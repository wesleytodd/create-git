# Create Git Project

[![NPM Version](https://img.shields.io/npm/v/create-git.svg)](https://npmjs.org/package/create-git)
[![NPM Downloads](https://img.shields.io/npm/dm/create-git.svg)](https://npmjs.org/package/create-git)
[![test](https://github.com/wesleytodd/create-git/workflows/Test/badge.svg)](https://github.com/wesleytodd/create-git/actions?query=workflow%3ATest)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/standard/standard)

A generator to initialize a project with git.

Features

- Initalize git repo
- Create .gitignore from templates
- Setup a remote origin
- Create first commit
- Push to repo

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
create-git

initalize a git repo

Options:
  --help                        Show help                              [boolean]
  --version                     Show version number                    [boolean]
  --cwd, -d                     Directory to run in     [default: process.cwd()]
  --primary-branch, -b          Primary branch for repo [string] [default: main]
  --initial-commit-message, -m  Message for initial commit              [string]
  --remote-origin, -o           Git remote origin                       [string]
  --ignore-templates, -t        Ignore templates from
                                github.com/github/gitignore
                                                       [default: Node.gitignore]
  --additional-rules            comma separated list of ignore lines    [string]
  --ignore-existing             Ignore existing .gitignore and package.json
                                files                           [default: false]
  --commit-all                  Commit all files (not just the new .gitignore
                                                       [boolean] [default: true]
  --push                        Push to remote origin when complete
                                                       [boolean] [default: true]
```

### Programmatic Usage

```javascript
const createGit = require('create-git')

await createGit({
  primartBranch: 'main',
  ignoreExisting: false,
  initialCommitMessage: '',
  remoteOrigin: '', // Will also load from the package.json repository field
  ignoreTemplates: ['Node.gitignore'],
  additionalRules: [],
  push: true,
  commitAll: true
})
```

#### Composition with other `create-*` packages

This generator is built on top of `opta`, a helper library for collecting
user input from multiple interfaces: CLI via `yargs`, interactive prompts via `inquirer`
and via a JS interface.  To compose with other `opta` based input collection,
you can use `.options` to access the cli/prompt/js configurations.

```javascript
const createGit = require('create-git')
const opta = require('opta')

// My wrapper which asks github username and repo to
// generate the `remoteOrigin`
const opts = opta({
  commandDescription: 'Create github repo',
  options: {
    // Spread the options from createGit
    ...createGit.options,

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

    // Override createGit.options.remoteOrigin
    remoteOrigin: {
      ...createGit.options.remoteOrigin,
      default: (promptInput, allInput) => {
        return `https://github.com/${allInput.githubOrg}/${allInput.githubRepo}`
      }
    }
  }
})

// Our generator main
module.exports = async function (input) {
  // Add our input as overrides on the opta instance
  options.overrides(input)

  // Prompt the user,
  // by overriding remoteOrigin's default above
  // it will now ask for the org and repo first,
  // then set the default for the remote origin
  // based on that input
  await options.prompt()

  // Get the current values from the opta instance
  let opts = options.values()

  // Call create git
  await createGit(opts)
}
```

For more information check out the [docs for `opta`](https://www.npmjs.com/package/opta).
