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
import {STATUS} from './globals'
import * as fs from 'node:fs'

export enum TAB_METHOD { UNKNOWN = 0, TAB = 1, DOUBLE = 2, QUAD = 4 }

export class DCParser {
    private fileContent: string = ""
    private index: number = 0
    private line_index: number = -1
    private lines: Array<string> = [""]
    private line: string = ""
    private tabMethod: TAB_METHOD = TAB_METHOD.UNKNOWN
    private scope: number = 0

    private classLookup: Object = {};
    private structLookup: Object = {};
    private fieldLookup: Array<any> = [];
    private reverseFieldLookup: Object = {};
    private classFields: Object = {};
    private typedefs: {[k: string]: any} = {};

    private notify(msg: string) { console.log(`${this.constructor.name}: ${msg}`) }

    public parse_file(dcFilePath: string) {
        this.read_dc_file(dcFilePath)

        for (let i = 0; i < this.lines.length; i++) {
            let status = this.parse_line()
            if (status === STATUS.FAILURE) return status
        }
        this.reset_properties()
    }

    private parser_err(msg: string) {
        this.notify(msg)
        this.notify(`Parser error occurred at: Line ${this.line_index}, Column ${this.index}.`)
    }

    private read_dc_file(path: string) {
        this.fileContent = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'})
        this.lines = this.fileContent.split('\n')
    }

    // Read until it reaches the given delimiter character
    private read_until(char: string): string | number {
        if (!char) char = ' '
        let token = ""
        while (this.line[this.index] !== char) {
            if (this.line.length < (this.index + 1)) {
                this.parser_err(`DC file missing delimiter token character; Check semicolons?`)
                return STATUS.FAILURE
            }
            token += this.line[this.index++]
        }
        this.index++ // set cursor past delimiter character
        return token
    }

    private parse_line(): number {
        this.line_index++
        this.index = 0
        this.line = this.lines[this.line_index]

        // If empty or line comment, skip line.
        if (this.line.length < 1 || this.line[0] === '/') return STATUS.SUCCESS

        // If in global scope ..
        if (this.scope === 0) {
            let token = this.read_until(' ')
            if (token === STATUS.FAILURE) return token

            switch (token) {
                case 'dclass':
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
                    let structName = this.read_until(' ')
                    //this.scope++
                    // TODO: Parse 'struct' definitions
                    break
                case 'from':
                    // TODO: Support DC file python-style 'from' imports.
                    this.parser_err("This implementation currently does not support DC file imports.")
                    break
                default:
                    this.parser_err("Invalid or unsupported token found; Please check your DC file.")
                    break
            }
        }
        // If inside scope ..
        else {
            // Check if end of scope
            if (this.line[0] === '}') {
                this.scope--; return STATUS.SUCCESS
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
                    return STATUS.FAILURE
                }
            }
            // Move index past 'n' tabs; 'n' defined by the scope its in
            this.index = this.tabMethod * this.scope

            // If next character is still a space, tab is probably uneven.
            if (this.line[this.index] === ' ') {
                this.parser_err("DC file tab spacing is invalid or uneven; Check DC file tab spaces?")
                return STATUS.FAILURE
            }

            // TODO: Parse field tokens inside object scope
        }
        return STATUS.FAILURE
    }

    private reset_properties() {
        this.fileContent = ""; this.index = 0; this.line_index = -1
        this.lines = [""]; this.line = ""; this.scope = 0
    }
}