#!/bin/bash

# Setup script for Chrome and ChromeDriver in /home/ubuntu/chrome
# Installs Chrome standalone for persistence after reboot

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
INSTALL_DIR="/home/$ACTUAL_USER/chrome"

print_info "Installing Chrome and ChromeDriver in $INSTALL_DIR"

# Install Chrome dependencies
print_info "Installing Chrome dependencies..."
apt-get update
apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    wget \
    unzip

# Create installation directory as the actual user
print_info "Creating installation directory..."
sudo -u $ACTUAL_USER mkdir -p "$INSTALL_DIR"

# Download and install Chrome
print_info "Downloading Google Chrome..."
cd /tmp
wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i google-chrome-stable_current_amd64.deb || apt-get install -f -y
rm google-chrome-stable_current_amd64.deb

# Get Chrome version
CHROME_VERSION=$(google-chrome --version | awk '{print $3}')
print_info "Chrome version: $CHROME_VERSION"

# Download ChromeDriver
print_info "Downloading ChromeDriver..."
CHROMEDRIVER_URL="https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}/linux64/chromedriver-linux64.zip"
wget -q "$CHROMEDRIVER_URL" -O /tmp/chromedriver.zip || {
    print_warning "Failed to download exact version, trying latest stable..."
    # Fallback to latest stable
    LATEST_VERSION=$(curl -s https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_STABLE)
    CHROMEDRIVER_URL="https://storage.googleapis.com/chrome-for-testing-public/${LATEST_VERSION}/linux64/chromedriver-linux64.zip"
    wget -q "$CHROMEDRIVER_URL" -O /tmp/chromedriver.zip
}

unzip -q /tmp/chromedriver.zip -d /tmp/
sudo -u $ACTUAL_USER cp /tmp/chromedriver-linux64/chromedriver "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/chromedriver"
rm -rf /tmp/chromedriver.zip /tmp/chromedriver-linux64

# Create symlinks in user bin
print_info "Creating symlinks..."
mkdir -p "$INSTALL_DIR/bin"
ln -sf /usr/bin/google-chrome "$INSTALL_DIR/bin/google-chrome"
ln -sf "$INSTALL_DIR/chromedriver" "$INSTALL_DIR/bin/chromedriver"

# Add Chrome to PATH in bashrc
print_info "Adding Chrome to PATH..."
BASHRC="/home/$ACTUAL_USER/.bashrc"
if ! grep -q "chrome/bin" "$BASHRC"; then
    cat >> "$BASHRC" <<EOF

# Chrome and ChromeDriver
export PATH="$INSTALL_DIR/bin:\$PATH"
EOF
fi

# Verify installations
CHROMEDRIVER_VERSION=$("$INSTALL_DIR/chromedriver" --version)
print_info "ChromeDriver version: $CHROMEDRIVER_VERSION"

print_info "Chrome and ChromeDriver installation completed!"
print_info ""
print_info "To use Chrome and ChromeDriver, run:"
print_info "  source ~/.bashrc"
print_info "  google-chrome --version"
print_info "  chromedriver --version"
