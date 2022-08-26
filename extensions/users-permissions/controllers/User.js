'use strict'
const { sanitizeEntity } = require('strapi-utils')
const _ = require('lodash')

const sanitizeUser = (user) =>
  sanitizeEntity(user, {
    model: strapi.query('user', 'users-permissions').model,
  })

async function me(ctx) {
  const user = ctx.state.user

  if (!user) {
    return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }])
  }

  let data = await strapi.plugins['users-permissions'].services.user.fetch({
    id: user.id,
  })

  if (data) {
    data = sanitizeUser(data)
  }

  ctx.body = data
}

async function profileUpdate(ctx) {
  const {
    request: { body },
    state: { user },
  } = ctx
  const newValues = _.pick(body, [
    'email',
    'alias',
    'name',
    'surname',
    'avatar',
    'city',
    'country',
    'bio',
    'personal_URL',
  ])

  const newUser = await strapi.plugins['users-permissions'].services.user.edit({ id: user.id }, newValues)
  ctx.body = sanitizeUser(newUser)
}

async function emailVerification(ctx) {
  const { token } = ctx.query

  const { user: userService, jwt: jwtService } = strapi.plugins['users-permissions'].services

  if (_.isEmpty(token)) {
    return ctx.badRequest('Invalid token')
  }

  const user = await userService.fetch({ confirmationToken: token }, [])

  if (!user) {
    return ctx.badRequest('Invalid token')
  }

  await userService.edit({ id: user.id }, { confirmed: true, confirmationToken: null })

  ctx.send({
    jwt: jwtService.issue({ id: user.id }),
    user: sanitizeEntity(user, {
      model: strapi.query('user', 'users-permissions').model,
    }),
  })
}

module.exports = {
  me,
  profileUpdate,
  emailVerification,
}
