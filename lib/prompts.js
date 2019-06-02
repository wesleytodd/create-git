'use strict'
// vim: set ft=javascript ts=2 sw=2:
const inquirer = require('inquirer')
const arrayFromList = require('./array-from-list')

module.exports = async function prompt (opts = {}, options = {}) {
  if (opts.noPrompt === true) {
    return opts
  }

  const answers = await inquirer.prompt([{
    name: 'initialCommitMessage',
    message: 'Initial commit message (leave empty for no commit):',
    default: opts.initialCommitMessage,
    when: !options.initialCommitMessage
  }, {
    name: 'remoteOrigin',
    message: 'Set remote origin:',
    default: opts.remoteOrigin,
    when: !options.remoteOrigin
  }, {
    name: 'ignoreTemplates',
    message: 'Ignore templates',
    default: options.ignoreTemplates || ['Node.gitignore'],
    when: !options.ignoreTemplate,
    type: 'checkbox',
    choices: [{
      name: 'Node',
      value: 'Node.gitignore'
    }, {
      name: 'Sass',
      value: 'Sass.gitignore'
    }, {
      name: 'Vue',
      value: 'community/Vue.gitignore'
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
  }, {
    name: 'additionalRules',
    message: 'Additional git ignores:',
    default: opts.additionalRules,
    when: !options.additionalRules,
    filter: arrayFromList
  }])

  // Merge answers into opts
  return Object.assign({}, opts, answers)
}
