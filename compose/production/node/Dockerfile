FROM node:14-alpine AS BUILD_IMAGE

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

#RUN apk add git

WORKDIR /opt

COPY . /opt

RUN yarn --frozen-lockfile && \
  yarn build

FROM node:14-alpine

RUN apk upgrade -U \
  && apk add curl \
  && rm -rf /var/cache/*

RUN apk add --no-cache "chromium<103.0.5059.0"

WORKDIR /opt

COPY --from=BUILD_IMAGE /opt /opt

EXPOSE 1337

CMD ["sh", "-c", "yarn start"]
