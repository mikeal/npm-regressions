#!/usr/bin/env node
const pull = require('./lib/pull')
const mkdirp = require('mkdirp')
const brotli = require('brotli-max')
const path = require('path')

const options = yargs => {
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
    const results = await pull(start)
    const filename = filepath(start)
    mkdirp.sync(path.dirname(filename))
    const buffer = Buffer.from(JSON.stringify(results)) 
    await brotli(buffer, filename)
    console.log({filename, b: buffer.length})
    start += oneday
  }
}

const yargs = require('yargs')
const args = yargs
  .command('day <day>', 'Output the regression for a single day.', options, runDay)
  .command('pull <start> <end>', 'Pull data and write regression.', options, runPull)
  .argv

if (!args._.length) {
  yargs.showHelp()
}

