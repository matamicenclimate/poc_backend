'use strict'

const algosdk = require('algosdk')
const { algoClient } = require(`${process.cwd()}/config/algorand`)
const algorandUtils = require(`${process.cwd()}/utils/algorand`)

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

async function calculate(ctx) {
  const { amount } = ctx.request.query
  const nftsToBurn = await getNFTsToBurn(amount)
  if (!nftsToBurn.length) {
    throw new Error('There are no nfts to burn')
  }
  const algodclient = algoClient()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  const suggestedParams = await algodclient.getTransactionParams().do()

  const assetsToCompensateFrom = nftsToBurn.map((item) => Number(item.asa_id))

  const burnParametersTxn = algosdk.makeApplicationCallTxnFromObject({
    from: creator.addr,
    appIndex: Number(process.env.APP_ID),
    // the atc appends the assets to the foreignAssets and passes the index of the asses in the appArgs
    appArgs: [algorandUtils.getMethodByName('burn_parameters').getSelector()],
    foreignApps: [Number(process.env.DUMP_APP_ID)],
    foreignAssets: assetsToCompensateFrom,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  const signedTxn = await burnParametersTxn.signTxn(creator.sk)

  return { txn: signedTxn, assets: assetsToCompensateFrom }
}

module.exports = { calculate }
async function getNFTsToBurn(amount) {
  const byLastInserted = 'id:desc'
  const nfts = await strapi.services.nfts.find({ status: 'swapped', _sort: byLastInserted })
  let totalAmountBurned = 0
  const nftsToBurn = nfts.filter((nft) => {
    if (amount > totalAmountBurned) {
      totalAmountBurned += nft.supply

      return nft
    }
    return false
  })
  return nftsToBurn
}
