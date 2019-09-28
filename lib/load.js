const { readFile } = require('fs').promises
const { brotliDecompress } = require('zlib')
const { promisify } = require('util')
const decompress = promisify(brotliDecompress)

const load = async f => {
  const buffer = await decompress(await readFile(f))
  const obj = JSON.parse(buffer.toString())
  return obj
}

module.exports = load
