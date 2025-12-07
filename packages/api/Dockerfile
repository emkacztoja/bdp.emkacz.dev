FROM node:20-slim AS builder
WORKDIR /app
# Install build dependencies for Prisma
RUN apt-get update && apt-get install -y curl ca-certificates build-essential python3 || true
# Copy API package manifest and install
COPY packages/api/package.json packages/api/package-lock.json* ./
RUN npm install --no-audit --no-fund --no-optional || true
# Copy prisma and source from packages/api
COPY packages/api/prisma ./prisma
COPY packages/api/src ./src
COPY packages/api/tsconfig*.json ./
# generate prisma client
RUN npm install prisma@^5 --no-audit --no-fund || true
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

FROM node:20-slim
WORKDIR /app
# Ensure runtime dependencies for Prisma
RUN apt-get update && apt-get install -y ca-certificates libssl1.1 || true
COPY --from=builder /app/dist ./dist
# Copy package.json from API package so we can install production deps
COPY packages/api/package.json ./
RUN npm install --production --no-audit --no-fund || true
# Copy generated Prisma client files from builder into final node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- --timeout=2 http://localhost:3000/api/ready || exit 1
CMD ["node", "dist/index.js"]
