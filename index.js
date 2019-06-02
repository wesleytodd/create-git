'use strict'
const path = require('path')
const axios = require('axios')
const shell = require('shelljs')
const fs = require('fs-extra')
const parseIgnore = require('./lib/ignore')
const prompt = require('./lib/prompts')

module.exports = async function createGit (input = {}) {
  // We need this for the defaults
  const cwd = process.cwd()

  // Removed undefined values from input and default some options
  const options = Object.keys(input).reduce((o, key) => {
    if (typeof input[key] !== 'undefined') {
      o[key] = input[key]
    }
    return o
  }, {
    extended: false
  })

  // Defaults
  let opts = Object.assign({
    directory: cwd,
    silent: false
  }, options)

  // Path to the gititnore
  const gitignorePath = path.join(opts.directory, '.gitignore')

  // Load existing .gitignore
  let existingIgnoreStr
  let existingIgnore
  if (opts.ignoreExisting) {
    try {
      existingIgnoreStr = await fs.readFile(gitignorePath, 'utf8')
      existingIgnore = parseIgnore.parse(existingIgnoreStr)
    } catch (e) {
      // ignore
    }
  }

  // prompt input
  opts = await prompt(opts, options)

  // Merge existing ignore with new ignore
  let ignoreRules = existingIgnore || parseIgnore.parse('')

  // Load templates
  for (var i in opts.ignoreTemplates) {
    try {
      const url = `https://raw.githubusercontent.com/github/gitignore/master/${opts.ignoreTemplates[i]}`
      const resp = await axios.get(url)

      // Join sections
      ignoreRules.concat(resp.data)
    } catch (e) {
      console.error('Unable to load template', e)
    }
  }

  // Merge custom rules
  if (opts.additionalRules && opts.additionalRules.length) {
    ignoreRules.concat(opts.additionalRules)
  }

  // Create directory and init git
  await fs.ensureDir(path.join(opts.directory))
  await shell.exec(`git init`, {
    cwd: opts.directory,
    silent: opts.silent
  })

  if (opts.remoteOrigin) {
    await shell.exec(`git remote add origin ${opts.remoteOrigin}`, {
      cwd: opts.directory,
      silent: opts.silent
    })
  }

  // Write gitignore
  await fs.writeFile(gitignorePath, parseIgnore.stringify(ignoreRules))

  if (opts.initialCommitMessage) {
    await shell.exec(`git add .`, {
      cwd: opts.directory,
      silent: opts.silent
    })
    await shell.exec(`git commit -am "${opts.initialCommitMessage}"`, {
      cwd: opts.directory,
      silent: opts.silent
    })
  }
}
