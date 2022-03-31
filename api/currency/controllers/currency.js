'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const https = require('https')
const currencies = require('config').currencies

async function updateCurrencies(ctx) {
  const url = `${process.env.CURRENCY_API}&symbols=${currencies.join(',')}`

  https.get(url, (res) => {
    let data = ''

    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', async () => {
      const exchange = JSON.parse(data)
      const currencyData = {}

      currencies.forEach((currency) => {
        currencyData[`usd_${currency.toLowerCase()}`] = exchange.rates[currency]
      })

      await strapi.services.currency.createOrUpdate(currencyData)
      strapi.log.info('[cron] Currencies updated')
    })
  })
}

module.exports = {
  updateCurrencies,
}
