'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

const { algoClient } = require(`${process.cwd()}/config/algorand`)
const algosdk = require('algosdk')
const algorandUtils = require(`${process.cwd()}/utils/algorand`)
const ALGORAND_ENUMS = require(`${process.cwd()}/utils/enums/algorand`)

async function emitClimateCoinToken() {
  const algodclient = algoClient()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  const assetOptions = algorandUtils.getAssetOptions(creator, true, process.env.CLIMATECOIN_ASA_TOTAL_SUPPLY)
  const assetConfig = await algorandUtils.getAssetConfig(algodclient, ALGORAND_ENUMS.DEFAULT, assetOptions)
  // @TODO: get metadata (ARC-0003?)

  const unsignedTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    ...assetConfig,
    from: creator.addr,
  })

  const signedTxn = unsignedTxn.signTxn(creator.sk)
  const txnId = unsignedTxn.txID().toString()

  await algodclient.sendRawTransaction(signedTxn).do()
  const confirmedTxn = await algosdk.waitForConfirmation(algodclient, txnId, 4)

  const climateCoinTokenData = {
    climatecoin_asa_id: confirmedTxn['asset-index'],
    climatecoin_asa_txn_id: txnId,
    climatecoin_algoexplorer_url: `https://testnet.algoexplorer.io/tx/${txnId}`,
  }
  const climateCoinToken = await strapi.services['app-config'].createOrUpdate(climateCoinTokenData)

  return climateCoinToken
}

module.exports = {
  emitClimateCoinToken,
}
