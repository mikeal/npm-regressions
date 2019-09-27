const { brotliDecompress } = require('zlib')
const { promisify } = require('util')
const { readFile } = require('fs').promises
const decompress = promisify(brotliDecompress)

const filename = ts => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().padStart(2, '0')
  return `${year}/${month}/${day}.json.br`
}

const load = async day => {
  day = new Date(day)
  const f = filename(day)
  const buffer = await decompress(await readFile('/root/npm-minimized/'+f))
  const obj = JSON.parse(buffer.toString())
  return obj
}

module.exports = async day => {
  const o = await load(day)
  const results = { releases: {}, deps: {}, devdeps: {}, owners: {} }
  const add = (container, key) => {
    if (!results[container][key]) results[container][key] = 0
    results[container][key] += 1
  }
  for (let [key, value] of Object.entries(o)) {
    add('releases', value.name)
    for (let dep of value.deps) {
      add('deps', dep)
    }
    for (let dep of value.devdeps) {
      add('devdeps', dep)
    }
    for (let owner of value.owners) {
      add('owners', owner)
    }
  }
  return results
}
module.exports.load = load
module.exports.filename = filename

