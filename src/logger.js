const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-slack-signature"]',
      'req.headers["x-slack-request-timestamp"]',
      'installation',
      'installation.*',
      'installations',
      '*.installation',
      '*.installations',
      'install_data',
      '*.install_data',
      'payload.installation',
      'payload.installation.*',
      'payload.installOptions',
      'payload.install_options',
      '*.token',
      '*.refresh_token',
      '*.access_token',
      '*.client_secret',
      '*.signing_secret',
      '*.state_secret',
      'SLACK_CLIENT_SECRET',
      'SLACK_SIGNING_SECRET',
      'SLACK_STATE_SECRET',
      'INSTALLATION_ENCRYPTION_KEY',
      'DATABASE_URL'
    ],
    censor: '[REDACTED]'
  }
});

module.exports = logger;
