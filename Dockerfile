# syntax=docker/dockerfile:1
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base
RUN apt-get update -qq && apt-get install --no-install-recommends -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app

# Shared lockfile lives at root — needed for npm ci
COPY package.json package-lock.json ./
RUN npm ci

# Copy the livekit source plus the shared db/ schema it imports
# (livekit/src/agent/agent.ts -> ../../../db/schema), not the Next.js app
COPY livekit/ ./livekit/
COPY db/ ./db/

RUN npm run livekit:build
RUN npm run livekit:download-files
RUN npm prune --omit=dev

FROM base
ARG UID=10001
RUN adduser --disabled-password --gecos "" --home "/app" --shell "/sbin/nologin" --uid "${UID}" appuser
WORKDIR /app
COPY --from=build --chown=appuser:appuser /app /app
USER appuser
ENV NODE_ENV=production
CMD ["npm", "run", "livekit:start"]