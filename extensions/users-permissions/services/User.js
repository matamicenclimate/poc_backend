'use strict'

module.exports = {
  async edit(params, values) {
    if (values.password) {
      values.password = await strapi.plugins['users-permissions'].services.user.hashPassword(
        values
      );
    }

    return strapi.query('user', 'users-permissions').update(params, values);
  },
}
