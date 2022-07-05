const config = require('config')

module.exports = ({ env }) => {
  let email = {}
  if (env('NODE_ENV') !== 'test') {
    email = {
      provider: 'mailgun',
      providerOptions: {
        apiKey: env('MAILGUN_API_KEY'),
        domain: env('MAILGUN_DOMAIN'),
        host: env('MAILGUN_HOST', 'api.mailgun.net'),
      },
      settings: {
        defaultFrom: env('MAILGUN_EMAIL'),
        defaultReplyTo: env('MAILGUN_EMAIL'),
      },
    }
  }
  return {
    email,
    upload: {
      provider: 'minio',
      providerOptions: {
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
        bucket: process.env.MINIO_BUCKET,
        endPoint: process.env.MINIO_ENDPOINT,
        port: parseInt(process.env.MINIO_PORT),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        folder: 'upload',
        host: process.env.MINIO_HOST,
      },
    },
    sentry: {
      enabled: true,
      config: {
        dsn: process.env.SENTRY_DSN,
        sendMetadata: true,

      },
    },
  }
}
