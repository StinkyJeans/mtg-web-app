# The website, for Railway.
# Build it from the REPOSITORY ROOT (the site needs the rules engine in ../packages/engine):
#   Railway: Settings -> Build -> Dockerfile Path = mtg/Dockerfile (root directory stays "/")
FROM node:22-slim

WORKDIR /app

# 1. the rules engine, built once
COPY packages/engine/package.json packages/engine/package-lock.json ./packages/engine/
RUN cd packages/engine && npm ci
COPY packages/engine ./packages/engine
RUN cd packages/engine && npm run build

# 2. the site (it links to the engine at ../packages/engine)
COPY mtg/package.json mtg/package-lock.json ./mtg/
RUN cd mtg && npm ci
COPY mtg ./mtg

# NEXT_PUBLIC_* values are baked into the browser bundle, so they must exist at build time.
# Railway passes the service variables in as these build args.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GAME_SERVER_URL
RUN cd mtg && npm run build

WORKDIR /app/mtg
ENV NODE_ENV=production
# A phone that signed in long ago can still hold an old, oversized login cookie (profile pictures used to be stored inside it). Node refuses
# requests with more than 16 KB of headers (HTTP 431) before the site can replace that cookie, so allow more: the next request refreshes it.
ENV NODE_OPTIONS=--max-http-header-size=262144
# Railway sets PORT; next start listens on it.
CMD ["node_modules/.bin/next", "start"]
