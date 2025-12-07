FROM node:20-alpine AS builder
WORKDIR /app
# Copy worker package manifest
COPY packages/worker/package.json packages/worker/package-lock.json* ./
RUN npm ci --ignore-scripts
# Copy prisma schema from API package into builder so prisma generate works
COPY packages/api/prisma ./prisma
# Copy worker source
COPY packages/worker/src ./src
COPY packages/worker/tsconfig.json ./
# generate prisma client
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY packages/worker/package.json ./
RUN npm ci --production --ignore-scripts
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
