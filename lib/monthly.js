const { readFile, readdir } = require('fs').promises
const { brotliDecompress } = require('zlib')
const { promisify } = require('util')
const path = require('path')
const brotli = require('brotli-max')
const decompress = promisify(brotliDecompress)
const basedir = path.join(__dirname, '..')

const load = async f => {
  const buffer = await decompress(await readFile(f))
  const obj = JSON.parse(buffer.toString())
  return obj
}

const runMonth = async (year, month) => {
  const days = await readdir(path.join(basedir, year, month))
  const data = {}
  for (const day of days) {
    const results = await load(path.join(basedir, year, month, day))
    for (const [type, metrics] of Object.entries(results)){
      if (!data[type]) data[type] = {}
      for (const [name, i] of Object.entries(metrics)) {
        if (!data[type][name]) data[type][name] = 0
        data[type][name] += i
      }
    }
  }
  const buffer = Buffer.from(JSON.stringify(data))
  console.log(year + '/' + month, buffer.length)
  await brotli(buffer, path.join(basedir, year, `${month}.json.br`))
}

const all = async () => {
  const years = (await readdir(basedir)).filter(s => s.startsWith('20'))
  for (const year of years) {
    const months = (await readdir(path.join(basedir, year))).filter(s => !s.includes('.'))
    for (const month of months) {
      await runMonth(year, month)
    }
  }
}

module.exports = runMonth
module.exports.all = all
