'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */
const mailer = require(`${process.cwd()}/utils/mailer`)

module.exports = {
  lifecycles: {
    afterCreate: async function (data) {
      await mailer.send()
    }
  }
};
