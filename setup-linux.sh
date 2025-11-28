#!/bin/bash

# CineFlow AI - Linux/Ubuntu Setup Script
# This script sets up both the main API and admin microservice

set -e  # Exit on error

echo "🚀 CineFlow AI - Linux Setup Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run this script as root${NC}"
   exit 1
fi

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
    print_info "Detected OS: $PRETTY_NAME"
else
    print_error "Cannot detect OS. This script is designed for Ubuntu/Debian."
    exit 1
fi

# Check Node.js
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_info "Node.js not found. Installing Node.js 20..."
    
    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    print_success "Node.js installed"
else
    NODE_VERSION=$(node -v)
    print_success "Node.js found: $NODE_VERSION"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install Node.js."
    exit 1
fi

# Check MySQL client (optional, for testing connection)
print_info "Checking MySQL client..."
if ! command -v mysql &> /dev/null; then
    print_info "MySQL client not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y mysql-client
    print_success "MySQL client installed"
fi

# Navigate to project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

print_info "Project directory: $SCRIPT_DIR"

# Install root dependencies
print_info "Installing root dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Root dependencies installed"
else
    print_error "package.json not found in root directory"
    exit 1
fi

# Setup backend
print_info "Setting up backend server..."
cd server

# Install backend dependencies
if [ -f "package.json" ]; then
    npm install
    print_success "Backend dependencies installed"
else
    print_error "server/package.json not found"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file from template..."
    if [ -f "env.example" ]; then
        cp env.example .env
        print_success ".env file created"
        print_info "⚠️  Please edit server/.env and add your GEMINI_API_KEY and update JWT_SECRET"
    else
        print_error "env.example not found"
        exit 1
    fi
else
    print_info ".env file already exists"
fi

# Build backend
print_info "Building backend..."
npm run build
print_success "Backend built successfully"

# Go back to root
cd ..

# Build frontend
print_info "Building frontend..."
npm run build
print_success "Frontend built successfully"

# Create PM2 ecosystem file for process management
print_info "Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'cineflow-api',
      script: './server/dist/index.js',
      cwd: './server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'cineflow-admin',
      script: './server/dist/admin/index.js',
      cwd: './server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ADMIN_PORT: 5001
      },
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF
print_success "PM2 configuration created"

# Create logs directory
mkdir -p logs
print_success "Logs directory created"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_info "PM2 not found. Installing PM2 globally..."
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 found: $(pm2 -v)"
fi

# Summary
echo ""
echo "===================================="
print_success "Setup completed successfully!"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. Edit server/.env file:"
echo "   - Add your GEMINI_API_KEY"
echo "   - Change JWT_SECRET to a secure random string"
echo "   - Verify database credentials"
echo ""
echo "2. Start services:"
echo "   ./start-services.sh"
echo ""
echo "   Or manually:"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "3. Check status:"
echo "   pm2 status"
echo ""
echo "4. View logs:"
echo "   pm2 logs"
echo ""
echo "5. Save PM2 configuration:"
echo "   pm2 save"
echo "   pm2 startup"
echo ""

