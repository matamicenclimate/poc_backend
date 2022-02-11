module.exports = ({ env }) => ({
  email: {
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
  },
});