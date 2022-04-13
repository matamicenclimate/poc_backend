'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

async function add(userDb, nft) {
  return await strapi.services.activities.create({
    date: new Date(),
    type: 'swap',
    user: userDb.id,
    nft,
    supply: nft.supply,
  })
}

module.exports = {
  add,
}
