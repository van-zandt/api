const db = require('../src/lib/db')
const { Docker } = require('node-docker-api')
const exec = require('../src/lib/exec')
const logger = require('../src/lib/logger')

const DOCKER_IMAGE = process.env.DOCKER_IMAGE

let postgresContainer

async function dockerDown() {

  const docker = new Docker({socketPath: process.env.DOCKER_SOCK_PATH})

  const containers = await docker.container.list()

  for (const container of containers) {

    if ([DOCKER_IMAGE].includes(container.data.Image)) {

      logger.debug(`Tearing down ${container.data.Image} docker container`)

      await container.delete({force: true})

    }
  }

}

async function dockerUp() {

  const docker = new Docker({socketPath: process.env.DOCKER_SOCK_PATH})

  // Clean up any old containers that weren't torn down
  await dockerDown()

  postgresContainer = await docker.container.create({
    'Image': DOCKER_IMAGE,
    'name': 'postgres-test',
    'Env': [
      `POSTGRES_DB=${process.env.PG_DATABASE}`,
      `POSTGRES_USER=${process.env.PG_USER}`,
      `POSTGRES_PASSWORD=${process.env.PG_PASSWORD}`,
    ],
    'HostConfig': {
      'PortBindings': {
        '5432/tcp': [
          {'HostPort': process.env.PG_PORT}
        ]
      }
    },
    'ExposedPorts': {
      '5432/tcp': {}
    },
    // 'AutoRemove': true
  })

  logger.debug('Starting postgres docker container')

  await postgresContainer.start()

}

// Wait for the database to respond, or give up after 5 seconds
async function postgresReady() {

  logger.debug('Waiting for postgres...')

  return new Promise((resolve) => {

    const abort = setTimeout(async () => {
      logger.error('Failed to connect to postgres')

      await dockerDown()

      process.exit(1)
    }, 10000)

    const wait = setInterval(async () => {
      try {
        await db.raw("SELECT 'test connection';")

        clearTimeout(abort)
        clearInterval(wait)

        logger.debug('Postgres ready.')

        resolve()
      }
      catch (e) {

      }
    }, 300)
  })
}

async function run() {

  // Ensure child process is killed if node process unexpectedly exits
  const cleanExit = () => process.exit(1)
  process.on('SIGINT', cleanExit) // catch ctrl-c
  process.on('SIGTERM', cleanExit) // catch kill

  process.on('unhandledRejection', async (reason) => {

    logger.error(reason)

    try {
      await dockerDown()
    }
    catch (e) {

    }

    process.exit(1)

  })

  // Start postgres/redis containers for testing
  await dockerUp()

  await postgresReady()

  exec('yarn jest')

}

run()
