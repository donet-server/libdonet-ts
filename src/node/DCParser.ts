/*
    Copyright 2022 Max Rodriguez Coppola

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import {_DCPARSER_DEBUG, DC_SPECIFICATION, STATUS} from './globals'
import * as fs from 'node:fs'

export enum TAB_METHOD { UNKNOWN = 0, TAB = 1, DOUBLE = 2, QUAD = 4 }

export class DCParser {
    private fileContent: string = ""
    private parsedObjects: Array<Array<string | Array<any>>> = []
    private tempObject: Array<string | Array<any>> = []

    private cursor: number = 0
    private lineCursor: number = -1
    private lines: Array<string> = [""]
    private line: string = ""
    private tabMethod: TAB_METHOD = TAB_METHOD.UNKNOWN
    private scope: number = 0

    private classLookup: {[k: string]: number} = {}
    private structLookup: {[k: string]: number} = {}
    private fieldLookup: Array<any> = []
    private reverseFieldLookup: {[k: string]: number} = {}
    private typedefs: {[k: string]: any} = {}

    private notify(msg: string) { console.log(`${this.constructor.name}: ${msg}`) }

    // Public main method
    public parse_file(dcFilePath: string): Array<Array<string | Array<any>>> | STATUS {
        this.read_dc_file(dcFilePath)
        for (let i = 0; i < this.lines.length; i++) {
            const status = this.parse_line()
            if (status === STATUS.FAILURE) return status
        }
        // If debug flag is set, print out results
        if (_DCPARSER_DEBUG) {
            this.notify(`DC FILE PARSE COMPLETE!`)
            this.notify(`Distributed Class Objects: \n${JSON.stringify(this.classLookup, null, 4)}`)
            this.notify(`DC File Structure: \n${JSON.stringify(this.parsedObjects)}`)
        }
        const DCFile = this.parsedObjects
        this.reset_properties()
        return DCFile
    }

    // Print an error with line/column point
    private parser_err(msg: string) {
        this.notify(msg)
        this.notify(`Parser error occurred at: Line ${this.lineCursor + 1}, Column ${this.cursor + 1}.`)
    }

    // Read DC file from file system
    private read_dc_file(path: string) {
        this.fileContent = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'})
        this.lines = this.fileContent.split('\n')
    }

    // Read until it reaches the given delimiter character
    private read_until(char: string): string | STATUS {
        if (!char) char = ' '
        let token = ""
        while (this.line[this.cursor] !== char) {
            if (this.line.length < (this.cursor + 1)) {
                this.parser_err(`ERROR: DC file missing delimiter token character; Check semicolons?`)
                return STATUS.FAILURE
            }
            token += this.line[this.cursor]
            this.cursor++
        }
        this.cursor++ // set cursor past delimiter character
        if (_DCPARSER_DEBUG) this.notify(`read_until(): '${token}' | '${char}'`)
        return token
    }

    // Read until it reaches any delimiter character in array given
    private read_until_either(chars: Array<string>): Array<string> | STATUS {
        let token = ""
        while (true) {
            if (this.line.length < (this.cursor + 1)) {
                this.parser_err(`ERROR: DC file missing delimiter token character; Check semicolons?`)
                return STATUS.FAILURE
            }
            // If any delimiter character reached, break loop
            if (chars.indexOf(this.line[this.cursor]) > -1) break
            // else, add to token string
            token += this.line[this.cursor]
            this.cursor++
        }
        const delimiter = this.line[this.cursor] // get delimiter it reached
        this.cursor++ // set cursor past delimiter character

        if (_DCPARSER_DEBUG) this.notify(`read_until_either(): '${token}' | '${delimiter}'`)
        return [token, delimiter]
    }

    // Search & match from parsed objects
    private static search_object(object: Array<string | Array<any>>, name: string): number | STATUS {
        for (let i = 0; i < object[2].length; i++)
            if (name === object[2][i][1].toString()) return i
        return STATUS.FAILURE
    }

    // Validate DC field keyword token
    private validate_dc_keyword(keyword: string): STATUS {
        for (let i = 0; i < DC_SPECIFICATION.FIELD_KEYWORDS.length; i++) {
            if (keyword === DC_SPECIFICATION.FIELD_KEYWORDS[i]) return STATUS.SUCCESS
        }
        this.parser_err(`ERROR: Invalid DC field keyword '${keyword}'.`)
        return STATUS.FAILURE
    }

    // Parse line at current line index
    private parse_line(): STATUS {
        this.lineCursor++
        if (_DCPARSER_DEBUG) this.notify(`NEW LINE: ${this.lineCursor + 1}`)
        this.cursor = 0
        this.line = this.lines[this.lineCursor]

        // If empty or line comment, skip line.
        if (this.line.length < 1 || this.line[0] === '/') return STATUS.SUCCESS

        // If in global scope ..
        if (this.scope === 0) {
            const token = this.read_until(' ')
            if (token === STATUS.FAILURE) return token

            switch (token) {
                case 'dclass':
                    const className = this.read_until(' ')
                    if (className === STATUS.FAILURE) return className
                    const inherited = []

                    if (this.line[this.cursor] === ':') { // if inheritance operator
                        if (_DCPARSER_DEBUG) this.notify(`READING DCLASS INHERITANCE`)
                        this.cursor += 2 // skip operator

                        while (true) {
                            const temp = this.read_until_either([',', ' '])
                            if (temp === STATUS.FAILURE) return temp
                            // @ts-ignore  ('temp' response type checked, don't worry)
                            const tClass = this.parsedObjects[this.classLookup[temp[0]]]

                            if (!tClass) {
                                this.parser_err(`ERROR: NULL TClass ${JSON.stringify(tClass)}`)
                                continue
                            }
                            for (let i = 0; i < tClass[2].length; i++) {
                                inherited.push(tClass[2][i])
                                this.reverseFieldLookup[
                                    `${className}::${tClass[2][i][1]}`
                                    // @ts-ignore  ('temp' response type checked, don't worry)
                                    ] = this.reverseFieldLookup[`${temp[0]}::${tClass[2][i][1]}`]
                            }
                            this.cursor++
                            // @ts-ignore  ('temp' response type checked, don't worry)
                            if (temp[1] === ' ' || this.line[this.cursor] === '{') break
                        }
                    }
                    // @ts-ignore  ('className' cannot be type 'number'; checked above)
                    this.tempObject = ["dclass", className, inherited]
                    this.classLookup[className] = this.parsedObjects.length

                    this.scope++
                    if (_DCPARSER_DEBUG) this.notify(`ENTERED SCOPE: ${this.scope}`)
                    break
                case 'typedef':
                    let dataType = this.read_until(' ')
                    let typeName = this.read_until(';')
                    let array_clip: Array<string> = []

                    // get array index if typedef is array
                    // @ts-ignore
                    if (typeName[ typeName.length - 1 ] == ']') {
                        if (typeof typeName !== "number") { // silences TS warning
                            // read array clip
                            typeName = typeName.slice(0, -1)
                            array_clip = typeName.split('[')
                        }
                        dataType += `[${ array_clip[1] }]`
                        typeName = array_clip[0]
                    }
                    this.typedefs[typeName] = dataType
                    break
                case 'struct':
                    const structName = this.read_until(' ')
                    if (structName === STATUS.FAILURE) return structName
                    // @ts-ignore  ('structName' always string; type checked above)
                    this.tempObject = ["struct", structName, []]
                    this.structLookup[structName] = this.parsedObjects.length

                    this.scope++
                    if (_DCPARSER_DEBUG) this.notify(`ENTERED SCOPE: ${this.scope}`)
                    break
                case 'from':
                    // TODO: Support DC file python-style 'from' imports.
                    this.parser_err("WARN: This implementation currently does not support DC file imports.")
                    break
                default:
                    this.parser_err("ERROR: Invalid or unsupported token found; Please check your DC file.")
                    return STATUS.FAILURE
            }
        }
        // If inside scope ..
        else {
            // Check if end of scope
            if (this.line[0] === '}') {
                this.scope--
                if (_DCPARSER_DEBUG) this.notify(`EXITED SCOPE: ${this.scope}`)
                this.parsedObjects.push(this.tempObject)
                return STATUS.SUCCESS
            }
            // Check file tab style
            if (this.tabMethod === TAB_METHOD.UNKNOWN) {
                // Check if space-based
                if (this.line[0] === ' ') {
                    for (let c = 1; c < 4; c++) {
                        if (c === 3) {
                            this.tabMethod = TAB_METHOD.QUAD; break
                        } else if (this.line[c] !== ' ') {
                            this.tabMethod = TAB_METHOD.DOUBLE; break
                        }
                    }
                }
                // Check if tab-character-based
                else if (this.line[0] === '\t') this.tabMethod = TAB_METHOD.TAB
                else {
                    this.parser_err("ERROR: Failed to detect tab method; Check DC file tab spaces?")
                    return STATUS.FAILURE
                }
            }
            // Move index past 'n' tabs; 'n' defined by the scope its in
            this.cursor = this.tabMethod * this.scope

            // If next character is still a space, tab is probably uneven.
            if (this.line[this.cursor] === ' ') {
                this.parser_err("ERROR: DC file tab spacing is invalid or uneven; Check DC file tab spaces?")
                return STATUS.FAILURE
            }
            // Read DC field in line
            const res = this.read_dc_field()
            if (res === STATUS.FAILURE) return res
            // @ts-ignore  (third item will always be Array<any> type)
            this.tempObject[2].push(res)
        }
        return STATUS.SUCCESS
    }

    // Parses line with a DC field
    private read_dc_field(): Array<any> | STATUS {
        const res = this.read_until_either([' ', '('])
        if (res === STATUS.FAILURE) return res

        // @ts-ignore  (response type checked above)
        switch (res[1]) {
            case ' ': // variable field
                // @ts-ignore  (response type checked above)
                let dataType = res[0]
                let fieldName = this.read_until_either([' ', ';'])
                if (fieldName === STATUS.FAILURE) return fieldName

                // @ts-ignore  (response type checked above)
                if (fieldName[0] === ':') {
                    fieldName = dataType // first token is the name in this case
                    const components: Array<string> = []

                    while (true) {
                        const temp = this.read_until_either([',', ';'])
                        if (temp === STATUS.FAILURE) return temp
                        this.cursor++
                        // @ts-ignore  (response type checked above)
                        components.push(temp[0])
                        // @ts-ignore  (same warn)
                        if (temp[1] === ';') break // once field delimiter char reached, break loop
                    }
                    let modifiers: Array<string> = []
                    let params: Array<string> = []

                    for (let i = 0; i < components.length; i++) {
                        const cIndex = DCParser.search_object(this.tempObject, components[i]) // old: i + 1
                        // error handling
                        if (cIndex === STATUS.FAILURE) {
                            this.parser_err(`ERROR: Component '${components[i]}' doesn't exist.`) // old: i - 1
                            return STATUS.FAILURE
                        }
                        if (_DCPARSER_DEBUG) this.notify(`'${components[i]}' at index '${cIndex}'`)
                        modifiers = this.tempObject[2][cIndex][2]
                        params = params.concat(this.tempObject[2][cIndex][3])
                    }
                    // modifiers.push["morph"] - this is in the inspired source code, but what does it do?

                    this.reverseFieldLookup[`${this.tempObject[1]}::${fieldName}`] = this.fieldLookup.length
                    this.fieldLookup.push([
                        this.tempObject[1], "function", fieldName, modifiers, params, components
                    ])
                    return ["function", fieldName, modifiers, params, components]
                }

                let dcKeywords = []
                // @ts-ignore  (index '1' always 'char'; type checked above)
                if (fieldName[1] === ' ') {
                    if (_DCPARSER_DEBUG) this.notify(`DC KEYWORDS START`)
                    // DC keywords ahead, parse tokens
                    while (true) {
                        const keyword = this.read_until_either([' ', ';'])
                        if (keyword === STATUS.FAILURE) return keyword

                        // @ts-ignore  Validate DC field keyword
                        let valid: STATUS = this.validate_dc_keyword(keyword[0])
                        if (valid === STATUS.FAILURE) return valid

                        // @ts-ignore  (array items always 'string'; type checked above)
                        dcKeywords.push(keyword[0])
                        // @ts-ignore  (same warn)
                        if (keyword[1] === ';') break
                    }
                    if (_DCPARSER_DEBUG) this.notify(`DC KEYWORDS END`)
                }
                // @ts-ignore  (index '0' always 'string' type)
                let name: string = fieldName[0] // set name (clear delimiter char response)

                // Remove brackets from name string, if field is array
                if (name[name.length - 1] === ']') {
                    name = name.slice(0, -2)
                    dataType += '[]' // move brackets to data type string
                }
                this.reverseFieldLookup[`${this.tempObject[1]}::${name}`] = this.fieldLookup.length
                this.fieldLookup.push([this.tempObject[1], dataType, name, dcKeywords])
                return [dataType, name, dcKeywords]

            case '(': // function field
                // @ts-ignore  ('res' type checked above)
                const funcName: string = res[0]
                const parameters: Array<string> = []

                while (true) {
                    let parameter = this.read_until_either([',', '(', ')'])
                    if (parameter === STATUS.FAILURE) return parameter

                    // @ts-ignore  (type checked above)
                    while (parameter[0] === ' ') parameter[0] = parameter[0].slice(1)

                    // @ts-ignore  (type checked above)
                    if (parameter[0].indexOf(' ') > -1) {
                        // @ts-ignore  (type checked above)
                        let p = parameter[0].split(' ')
                        let l = p[p.length - 1]

                        if ((l * 1) !== l) {
                            // If it's a number, it's probably just weirdly spaced inline math.
                            // If not, we need to strip off the property name.
                            // @ts-ignore  (type checked above)
                            parameter[0] = p.slice(0, -1).join(' ')
                        }
                    }
                    // @ts-ignore  (type checked above)
                    if (parameter[1] === '(') {
                        this.read_until(')')

                        if (this.line[this.cursor + 1] === '[') {
                            this.cursor += 2 // move cursor ahead
                            let ind = this.read_until(']')
                            // @ts-ignore  (type checked above)
                            parameter[0] += `[${ind}]`
                        }
                        // @ts-ignore  (type checked above)
                        parameters.push(parameter[0])
                        if (this.line[this.cursor + 1] === ')') break

                    } else {
                        // @ts-ignore  (type checked above)
                        parameters.push(parameter[0]);
                        // @ts-ignore  (type checked above)
                        if (parameter[1] === ')') break
                        this.cursor++
                    }
                }
                const keywords: Array<string> = []

                if (this.line[this.cursor] === ' ') {
                    this.cursor++
                    if (_DCPARSER_DEBUG) this.notify(`DC KEYWORDS START`)
                    // DC field keywords ahead, parse them!
                    while (true) {
                        const keyword = this.read_until_either([' ', ';'])
                        if (keyword === STATUS.FAILURE) return keyword

                        // @ts-ignore  Validate DC field keyword
                        let valid: STATUS = this.validate_dc_keyword(keyword[0])
                        if (valid === STATUS.FAILURE) return valid

                        // @ts-ignore  (this is tiring)
                        keywords.push(keyword[0])
                        // @ts-ignore
                        if (keyword[1] === ';') break
                    }
                    if (_DCPARSER_DEBUG) this.notify(`DC KEYWORDS END`)
                }
                this.reverseFieldLookup[`${this.tempObject[1]}::${funcName}`] = this.fieldLookup.length
                this.fieldLookup.push([this.tempObject[1], "function", funcName, keywords, parameters])
                return ["function", funcName, keywords, parameters]

            default:
                this.parser_err(`ERROR: Invalid DC object field found; Please check your DC file.`)
                return STATUS.FAILURE
        }
    }
    private reset_properties() {
        this.cursor = 0; this.lineCursor = -1; this.line = ""; this.lines = [];
        this.fileContent = ""; this.parsedObjects = []; this.tempObject = []; this.scope = 0;
        this.tabMethod = TAB_METHOD.UNKNOWN; this.classLookup = {}; this.fieldLookup = [];
        this.structLookup = {}; this.reverseFieldLookup = {}; this.typedefs = {};
    }
}