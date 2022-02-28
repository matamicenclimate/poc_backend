'use strict';

const { info } = require('config')
const { deleteDataFields } = require(`${process.cwd()}/utils/formatters`)

async function find(ctx) {
  const data = {}
  const fields = ['createdAt','updatedAt','created_by', 'updated_by']
  for (const collection of info.collections) {
    const dbData = await strapi.services[collection].find({_limit: -1})
    const formattedData = deleteDataFields(dbData, fields)
    data[collection] = formattedData
  }

  return data
}

module.exports = {
  find,
};
