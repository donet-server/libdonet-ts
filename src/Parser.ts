/*
    DONET SOFTWARE
    Copyright (c) 2023, libdonet-ts Authors.
    
    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License version 3.
    You should have received a copy of this license along
    with this source code in a file named "LICENSE."
    
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with this program; if not, write to the Free Software Foundation,
    Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

import { DC_SYNTAX, ESC_COLOR, MODULE_DEBUG_FLAGS, STATUS } from './globals'
import { color_string } from './Utils'
import * as error from './Errors'
import * as fs from 'node:fs'

export type dcFile = Array<Array<string | Array<any>>>

const enum TAB_METHOD { UNKNOWN = 0, TAB = 1, DOUBLE = 2, QUAD = 4 }
const IMPORT_FILE_EXTENSION: string = '.js'

/**
 * Contains the DC file parser to process Distributed Class definitions.
 *
 * @remarks
 * This parser was heavily inspired by an attempt to parse
 * the DC file by bobbybee using JavaScript which was used in
 * the Astron 'Web Panel' project, although abandoned in 2014.
 * {@link https://github.com/Astron/Web-Panel/blob/master/js/dcparser.js}
 *
 * @internal
 */
export class Parser {
    private _DEBUG_: boolean = MODULE_DEBUG_FLAGS.PARSER
    private fileContent: string = ""
    private parsedObjects: dcFile = []
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

    private notify(msg: string) {
        let margin: string = ""
        if (this._DEBUG_) for (let i = 0; i < this.scope; i++) margin += '\t'
        console.log(`${this.constructor.name}: ${margin}${msg}`)
    }

    // Public main method
    public parse_file(dcFilePath: string): dcFile {
        this.read_dc_file(dcFilePath)
        for (let i = 0; i < this.lines.length; i++)
            this.parse_line()
        if (this._DEBUG_)
            this.notify(color_string('DC FILE PARSE COMPLETE!', ESC_COLOR.GREEN))

        const DC_objects = this.parsedObjects // storing in variable before resetting properties
        this.reset_properties()
        return DC_objects
    }

    // Read DC file from file system
    private read_dc_file(path: string) {
        try {
            this.fileContent = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'})
        } catch (err) {
            throw new error.DCFileNotFound()
        }
        this.lines = this.fileContent.split('\n')
    }

    // Print an error with line/column point
    private parser_err(msg: string, warn?: boolean) {
        const trace = `Line ${this.lineCursor + 1} @ Column ${this.cursor + 1}`
        let prefix: string = color_string("ERROR", ESC_COLOR.RED)
        if (warn) prefix = color_string("WARNING", ESC_COLOR.MAGENTA)

        this.notify(`${prefix}: ${msg}`)
        if (warn) { this.notify(`Warning issued at: ${trace}.`); return }
        this.notify(`Error occurred at: ${trace}.`)
    }

    // Undo printed error message (used when certain tokens are re-validated)
    private undo_parser_err() {
        console.log("\u001b[3A") // move cursor 3 lines up
        const max_error_length: number = 70
        const error_height: number = 2
        let blank_cover: string = ""
        for (let i = 0; i < max_error_length; i++) blank_cover += " "
        for (let i = 0; i < error_height; i++) this.notify(blank_cover)
    }

    // Read until it reaches the given delimiter character
    private read_until(char: string = ' ', delimiterCheck: boolean = true): string {
        let token: string = ""
        while (this.line[this.cursor] !== char) {
            if (this.line.length < (this.cursor + 1)) {
                // if delimiterCheck disabled, return without worrying.
                if (!delimiterCheck) break
                // delimiterCheck is enabled, so we're expecting ';' but there isn't.
                this.parser_err(`DC file missing delimiter token character. Check semicolons?`)
                throw new error.DCFileMissingDelimiter()
            }
            token += this.line[this.cursor]
            this.cursor++
        }
        this.cursor++ // set cursor past delimiter character

        if (this._DEBUG_) this.notify(`read_until(): '${token}' | del: '${char}'`)
        return token
    }

    // Read until it reaches any delimiter character in array given
    private read_until_either(chars: Array<string>): Array<string> {
        let token = ""
        while (true) {
            if (this.line.length < (this.cursor + 1)) {
                this.parser_err(`DC file missing delimiter token character; Check semicolons?`)
                throw new error.DCFileMissingDelimiter()
            }
            // If any delimiter character reached, break loop
            if (chars.indexOf(this.line[this.cursor]) > -1) break
            // else, add to token string
            token += this.line[this.cursor]
            this.cursor++
        }
        const delimiter = this.line[this.cursor] // get delimiter it reached
        this.cursor++ // set cursor past delimiter character

        if (this._DEBUG_) this.notify(`read_until_either(): '${token}' | del: '${delimiter}'`)
        return [token, delimiter]
    }

    // Search & match from parsed objects
    private static search_object(object: Array<string | Array<any>>, name: string): number | STATUS {
        for (let i = 0; i < object[2].length; i++)
            if (name === object[2][i][1].toString()) return i
        return STATUS.FAILURE  // not throwing error here so that we can print the component name
    }

    // Validate DC language token
    private validate_dc_token(token: string, specification: Array<string>): STATUS {
        for (let i = 0; i < specification.length; i++)
            if (token === specification[i]) return STATUS.SUCCESS

        this.parser_err(`Invalid DC language token found: '${token}'.`)
        return STATUS.FAILURE // not throwing here, because in one case we check if we're reading an array
    }

    // Validate identifier name (compare to reserved keywords)
    private validate_identifier(identifier: string): STATUS {
        for (let keywordType in DC_SYNTAX)
            for (let i = 0; i < keywordType.length; i++)
                if (identifier === keywordType[i]) {
                    this.parser_err(`Identifier '${identifier}' cannot be a keyword.`)
                    throw new error.DCFileInvalidIdentifier()
                }
        return STATUS.SUCCESS
    }

    // Validate field data type token
    private validate_dc_data_type(data_type: string): STATUS {
        let isDataType = this.validate_dc_token(data_type, DC_SYNTAX.DATA_TYPES)

        if (isDataType === STATUS.FAILURE) {
            // If data type was array, strip and check again.
            if (data_type.endsWith('[]')) {
                data_type = data_type.slice(0, -2)
                isDataType = this.validate_dc_data_type(data_type)
                // if validated, clear previous error
                if (isDataType === STATUS.SUCCESS) this.undo_parser_err()
                return isDataType
            }

            // Check if the token is squished with an operator
            let operator: string = ''
            DC_SYNTAX.OPERATORS.forEach((value: string) => {
                if (data_type.includes(value)) operator = value
            });
            if (operator !== '') {
                data_type = data_type.split(operator)[0] // get type before operator
                isDataType = this.validate_dc_data_type(data_type)
                // if validated, clear previous error
                if (isDataType === STATUS.SUCCESS) this.undo_parser_err()
                return isDataType
            }

            // If type doesn't match data type, check if it matches a struct type.
            for (let structIdentifier in this.structLookup)
                if (data_type === structIdentifier) {
                    this.undo_parser_err() // clear first validation error
                    return STATUS.SUCCESS
                }
            throw new error.DCFileInvalidToken() // OK, it's an invalid data type then
        }
        return STATUS.SUCCESS
    }

    // Parse line at current line index
    private parse_line(): STATUS {
        this.lineCursor++
        if (this._DEBUG_) this.notify(`\t--- LINE: ${this.lineCursor + 1} ---`)
        this.cursor = 0
        this.line = this.lines[this.lineCursor]

        // If empty or line comment, skip line.
        if (this.line.length < 1) return STATUS.SUCCESS
        if (this.line[0] === '/' && this.line[1] === '/') return STATUS.SUCCESS

        // If in global scope ..
        if (this.scope === 0) {
            const token = this.read_until(' ')

            // @ts-ignore  Validate DC language keyword
            this.validate_dc_token(token, DC_SYNTAX.KEYWORDS)

            switch (token) {
                case 'dclass':
                    const className = this.read_until(' ')
                    // @ts-ignore  Validate identifier
                    this.validate_identifier(className)

                    const inherited = []

                    if (this.line[this.cursor] === ':') { // if inheritance operator
                        if (this._DEBUG_) this.notify(`CLASS INHERITANCE FOUND`)
                        this.cursor += 2 // skip operator

                        while (true) {
                            const temp = this.read_until_either([',', ' '])
                            // @ts-ignore  ('temp' response type checked, don't worry)
                            const tClass = this.parsedObjects[this.classLookup[temp[0]]]

                            if (!tClass) {
                                // @ts-ignore  ('temp' response type checked, don't worry)
                                this.parser_err(`Inheriting from undefined '${temp[0]}' class!`, true)
                            } else {
                                for (let i = 0; i < tClass[2].length; i++) {
                                    inherited.push(tClass[2][i])
                                    this.reverseFieldLookup[
                                        `${className}::${tClass[2][i][1]}`
                                        // @ts-ignore  ('temp' response type checked, don't worry)
                                        ] = this.reverseFieldLookup[`${temp[0]}::${tClass[2][i][1]}`]
                                }
                            }
                            this.cursor++
                            // @ts-ignore  ('temp' response type checked, don't worry)
                            if (temp[1] === ' ' || this.line[this.cursor] === '{') break
                        }
                    }
                    // @ts-ignore  ('className' cannot be type 'number'; checked above)
                    this.tempObject = ["dclass", className, inherited]
                    this.classLookup[className] = this.parsedObjects.length

                    if (this._DEBUG_) this.notify(`ENTERED SCOPE: ${this.scope + 1}`)
                    this.scope++
                    break
                case 'typedef':
                    let dataType = this.read_until(' ')
                    let typeName = this.read_until(';')
                    let array_clip: Array<string> = []

                    // @ts-ignore  Validate type name
                    this.validate_identifier(typeName)

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
                    // @ts-ignore  ('structName' always string; type checked above)
                    this.tempObject = ["struct", structName, []]
                    this.structLookup[structName] = this.parsedObjects.length

                    if (this._DEBUG_) this.notify(`ENTERED SCOPE: ${this.scope + 1}`)
                    this.scope++
                    break
                case 'from':
                    const filename = `${this.read_until(' ')}${IMPORT_FILE_EXTENSION}`
                    const next_token = this.read_until(' ')

                    if (next_token !== "import") {
                        this.parser_err(`Invalid token found, '${next_token}'.` +
                                        'Expected \'import\'. See DC file specification.')
                        throw new error.DCFileInvalidToken()
                    }
                    /* The `class_import` string should look something like this:
                            DistributedAvatar/AI/OV/AE
                    */
                    const class_import = this.read_until(' ', false) // skip delimiter check since it's python style
                    let import_components: string[] = class_import.split('/')
                    const class_name: string = import_components[0]

                    if (import_components.length !== 1)
                        for (let i = 1; i < import_components.length; i++)
                            import_components[i] = `${class_name}${import_components[i]}`

                    this.parsedObjects.push(["import", filename, import_components])
                    return STATUS.SUCCESS // returning since we're ready for the next line!
                default:
                    this.parser_err(`Unsupported token found, '${token}'; Please check your DC file.`)
                    throw new error.DCFileInvalidToken()
            }
        }
        // If inside scope ..
        else {
            // Check if end of scope
            if (this.line[0] === '}') {
                if (this.line[1] === ';') { // enforce ';' delimiter (to follow DC specification)
                    this.scope--
                    if (this._DEBUG_) this.notify(`EXITED SCOPE: ${this.scope}`)
                    this.parsedObjects.push(this.tempObject)
                    return STATUS.SUCCESS
                } else {
                    this.parser_err("Missing delimiter semicolon after end of scope.")
                    throw new error.DCFileMissingDelimiter()
                }
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
                    this.parser_err("Failed to detect tab method; Check DC file tab spaces?")
                    throw new error.DCFileInvalidTabSpacing()
                }
            }
            // Move index past 'n' tabs; 'n' defined by the scope its in
            this.cursor = this.tabMethod * this.scope

            // If next character is still a space, tab is probably uneven.
            if (this.line[this.cursor] === ' ') {
                this.parser_err("DC file tab spacing is invalid or uneven; Check DC file tab spaces?")
                throw new error.DCFileInvalidTabSpacing()
            }
            // Check if there is a comment line inside this scope
            if (this.line[this.cursor] === '/' && this.line[this.cursor + 1] === '/') return STATUS.SUCCESS

            // Read DC field in line
            const res = this.read_dc_field()
            // @ts-ignore  (third item will always be Array<any> type)
            this.tempObject[2].push(res)
        }
        return STATUS.SUCCESS
    }

    // Parses line with a DC field
    private read_dc_field(): Array<any> | STATUS {
        const res: string[] = this.read_until_either([' ', '('])

        // @ts-ignore  (response type checked above)
        switch (res[1]) {
            case ' ': // variable field
                // @ts-ignore  (response type checked above)
                let dataType: string = res[0]
                let fieldName: string[] = this.read_until_either([' ', ';'])

                // @ts-ignore  (response type checked above)
                if (fieldName[0] === ':') {
                    fieldName[0] = dataType // first token is the name in this case
                    // @ts-ignore  Validate identifier
                    this.validate_identifier(fieldName)

                    const components: Array<string> = []

                    while (true) {
                        const temp = this.read_until_either([',', ';'])
                        this.cursor++
                        // @ts-ignore  (response type checked above)
                        components.push(temp[0])
                        // @ts-ignore  (same warn)
                        if (temp[1] === ';') break // once field delimiter char reached, break loop
                    }
                    let modifiers: Array<string> = []
                    let params: Array<string> = []

                    for (let i = 0; i < components.length; i++) {
                        const cIndex = Parser.search_object(this.tempObject, components[i]) // old: i + 1
                        // error handling
                        if (cIndex === STATUS.FAILURE) {
                            this.parser_err(`Component '${components[i]}' doesn't exist.`) // old: i - 1
                            throw new error.DCFileInvalidComponent(components[i])
                        }
                        if (this._DEBUG_) this.notify(`'${components[i]}' at index '${cIndex}'`)
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
                // run validations for regular variable field
                this.validate_dc_data_type(dataType)
                // @ts-ignore
                this.validate_identifier(fieldName[0])

                let dcKeywords = []
                // @ts-ignore  (index '1' always 'char'; type checked above)
                if (fieldName[1] === ' ') {
                    if (this._DEBUG_) this.notify(`DC KEYWORDS START`)
                    // DC keywords ahead, parse tokens
                    while (true) {
                        const keyword = this.read_until_either([' ', ';'])

                        // @ts-ignore  Validate DC field keyword
                        this.validate_dc_token(keyword[0], DC_SYNTAX.FIELD_KEYWORDS)

                        // @ts-ignore  (array items always 'string'; type checked above)
                        dcKeywords.push(keyword[0])
                        // @ts-ignore  (same warn)
                        if (keyword[1] === ';') break
                    }
                    if (this._DEBUG_) this.notify(`DC KEYWORDS END`)
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

                this.validate_identifier(funcName)

                while (true) {
                    let parameter: string[] = this.read_until_either([',', '(', ')'])

                    // @ts-ignore  (type checked above)
                    while (parameter[0] === ' ') {
                        // @ts-ignore  (type checked above)
                        parameter = parameter.slice(1)

                        // @ts-ignore  (type checked above)
                        if (parameter[0].indexOf(' ') > -1) {
                            // @ts-ignore  (type checked above)
                            let p = parameter[0].split(' ')
                            let l = p[p.length - 1]

                            // @ts-ignore  I know this is confusing, but this works! (it checks if the str is a number)
                            if ((l * 1) !== l) {
                                // If it's a number, it's probably just weirdly spaced inline math.
                                // If not, we need to strip off the property name.
                                // @ts-ignore  (type checked above)
                                parameter[0] = p.slice(0, -1).join(' ')
                            }
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
                    if (this._DEBUG_) this.notify(`DC KEYWORDS START`)
                    // DC field keywords ahead, parse them!
                    while (true) {
                        const keyword = this.read_until_either([' ', ';'])

                        // @ts-ignore  Validate DC field keyword
                        this.validate_dc_token(keyword[0], DC_SYNTAX.FIELD_KEYWORDS)

                        // @ts-ignore  (this is tiring)
                        keywords.push(keyword[0])
                        // @ts-ignore
                        if (keyword[1] === ';') break
                    }
                    if (this._DEBUG_) this.notify(`DC KEYWORDS END`)
                }
                this.reverseFieldLookup[`${this.tempObject[1]}::${funcName}`] = this.fieldLookup.length
                this.fieldLookup.push([this.tempObject[1], "function", funcName, keywords, parameters])
                return ["function", funcName, keywords, parameters]

            default:
                this.parser_err(`Invalid DC object field found; Please check your DC file.`)
                throw new error.DCFileInvalidField()
        }
    }
    private reset_properties() {
        this.cursor = 0; this.lineCursor = -1; this.line = ""; this.lines = [];
        this.fileContent = ""; this.parsedObjects = []; this.tempObject = []; this.scope = 0;
        this.tabMethod = TAB_METHOD.UNKNOWN; this.classLookup = {}; this.fieldLookup = [];
        this.structLookup = {}; this.reverseFieldLookup = {}; this.typedefs = {};
    }
}

/**
 * Provides static utility functions for reading parsed data from the parsed DC file.
 *
 * @remarks
 * So as I started writing the LegacyHash.ts file, I realized how
 * the parsed DC file is used in Astron implementations and realized
 * that an array of arrays might not be the best way to define the parsed file.
 *
 * So instead of reworking this parser again, (which I've been spending too much time on)
 * I just defined helper functions below to make reading of the dcFile type easier.
 *
 * This is not too different from Astron anyway, since Astron defines a 'File' class
 * which basically has its own helper functions to read the parsed DC objects.
 *
 * @internal
 */
export class DCFileUtils {
    private static count_objects_of_type(file: dcFile, type: string): number {
        let count: number = 0
        for (let i = 0; i < file.length; i++) {
            const object: Array<string | Array<any>> = file[i]
            if (object[0] === type) count++
        }
        return count
    }

    public static get_num_imports(file: dcFile): number {
        return DCFileUtils.count_objects_of_type(file, 'import')
    }

    public static get_num_classes(file: dcFile): number {
        return DCFileUtils.count_objects_of_type(file, 'dclass')
    }

    public static get_num_structs(file: dcFile): number {
        throw new error.NotImplemented() // FIXME: implement
    }

    public static get_num_types(file: dcFile): number {
        throw new error.NotImplemented() // FIXME: implement
    }

    public static get_num_keywords(file: dcFile): number {
        throw new error.NotImplemented() // FIXME: implement
    }
}
