'use strict'

const _ = require('lodash')
const fileUploader = require(`${process.cwd()}/utils/upload`)

module.exports = async (ctx, next) => {
  let role

  if (ctx.request.files && ctx.request.files.avatar) {
    const pushFilesResponse = await fileUploader.pushFile(ctx)
    ctx.request.body = { ...ctx.request.body, ...pushFilesResponse }
  }

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      if (!ctx.state.user) {
        const { id } = await strapi.plugins['users-permissions'].services.jwt.getToken(ctx)

        if (id === undefined) {
          throw new Error('Invalid token: Token did not contain required fields')
        }

        // fetch authenticated user
        ctx.state.user = await strapi.plugins['users-permissions'].services.user.fetchAuthenticatedUser(id)
      }
    } catch (err) {
      try {
        await strapi.plugins['magic-auth'].services['magic-auth'].loginWithMagic(ctx)
      } catch (err) {
        return handleErrors(ctx, err, 'unauthorized')
      }
    }

    if (!ctx.state.user) {
      return handleErrors(ctx, 'User Not Found', 'unauthorized')
    }

    //TODO: Ver type del rol del usuario de frontend
    if (ctx.state.user.roles) {
      role = ctx.state.user.roles[0]
      if (role.code === 'strapi-super-admin') {
        return await next()
      }
    } else if (ctx.state.user.role && ctx.state.user.role.type === 'root') {
      // TODO: Quitar el root de aqui, malas prácticas..
      return await next()
    } else {
      role = ctx.state.user.role
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
