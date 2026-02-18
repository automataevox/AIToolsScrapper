# Builder stage: use Node 20 to install dev deps and build
FROM node:20 AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev) for build
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . ./
RUN npm run build && npm prune --production

# Runtime stage: use Apify Playwright Chromium base image so browsers can be launched
FROM apify/actor-node-playwright:20 AS runtime
WORKDIR /app

# Copy package metadata (optional) and production node_modules from builder to avoid running npm as non-root
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Default command: run the built actor
CMD ["node", "dist/main.js"]
