const Knex = require('knex')
const { Model } = require('objection')

const knex = Knex({
  client: 'postgresql',
  connection: {
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    user: process.env.PG_USER
  },
  pool: {
    min: 2,
    max: 10
  },
})

Model.knex(knex)

module.exports = knex
