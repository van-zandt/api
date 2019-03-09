# API
Node.js API with Postgres support

## Requirements

### Postgres
Install postgres. There are many ways of installing postgres, but the easiest way on macOS is:

    brew install postgres

Initialise postgres database:

```
initdb -D postgres_data

// Start postgres so we can finish setting up
postgres -D postgres_data

createdb paradigm

psql paradigm
> CREATE ROLE paradigm WITH LOGIN PASSWORD '<password>';
```

## Development
Start postgres:

    postgres -D postgres_data

Ensure that all migrations have been run for postgres.

    yarn migrate-schema

Start the API:

    yarn start:dev

## esting
You'll need to fill a .env.test file using the .env.test.example template.

Ensure that you have Docker installed and running, and pull the redis and postgres images:

    docker pull postgres:9.6.12-alpine

Run the tests:

    npm t
