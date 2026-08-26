# ---- deps + build ----
FROM node:20-alpine AS builder
WORKDIR /app

# better-sqlite3 compiles a native addon; alpine needs the toolchain to build it.
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV DB_PATH=/app/data/pulsesync.db

EXPOSE 4000
CMD ["node", "dist/index.js"]
