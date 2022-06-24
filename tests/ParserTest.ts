import * as Astron from './../build'
import { STATUS, MODULE_DEBUG_FLAGS } from './../build/globals'
// Enable parser debug output
MODULE_DEBUG_FLAGS.DC_PARSER = true

const parser = new Astron.DCParser()
const dcFile1 = parser.parse_file('parser_test.dc')

if (dcFile1 === STATUS.FAILURE) process.exit(1)
//console.dir(dcFile1, {depth: null})