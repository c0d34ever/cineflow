#!/bin/bash
# Setup script to create uploads directory with proper permissions

echo "Creating uploads directory structure..."

# Create directories
mkdir -p uploads/thumbnails

# Set permissions (755 = rwxr-xr-x)
chmod -R 755 uploads

# Get current user and group
CURRENT_USER=$(id -u)
CURRENT_GROUP=$(id -g)

echo "Uploads directory created at: $(pwd)/uploads"
echo "Permissions set to 755"
echo ""
echo "If you're using Docker, the container user (nodejs, UID 1001) needs write access."
echo "You may need to adjust permissions based on your Docker setup:"
echo "  Option 1: chown -R 1001:1001 uploads"
echo "  Option 2: chmod -R 777 uploads (less secure, but works for Docker)"
echo ""
echo "For production, consider using a named Docker volume instead of bind mount."

