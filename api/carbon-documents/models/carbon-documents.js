'use strict'

const { mailer, MAIL_ACTIONS, logMailAction } = require(`${process.cwd()}/utils/mailer`)

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
    [statusesEnum.REJECTED]: [statusesEnum.ACCEPTED],
  }

  if (currentStatus === statusesEnum.CLAIMED || !stateTransition[currentStatus].includes(newStatus)) {
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
      const oldCarbonDocument = await strapi.services['carbon-documents'].findOne({ _id })
      statusLogic(oldCarbonDocument.status, newDocument.status)
      newDocument.oldStatus = oldCarbonDocument.status
    },
    afterUpdate: async function (result, params, data) {
      const statuses = getStatuses()
      if (data.oldStatus !== data.status) {
        if (data.status === statuses.ACCEPTED) {
          const registryInstructions = data.registry.instructions
          logMailAction('carbon-documents', statuses.ACCEPTED, MAIL_ACTIONS.SENDING, data.created_by_user)
          await mailer.send('Document status changed to accepted', registryInstructions, data.created_by_user)
          logMailAction('carbon-documents', statuses.ACCEPTED, MAIL_ACTIONS.SENT, data.created_by_user)
          await strapi.services['carbon-documents'].update({ id: data._id }, { status: statuses.WAITING_FOR_CREDITS })
        } else if (data.status === statuses.COMPLETED) {
          logMailAction('carbon-documents', statuses.COMPLETED, MAIL_ACTIONS.SENDING, data.created_by_user)
          await mailer.send(
            'Credits received',
            `We have received your credits.<br>You will receive your tokens in a cooldown of 48 hours.`,
            data.created_by_user,
          )
          logMailAction('carbon-documents', statuses.COMPLETED, MAIL_ACTIONS.SENT, data.created_by_user)
        }
      }
    },
  },
}
