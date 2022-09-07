const en = require('../../locales/en.json')
const es = require('../../locales/es.json')
const ko = require('../../locales/ko.json')
const fr = require('../../locales/fr.json')
const _ = require('lodash')

const locales = { en, es, ko, fr }

function getLocalized(languageKey, path) {
  return _.get(locales, `${languageKey || 'en'}.${path}`)
}

module.exports = getLocalized
