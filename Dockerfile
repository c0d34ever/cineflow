# Multi-stage build for production
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Copy all frontend source files
COPY . .

# Install dependencies and build frontend
RUN npm ci
RUN npm run build

# Backend builder
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy root package files (includes @types/node in devDependencies)
COPY package*.json ./
COPY tsconfig.json ./

# Copy server package files
COPY server/package*.json ./server/
COPY server/tsconfig.json ./server/

# Copy backend source
COPY server ./server
COPY types.ts ./

# Install root dependencies (including devDependencies for build)
RUN npm ci

# Install server dependencies (including devDependencies for build)
WORKDIR /app/server
RUN npm ci

# Build backend (from root directory)
WORKDIR /app
RUN npm run build:server

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy built backend - with rootDir="../", output might be at server/dist/server/index.js
COPY --from=backend-builder /app/server/dist ./server/dist

# Fix nested structure if rootDir caused it (server/dist/server/* -> server/dist/*)
RUN if [ -d /app/server/dist/server ]; then \
      echo "Fixing nested structure from rootDir..."; \
      mv /app/server/dist/server/* /app/server/dist/ 2>/dev/null && \
      rmdir /app/server/dist/server 2>/dev/null || true; \
    fi && \
    if [ ! -f /app/server/dist/index.js ]; then \
      echo "ERROR: index.js not found!"; \
      echo "Files in /app/server/dist:"; \
      find /app/server/dist -type f; \
      echo "All index.js files:"; \
      find /app -name "index.js" -type f; \
      exit 1; \
    fi

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server/dist/index.js"]

