const fs = require('fs');
const { setupStrapi } = require('./helpers/strapi');

jest.setTimeout(10000);

beforeAll(async () => {
  await setupStrapi();
});

afterAll(async () => {
  await strapi.destroy();
});

require('./integration');