module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '9500af4b764de09442ab5f08ef248426'),
    },
    // ignore minIO files so that upload dont restart strapi in dev mode
    watchIgnoreFiles: ['**/docker/**'],
  },
  cron: {
    enabled: true,
  },
})
