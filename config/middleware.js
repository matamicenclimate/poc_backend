module.exports = {
  settings: {
    sentry: {
      enabled: true,
    },
  },

  load: {
    after: ['sentry'],
  },
};