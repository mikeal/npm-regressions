const fs = require('fs').promises
const merge = require('@mikeal/csv-merge')
// const brotli = require('brotli-max')
const mkcsv = require('mkcsv')
const path = require('path')
const mkdirp = require('mkdirp')
const { collection, counter, quarter } = require('reed-richards')

const pj = path.join
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

const deps = counter()

const month = async (ts, db, ownerIndex) => {
  ts = new Date(ts)
  const [year, month] = ts.toISOString().split('-')
  const results = await load(path.join(__dirname, '..', year, month + '.json.br'))

  const q = quarter(ts)
  const m = year + '-' + month

  console.log('processing', m)
  for (const [pkg, value] of Object.entries(results.releases)) {
    let owners = ownerIndex.get(pkg)
    for (let owner of owners) {
      db.ownersPerQuarter.count({quarter: q, owner})
      db.ownersPerMonth.count({month: m, owner})
      db.ownerReleasesByQuarter.add({quarter: q, owner}, value)
      db.ownerReleasesByMonth.add({month: m, owner}, value)
    }
    db.releasesByQuarter.count({quarter: q, pkg})
    db.releasesByMonth.count({month: m, pkg})
    db.pkgReleasesByQuarter.add({quarter: q, pkg}, value)
    db.pkgReleasesByMonth.set({month: m, pkg, count: value})
  }
  const _deps = obj => {
    for (const [pkg, value] of Object.entries(obj)) {
      let owners = ownerIndex.get(pkg) || []
      for (let owner of owners) {
        db.depOwnersPerQuarter.count({quarter: q, owner})
        db.depOwnersPerMonth.count({month: m, owner})
        db.depOwnersDependedPerQuarter.add({quarter: q, owner}, value)
        db.depOwnersDependedPerMonth.add({month: m, owner}, value)
      }
      db.depsByQuarter.count({quarter: q, pkg})
      db.depsByMonth.count({month: m, pkg}, value)
      db.depsDependedPerQuarter.add({quarter: q, pkg}, value)
      db.depsDependedPerMonth.add({month: m, pkg}, value)
    }
  }
  _deps(results.deps)
  _deps(results.devdeps)
}

const oneday = 1000 * 60 * 60 * 24

const loadMap = async f => {
  return new Map(await load(f))
}

const daystring = dt => (new Date(dt)).toISOString().split('T')[0].slice(0, '2019-01'.length)

const run = async (start, end, outputDir=null) => {
  const db = {
    releasesByQuarter: counter('quarter', 'pkg'),
    releasesByMonth: counter('month', 'pkg'),
    pkgReleasesByQuarter: counter('quarter', 'pkg'),
    pkgReleasesByMonth: collection('month', 'pkg', 'count'),

    ownersPerQuarter: counter('quarter', 'owner'),
    ownersPerMonth: counter('month', 'owner'),
    ownerReleasesByQuarter: counter('quarter', 'owner'),
    ownerReleasesByMonth: counter('month', 'owner'),

    depOwnersPerQuarter: counter('quarter', 'owner'),
    depOwnersPerMonth: counter('month', 'owner'),
    depOwnersDependedPerQuarter: counter('quarter', 'owner'),
    depOwnersDependedPerMonth: counter('month', 'owner'),

    depsByQuarter: counter('quarter', 'pkg'),
    depsByMonth: counter('month', 'pkg'),
    depsDependedPerQuarter: counter('quarter', 'pkg'),
    depsDependedPerMonth: counter('month', 'pkg')
  }
  const ownerIndex = await loadMap(path.join(__dirname, '..', 'owner-index.json.br'))
  start = new Date(start)
  const startString = daystring(start)
  end = (new Date(end)).getTime()
  while (start.getTime() < end) {
    const r = await month(start, db, ownerIndex)
    start = new Date(start.setMonth(start.getMonth()+1))
  }
  if (!outputDir) {
    outputDir = startString + '---' + daystring(end)
  }
  mkdirp.sync(outputDir)
  const serialize = async (gen, name) => {
    const buffer = Buffer.from(mkcsv(Array.from(gen)))
    const f = pj(outputDir, name + '.csv')
    await fs.writeFile(f, buffer)
    // await brotli(f, f + '.br')
  }
  for (let [name, cc] of Object.entries(db)) {
    console.log('serializing', name)
    await serialize(cc.objects(), name)
    await serialize(cc.unique(), name + 'Unique')
  }
  console.log('serializing maintainersByMonth')
  let csv1 = await fs.readFile(pj(outputDir, 'depOwnersDependedPerMonth.csv'))
  let csv2 = await fs.readFile(pj(outputDir, 'ownerReleasesByMonth.csv'))
  let merged = merge(csv1, csv2, 'dependedon', 'releases', { skipMissing: true })
  await fs.writeFile(pj(outputDir, 'maintainersByMonth.csv'), Buffer.from(merged))

  console.log('serializing maintainersByQuarter')
  csv1 = await fs.readFile(pj(outputDir, 'depOwnersDependedPerQuarter.csv'))
  csv2 = await fs.readFile(pj(outputDir, 'ownerReleasesByQuarter.csv'))
  merged = merge(csv1, csv2, 'dependedon', 'releases', { skipMissing: true })
  await fs.writeFile(pj(outputDir, 'maintainersByQuarter.csv'), Buffer.from(merged))
}

module.exports = run
module.exports.month = month
