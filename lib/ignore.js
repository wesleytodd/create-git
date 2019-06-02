'use strict'
const parseIgnore = require('parse-gitignore')

parseIgnore.parse = (input, fn = line => line) => {
  let lines = input.toString().split(/\r?\n/)
  let section = { name: 'default', patterns: [] }
  let state = { patterns: [], sections: [section] }

  for (let line of lines) {
    if (line.charAt(0) === '#') {
      section = { name: line.slice(1).trim(), patterns: [] }
      state.sections.push(section)
      continue
    }

    if (line.trim() !== '') {
      let pattern = fn(line, section, state)
      section.patterns.push(pattern)
      state.patterns.push(pattern)
    }
  }
  return state
}

module.exports.format = parseIgnore.format

module.exports.stringify = function (state) {
  return parseIgnore.stringify(state.sections, (section) => {
    if (!section.patterns.length) {
      return ''
    }

    return `# ${section.name}\n${section.patterns.join('\n')}\n\n`
  })
}

module.exports.parse = function (input, fn) {
  const state = parseIgnore.parse(input, fn)

  state.concat = (i) => {
    const newState = parseIgnore.parse(i, fn)

    for (let s2 in newState.sections) {
      const sec2 = newState.sections[s2]

      let sectionExists = false
      for (let s1 in state.sections) {
        const sec1 = state.sections[s1]

        // Join sections under common name
        if (sec1.name === sec2.name) {
          sectionExists = true
          sec1.patterns = Array.from(new Set(sec1.patterns.concat(sec2.patterns)))
        }
      }

      // Add new section
      if (!sectionExists) {
        state.sections.push(sec2)
      }
    }

    return state
  }

  return state
}
