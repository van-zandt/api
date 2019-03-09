process.on('uncaughtException', function(err) {
  console.error(err)
})

process.on('unhandledRejection', function(err) {
  console.error(err)
})

const path = require('path')
const configPath = path.resolve(__dirname, '../.env')
require('dotenv').config({path: configPath})

import express from 'express'
const http = require('http')
import log from './lib/logger'

const HOST = process.env.EXPRESS_HOST
const PORT = process.env.EXPRESS_PORT

const server = express()

const httpServer = http.Server(server)

httpServer.listen(PORT, HOST, () => {
  log.debug(`Server listening on http://${HOST}:${PORT}`)
})

// Helpful when terminal process is killed too quickly
process.on('SIGTERM', () => {
  try {
    httpServer.close()
  }
  catch(e) {

  }
})
