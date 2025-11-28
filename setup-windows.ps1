# CineFlow AI - Windows Setup Script (PowerShell)
# This script sets up both the main API and admin microservice

Write-Host "🚀 CineFlow AI - Windows Setup Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Some operations may require administrator privileges" -ForegroundColor Yellow
}

# Function to print colored output
function Print-Success {
    Write-Host "✅ $args" -ForegroundColor Green
}

function Print-Error {
    Write-Host "❌ $args" -ForegroundColor Red
}

function Print-Info {
    Write-Host "ℹ️  $args" -ForegroundColor Yellow
}

# Check Node.js
Print-Info "Checking Node.js installation..."
try {
    $nodeVersion = node -v
    Print-Success "Node.js found: $nodeVersion"
} catch {
    Print-Error "Node.js not found. Please install Node.js 20+ from https://nodejs.org/"
    Write-Host "After installing Node.js, run this script again." -ForegroundColor Yellow
    exit 1
}

# Check npm
try {
    $npmVersion = npm -v
    Print-Success "npm found: $npmVersion"
} catch {
    Print-Error "npm not found. Please install Node.js."
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Print-Info "Project directory: $scriptDir"

# Install root dependencies
Print-Info "Installing root dependencies..."
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Root dependencies installed"
    } else {
        Print-Error "Failed to install root dependencies"
        exit 1
    }
} else {
    Print-Error "package.json not found in root directory"
    exit 1
}

# Setup backend
Print-Info "Setting up backend server..."
Set-Location server

# Install backend dependencies
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Backend dependencies installed"
    } else {
        Print-Error "Failed to install backend dependencies"
        exit 1
    }
} else {
    Print-Error "server/package.json not found"
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Print-Info "Creating .env file from template..."
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Print-Success ".env file created"
        Print-Info "⚠️  Please edit server\.env and add your GEMINI_API_KEY and update JWT_SECRET"
    } else {
        Print-Error "env.example not found"
        exit 1
    }
} else {
    Print-Info ".env file already exists"
}

# Build backend
Print-Info "Building backend..."
npm run build
if ($LASTEXITCODE -eq 0) {
    Print-Success "Backend built successfully"
} else {
    Print-Error "Backend build failed"
    exit 1
}

# Go back to root
Set-Location ..

# Build frontend
Print-Info "Building frontend..."
npm run build
if ($LASTEXITCODE -eq 0) {
    Print-Success "Frontend built successfully"
} else {
    Print-Error "Frontend build failed"
    exit 1
}

# Create PM2 ecosystem file
Print-Info "Creating PM2 configuration..."
$ecosystemConfig = @"
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
"@

$ecosystemConfig | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8
Print-Success "PM2 configuration created"

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Print-Success "Logs directory created"
}

# Check if PM2 is installed
Print-Info "Checking PM2 installation..."
try {
    $pm2Version = pm2 -v
    Print-Success "PM2 found: $pm2Version"
} catch {
    Print-Info "PM2 not found. Installing PM2 globally..."
    npm install -g pm2
    if ($LASTEXITCODE -eq 0) {
        Print-Success "PM2 installed"
    } else {
        Print-Error "Failed to install PM2. You may need to run PowerShell as Administrator."
    }
}

# Create start script
Print-Info "Creating start script..."
$startScript = @"
@echo off
echo Starting CineFlow AI Services...
cd /d "%~dp0"
pm2 start ecosystem.config.js
pm2 save
echo.
echo Services started!
echo.
echo Useful commands:
echo   pm2 status     - Check service status
echo   pm2 logs       - View logs
echo   pm2 stop all   - Stop all services
echo   pm2 restart all - Restart all services
echo.
pause
"@

$startScript | Out-File -FilePath "start-services.bat" -Encoding ASCII
Print-Success "Start script created: start-services.bat"

# Create stop script
$stopScript = @"
@echo off
echo Stopping CineFlow AI Services...
pm2 stop all
echo Services stopped.
pause
"@

$stopScript | Out-File -FilePath "stop-services.bat" -Encoding ASCII
Print-Success "Stop script created: stop-services.bat"

# Summary
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Print-Success "Setup completed successfully!"
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit server\.env file:"
Write-Host "   - Add your GEMINI_API_KEY"
Write-Host "   - Change JWT_SECRET to a secure random string"
Write-Host "   - Verify database credentials"
Write-Host ""
Write-Host "2. Start services:"
Write-Host "   .\start-services.bat"
Write-Host ""
Write-Host "   Or manually:"
Write-Host "   pm2 start ecosystem.config.js"
Write-Host ""
Write-Host "3. Check status:"
Write-Host "   pm2 status"
Write-Host ""
Write-Host "4. View logs:"
Write-Host "   pm2 logs"
Write-Host ""

