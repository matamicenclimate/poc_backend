'use strict'

const mongoose = require('mongoose')

function deleteDataFields(data, fields = []) {
  const deleteDefaultFields = ['__v', '_id']
  fields.push(...deleteDefaultFields)
  for (const field of fields) {
    for (const element of data) {
      delete element[field]
    }
  }

  return data
}

function mongoIdFormatter(dataIds) {
  if (!Array.isArray(dataIds)) {
    if (typeof dataIds === 'string') {
      return mongoose.Types.ObjectId(dataIds)
    }

    strapi.log.info(`mongoIdFormatter: value must be an array or string`)
    return
  }

  const formattedIds = []
  for (const stringId of dataIds) {
    const validId = mongoose.Types.ObjectId(stringId)
    formattedIds.push(validId)
  }

  return formattedIds
}

module.exports = {
  deleteDataFields,
  mongoIdFormatter,
}
