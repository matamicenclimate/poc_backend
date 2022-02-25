'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)

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

  if ((currentStatus === statusesEnum.COMPLETED) ||
    (currentStatus === statusesEnum.PENDING && (newStatus !== statusesEnum.ACCEPTED && newStatus !== statusesEnum.REJECTED)) ||
    (currentStatus === statusesEnum.ACCEPTED && (newStatus !== statusesEnum.WAITING_FOR_CREDITS && newStatus !== statusesEnum.REJECTED)) ||
    (currentStatus === statusesEnum.WAITING_FOR_CREDITS && (newStatus !== statusesEnum.COMPLETED && newStatus !== statusesEnum.REJECTED)) ||
    (currentStatus === statusesEnum.REJECTED && newStatus !== statusesEnum.ACCEPTED)) {
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
    },
    afterUpdate: async function (data) {
      const statuses = getStatuses()
      if (data.status === statuses.ACCEPTED) {
        const registryInstructions = data.registry.instructions
        strapi.log.info(`sending mail to ${data.created_by_user}`)
        await mailer.send('Document status changed to accepted', registryInstructions)
        strapi.log.info(`mail sent to ${data.created_by_user}`)
        await strapi.services['carbon-documents'].update({ id: data.id }, { status: statuses.WAITING_FOR_CREDITS })
      }
    },
  }
}
