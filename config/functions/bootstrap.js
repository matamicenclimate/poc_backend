'use strict'
/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/3.0.0-beta.x/concepts/configurations.html#bootstrap
 */

const publicPermissions = {
  'web3-auth': {
    auth: ['preparechallenge', 'login'],
  },
  'users-permissions': {
    user: ['emailverification'],
  },
}

const authenticatedPermissions = {
  'web3-auth': {
    auth: ['preparechallenge', 'login'],
  },
  'users-permissions': {
    user: ['me', 'profileupdate', 'emailverification'],
    auth: ['connect'],
  },
  application: {
    activities: ['me'],
    'carbon-documents': ['claim', 'create', 'find', 'swap', 'findone', 'prepareswap', 'paginated'],
    compensations: ['calculate', 'findone', 'claimcertificate', 'create', 'me', 'prepareclaimcertificate', 'paginated'],
    currency: ['find'],
    info: ['find'],
    notifications: ['me', 'markallasread'],
    utils: ['chartbalanceme'],
  },
}

const findPublicRole = async () => {
  const result = await strapi.query('role', 'users-permissions').findOne({ type: 'public' })
  return result
}
const findAuthenticatedRole = async () => {
  const result = await strapi.query('role', 'users-permissions').findOne({ type: 'authenticated' })
  return result
}
const updatePermissionsIfNeeded = async (p, permissions) => {
  const shouldBeEnabled =
    permissions[p.type] && permissions[p.type][p.controller] && permissions[p.type][p.controller].includes(p.action)
  if (p.enabled !== shouldBeEnabled)
    return strapi.query('permission', 'users-permissions').update({ id: p.id }, { enabled: shouldBeEnabled })
  else return
}

const setDefaultPermissions = async () => {
  const publicRole = await findPublicRole()
  const authenticatedRole = await findAuthenticatedRole()
  const publicPermissionsDB = await strapi
    .query('permission', 'users-permissions')
    .find({ role: publicRole.id, _limit: -1 })
  const authenticatedPermisssionsDB = await strapi
    .query('permission', 'users-permissions')
    .find({ role: authenticatedRole.id, _limit: -1 })
  await Promise.all(publicPermissionsDB.map((p) => updatePermissionsIfNeeded(p, publicPermissions)))
  await Promise.all(authenticatedPermisssionsDB.map((p) => updatePermissionsIfNeeded(p, authenticatedPermissions)))
}

const isFirstRun = async () => {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  })
  const initHasRun = await pluginStore.get({ key: 'initHasRun' })
  await pluginStore.set({ key: 'initHasRun', value: true })
  return !initHasRun
}

module.exports = async () => {
  await setDefaultPermissions()
}
