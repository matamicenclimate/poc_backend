FROM node:14-alpine

RUN apk upgrade -U \
  && apk add curl \
  && rm -rf /var/cache/*

RUN apk add --no-cache chromium