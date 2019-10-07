const { brotliDecompress } = require('zlib')
const { promisify } = require('util')
const { readFile, stat } = require('fs').promises
const bent = require('bent')
const decompress = promisify(brotliDecompress)

const exists = async f => {
  try {
    await stat(f) 
  } catch (e) {
    return false
  }
  return true
}

const filename = ts => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().padStart(2, '0')
  return `${year}/${month}/${day}.json.br`
}

const get = async s => {
  const _get = bent('https://media.githubusercontent.com/media/mikeal/npm-minimized/master/', 'buffer')
  let buffer
  try {
    buffer = await _get(s)
  } catch (e) {
    if (e.statusCode === 404) return null
    throw e
  }
  buffer = await decompress(buffer)
  return JSON.parse(buffer.toString())
}

const load = async (day, local=false) => {
  day = new Date(day)
  if (local) {
    const f = '/root/npm-minimized/' + filename(day)
    if (!await exists(f)) return null
    const buffer = await decompress(await readFile(f))
    return JSON.parse(buffer.toString())
  } else {
    return get(filename(day))
  }
}

module.exports = async (day, local=false) => {
  const o = await load(day, local)
  if (o === null) return null
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

