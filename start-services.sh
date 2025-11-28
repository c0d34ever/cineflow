#!/bin/bash

# CineFlow AI - Start Services Script (Linux)
# Starts both main API and admin microservice using PM2

set -e

echo "🚀 Starting CineFlow AI Services..."
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Please run ./setup-linux.sh first"
    exit 1
fi

# Navigate to project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if ecosystem.config.js exists
if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ ecosystem.config.js not found. Please run ./setup-linux.sh first"
    exit 1
fi

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: server/.env not found. Please create it from server/env.example"
    echo "   Services may not start correctly without proper configuration."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start services
echo "Starting services with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo ""
echo "✅ Services started!"
echo ""
echo "Useful commands:"
echo "  pm2 status       - Check service status"
echo "  pm2 logs         - View logs"
echo "  pm2 stop all     - Stop all services"
echo "  pm2 restart all  - Restart all services"
echo "  pm2 monit        - Monitor services"
echo ""
echo "Services are running:"
echo "  Main API:    http://localhost:5000"
echo "  Admin API:   http://localhost:5001"
echo "  Frontend:    http://localhost:3000 (if running)"
echo ""

