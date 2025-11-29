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
RUN npm run build:server && \
    echo "=== Checking build output ===" && \
    ls -la /app/server/dist/ 2>/dev/null || echo "dist directory missing" && \
    find /app/server/dist -type f 2>/dev/null | head -20 || echo "No files found" && \
    find /app -name "index.js" -type f 2>/dev/null | head -10 && \
    echo "=== Build completed, checking output ===" && \
    find /app/server/dist -type f 2>/dev/null | head -20 || echo "No files in server/dist" && \
    find /app -name "index.js" -type f 2>/dev/null | head -10

# Production image
FROM node:20-alpine

# Install su-exec for user switching
RUN apk add --no-cache su-exec

WORKDIR /app

# Install production dependencies only (root package.json for frontend)
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy entire server/dist directory from builder
COPY --from=backend-builder /app/server/dist ./server/dist-temp
# Copy server package.json and package-lock.json, then install server dependencies (needed for bcryptjs, etc.)
COPY --from=backend-builder /app/server/package*.json ./server/
# Copy migration SQL files (needed at runtime) - copy to both source and dist locations
COPY --from=backend-builder /app/server/db/migrations/*.sql ./server/db/migrations/
WORKDIR /app/server
RUN npm ci --omit=dev || npm install --omit=dev
WORKDIR /app

# Move files from nested server/ directory to dist root (because rootDir="../")
RUN echo "=== Starting file copy process ===" && \
    ls -la /app/server/dist-temp/ && \
    echo "=== Checking for nested server directory ===" && \
    ls -la /app/server/dist-temp/server/ 2>/dev/null || echo "No server subdirectory" && \
    echo "=== Looking for types.js ===" && \
    find /app/server/dist-temp -name "types.js" -type f 2>&1 && \
    mkdir -p /app/server/dist && \
    if [ -d /app/server/dist-temp/server ]; then \
      echo "Moving files from nested server/ directory..."; \
      cp -r /app/server/dist-temp/server/* /app/server/dist/ && \
      echo "Files copied, verifying..."; \
      ls -la /app/server/dist/ | head -10; \
    elif [ -f /app/server/dist-temp/index.js ]; then \
      echo "Found index.js at root level"; \
      cp -r /app/server/dist-temp/* /app/server/dist/; \
    else \
      echo "ERROR: index.js not found! Listing all files:"; \
      find /app/server/dist-temp -type f | head -20; \
      exit 1; \
    fi && \
    echo "=== Finding and copying types.js ===" && \
    if [ -f /app/server/dist-temp/types.js ]; then \
      cp /app/server/dist-temp/types.js /app/server/types.js && \
      echo "SUCCESS: types.js copied from dist-temp root"; \
    elif [ -f /app/server/dist-temp/server/types.js ]; then \
      cp /app/server/dist-temp/server/types.js /app/server/types.js && \
      echo "SUCCESS: types.js copied from nested server location"; \
    else \
      echo "Searching for types.js in dist-temp..."; \
      TYPES_PATH=$(find /app/server/dist-temp -name "types.js" -type f 2>/dev/null | head -1); \
      if [ -n "$TYPES_PATH" ]; then \
        cp "$TYPES_PATH" /app/server/types.js && \
        echo "SUCCESS: types.js found and copied from $TYPES_PATH"; \
      else \
        echo "ERROR: types.js not found in dist-temp! Listing all .js files:"; \
        find /app/server/dist-temp -name "*.js" -type f 2>&1 | head -10; \
        echo "Trying to find types.js in builder output..."; \
        exit 1; \
      fi; \
    fi && \
    echo "=== Copying migration SQL files ===" && \
    mkdir -p /app/server/dist/db/migrations && \
    if [ -d /app/server/db/migrations ]; then \
      cp /app/server/db/migrations/*.sql /app/server/dist/db/migrations/ 2>/dev/null && \
      echo "SUCCESS: Migration SQL files copied" && \
      ls -la /app/server/dist/db/migrations/*.sql 2>/dev/null | head -5 || echo "No SQL files found"; \
    else \
      echo "WARNING: /app/server/db/migrations directory not found"; \
    fi && \
    echo "=== Final verification ===" && \
    test -f /app/server/dist/index.js && echo "SUCCESS: index.js found at /app/server/dist/index.js" && ls -lh /app/server/dist/index.js && head -3 /app/server/dist/index.js || (echo "ERROR: index.js still missing!" && echo "Files in dist:" && find /app/server/dist -type f | head -20 && exit 1) && \
    test -f /app/server/types.js && echo "SUCCESS: types.js found at /app/server/types.js" || (echo "ERROR: types.js not found at /app/server/types.js - checking where it is..." && find /app -name "types.js" -type f 2>&1 && exit 1) && \
    rm -rf /app/server/dist-temp

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create uploads directory and set permissions (as root, before switching user)
RUN mkdir -p /app/server/uploads /app/server/uploads/thumbnails && \
    chown -R nodejs:nodejs /app/server/uploads && \
    chmod -R 755 /app/server/uploads && \
    chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server - run from server directory so package.json is found
WORKDIR /app/server
# Verify file exists and show its location
RUN echo "=== Verifying before CMD ===" && \
    pwd && \
    echo "=== Contents of /app/server ===" && \
    ls -la /app/server/ && \
    echo "=== Contents of /app/server/dist ===" && \
    ls -la /app/server/dist/ 2>&1 || echo "dist directory missing" && \
    echo "=== Looking for index.js ===" && \
    find /app/server -name "index.js" -type f 2>&1 && \
    test -f dist/index.js && echo "SUCCESS: dist/index.js exists and is readable" || (echo "ERROR: dist/index.js missing!" && echo "Files in dist:" && find /app/server/dist -type f 2>&1 | head -20 && exit 1)
CMD ["node", "dist/index.js"]

