import * as Astron from './../build'

const parser = new Astron.DCParser()
// Parse test DC file
const dcFile1 = parser.parse_file('parser_test.dc')
console.dir(dcFile1, {depth: null})