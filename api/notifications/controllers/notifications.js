'use strict'

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

async function me(ctx) {
  const user = ctx.state.user.id
  const notifications = await strapi.services.notifications.find({ user: user })

  return notifications
}

async function markAllAsRead(ctx) {
  const user = ctx.state.user.id
  await strapi.query('notifications').model.updateMany({ user: user, is_read: false }, { is_read: true })

  return true
}

module.exports = {
  me,
  markAllAsRead,
}
