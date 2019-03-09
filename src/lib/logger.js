/**
 * Module Dependencies
 *
 * @ignore
 */
const winston = require('winston')

const logger = new winston.createLogger({
  format: winston.format.simple(),
  level: (process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : 'debug',

  transports: [
    new winston.transports.Console()
  ]

})

module.exports = logger
