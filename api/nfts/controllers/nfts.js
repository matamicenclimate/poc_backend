'use strict';
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

async function burn (ctx) {
  try {
    const nft = await strapi.services['nfts'].findOne({ id: ctx.params.id })
    if (nft.status === 'swapped') {
      return await strapi.services['nfts'].update({ id: ctx.params.id }, { status: 'burned' })
    } else {
      throw new Error(`Invalid nft status`)
    }
  } catch (error) {
    strapi.log.error(error)
    return { status: error.status, message: error.message }
  }
}

module.exports = {
  burn
};
