# The live game server, for Railway.
# Build it from the REPOSITORY ROOT (the server needs the rules engine in ../packages/engine):
#   Railway: Settings -> Build -> Dockerfile Path = game-server/Dockerfile (root directory stays "/")
FROM node:22-slim

WORKDIR /app

# 1. the rules engine, built once
COPY packages/engine/package.json packages/engine/package-lock.json ./packages/engine/
RUN cd packages/engine && npm ci
COPY packages/engine ./packages/engine
RUN cd packages/engine && npm run build

# 2. the server (it links to the engine at ../packages/engine)
COPY game-server/package.json game-server/package-lock.json ./game-server/
RUN cd game-server && npm ci
COPY game-server ./game-server
RUN cd game-server && npm run build

WORKDIR /app/game-server
ENV NODE_ENV=production
# Railway sets PORT; the server listens on it (2567 when it is not set).
CMD ["node", "build/index.js"]
