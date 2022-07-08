'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

const mailer = require(`${process.cwd()}/utils/mailer`)

module.exports = {
  lifecycles: {
    afterCreate: async function (result) {
      await strapi.services.activities.create({
        type: 'burn',
        group_id: result.txnId,
        txn_id: result.txnId,
        is_group: true,
        supply: result.amount,
        user: result.user.id,
        date: new Date(),
      })
      const burnReceipt = {}
      let amountToBurn = result.amount
      for (const nft of result.nfts) {
        const nftFound = await strapi.services.nfts.findOne({id: nft.id})
        if (nftFound.id === nft.id) {
          if (amountToBurn.greaterThanOrEqual(nftFound.supply_remaining)) {
            burnReceipt[nftFound.asa_id.toInt()] = nftFound.supply_remaining.toInt()
            amountToBurn = amountToBurn.subtract(nftFound.supply_remaining)
            await strapi.services.nfts.update({ id: nft.id }, { status: 'burned', supply_remaining: 0, burnWillTimeoutOn: Date.now() })
            continue
          }

          burnReceipt[nftFound.asa_id.toInt()] = amountToBurn.toInt()
          const finalSupply = nftFound.supply_remaining.subtract(amountToBurn)
          await strapi.services.nfts.update({ id: nft.id }, { supply_remaining: finalSupply, burnWillTimeoutOn: Date.now() })
        } else {
          const collectionName = 'compensations'
          const applicationUid = strapi.api[collectionName].models[collectionName].uid
          const url = `${process.env.BASE_URL}${process.env.CONTENT_MANAGER_URL}/${applicationUid}/${result.id}`
          const mailContent = `Compensation cannot be finished(${url}). Nft ${nft.id} not found`
          await mailer.send('Compensation Failed', mailContent)
          throw new Error(`Nft with id ${nft.id} Not Found`)
        }
      }

      await strapi.services.compensations.update({ id: result.id }, { burn_receipt: burnReceipt })

      /**
       * Handle compensation request notification email
       */
      const collectionName = 'compensations'
      const applicationUid = strapi.api[collectionName].models[collectionName].uid
      const url = `${process.env.BASE_URL}${process.env.CONTENT_MANAGER_URL}/${applicationUid}/${result.id}`
      const mailContent = `A new compensation request has been made.<br>Available here: ${url}`
      await mailer.send('New compensation', mailContent)
    },
  },
}
