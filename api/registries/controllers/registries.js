'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */
const mailer = require(`${process.cwd()}/utils/mailer`)

async function create(ctx) {
  // get url from .env & insert with application type (carbon-documents)
  const mailContent = `${ctx.state.user.email}\n${url}`
  await mailer.send('New document', mailContent)
}

module.exports = {
  create,
}
