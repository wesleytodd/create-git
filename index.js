'use strict'
const create = require('@pkgjs/create')
const path = require('path')
const got = require('got')
const shell = require('shelljs')
const fs = require('fs-extra')
const parseList = require('safe-parse-list')
const parseIgnore = require('./lib/ignore')

module.exports = create({
  commandDescription: 'Initalize a git repo',
  options: {
    initialCommitMessage: {
      type: 'string',
      flag: {
        key: 'initial-commit-message',
        alias: 'm'
      },
      prompt: {
        message: 'Initial commit message (leave empty for no commit):'
      }
    },
    remoteOrigin: {
      type: 'string',
      flag: {
        key: 'remote-origin',
        alias: 'o'
      },
      prompt: {
        message: 'Set remote origin:'
      }
    },
    ignoreTemplates: {
      default: ['Node.gitignore'],
      flag: {
        key: 'ignore-templates',
        alias: 't'
      },
      prompt: {
        message: 'Ignore templates',
        type: 'checkbox',
        choices: [{
          name: 'Node',
          value: 'Node.gitignore'
        }, {
          name: 'Sass',
          value: 'Sass.gitignore'
        }, {
          name: 'Vue',
          value: 'community/JavaScript/Vue.gitignore'
        }, {
          name: 'MacOs',
          value: 'Global/macOS.gitignore'
        }, {
          name: 'Linux',
          value: 'Global/Linux.gitignore'
        }, {
          name: 'Windows',
          value: 'Global/Windows.gitignore'
        }, {
          name: 'Vim',
          value: 'Global/Vim.gitignore'
        }, {
          name: 'Emacs',
          value: 'Global/Emacs.gitignore'
        }]
      },
      additionalRules: {
        type: 'string',
        prompt: {
          message: 'Additional git ignores:',
          filter: parseList
        }
      },
      ignoreExisting: {
        type: 'boolean',
        prompt: false,
        flag: {
          key: 'ignore-existing'
        }
      }
    }
  }
}, async function creategit (initOpts) {
  const opts = await initOpts()

  // Path to the gititnore
  const gitignorePath = path.join(opts.directory, '.gitignore')

  // Load existing .gitignore
  let existingIgnoreStr
  let existingIgnore
  if (opts.ignoreExisting !== false) {
    try {
      existingIgnoreStr = await fs.readFile(gitignorePath, 'utf8')
      existingIgnore = parseIgnore.parse(existingIgnoreStr)
    } catch (e) {
      // ignore
    }
  }

  // Load git url from package.json
  const pkgJsonPath = path.join(opts.directory, 'package.json')
  if (!opts.remoteOrigin && await fs.pathExists(pkgJsonPath)) {
    const pkg = await fs.readJson(pkgJsonPath, { throws: false })
    if (pkg && pkg.repository && pkg.repository.type === 'git' && pkg.repository.url) {
      opts.remoteOrigin = pkg.repository.url
    }
  }

  // Merge existing ignore with new ignore
  const ignoreRules = existingIgnore || parseIgnore.parse('')

  // Load templates
  for (const i in opts.ignoreTemplates) {
    try {
      const url = `https://raw.githubusercontent.com/github/gitignore/master/${opts.ignoreTemplates[i]}`
      const resp = await got(url)

      // Join sections
      ignoreRules.concat(resp.body)
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
  await shell.exec('git init', {
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
    await shell.exec('git add .', {
      cwd: opts.directory,
      silent: opts.silent
    })
    await shell.exec(`git commit -am "${opts.initialCommitMessage}"`, {
      cwd: opts.directory,
      silent: opts.silent
    })
  }
})
