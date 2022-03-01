'use strict'

const config = require('config')
const { delay } = require(process.cwd() + '/utils/time')
const ROLE_TYPES = require(process.cwd() + '/utils/enums').ROLE_TYPES

async function createAdminUser(strapi) {
  strapi.log.info(`[initData] Create admin account`)
  let superAdminRole = await strapi.admin.services.role.getSuperAdmin()
  if (superAdminRole === null) {
    strapi.log.info(`[initData] Wait 1s to get SuperAdmin role`)
    await delay(1000)
    superAdminRole = await strapi.admin.services.role.getSuperAdmin()
  }

  if (process.env.DEFAULT_ADMIN_USER) {
    //Check if any account exists.
    const admins = await strapi.query('user', 'admin').find()
    if (admins.length === 0) {
      try {
        const params = {
          username: process.env.DEFAULT_ADMIN_USER,
          password: process.env.DEFAULT_ADMIN_PASS,
          firstname: process.env.DEFAULT_ADMIN_FIRSTNAME,
          lastname: process.env.DEFAULT_ADMIN_LASTNAME,
          email: process.env.DEFAULT_ADMIN_EMAIL,
          blocked: false,
          isActive: true,
        }

        params.roles = [superAdminRole.id]
        params.password = await strapi.admin.services.auth.hashPassword(params.password)
        const admin = await strapi.query('user', 'admin').create({
          ...params,
        })
        strapi.log.info(`[initData] Admin account was successfully created with email ${admin.email}`)
      } catch (error) {
        strapi.log.error(`[initData] Couldn't create Admin account during bootstrap: `, error)
      }
    }
  }
}

async function createEditorUser(strapi) {
  if (process.env.DEFAULT_EDITOR_USER) {
    let user = await strapi.query('user', 'admin').find({ email: process.env.DEFAULT_EDITOR_EMAIL })

    if (user.length === 0) {
      try {
        const editorRole = await strapi.admin.services.role.findOne({ code: 'strapi-editor' })
        const params = {
          username: process.env.DEFAULT_EDITOR_USER,
          password: process.env.DEFAULT_EDITOR_PASS,
          firstname: process.env.DEFAULT_EDITOR_FIRSTNAME,
          lastname: process.env.DEFAULT_EDITOR_LASTNAME,
          email: process.env.DEFAULT_EDITOR_EMAIL,
          roles: [editorRole.id],
          blocked: false,
          isActive: true,
        }

        params.password = await strapi.admin.services.auth.hashPassword(params.password)
        user = await strapi.query('user', 'admin').create({
          ...params,
        })
        strapi.log.info(
          `[initData] ${process.env.DEFAULT_EDITOR_EMAIL} account was successfully created with email ${user.email}`,
        )
      } catch (error) {
        strapi.log.error(
          `[initData] Couldn't create ${process.env.DEFAULT_EDITOR_EMAIL} account during bootstrap: `,
          error,
        )
      }
    }
  }
}

function initData(strapi) {
  createAdminUser(strapi)
  createEditorUser(strapi)
}

module.exports = (strapi) => {
  return {
    async initialize() {
      strapi.log.info(`[initData] Initialize Hook`)
      strapi.server.setTimeout(config.initTimeout)
      initData(strapi)
    },
  }
}
