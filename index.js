'use strict'
const path = require('path')
const { promisify } = require('util')
const cp = require('child_process')
const execFile = promisify(cp.execFile)
const opta = require('opta')
const parseList = require('safe-parse-list')
const fs = require('fs-extra')
const got = require('got')
const parseIgnore = require('./lib/ignore')

function initOpts () {
  return opta({
    commandDescription: 'Initalize a git repo',
    options: {
      cwd: {
        description: 'Directory to run in',
        prompt: false,
        flag: {
          alias: 'd',
          defaultDescription: 'process.cwd()'
        }
      },
      primaryBranch: {
        description: 'Primary branch for repo',
        type: 'string',
        flag: {
          key: 'primary-branch',
          alias: 'b',
          defaultDescription: 'main'
        },
        prompt: {
          message: 'Primary branch:',
          default: 'main'
        }
      },
      initialCommitMessage: {
        description: 'Message for initial commit',
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
        description: 'Git remote origin',
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
        description: 'Ignore templates from github.com/github/gitignore',
        flag: {
          key: 'ignore-templates',
          alias: 't',
          defaultDescription: 'Node.gitignore'
        },
        prompt: {
          message: 'Ignore templates',
          type: 'checkbox',
          default: ['Node.gitignore'],
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
        }
      },
      additionalRules: {
        description: 'Additional ignore rules to append to .gitignore',
        type: 'string',
        prompt: {
          message: 'Additional git ignores:',
          filter: parseList
        },
        flag: {
          key: 'additional-rules',
          description: 'comma separated list of ignore lines'
        }
      },
      ignoreExisting: {
        description: 'Ignore existing .gitignore and package.json files',
        prompt: false,
        flag: {
          key: 'ignore-existing',
          defaultDescription: 'false'
        }
      },
      commitAll: {
        description: 'Commit all files (not just the new .gitignore',
        type: 'boolean',
        prompt: false,
        flag: {
          key: 'commit-all',
          defaultDescription: 'true'
        }
      },
      push: {
        description: 'Push to remote origin when complete',
        type: 'boolean',
        prompt: false,
        flag: {
          defaultDescription: 'true'
        }
      }
    }
  })
}

module.exports = main
async function main (input, _opts = {}) {
  const options = initOpts()
  options.overrides({
    cwd: input.cwd || process.cwd()
  })
  options.overrides(input)
  let opts = options.values()

  const gitignorePath = path.join(opts.cwd, '.gitignore')

  // Load existing .gitignore
  let existingIgnoreStr
  let existingIgnore
  if (opts.ignoreExisting !== false) {
    try {
      existingIgnoreStr = await fs.readFile(gitignorePath, 'utf8')
      existingIgnore = parseIgnore.parse(existingIgnoreStr)
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e
      }
    }
    try {
      const pkg = await fs.readJSON(path.join(opts.cwd, 'package.json'))
      if (pkg && pkg.repository && pkg.repository.type === 'git' && typeof pkg.repository.url === 'string') {
        options.defaults({
          remoteOrigin: pkg.repository.url
        })
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e
      }
    }
  }

  // Merge existing ignore with new ignore
  const ignoreRules = existingIgnore || parseIgnore.parse('')

  await options.prompt({
    promptor: _opts.promptor
  })()
  opts = options.values()

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
  await fs.ensureDir(opts.cwd)
  await git(['init'], { cwd: opts.cwd })

  // Switch to primary branch
  const currentBranch = (await git(['branch', '--show-current'], { cwd: opts.cwd })).stdout.trim()
  if (currentBranch && currentBranch !== opts.primaryBranch) {
    await git(['checkout', '-b', opts.primaryBranch], { cwd: opts.cwd })
  }

  if (opts.remoteOrigin) {
    try {
      await git(['remote', 'add', 'origin', opts.remoteOrigin], {
        cwd: opts.cwd
      })
    } catch (e) {
      // If remote already exists, test if it is the same, if so, move on, else throw
      if (e.stderr === 'fatal: remote origin already exists.\n') {
        const url = (await git(['remote', 'get-url', 'origin'], {
          cwd: opts.cwd
        })).stdout.trim()
        if (url !== opts.remoteOrigin) {
          throw new Error(`remote origin already exists and points somwhere else: ${url}`)
        }
      } else {
        throw e
      }
    }
  }

  // Write gitignore
  await fs.writeFile(gitignorePath, parseIgnore.stringify(ignoreRules))

  if (opts.initialCommitMessage) {
    if (opts.commitAll !== false) {
      await git(['add', '.'], {
        cwd: opts.cwd
      })
    } else {
      await git(['add', gitignorePath], {
        cwd: opts.cwd
      })
    }
    try {
      await git(['commit', '-m', opts.initialCommitMessage], {
        cwd: opts.cwd
      })
    } catch (e) {
      if (e.stdout.includes('nothing to commit')) {
        // Ignore error, but log
        console.error('No changes to commit, skipping commit')
      } else {
        throw e
      }
    }
  }

  if (opts.push !== false) {
    await git(['push'], {
      cwd: opts.cwd
    })
  }
}

module.exports.options = initOpts().options
module.exports.cli = function () {
  return initOpts().cli((yargs) => {
    yargs.command('$0', 'initalize a git repo', () => {}, main)
  })
}

module.exports.execGit = git
async function git (args, opts) {
  try {
    const ret = await execFile('git', args, opts)
    return ret
  } catch (e) {
    Error.captureStackTrace(e, git)
    e.message = `${e.message}${e.stdout}${e.stderr}`
    throw e
  }
}
