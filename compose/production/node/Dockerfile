FROM node:14-alpine AS BUILD_IMAGE

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt

COPY . /opt

RUN yarn --frozen-lockfile && \
  yarn build

FROM node:14-alpine

RUN apk upgrade -U \
  && apk add curl \
  && rm -rf /var/cache/*

RUN apk add --no-cache  chromium

WORKDIR /opt

COPY --from=BUILD_IMAGE /opt /opt

EXPOSE 1337

CMD ["sh", "-c", "yarn start"]
