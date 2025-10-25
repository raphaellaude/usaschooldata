ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim as base

WORKDIR /app

ENV NODE_ENV="production"

FROM base as build
ARG VITE_DATA_DIRECTORY

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 ca-certificates

COPY --link package-lock.json package.json ./
RUN npm ci --include=dev

RUN echo "VITE_DATA_DIRECTORY=$VITE_DATA_DIRECTORY" > .env.production

COPY --link . .

RUN npm run build

RUN npm prune --omit=dev

FROM base

COPY --from=build /app /app

EXPOSE 5173
CMD [ "npm", "run", "start" ]
