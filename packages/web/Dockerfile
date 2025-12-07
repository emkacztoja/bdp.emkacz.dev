FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_ORIGIN
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN
COPY packages/web/package.json packages/web/package-lock.json* ./
RUN npm install --no-audit --no-fund || true
COPY packages/web/ ./
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
