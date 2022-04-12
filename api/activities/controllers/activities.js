'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

async function me(ctx) {
  const user = ctx.state.user.id
  const activities = await strapi.services.activities.find({ user: user, ...ctx.query })

  return activities
}

module.exports = {
  me,
}
