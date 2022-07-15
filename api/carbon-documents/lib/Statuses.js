function makeEnum(statuses) {
  const enumObject = {}
  for (const status of statuses) {
    enumObject[status.toUpperCase()] = status
  }
  return Object.freeze(enumObject)
}

function getStatuses() {
  if (strapi.models == null) {
    console.trace('WARN: Early attempt to access schema.')
    return null
  }
  const statuses = strapi.models['carbon-documents'].__schema__.attributes.status.enum
  return makeEnum(statuses)
}

module.exports = {
  get enum() {
    return getStatuses()
  },
}
