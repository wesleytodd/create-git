# Create Git Project

[![NPM Version](https://img.shields.io/npm/v/create-git.svg)](https://npmjs.org/package/create-git)
[![NPM Downloads](https://img.shields.io/npm/dm/create-git.svg)](https://npmjs.org/package/create-git)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/standard/standard)

A generator to initialize a project with git.

Features

- Initalize git repo
- Create .gitignore from templates
- Setup a remote origin
- Create first commit

## Usage

```
$ npm init git

# or

$ npx create-git

# or

$ npm install -g create-git
$ create-git
```

### CLI Usage

```
$ create-git --help
  Usage: create-git [options] <directory>

  Options:
    -V, --version                output the version number
    --silent                     Surpress output
    --no-prompt                  Skip prompts and just use input options
    --ignore-existing            Ignore existing package.json
    -m --initial-commit-message  The initial commit message
    -o --origin                  Set the remote origin
    -t --templates               Ignor templates to load
    -h, --help                   output usage information
```

### Programmatic Usage

```javascript
const createGit = require('create-git')

;(async () => {
  await createGit({
    ignoreExisting: false,
    initialCommitMessage: '',
    remoteOrigin: '',
    ignoreTemplates: 'Node.gitignore'
  })
})()
```
