'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

const mailer = require(`${process.cwd()}/utils/mailer`)
const algosdk = require('algosdk')
const { algoClient } = require('../../../config/algorand')
const algorandUtils = require('../../../utils/algorand')
const { LogoStrapiBuffer } = require('../../../utils/pdf')
const t = require('../../../utils/locales')

async function rejectCompensation(compensation) {
  const algodClient = algoClient()
  const suggestedParams = await algodClient.getTransactionParams().do()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  const nfts = compensation.nfts.map((nft) => Number(nft.asa_id))

  const rejectBurnTxn = algosdk.makeApplicationCallTxnFromObject({
    from: creator.addr,
    appIndex: Number(process.env.APP_ID),
    appArgs: [algorandUtils.getMethodByName('reject_burn').getSelector(), algosdk.encodeUint64(1)],
    foreignAssets: [...nfts, Number(process.env.CLIMATECOIN_ASA_ID)],
    accounts: [algosdk.getApplicationAddress(Number(process.env.DUMP_APP_ID)), compensation.user.publicAddress],
    foreignApps: [Number(compensation.contract_id), Number(process.env.DUMP_APP_ID)],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  rejectBurnTxn.fee += (3 + nfts.length) * algosdk.ALGORAND_MIN_TX_FEE

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
        if (newCompensation.state === 'rejected') {
          if (['minted', 'claimed'].includes(oldCompensation.state))
            throw strapi.errors.badRequest(`Cannot reject compensation that has already been approved`)
          await rejectCompensation(oldCompensation)
        } else if (oldCompensation.state === 'rejected')
          throw strapi.errors.badRequest(`Cannot edit compensation that has already been rejected`)
      }

      const changeListKeys = Object.keys(newCompensation)
      for (const key of changeListKeys) {
        const isStateChange = key === 'state'
        const isBurnReceiptChange = key === 'burn_receipt'
        const isCompensationNftChange = key === 'compensation_nft'
        const isConsolidationCertificateChange = key === 'consolidation_certificate_ipfs_cid'
        const isRegistryCertificatesChange = key === 'registry_certificates'
        const isApproveTxnIdChange = key === 'approve_txn_id'
        const isClaimGroupIdChange = key === 'claim_group_id'
        const wasPreviouslyUndefined = !oldCompensation[key]
        const isNextStateMinted = newCompensation.state === 'minted'
        const currentStateAllowsRegistryCertificatesChanges = !['minted', 'claimed', 'rejected'].includes(
          oldCompensation.state,
        )

        if (isStateChange) continue
        if (isBurnReceiptChange && wasPreviouslyUndefined) continue
        if (isApproveTxnIdChange && wasPreviouslyUndefined) continue
        if (isClaimGroupIdChange) continue
        if (isCompensationNftChange && wasPreviouslyUndefined && isNextStateMinted) continue
        if (isConsolidationCertificateChange && wasPreviouslyUndefined && isNextStateMinted) continue
        if (isRegistryCertificatesChange && currentStateAllowsRegistryCertificatesChanges) continue

        // Do not allow any other change
        delete newCompensation[key]
      }

      newCompensation.oldState = oldCompensation.state
    },

    afterUpdate: async function (result, params, data) {
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]
      var date = result.createdAt
      var dd = String(date.getDate()).padStart(2, '0')
      var mm = String(monthNames[date.getMonth()])
      var yyyy = date.getFullYear()
      var hours = date.getHours()
      var minutes = date.getMinutes()

      var time = `${hours}:${minutes}`
      date = `${dd} ${mm} ${yyyy}`

      if (data.oldState !== result.state) {
        const user = result.user
        //const url = `${process.env.BASE_URL}${process.env.CONTENT_MANAGER_URL}/${applicationUid}/${result.id}`
        const compensationID = result.id
        const amount = result.amount

        const certificate = result.consolidation_certificate_ipfs_cid
        const explorerURL = 'https://testnet.algoexplorer.io/'
        const txnGroupId = encodeURIComponent(result.txn_id)
        if (result.state === 'minted') {
          const mailContent_confirmed = {
            title: t(user.language, 'Email.Compensation.minted.title'),
            claim: t(user.language, 'Email.Compensation.minted.claim').format(amount),
            text: t(user.language, 'Email.Compensation.minted.text').format(date, time, compensationID),
            button_1: {
              label: t(user.language, 'Email.Compensation.minted.button_1'),
              href: `${explorerURL}tx/group/${txnGroupId}`,
            },
            button_2: {
              label: t(user.language, 'Email.Compensation.minted.button_2'),
              href: `${process.env.IPFS_BASE_URL}${certificate}`,
            },
          }

          const confirmedMail = mailer.generateMailHtml(mailContent_confirmed)
          await mailer.send(t(user.language, 'Email.Compensation.minted.subject'), confirmedMail, user)
        } else if (result.state === 'rejected') {
          const mailContent_rejected = {
            title: t(user.language, 'Email.Compensation.rejected.title'),
            claim: t(user.language, 'Email.Compensation.rejected.claim').format(amount),
            text: t(user.language, 'Email.Compensation.rejected.claim').format(date, time, compensationID),
            button_1: {
              label: t(user.language, 'Email.Compensation.rejected.button_1'),
              href: `${explorerURL}tx/group/${txnGroupId}`,
            },
            bgColor: '#4b0810',
            titleColor: '#ff999f',
          }

          const rejectedMail = mailer.generateMailHtml(mailContent_rejected)
          await mailer.send(t(user.language, 'Email.Compensation.rejected.subject'), rejectedMail, user)
        }

        await strapi.services.notifications.create({
          title: `Compensation status '${result.state.replace('_', ' ')}'`,
          description: `Compensation status changed to '${result.state.replace('_', ' ')}'`,
          model: 'compensations',
          model_id: result.id,
          user: user.id,
        })

        // TODO: Añadir activity si es necesario
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
        const nftFound = await strapi.services.nfts.findOne({ id: nft.id })
        if (nftFound.id === nft.id) {
          if (amountToBurn.greaterThanOrEqual(nftFound.supply_remaining)) {
            burnReceipt[nftFound.asa_id.toInt()] = nftFound.supply_remaining.toInt()
            amountToBurn = amountToBurn.subtract(nftFound.supply_remaining)
            await strapi.services.nfts.update(
              { id: nft.id },
              { status: 'burned', supply_remaining: 0, burnWillTimeoutOn: Date.now() },
            )
            continue
          }

          burnReceipt[nftFound.asa_id.toInt()] = amountToBurn.toInt()
          const finalSupply = nftFound.supply_remaining.subtract(amountToBurn)
          await strapi.services.nfts.update(
            { id: nft.id },
            { supply_remaining: finalSupply, burnWillTimeoutOn: Date.now() },
          )
        } else {
          const collectionName = 'compensations'
          const applicationUid = strapi.api[collectionName].models[collectionName].uid
          const url = `${process.env.BASE_URL}${process.env.CONTENT_MANAGER_URL}/${applicationUid}/${result.id}`
          const mailContent = `Compensation cannot be finished(${url}). Nft ${nft.id} not found`
          // TODO: SEND EMAIL PROPERLY TO ADMINS
          //await mailer.send('Compensation Failed', mailContent)
          throw new Error(`Nft with id ${nft.id} Not Found`)
        }
      }

      await strapi.services.compensations.update({ id: result.id }, { burn_receipt: burnReceipt })

      /**
       * Handle compensation request notification email
       */
      const explorerURL = 'https://testnet.algoexplorer.io/'
      const txnGroupId = encodeURIComponent(result.txn_id)
      const user = result.user

      const mailContent_pending = {
        title: t(user.language, 'Email.Compensation.created.title'),
        claim: t(user.language, 'Email.Compensation.created.claim'),
        text: t(user.language, 'Email.Compensation.created.text'),
        button_1: {
          label: t(user.language, 'Email.Compensation.created.button_1'),
          href: `${explorerURL}tx/group/${txnGroupId}`,
        },
      }

      const creationMail = mailer.generateMailHtml(mailContent_pending)
      await mailer.send(t(user.language, 'Email.Compensation.created.subject'), creationMail, user, [
        { buffer: LogoStrapiBuffer, cid: 'logo-strapi.png' },
      ])

      await strapi.services.notifications.create({
        title: `Compensation status '${result.state.replace('_', ' ')}'`,
        description: `Compensation status changed to '${result.state.replace('_', ' ')}'`,
        model: 'compensations',
        model_id: result.id,
        user: result.user.id,
      })
    },
  },
}
