'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

const usersPermissionsActions = require('../users-permissions-actions');

module.exports = async () => {
  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: 'web3-auth',
  });

  if (!(await pluginStore.get({key: 'settings'}))) {
    const value = {
      enabled: true,
      createUserIfNotExists: true,
      expire_period: 3600,
      asaId: 0,
      loginMessage: "This is a sample transaction to authenticate you in the website, it will never be completed."
    };

    await pluginStore.set({key: 'settings', value});
  }

  await strapi.admin.services.permission.actionProvider.registerMany(
    usersPermissionsActions.actions
  );
};
