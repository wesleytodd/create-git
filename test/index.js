'use strict'
const path = require('path')
const assert = require('assert')
const fs = require('fs-extra')
const opta = require('opta')
const { suite, test, before } = require('mocha')
const fixtures = require('fs-test-fixtures')
const createGit = require('../')

suite('create-git', () => {
  let fix
  before(() => {
    fix = fixtures()
  })

  test('init a git repo', async () => {
    await fix.setup()
    await createGit({
      cwd: fix.TMP,
      push: false,
      silent: true
    }, {
      promptor: () => {
        return async (prompts) => {
          return {
            primaryBranch: 'master',
            initialCommitMessage: 'test initial commit',
            remoteOrigin: 'git@github.com:wesleytodd/create-git.git',
            ignoreTemplates: prompts.find((p) => p.name === 'ignoreTemplates').default
          }
        }
      }
    })

    assert(await fs.pathExists(path.join(fix.TMP, '.git')))
    assert(fs.pathExists(path.join(fix.TMP, '.gitignore')))
    assert((await fs.readFile(path.join(fix.TMP, '.gitignore'), 'utf8')).includes('npm-debug.log*'))
    assert((await createGit.execGit(['--no-pager', 'log', '--oneline'], {
      cwd: fix.TMP
    })).stdout.includes('test initial commit'))
    assert((await createGit.execGit(['remote', '-v'], {
      cwd: fix.TMP
    })).stdout.includes('git@github.com:wesleytodd/create-git.git'))
  })

  test('init in an existing repo', async () => {
    await fix.setup()
    await createGit({
      cwd: fix.TMP,
      push: false,
      silent: true
    }, {
      promptor: () => {
        return async (prompts) => {
          return {
            primaryBranch: prompts.find((p) => p.name === 'primaryBranch').default,
            initialCommitMessage: 'test initial commit',
            remoteOrigin: 'git@github.com:wesleytodd/create-git.git',
            ignoreTemplates: prompts.find((p) => p.name === 'ignoreTemplates').default
          }
        }
      }
    })

    await createGit({
      cwd: fix.TMP,
      push: false,
      silent: true
    }, {
      promptor: () => {
        return async (prompts) => {
          return {
            primaryBranch: prompts.find((p) => p.name === 'primaryBranch').default,
            initialCommitMessage: 'test initial commit',
            remoteOrigin: 'git@github.com:wesleytodd/create-git.git',
            ignoreTemplates: prompts.find((p) => p.name === 'ignoreTemplates').default
          }
        }
      }
    })
  })

  test('switch to primary branch', async () => {
    await fix.setup()
    await createGit({
      cwd: fix.TMP,
      push: false,
      silent: true
    }, {
      promptor: () => {
        return async (prompts) => {
          return {
            primaryBranch: prompts.find((p) => p.name === 'primaryBranch').default,
            initialCommitMessage: 'test initial commit',
            remoteOrigin: 'git@github.com:wesleytodd/create-git.git',
            ignoreTemplates: prompts.find((p) => p.name === 'ignoreTemplates').default
          }
        }
      }
    })
  })

  test('should get remote origin default from package.json if it exists', async () => {
    await fix.setup()
    await fs.writeJson(path.join(fix.TMP, 'package.json'), {
      repository: {
        type: 'git',
        url: 'git@github.com:wesleytodd/create-git.git'
      }
    })
    await createGit({
      cwd: fix.TMP,
      push: false,
      silent: true
    }, {
      promptor: () => {
        return async (prompts) => {
          const remoteOriginPrompt = prompts.find((p) => p.name === 'remoteOrigin')
          assert.strictEqual(remoteOriginPrompt.name, 'remoteOrigin')
          assert.strictEqual(remoteOriginPrompt.default, 'git@github.com:wesleytodd/create-git.git')
          return {
            primaryBranch: prompts.find((p) => p.name === 'primaryBranch').default,
            initialCommitMessage: 'test initial commit',
            remoteOrigin: remoteOriginPrompt.default,
            ignoreTemplates: prompts.find((p) => p.name === 'ignoreTemplates').default
          }
        }
      }
    })

    assert((await createGit.execGit(['remote', '-v'], {
      cwd: fix.TMP
    })).stdout.includes('git@github.com:wesleytodd/create-git.git'))
  })

  test('plays well with others', async () => {
    const opts = opta({
      options: {
        // Add our additional prompts
        githubOrg: {
          prompt: {
            message: 'GitHub User/Org:'
          }
        },
        githubRepo: {
          prompt: {
            message: 'GitHub repo:'
          }
        },

        // Spread the options from createGit
        ...createGit.options,

        // Override createGit.options.remoteOrigin
        remoteOrigin: {
          ...createGit.options.remoteOrigin,
          prompt: {
            ...createGit.options.remoteOrigin.prompt,
            default: (promptInput, allInput) => {
              return `https://github.com/${allInput.githubOrg}/${allInput.githubRepo}`
            }
          }
        }
      }
    })

    await opts.prompt({
      promptor: () => {
        return async (prompts) => {
          const remoteOriginPrompt = prompts.find((p) => p.name === 'remoteOrigin')
          assert.strictEqual(prompts[0].name, 'githubOrg')
          assert.strictEqual(prompts[1].name, 'githubRepo')
          assert.strictEqual(remoteOriginPrompt.name, 'remoteOrigin')
          assert.strictEqual(remoteOriginPrompt.default({ githubOrg: 'foo', githubRepo: 'bar' }), 'https://github.com/foo/bar')
          return prompts.reduce((o, p) => {
            if (!p.when) {
              return o
            }
            o[p.name] = typeof p.default === 'function' ? p.default(o) : p.default || o[p.name]
            return o
          }, {
            githubOrg: 'foo',
            githubRepo: 'bar'
          })
        }
      }
    })()

    const o = opts.values({
      push: false,
      silent: true
    })
    assert.strictEqual(o.githubOrg, 'foo')
    assert.strictEqual(o.githubRepo, 'bar')
    assert.strictEqual(o.remoteOrigin, 'https://github.com/foo/bar')
  })
})
