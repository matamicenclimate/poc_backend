'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

const mailer = require(`${process.cwd()}/utils/mailer`)
const algosdk = require("algosdk");
const {algoClient} = require("../../../config/algorand");
const algorandUtils = require("../../../utils/algorand");

async function rejectCompensation(compensation) {
  const algodClient = algoClient()
  const suggestedParams = await algodClient.getTransactionParams().do()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  const nfts = compensation.nfts.map((nft) => Number(nft.asa_id))

  const rejectBurnTxn = algosdk.makeApplicationCallTxnFromObject({
    from: creator.addr,
    appIndex: Number(process.env.APP_ID),
    appArgs: [
      algorandUtils.getMethodByName('reject_burn').getSelector(),
      algosdk.encodeUint64(1),
    ],
    foreignAssets: [...nfts ,Number(process.env.CLIMATECOIN_ASA_ID)],
    accounts: [algosdk.getApplicationAddress(Number(process.env.DUMP_APP_ID)), compensation.user.publicAddress],
    foreignApps: [Number(compensation.contract_id), Number(process.env.DUMP_APP_ID)],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  rejectBurnTxn.fee += (3+nfts.length)*algosdk.ALGORAND_MIN_TX_FEE

  const signedTxn = rejectBurnTxn.signTxn(creator.sk)
  const txId = rejectBurnTxn.txID().toString()

  await algodClient.sendRawTransaction(signedTxn).do()
  await algosdk.waitForConfirmation(algodClient, txId, 4)
}

module.exports = {
  lifecycles: {
    beforeUpdate: async function (params, newCompensation) {
      const { _id } = params
      const oldCompensation = await strapi.services.compensations.findOne({ _id })
      if (oldCompensation.id !== _id) throw new Error(`Compensation not found with id: ${_id}`)
      if (newCompensation.state !== oldCompensation.state) {
        if (newCompensation.state === "rejected") {
          if (["minted", "claimed"].includes(oldCompensation.state)) throw strapi.errors.badRequest(`Cannot reject compensation that has already been approved`)
          await rejectCompensation(oldCompensation)
        }else if (oldCompensation.state === "rejected") throw strapi.errors.badRequest(`Cannot edit compensation that has already been rejected`)
      }

      const changeListKeys = Object.keys(newCompensation)
      for (const key of changeListKeys) {
        const isStateChange = key === "state"
        const isBurnReceiptChange = key === "burn_receipt"
        const isCompensationNftChange = key === "compensation_nft"
        const isConsolidationCertificateChange = key === "consolidation_certificate_ipfs_cid"
        const isRegistryCertificatesChange = key === "registry_certificates"
        const wasPreviouslyUndefined = !oldCompensation[key]
        const isNextStateMinted = newCompensation.state === "minted"
        const currentStateAllowsRegistryCertificatesChanges = !["minted", "claimed", "rejected"].includes(oldCompensation.state)

        if (isStateChange) continue;
        if (isBurnReceiptChange && wasPreviouslyUndefined) continue;
        if (isCompensationNftChange && wasPreviouslyUndefined && isNextStateMinted) continue;
        if (isConsolidationCertificateChange && wasPreviouslyUndefined && isNextStateMinted) continue;
        if (isRegistryCertificatesChange && currentStateAllowsRegistryCertificatesChanges) continue;

        // Do not allow any other change
        delete newCompensation[key]
      }
    },
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
