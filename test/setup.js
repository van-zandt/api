process.on('uncaughtException', function(e) {
  console.error(e)
})

process.on('unhandledRejection', function(e) {
  console.error(e)
})

const path = require('path')
require('dotenv').config({path: path.join(__dirname, '../.env.test')})

require('./run')
