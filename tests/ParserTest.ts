import * as Astron from './../build'
import { STATUS, MODULE_DEBUG_FLAGS } from './../build/globals'
// Enable parser debug output
MODULE_DEBUG_FLAGS.DC_PARSER = true

const parser = new Astron.DCParser()

// Run full test DC file (3k lines)
const testDC = parser.parse_file('parser_test.dc')
if (testDC === STATUS.FAILURE) process.exit(1)
console.log("\n\n\n\n")

// Run simple DC file (less overwhelming to observe)
const simpleDC = parser.parse_file('simple_example.dc')
if (simpleDC === STATUS.FAILURE) process.exit(1)
console.dir(simpleDC, {depth: null})