const path = require('path')
const mkcsv = require('mkcsv')
const { collection, counter } = require('reed-richards')

const load = require('./load')

const sum = (a, b) => {
  const c = {}
  Object.assign(c, a)
  for (const [key, value] of Object.entries(b)) {
    if (!c[key]) c[key] = b[key]
    else c[key] = c[key] + b[key]
  }
  return c
}

const month = async ts => {
  ts = new Date(ts)
  const [year, month] = ts.toISOString().split('-')
  const results = await load(path.join(__dirname, '..', year, month + '.json.br')) 
  
  const deps = sum(results.deps, results.devdeps)
  const db = {}
  for (let [pkg, i] of Object.entries(deps)) {
    db[pkg] = {pkg: null, deps: i, releases: 0}
  }
  for (let [pkg, i] of Object.entries(results.releases)) {
    if (!db[pkg]) db[pkg] = {pkg: null, releases: i, deps: 0}
    else db[pkg].releases = i
  }
  const lines = Array.from(Object.entries(db)).map(x => {
    let [key, line] = x
    line.pkg = key
    return line
  })
  
  const ret = { packages: mkcsv(lines), db }
  return ret
}

const oneday = 1000 * 60 * 60 * 24

const run = async (start, end) => {
  const uniqueOwners = collection()
  const releases = collection()
  start = new Date(start)
  end = (new Date(end)).getTime()
  while (start.getTime() < end) {
    const r = await month(start)
    const [year, month] = start.toISOString().split('-')
    uniqueOwners.set(year, month, Object.keys(r.db.owners).length)
    releases.set(year, month, Object.values(r.db.owners).reduce((x,y) => x + y))
    start = new Date(start.getTime() + oneday)
  }
}

module.exports = run
