'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  lifecycles: {
    // Called before an entry is created
    beforeCreate: async function (data) {
      data.burnWillTimeoutOn = Date.now()
      data.supply_remaining = data.supply
    },
  },
}
