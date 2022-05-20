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
  const user = ctx.state.user

  const nftsToBurn = await getNFTsToBurn(amount)
  if (!nftsToBurn.length) {
    throw new Error('There are no nfts to burn')
  }
  const algodclient = algoClient()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  const suggestedParams = await algodclient.getTransactionParams().do()

  const assetsToCompensateFrom = nftsToBurn.map((item) => Number(item.asa_id))
  const nftIds = nftsToBurn.map((item) => item.id)

  const climatecoinTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: user.publicAddress,
    assetIndex: Number(process.env.CLIMATECOIN_ASA_ID),
    to: algosdk.getApplicationAddress(Number(process.env.APP_ID)),
    amount: Number(amount),
    suggestedParams,
  })
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

  const burnTxn = algosdk.makeApplicationCallTxnFromObject({
    from: user.publicAddress,
    appIndex: Number(process.env.APP_ID),
    appArgs: [algorandUtils.getMethodByName('burn_climatecoins').getSelector()],
    foreignAssets: assetsToCompensateFrom,
    accounts: [algosdk.getApplicationAddress(Number(process.env.DUMP_APP_ID))],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  const burnGroupTxn = [climatecoinTransferTxn, burnParametersTxn, burnTxn]
  const [transfer, params, burn] = algosdk.assignGroupID(burnGroupTxn)

  const encodedTransferTxn = algosdk.encodeUnsignedTransaction(transfer)
  const encodedBurnTxn = algosdk.encodeUnsignedTransaction(burn)

  const signedTxn = await params.signTxn(creator.sk)

  return {
    address: user.publicAddress,
    amount: Number(amount),
    assets: assetsToCompensateFrom,
    nftIds,
    txn: signedTxn,
    encodedTransferTxn,
    encodedBurnTxn,
  }
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
