const en = require('../../locales/en.json')
const es = require('../../locales/es.json')
const ko = require('../../locales/ko.json')
const fr = require('../../locales/fr.json')
const _ = require('lodash')

const locales = { en, es, ko, fr }

function getLocalized(languageKey, path) {
  return _.get(locales, `${languageKey}.${path}`)
}

String.prototype.format = function () {
  // store arguments in an array
  var args = arguments
  // use replace to iterate over the string
  // select the match and check if the related argument is present
  // if yes, replace the match with the argument
  return this.replace(/{([0-9]+)}/g, function (match, index) {
    // check if the argument is present
    return typeof args[index] == 'undefined' ? match : args[index]
  })
}

module.exports = getLocalized
