const fs = require('fs');
const { setupStrapi } = require('./helpers/strapi');


beforeAll(async () => {
  jest.setTimeout(20000);
  await setupStrapi();
});

afterAll(async () => {
  const dbSettings = strapi.config.get('database.connections.default.settings');
  await strapi.destroy();

  //delete test database after all tests
  if (dbSettings && dbSettings.filename) {
    const tmpDbFile = `${__dirname}/../${dbSettings.filename}`;
    if (fs.existsSync(tmpDbFile)) {
      fs.unlinkSync(tmpDbFile);
    }
  }
});

require('./integration');