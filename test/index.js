'use strict'
// vim: set ft=javascript ts=2 sw=2:
const path = require('path')
const assert = require('assert')
const { describe, it, beforeEach } = require('mocha')
const shell = require('shelljs')
const fs = require('fs-extra')
const createGit = require('../')

const TMP_DIR = path.join(__dirname, 'fixtures', 'tmp')

describe('create git', () => {
  beforeEach(() => fs.remove(TMP_DIR))

  it('should initialize a git repo', async () => {
    await createGit({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      remoteOrigin: 'git@github.com:wesleytodd/create-git.git'
    })

    assert(await fs.pathExists(path.join(TMP_DIR, '.git')))
    assert(fs.pathExists(path.join(TMP_DIR, '.gitignore')))

    const out = await shell.exec(`git remote -v`, {
      cwd: TMP_DIR,
      silent: true
    })
    assert(out.stdout.includes('git@github.com:wesleytodd/create-git.git'))
  })

  it('should load existing .gitignore', async () => {
    // Write existing file
    await fs.ensureDir(TMP_DIR)
    await fs.writeFile(path.join(TMP_DIR, '.gitignore'), 'node_modules\ntest\n!test/test')

    await createGit({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      ignoreTemplates: []
    })

    assert(fs.pathExists(path.join(TMP_DIR, '.gitignore')))
    assert.strictEqual(await fs.readFile(path.join(TMP_DIR, '.gitignore'), 'utf8'), '# default\nnode_modules\ntest\n!test/test')
  })

  it('should download templates', async () => {
    // Write existing file
    await fs.ensureDir(TMP_DIR)

    await createGit({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      ignoreTemplates: [
        'Node.gitignore'
      ]
    })

    assert(fs.pathExists(path.join(TMP_DIR, '.gitignore')))
    assert((await fs.readFile(path.join(TMP_DIR, '.gitignore'), 'utf8')).includes('npm-debug.log*'))
  })

  it('should make initial commit', async () => {
    // Write existing file
    await fs.ensureDir(TMP_DIR)

    await createGit({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      initialCommitMessage: 'testing'
    })

    const out = await shell.exec('git --no-pager log --oneline', {
      cwd: TMP_DIR,
      silent: true
    })
    assert(out.stdout.includes('testing'))
  })

  it('should get remote origin default from package.json', async () => {
    // Write existing file
    await fs.ensureDir(TMP_DIR)
    await fs.writeJson(path.join(TMP_DIR, 'package.json'), {
      repository: {
        type: 'git',
        url: 'git@github.com:wesleytodd/create-git.git'
      }
    })

    await createGit({
      directory: TMP_DIR,
      prompt: false,
      silent: true
    })

    const out = await shell.exec('git remote -v', {
      cwd: TMP_DIR,
      silent: true
    })
    assert(out.stdout.includes('git@github.com:wesleytodd/create-git.git'))
  })
})
