FROM node:20-bullseye-slim AS builder
WORKDIR /app
# Install build dependencies for Prisma
RUN apt-get update && apt-get install -y curl ca-certificates build-essential python3 --no-install-recommends || true
# Copy worker package manifest
COPY packages/worker/package.json packages/worker/package-lock.json* ./
RUN npm install --no-audit --no-fund --no-optional || true
# Copy prisma schema from API package into builder so prisma generate works
COPY packages/api/prisma ./prisma
# Copy worker source
COPY packages/worker/src ./src
COPY packages/worker/tsconfig.json ./
# Ensure prisma CLI v5 is installed so generation uses compatible CLI
RUN npm install prisma@^5 --no-audit --no-fund || true
# generate prisma client
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

FROM node:20-bullseye-slim
WORKDIR /app
# Ensure runtime dependencies for Prisma (libssl1.1 on bullseye)
RUN apt-get update && apt-get install -y ca-certificates libssl1.1 --no-install-recommends || true
COPY --from=builder /app/dist ./dist
COPY packages/worker/package.json ./
RUN npm install --production --no-audit --no-fund || true
# Copy generated Prisma client files from builder into final node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
