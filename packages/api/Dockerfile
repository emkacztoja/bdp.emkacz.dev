FROM node:20-alpine AS builder
WORKDIR /app
# Copy API package manifest and install
COPY packages/api/package.json packages/api/package-lock.json* ./
RUN npm install --no-audit --no-fund --no-optional || true
# Copy prisma and source from packages/api
COPY packages/api/prisma ./prisma
COPY packages/api/src ./src
COPY packages/api/tsconfig*.json ./
# generate prisma client
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
# Copy package.json from API package so we can install production deps
COPY packages/api/package.json ./
RUN npm install --production --no-audit --no-fund || true
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- --timeout=2 http://localhost:3000/api/ready || exit 1
CMD ["node", "dist/index.js"]
