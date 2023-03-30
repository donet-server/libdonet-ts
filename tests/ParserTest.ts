import * as astron from './../' // import our own project

// Enable parser debug output
astron.globals.MODULE_DEBUG_FLAGS.PARSER = true

const globals = astron.globals
const parser = new astron.Parser()

// Run full test DC file (3000 lines)
const testDC = parser.parse_file('parser_test.dc')
if (testDC === globals.STATUS.FAILURE) process.exit(1)
console.log("\n\n\n\n")

// Run simple DC file (less overwhelming to observe)
const simpleDC = parser.parse_file('example/example.dc')
if (simpleDC === globals.STATUS.FAILURE) process.exit(1)
console.dir(simpleDC, {depth: null})