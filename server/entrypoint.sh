#!/bin/sh
set -e

echo "Entrypoint: Running as user $(id -u):$(id -g)"

# Fix permissions for uploads directory if it exists
if [ -d "/app/server/uploads" ]; then
    echo "Fixing permissions for uploads directory..."
    chown -R nodejs:nodejs /app/server/uploads 2>/dev/null || echo "Warning: Could not chown uploads directory (may be volume mount)"
    chmod -R 755 /app/server/uploads 2>/dev/null || echo "Warning: Could not chmod uploads directory"
fi

# Create uploads directory if it doesn't exist (non-fatal)
mkdir -p /app/server/uploads/thumbnails 2>/dev/null || echo "Warning: Could not create uploads directory (may be volume mount)"
chown -R nodejs:nodejs /app/server/uploads 2>/dev/null || echo "Warning: Could not chown uploads directory"
chmod -R 755 /app/server/uploads 2>/dev/null || echo "Warning: Could not chmod uploads directory"

# Switch to nodejs user and execute the main command
if command -v su-exec >/dev/null 2>&1; then
    echo "Switching to nodejs user and executing: $@"
    exec su-exec nodejs "$@"
else
    # Fallback: if already running as nodejs, just execute
    echo "Running as current user (su-exec not available): $@"
    exec "$@"
fi

