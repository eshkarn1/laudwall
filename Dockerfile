# Laudwall: one container, one SQLite file in /app/data.
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3051 HOSTNAME=0.0.0.0 LAUDWALL_DB=/app/data/laudwall.db
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
RUN apk add --no-cache su-exec && mkdir -p /app/data
VOLUME /app/data
EXPOSE 3051
# A mounted ./data folder arrives owned by root: hand it to the node user, then drop root before starting.
CMD ["sh", "-c", "chown -R node:node /app/data && exec su-exec node node server.js"]
