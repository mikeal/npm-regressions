#!/usr/bin/env node
const { execSync } = require('child_process')
const pull = require('./lib/pull')
const mkdirp = require('mkdirp')
const monthly = require('./lib/monthly')
const csv = require('./lib/csv')
const brotli = require('brotli-max')
const path = require('path')

const options = yargs => {
  yargs.option('local', {
    desc: 'Local directory containing minimized files.',
    default: false
  })
}

const runDay = async argv => {
  let results = await pull(argv.day)
  console.log(results)
}

const filepath = ts => {
  ts = new Date(ts)
  return pull.filename(ts)
}

const oneday = 1000 * 60 * 60 * 24

const runPull = async argv => {
  let start = (new Date(argv.start)).getTime()
  const end = (new Date(argv.end)).getTime()
  while (start <= end) {
    const filename = filepath(start)
    const results = await pull(start, argv.local)
    start += oneday
    if (results === null) {
      console.log('skipping', start)
      continue
    }
    mkdirp.sync(path.dirname(filename))
    const buffer = Buffer.from(JSON.stringify(results)) 
    await brotli(buffer, filename)
    console.log({filename, b: buffer.length})
  }
}

const runDaily = async argv => {
  argv.start = Date.now() - (oneday * 3)
  argv.end = Date.now() - oneday
  runPull(argv)
}
const runMonthly = async argv => {
  const ts = new Date(Date.now() - (oneday * 5))
  const [year, month] = ts.toISOString().split('-')
  execSync('git lfs install')
  execSync(`git lfs pull --include "${year + '/' + month}"`)
  await monthly(year, month)
}

const runAllMonths = async argv => {
  return monthly.all()
}

const runCSV = async argv => {
  const str = await csv(argv.month)
}

const yargs = require('yargs')
const args = yargs
  .command('day <day>', 'Output the regression for a single day.', options, runDay)
  .command('pull <start> <end>', 'Pull data and write regression.', options, runPull)
  .command('daily-action', 'Daily regression action.', options, runDaily)
  .command('monthly-action', 'Monthly regression action.', options, runMonthly)
  .command('all-months', 'Run montly regressions for everyday.', options, runAllMonths)
  .command('csv <month>', "Create CSV's from monthly regressions", options, runCSV)
  .argv

if (!args._.length) {
  yargs.showHelp()
}

