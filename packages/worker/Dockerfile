FROM node:20-alpine AS builder
WORKDIR /app
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

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY packages/worker/package.json ./
RUN npm install --production --no-audit --no-fund || true
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
