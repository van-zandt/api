FROM node:11.7-alpine as builder

RUN mkdir -p /src
WORKDIR /src

ADD . .

RUN npm install
RUN yarn build

FROM node:11.7-alpine

ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV}

RUN apk update && apk add bash

RUN mkdir -p /app
WORKDIR /app

COPY package.json .
COPY --from=builder /src/dist dist
COPY --from=builder /src/node_modules node_modules

RUN npm prune

# Affix version information to service images at build time
ARG LEDGERX_VERSION
# Provide version number in environment for application error reporting
ENV LX_LEDGERX_VERSION ${LEDGERX_VERSION}
LABEL "com.ledgerx.version"=${LEDGERX_VERSION}
CMD ["npm", "start"]
