#!/bin/bash

# Setup script for Node.js 20 and pnpm using nvm
# Installs in /home/ubuntu/.nvm for persistence after reboot

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the actual user (not root when using sudo)
ACTUAL_USER=${SUDO_USER:-$USER}
USER_HOME="/home/$ACTUAL_USER"
NVM_DIR="$USER_HOME/.nvm"

print_info "Installing Node.js 20 and pnpm via nvm"

# Install nvm
print_info "Installing nvm..."
if [ -d "$NVM_DIR" ]; then
    print_warning "nvm already installed, skipping..."
else
    sudo -u $ACTUAL_USER bash -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
fi

# Load nvm
export NVM_DIR="$NVM_DIR"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20
print_info "Installing Node.js 20..."
sudo -u $ACTUAL_USER bash -c "source $NVM_DIR/nvm.sh && nvm install 20.19.6 && nvm use 20.19.6 && nvm alias default 20.19.6"

# Install pnpm
print_info "Installing pnpm..."
sudo -u $ACTUAL_USER bash -c "source $NVM_DIR/nvm.sh && npm install -g pnpm"

# Verify installations
print_info "Verifying installations..."
NODE_VERSION=$(sudo -u $ACTUAL_USER bash -c "source $NVM_DIR/nvm.sh && node --version")
NPM_VERSION=$(sudo -u $ACTUAL_USER bash -c "source $NVM_DIR/nvm.sh && npm --version")
PNPM_VERSION=$(sudo -u $ACTUAL_USER bash -c "source $NVM_DIR/nvm.sh && pnpm --version")

print_info "Node.js version: $NODE_VERSION"
print_info "npm version: $NPM_VERSION"
print_info "pnpm version: $PNPM_VERSION"

print_info "Node.js and pnpm installation completed!"
print_info ""
print_info "To use Node.js and pnpm, run:"
print_info "  source ~/.bashrc"
print_info "  node --version"
print_info "  pnpm --version"
