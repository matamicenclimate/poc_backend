'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)
const registryConfig = require('config').registry

function makeEnum(statuses) {
  const enumObject = {}
  for (const status of statuses) {
    enumObject[status.toUpperCase()] = status
  }
  return enumObject
}

function statusLogic(currentStatus, newStatus) {
  const statusesEnum = getStatuses()
  if (currentStatus === newStatus) {
    return true
  }

  // left: current state | right: possible new states
  const stateTransition = {
    [statusesEnum.PENDING]: [statusesEnum.ACCEPTED, statusesEnum.REJECTED],
    [statusesEnum.ACCEPTED]: [statusesEnum.WAITING_FOR_CREDITS, statusesEnum.REJECTED],
    [statusesEnum.WAITING_FOR_CREDITS]: [statusesEnum.COMPLETED, statusesEnum.REJECTED],
    [statusesEnum.COMPLETED]: [statusesEnum.MINTED],
    [statusesEnum.MINTED]: [statusesEnum.CLAIMED],
    [statusesEnum.CLAIMED]: [statusesEnum.SWAPPED],
    [statusesEnum.REJECTED]: [statusesEnum.ACCEPTED],
  }

  if (currentStatus === statusesEnum.SWAPPED || !stateTransition[currentStatus].includes(newStatus)) {
    throw strapi.errors.badRequest(`Cannot change status from ${currentStatus} to ${newStatus}`)
  }
}

function getStatuses() {
  const statuses = strapi.models['carbon-documents'].__schema__.attributes.status.enum
  return makeEnum(statuses)
}

module.exports = {
  lifecycles: {
    beforeUpdate: async function (params, newDocument) {
      const { _id } = params
      const oldCarbonDocument = await strapi.services['carbon-documents'].findOne({ _id }, [])
      statusLogic(oldCarbonDocument.status, newDocument.status)

      const changeListKeys = Object.keys(newDocument)
      // Only allow to update the status and the developer and fee nfts internally
      for (const key of changeListKeys) {
        const isStatusChange = key === 'status'
        const isDeveloperNftChange = key === 'developer_nft'
        const isFeeNftChange = key === 'fee_nft'
        const isSwapGroupTxnId = key === 'swap_group_txn_id'
        const wasPreviouslyUndefined = !oldCarbonDocument[key]
        const isSwappedCurrentState = oldCarbonDocument.status === 'swapped'
        const currentStateAllowsChanges = ['pending', 'accepted'].includes(oldCarbonDocument.status)

        if (isStatusChange) continue
        if (isDeveloperNftChange && wasPreviouslyUndefined) continue
        if (isFeeNftChange && wasPreviouslyUndefined) continue
        if (isSwapGroupTxnId && !isSwappedCurrentState) continue
        if (!currentStateAllowsChanges)
          // Allow changes if state is pending or accepted, otherwise deny any change
          delete newDocument[key]
      }

      newDocument.oldStatus = oldCarbonDocument.status
    },
    afterUpdate: async function (result, params, data) {
      const statuses = getStatuses()
      if (data.oldStatus !== result.status) {
        const userEmail = result.user?.email
        if (result.status === statuses.ACCEPTED) {
          const title = `${result.title.slice(0, 10)}`
          const credits = `${result.credits}`
          mailer.logMailAction('carbon-documents', statuses.ACCEPTED, mailer.MAIL_ACTIONS.SENDING, userEmail)
          const mailContent_accepted = {
            title: 'Your project has been confirmed.',
            claim: `Your project <strong>'${title}'</strong> to offset <strong>${credits} t</strong> of CO2 has been
            confirmed in Climatecoin.`,
            text: `Congratulations. Your project <strong>'${title}'</strong> has been approved for listing
            on Climatecoin now you can share it with your friends so they can
            start offsetting their carbon footprint.`,
            button_1: {
              label: 'View project',
              href: `${process.env.FRONTEND_BASE_URL}/documents/${result.id}`,
            },
          }
          const acceptedMail = mailer.generateMailHtml(mailContent_accepted)
          await mailer.send('Document accepted', acceptedMail, userEmail)
          mailer.logMailAction('carbon-documents', statuses.ACCEPTED, mailer.MAIL_ACTIONS.SENT, userEmail)
          await strapi.services['carbon-documents'].update({ id: result._id }, { status: statuses.WAITING_FOR_CREDITS })
        } else if (result.status === statuses.COMPLETED) {
          mailer.logMailAction('carbon-documents', statuses.COMPLETED, mailer.MAIL_ACTIONS.SENDING, userEmail)
          const mailContent_completed = {
            title: 'Credits received.',
            claim: `We have received the credits.`,
            text: `We have received your credits. You will receive your tokens in a cooldown of 48 hours.`,
            button_1: {
              label: 'View project',
              href: `${process.env.FRONTEND_BASE_URL}/documents/${result.id}`,
            },
          }
          const completedMail = mailer.generateMailHtml(mailContent_completed)
          await mailer.send('Credits received', completedMail, userEmail)
          mailer.logMailAction('carbon-documents', statuses.COMPLETED, mailer.MAIL_ACTIONS.SENT, userEmail)
        }

        await strapi.services.notifications.create({
          title: `Carbon document status '${result.status.replace('_', ' ')}'`,
          description: `Carbon document status changed to '${result.status.replace('_', ' ')}'`,
          model: 'carbon-documents',
          model_id: result.id,
          user: result.user.id,
        })

        // Add activity when carbon document status is "swapped"
        if (result.status === 'swapped') {
          await strapi.services.activities.add(result.user, result.developer_nft)
        }
      }
    },
  },
}
