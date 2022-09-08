const fs = require('fs');
const { setupStrapi } = require('./helpers/strapi');
const algosdk = require('algosdk')

jest.setTimeout(10000);

beforeAll(async () => {
  await setupStrapi();
});

//require('./integration');
require('./features');
require('./delete-strapi');