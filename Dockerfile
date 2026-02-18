# Builder stage: use Node 20 to install dev deps and build
FROM node:20 AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev) for build
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . ./
RUN npm run build

# Runtime stage: use Apify base image (Node 20) with only production deps
FROM apify/actor-node:20 AS runtime
WORKDIR /app

# Install only production dependencies for a smaller image
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy built files and necessary metadata from builder
COPY --from=builder /app/dist ./dist
# Optionally copy metadata if present in the build context; avoid failing when absent
# Copying README/INPUT_SCHEMA/.actor is not required for runtime execution, so skip.

# Default command: run the built actor
CMD ["node", "dist/main.js"]
