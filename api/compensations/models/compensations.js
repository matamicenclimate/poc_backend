'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

 module.exports = {
  lifecycles: {
    afterCreate: async function (result) {
      
      await strapi.services.activities.create({ type: 'burn' }, { txnId: result.txnId })
      const promises = result.nfts.map(async(nft) => {
        return strapi.services.nfts.update({ id: nft.id }, { status: 'burned' })
      })
      await Promise.all(promises)
    },
  },
}
