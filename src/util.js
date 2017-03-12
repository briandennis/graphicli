const chalk = require('chalk')
const fs = require('fs')
const path = require('path')

exports.DEFAULT_CONFIG = { timeout: 10000, headers: {} }

exports.encode = query => `"${query.replace(/\s/ig, '').replace(/"/ig, `\\"`).toString()}"`

exports.readFile = (path) =>
  new Promise((resolve, reject) =>
    fs.readFile(path, 'utf8', (err, data) =>
      err ? reject(err) : resolve(data)))

exports.checkPath = (path) =>
  new Promise((resolve, reject) =>
    fs.stat(path, (err, stats) =>
      err ? reject(err) : resolve(path)))

const pullHeaders = (header) => {
  if (!header) return undefined
  if (typeof header === 'string') {
    const [key, value] = header.split('=')
    return { [key]: value }
  }
  return header.reduce((accum, next) => {
    const [key, value] = next.split('=')
    accum[key] = value
    return accum
  }, {})
}

// JSON.parse(JSON.stringify(obj)) removes undefined keys
exports.flagsToOptions = ({baseUrl, schema, header}) =>
  JSON.parse(JSON.stringify({
    baseURL: Array.isArray(baseUrl) ? baseUrl[0] : baseUrl,
    schema: Array.isArray(schema) ? schema[0] : schema,
    headers: pullHeaders(header)
  }))

exports.correctURL = (url) => {
  if (/(https?:\/\/)[\w-]+(\.[a-z-]+)+\.?(:\d+)?(\/\S*)?/gi.test(url)) return url
  if (/[\w-]+(\.[a-z-]+)+\.?(:\d+)?(\/\S*)?/gi.test(url)) return `https://${url}`
  throw new Error('Your `baseURL` must be a valid URL.')
}

exports.colorResponse = (res) =>
  `\n${JSON.stringify(res, null, 2)
    .replace(/errors/i, chalk.red.bold('$&'))
    .replace(/data/i, chalk.green.bold('$&'))
    .replace(/\\"/ig, `"`)
    .replace(/Did you mean ".+?"/ig, chalk.yellow.bold('$&'))}\n`

exports.errorMessage = (e) => {
  switch (e.code) {
    case 'MODULE_NOT_FOUND': return `
Schema not found. Trying running \`${chalk.yellow.bold('gest --schema ./path/to/schema.js')}\`
or with \`schema.js\` in the current working directory.
`
    default: return e
  }
}

exports.findFiles = function (regex = /.*.(query|graphql)/i) {
  const check = (name, file) => {
    const newFile = path.join(name, file)
    if (file === 'node_modules' || file === '.git') return
    return new Promise((resolve, reject) => {
      fs.stat(newFile, (err, stats) => {
        if (err) return reject(err)
        if (stats && stats.isDirectory()) return resolve(readDir(newFile))
        if (regex.exec(newFile)) return resolve(newFile)
        return resolve()
      })
    })
  }

  const readDir = (name) =>
    new Promise((resolve, reject) =>
      fs.readdir(name, (err, files) =>
        err ? reject(err) : resolve(Promise.all(
          files.map(check.bind(null, name))
        )))).then(values =>
          values.reduce((x, y) => x.concat(y), [])
                .filter(value => value))

  return readDir(process.cwd())
}

// return resolve(Promise.all(
//   files.map(f => new Promise((resolve, reject) => {
//     if (regex.exec(f)) {
//       return resolve(f)
//     }
    // fs.stat(f, (err, stats) => {
    //   if (err) return reject(err)
    //   // if (stats && stats.isDirectory()) return resolve(readDir(f))
    //   if (regex.exec(f)) {
    //     return resolve(f)
    //   }
    // })
