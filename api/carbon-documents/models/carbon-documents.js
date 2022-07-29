'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)
const {algoIndexer} = require("../../../config/algorand");
const algosdk = require("algosdk");
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
        const isStatusChange = key === "status"
        const isDeveloperNftChange = key === "developer_nft"
        const isFeeNftChange = key === "fee_nft"
        const wasPreviouslyUndefined = oldCarbonDocument[key] === null
        const currentStateAllowsChanges = ["pending", "accepted"].includes(oldCarbonDocument.status)

        if (isStatusChange) continue;
        if (isDeveloperNftChange && wasPreviouslyUndefined) continue;
        if (isFeeNftChange && wasPreviouslyUndefined) continue;

        // Allow changes if state is pending or accepted, otherwise deny any change
        if (!currentStateAllowsChanges) delete newDocument[key]
      }

      newDocument.oldStatus = oldCarbonDocument.status

    },
    afterUpdate: async function (result, params, data) {
      const statuses = getStatuses()
      if (data.oldStatus !== result.status) {
        const userEmail = result.created_by_user
        if (result.status === statuses.ACCEPTED) {
          const registryInstructions = result.registry.instructions ?? registryConfig.defaultInstructions
          mailer.logMailAction('carbon-documents', statuses.ACCEPTED, mailer.MAIL_ACTIONS.SENDING, userEmail)
          await mailer.send('Document status changed to accepted', registryInstructions, userEmail)
          mailer.logMailAction('carbon-documents', statuses.ACCEPTED, mailer.MAIL_ACTIONS.SENT, userEmail)
          await strapi.services['carbon-documents'].update({ id: result._id }, { status: statuses.WAITING_FOR_CREDITS })
        } else if (result.status === statuses.COMPLETED) {
          mailer.logMailAction('carbon-documents', statuses.COMPLETED, mailer.MAIL_ACTIONS.SENDING, userEmail)
          await mailer.send(
            'Credits received',
            `We have received your credits.<br>You will receive your tokens in a cooldown of 48 hours.`,
            userEmail,
          )
          mailer.logMailAction('carbon-documents', statuses.COMPLETED, mailer.MAIL_ACTIONS.SENT, userEmail)
        }

        const userDb = await strapi.plugins['users-permissions'].services.user.fetch({
          email: result.created_by_user,
        })
        await strapi.services.notifications.create({
          title: `Carbon document ${result.status}`,
          description: `Carbon document status changed to ${result.status}`,
          model: 'carbon-documents',
          model_id: result.id,
          user: userDb.id,
        })

        // Add activity when carbon document status is "swapped"
        if (result.status === 'swapped') {
          await strapi.services.activities.add(userDb, result.developer_nft)
        }
      }
    },
  },
}
