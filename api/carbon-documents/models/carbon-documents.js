'use strict'
const { StateProvider, ActivityUpdate } = require('../lib')

module.exports = {
  lifecycles: {
    async beforeUpdate(params, newDocument) {
      const { _id } = params
      const oldCarbonDocument = await strapi.services['carbon-documents'].findOne({ _id })
      const state = StateProvider.recover(oldCarbonDocument)
      state.next(newDocument.status)
      newDocument.oldStatus = oldCarbonDocument.status
    },
    async afterUpdate(result, _params, _data) {
      await ActivityUpdate.updateActivity(result)
      // Add activity when carbon document status is "swapped"
      if (await ActivityUpdate.shouldAddActivity(result)) {
        await ActivityUpdate.addActivity(result)
      }
    },
  },
}
