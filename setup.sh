#!/bin/bash

# Main setup script for native VPS deployment (without Docker)
# Installs all dependencies in /home/ubuntu for persistence after reboot

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

# Get the actual user (not root when using sudo)
ACTUAL_USER=${SUDO_USER:-$USER}
PROJECT_DIR=$(pwd)

print_header "PRD Analyst Dashboard - Native VPS Setup"
print_info "Project directory: $PROJECT_DIR"
print_info "Running as user: $ACTUAL_USER"
print_info "Installation directory: /home/$ACTUAL_USER"
echo ""

# Update system packages
print_info "Updating system packages..."
apt-get update -qq

# Install basic dependencies
print_info "Installing basic system dependencies..."
apt-get install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    gnupg \
    unzip \
    ca-certificates \
    lsof

# Check if Conda is installed
print_header "Checking Conda Installation"
CONDA_BASE=""
if [ -d "/home/$ACTUAL_USER/miniconda3" ]; then
    CONDA_BASE="/home/$ACTUAL_USER/miniconda3"
elif [ -d "/home/$ACTUAL_USER/anaconda3" ]; then
    CONDA_BASE="/home/$ACTUAL_USER/anaconda3"
elif [ -d "/opt/conda" ]; then
    CONDA_BASE="/opt/conda"
fi

if [ -z "$CONDA_BASE" ] || [ ! -f "$CONDA_BASE/bin/conda" ]; then
    print_error "Conda is not installed for user $ACTUAL_USER."
    print_info "Please install Miniconda first:"
    print_info "  wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"
    print_info "  bash Miniconda3-latest-Linux-x86_64.sh"
    print_info "  source ~/.bashrc"
    exit 1
fi

print_info "Found Conda at: $CONDA_BASE"
CONDA_VERSION=$($CONDA_BASE/bin/conda --version)
print_info "Conda version: $CONDA_VERSION"

# Initialize conda for bash
print_info "Initializing Conda..."
sudo -u $ACTUAL_USER $CONDA_BASE/bin/conda init bash || true

# Create or update conda environment 'prd6' with Python 3.11
print_info "Setting up Conda environment 'prd6' with Python 3.11..."
if sudo -u $ACTUAL_USER $CONDA_BASE/bin/conda env list | grep -q "^prd6 "; then
    print_info "Environment 'prd6' already exists, updating..."
    sudo -u $ACTUAL_USER $CONDA_BASE/bin/conda install -n prd6 python=3.11 -y -q
else
    print_info "Creating new environment 'prd6'..."
    sudo -u $ACTUAL_USER $CONDA_BASE/bin/conda create -n prd6 python=3.11 -y -q
fi
print_info "Conda environment 'prd6' is ready!"

# Install PostgreSQL
print_header "Installing PostgreSQL 14"
bash "$PROJECT_DIR/scripts/setup-local-postgres.sh"

# Install Node.js and pnpm
print_header "Installing Node.js 20 and pnpm"
bash "$PROJECT_DIR/scripts/setup-local-nodejs.sh"

# Install PM2 globally
print_info "Installing PM2 globally..."
export NVM_DIR="/home/$ACTUAL_USER/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
sudo -u $ACTUAL_USER bash -c "source $NVM_DIR/nvm.sh && npm install -g pm2"
print_info "PM2 installed successfully"

# Install Nginx
print_info "Installing Nginx..."
apt-get install -y nginx
print_info "Nginx installed successfully"

# Install Chrome and ChromeDriver
print_header "Installing Chrome and ChromeDriver"
bash "$PROJECT_DIR/scripts/setup-local-chrome.sh"

# Setup database
print_header "Setting up Database"
bash "$PROJECT_DIR/scripts/setup-database.sh"

# Install Python dependencies in conda environment
print_header "Installing Python Dependencies"
print_info "Installing Python dependencies in 'prd6' environment..."
cd "$PROJECT_DIR/backend"
sudo -u $ACTUAL_USER $CONDA_BASE/envs/prd6/bin/pip install --upgrade pip -q
sudo -u $ACTUAL_USER $CONDA_BASE/envs/prd6/bin/pip install -r requirements.txt -q
print_info "Python dependencies installed successfully"

# Install Node.js dependencies
print_header "Installing Node.js Dependencies"
print_info "Installing Node.js dependencies..."
cd "$PROJECT_DIR/frontend"
export NVM_DIR="/home/$ACTUAL_USER/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
sudo -u $ACTUAL_USER bash -c "source $NVM_DIR/nvm.sh && pnpm install"
print_info "Node.js dependencies installed successfully"

# Build frontend for production
print_info "Building frontend..."
sudo -u $ACTUAL_USER bash -c "source $NVM_DIR/nvm.sh && pnpm build"
print_info "Frontend built successfully"

# Setup environment file
print_header "Setting up Environment File"
cd "$PROJECT_DIR"
if [ ! -f .env ]; then
    cp env.example .env
    print_warning "Created .env file from template. Please update with your actual values!"
    print_warning "IMPORTANT: Update GEMINI_API_KEY in .env file"
else
    print_info ".env file already exists, skipping..."
fi

# Make scripts executable
print_info "Making scripts executable..."
chmod +x "$PROJECT_DIR/scripts/"*.sh

# Print completion message
print_header "Setup Completed Successfully!"
echo ""
print_info "Installation Summary:"
echo "  ✓ PostgreSQL 14 installed in /home/$ACTUAL_USER/postgresql"
echo "  ✓ Node.js 20 installed via nvm in /home/$ACTUAL_USER/.nvm"
echo "  ✓ Chrome and ChromeDriver installed in /home/$ACTUAL_USER/chrome"
echo "  ✓ Database 'prd' created and schema imported"
echo "  ✓ Python dependencies installed in conda env 'prd6'"
echo "  ✓ Node.js dependencies installed"
echo "  ✓ Nginx installed"
echo "  ✓ PM2 installed"
echo "  ✓ Frontend built for production"
echo ""
print_info "For detailed documentation, see GUIDES.md"
