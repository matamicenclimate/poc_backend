'use strict'

module.exports = {
  initTimeout: 60 * 60 * 1000,
  fileSize: {
    max: 6000,
  },
  info: {
    collections: [
      'registries',
      'project-types',
      'sdgs',
      'types',
      'sub-types',
      'methodologies',
      'validators',
      'first-verifiers',
      'standards',
      'countries',
    ],
  },
  registry: {
    defaultInstructions: 'Default instructions',
  },
  currencies: ['USD', 'EUR', 'JPY', 'GBP', 'BTC'],
}
