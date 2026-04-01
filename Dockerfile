# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci

# Stage 2: Build client
FROM deps AS build-client
COPY packages/client packages/client
COPY tsconfig.base.json .
RUN npm -w packages/client run build

# Stage 3: Production image
FROM node:22-alpine AS production
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

# Install production deps only
RUN npm ci --omit=dev

# Copy server source (runs via tsx)
COPY packages/server packages/server
COPY tsconfig.base.json .

# Copy built client
COPY --from=build-client /app/packages/client/dist packages/client/dist

# Install tsx for running TypeScript
RUN npm install -g tsx

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/api/auth/me || exit 0

CMD ["tsx", "--max-old-space-size=384", "packages/server/src/index.ts"]
