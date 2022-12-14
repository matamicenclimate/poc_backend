'use strict'

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NOTAUTHORIZED: 401,
  BADREQUEST: 400,
  FORBIDDEN: 403,
  NOTFOUND: 404,
  SERVERERROR: 500,
}

const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
}

const ROLE_TYPES = {
  PUBLIC: 'public',
  AUTH: 'authenticated',
  ADMIN: 'admin',
  EDITOR: 'editor',
}

const USERS_PROVIDERS = {
  MAGIC: 'magic',
}

module.exports = {
  HTTP_STATUS,
  HTTP_METHODS,
  ROLE_TYPES,
  USERS_PROVIDERS,
}
