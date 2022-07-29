'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

const {algoIndexer} = require("../../../config/algorand");
const algosdk = require("algosdk");


module.exports = {
  lifecycles: {
    // Called before an entry is created
    beforeCreate: async function (data) {
      data.burnWillTimeoutOn = Date.now()
      data.supply_remaining = data.supply
    },
    beforeUpdate: async function (params, newNFT) {
      const { _id } = params
      const oldNft = await strapi.services.nfts.findOne({ _id })
      if (oldNft.id !== _id) throw new Error(`NFT not found with id: ${_id}`)
      const changeListKeys = Object.keys(newNFT)
      for (const key of changeListKeys) {

        const isStatusChange = key === "status"
        const isBurnTimeoutChange = key === "burnWillTimeoutOn"
        const isSupplyRemainingChange = key === "supply_remaining"

        if (isStatusChange || isBurnTimeoutChange) continue;
        // If the supply_remaining is updated, check if the change is correct in the blockchain
        if (isSupplyRemainingChange) {
          const indexerClient = algoIndexer()
          const NFTHoldings = await indexerClient.lookupAssetBalances(Number(oldNft.asa_id)).do()
          const vaultAddress = algosdk.getApplicationAddress(Number(process.env.APP_ID))
          const vaultHoldings = NFTHoldings.balances.filter(accountHoldings => accountHoldings.address === vaultAddress)[0]
          if (vaultHoldings.amount !== Number(newNFT[key])) console.warn("Attempting to update supply_remaining with incorrect value according to the indexer. Using indexer data instead.")
          newNFT[key] = vaultHoldings.amount
          continue
        }
        // Deny any other change
        delete newNFT[key]
      }
    }
  },
}
