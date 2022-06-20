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
        // folder: 'upload',
        isDocker: false,
        host: process.env.MINIO_HOST,
      },
    },
    // upload: {
    //   provider: 'aws-s3',
    //   providerOptions: {
    //     accessKeyId: process.env.MINIO_ACCESS_KEY,
    //     secretAccessKey: process.env.MINIO_SECRET_KEY,
    //     params: {
    //       Bucket: process.env.MINIO_BUCKET,
    //     },
    //     endpoint: 'https://storage.staging.dekaside.com',
    //   },
    // },
    sentry: {
      enabled: true,
      config: {
        dsn: env('DSN'),
      },
    },
  }
}
