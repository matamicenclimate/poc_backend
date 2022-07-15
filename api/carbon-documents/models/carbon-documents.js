'use strict'
const { StateProvider, ActivityUpdate, Statuses } = require('../lib')

module.exports = {
  lifecycles: {
    async beforeUpdate(params, newDocument) {
      console.log('CALLING ON ELVIS')
      await new Promise((r) => setTimeout(r))
      console.log(Statuses.enum)
      throw new Error(`FOO`)
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
