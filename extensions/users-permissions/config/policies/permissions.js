'use strict'

const _ = require('lodash')
const { Magic } = require('@magic-sdk/admin')
const ENUMS = require(`${process.cwd()}/utils/enums`)
const fileUploader = require(`${process.cwd()}/utils/upload`)

function getCleanAuthToken(authorizationHeader) {
  const textTrim = 'Bearer '
  if (!authorizationHeader.includes(textTrim)) {
    strapi.log.info('unable to retrieve issuer info')
    return
  }

  return authorizationHeader.replace(textTrim, '')
}

function isStrapiUser(user) {
  if (!user) {
    return
  }

  return user.username === ENUMS.ROLE_TYPES.ADMIN || user.username === ENUMS.ROLE_TYPES.EDITOR
}

async function checkIssuer(ctx) {
  const magic = new Magic(process.env.MAGIC_KEY)

  if (!ctx.state.user || !ctx.state.user.provider || ctx.state.user.provider !== ENUMS.USERS_PROVIDERS.MAGIC) {
    if (isStrapiUser(ctx.state.user)) {
      return
    }

    if (process.env.NODE_ENV !== 'test') {
      strapi.log.info('Unable to validate did token')
    }
    return
  }

  const userDb = await strapi.plugins['users-permissions'].services.user.fetch({
    email: ctx.state.user.email,
  })

  if (!userDb || !userDb.issuer) {
    const cleanToken = getCleanAuthToken(ctx.request.header.authorization)
    if (cleanToken) {
      const issuer = await magic.token.getIssuer(cleanToken)
      const metadata = await magic.users.getMetadataByIssuer(issuer)
      if (!issuer) {
        return
      }

      const updatedUser = await strapi.plugins['users-permissions'].services.user.edit(
        { _id: userDb._id },
        { issuer: metadata.issuer, publicAddress: metadata.publicAddress },
      )

      return updatedUser
    }
  }

  return userDb
}

module.exports = async (ctx, next) => {
  let role

  await strapi.plugins['magic'].services['magic'].loginWithMagic(ctx)
  checkIssuer(ctx)
  if(ctx.request.files && ctx.request.files.avatar) {
    const pushFilesResponse = await fileUploader.pushFile(ctx)
    ctx.request.body = { ...ctx.request.body, ...pushFilesResponse }
  }
  if (ctx.state.user) {
    // request is already authenticated in a different way
    return next()
  }

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      const { id } = await strapi.plugins['users-permissions'].services.jwt.getToken(ctx)

      if (id === undefined) {
        throw new Error('Invalid token: Token did not contain required fields')
      }

      // fetch authenticated user
      ctx.state.user = await strapi.plugins['users-permissions'].services.user.fetchAuthenticatedUser(id)
    } catch (err) {
      return handleErrors(ctx, err, 'unauthorized')
    }

    if (!ctx.state.user) {
      return handleErrors(ctx, 'User Not Found', 'unauthorized')
    }

    role = ctx.state.user.role
    if (role.type === 'root') {
      return await next()
    }

    const store = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    })

    if (_.get(await store.get({ key: 'advanced' }), 'email_confirmation') && !ctx.state.user.confirmed) {
      return handleErrors(ctx, 'Your account email is not confirmed.', 'unauthorized')
    }

    if (ctx.state.user.blocked) {
      return handleErrors(ctx, 'Your account has been blocked by the administrator.', 'unauthorized')
    }
  }

  // Retrieve `public` role.
  if (!role) {
    role = await strapi.query('role', 'users-permissions').findOne({ type: 'public' }, [])
  }

  const route = ctx.request.route
  const permission = await strapi.query('permission', 'users-permissions').findOne(
    {
      role: role.id,
      type: route.plugin || 'application',
      controller: route.controller,
      action: route.action,
      enabled: true,
    },
    [],
  )
  // if (process.env.NODE_ENV === 'test') {
  //   return await next()
  // }
  if (!permission) {
    return handleErrors(ctx, undefined, 'forbidden')
  }

  // Execute the policies.
  if (permission.policy) {
    return await strapi.plugins['users-permissions'].config.policies[permission.policy](ctx, next)
  }

  // Execute the action.
  await next()
}

const handleErrors = (ctx, err = undefined, type) => {
  throw strapi.errors[type](err)
}
