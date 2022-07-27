module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', process.env.JWT_SECRET),
    },
    // ignore minIO files so that upload dont restart strapi in dev mode
    watchIgnoreFiles: ['**/docker/**'],
  },
  cron: {
    enabled: true,
  },
})
