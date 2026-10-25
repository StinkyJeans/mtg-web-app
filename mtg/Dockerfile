# The website, for Railway (or any host that runs Docker).
# Build it from the REPOSITORY ROOT (the site needs the rules engine in ../packages/engine):
#   Railway: Settings -> Config-as-code file path = mtg/railway.json (root directory stays "/")
FROM node:22-slim

WORKDIR /app

# 1. the rules engine, built once
COPY packages/engine/package.json packages/engine/package-lock.json ./packages/engine/
RUN cd packages/engine && npm ci
COPY packages/engine ./packages/engine
RUN cd packages/engine && npm run build

# 2. the website
COPY mtg/package.json mtg/package-lock.json ./mtg/
RUN cd mtg && npm ci
COPY mtg ./mtg

# These three are baked into the pages while they are built, so they must be set on the service BEFORE the build.
# (Railway hands a service's variables to the build as these ARGs.)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GAME_SERVER_URL
ARG NEXT_PUBLIC_AUTH_EMAIL_DOMAIN
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_GAME_SERVER_URL=$NEXT_PUBLIC_GAME_SERVER_URL \
    NEXT_PUBLIC_AUTH_EMAIL_DOMAIN=$NEXT_PUBLIC_AUTH_EMAIL_DOMAIN
RUN cd mtg && npm run build

WORKDIR /app/mtg
ENV NODE_ENV=production
# Railway sets PORT.
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
