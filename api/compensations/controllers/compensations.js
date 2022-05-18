'use strict'

const algosdk = require('algosdk')
const { algoClient } = require(`${process.cwd()}/config/algorand`)
const algorandUtils = require(`${process.cwd()}/utils/algorand`)

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

async function calculate(ctx) {
  const { amount, nfts } = ctx.request.query

  const algodclient = algoClient()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  const suggestedParams = await algodclient.getTransactionParams().do()

  const assetsToCompensateFrom = nfts.map((item) => Number(item))

  /* TODO:
    assetsToCompensateFrom should come from the DB
    we have to select the worst ones. (by date or creation)
  */

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

  return signedTxn
}

module.exports = { calculate }
