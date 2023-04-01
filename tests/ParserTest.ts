import * as astron from './../' // import our own project

// Enable parser debug output
astron.globals.MODULE_DEBUG_FLAGS.PARSER = true
const parser = new astron.Parser()

// Run full test DC file (3000 lines)
parser.parse_file('parser_test.dc')
console.log("\n\n\n\n")

// Run simple DC file (less overwhelming to observe)
const simpleDC = parser.parse_file('example/example.dc')
console.dir(simpleDC, {depth: null})