module.exports = {
  settings: {
    sentry: {
      enabled: true,
    },
  },
  
  load: {
    before: ['sentry'],
  },
};
