'use strict'

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

module.exports = {
  deleteDataFields
}
