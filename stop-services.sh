#!/bin/bash

# CineFlow AI - Stop Services Script (Linux)

echo "🛑 Stopping CineFlow AI Services..."

if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found"
    exit 1
fi

pm2 stop all
echo "✅ Services stopped"

