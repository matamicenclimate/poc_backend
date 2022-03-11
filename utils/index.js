'use strict'

function getAttributesByType(attributes, type, typeExclude) {
  const collectionTypeAttributes = []
  for (const key in attributes) {
    const attribute = attributes[key]
    if (attribute[type] && !attribute[typeExclude]) {
      collectionTypeAttributes.push(key)
    }
  }

  return collectionTypeAttributes
}

module.exports = {
  getAttributesByType,
}
