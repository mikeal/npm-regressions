const { load } = require('./pull')

const oneday = 1000 * 60 * 60 * 24

const run = async (local=false) => {
  let start = Date.now()
  const end = (new Date('2010/11/09')).getTime()
  const db = new Map() 
  while (start >= end) {
    console.log('load', new Date(start))
    const data = await load(start)
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        let [pkg, version] = key.split('|')
        if (!db.has(pkg)) {
          db.set(pkg, value.owners)
        }
      }
    }
    start -= oneday
  }
  console.log('size', db.size)
  return db
}

module.exports = run
