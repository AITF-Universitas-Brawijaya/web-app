# Manual Setup

**What the script does:**
- ✅ Installs system dependencies (curl, wget, git, build-essential)
- ✅ Checks/validates Conda installation
- ✅ Creates conda environment `prd6` with Python 3.11
- ✅ Installs PostgreSQL 14 in `/home/ubuntu/postgresql`
- ✅ Installs Node.js 20 via nvm in `/home/ubuntu/.nvm`
- ✅ Installs Chrome and ChromeDriver in `/home/ubuntu/chrome`
- ✅ Sets up database `prd` with schema
- ✅ Installs Python dependencies in conda env
- ✅ Installs Node.js dependencies (pnpm)
- ✅ Builds frontend for production
- ✅ Creates `.env` file from template
- ✅ Installs systemd services (optional)

## Step 1: Install Miniconda

```bash
# Download Miniconda
cd /home/ubuntu
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh

# Install
bash Miniconda3-latest-Linux-x86_64.sh -b -p /home/ubuntu/miniconda3

# Initialize
/home/ubuntu/miniconda3/bin/conda init bash
source ~/.bashrc

# Create environment
conda create -n prd6 python=3.11 -y
```

## Step 2: Install PostgreSQL 14

```bash
# Install PostgreSQL locally (without sudo)
cd /home/ubuntu
wget https://ftp.postgresql.org/pub/source/v14.0/postgresql-14.0.tar.gz
tar -xzf postgresql-14.0.tar.gz
cd postgresql-14.0

# Configure and install
./configure --prefix=/home/ubuntu/postgresql
make
make install

# Initialize database
/home/ubuntu/postgresql/bin/initdb -D /home/ubuntu/postgresql/data

# Start PostgreSQL
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data -l logfile start

# Create database
/home/ubuntu/postgresql/bin/createdb prd
```

## Step 3: Install Node.js 20

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2
```

## Step 4: Install Nginx

```bash
# Install Nginx (requires sudo)
sudo apt update
sudo apt install nginx -y

# Verify installation
nginx -v
```

## Step 5: Install Chrome and ChromeDriver

```bash
# Download Chrome
cd /home/ubuntu
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb

# Install (requires sudo)
sudo apt install ./google-chrome-stable_current_amd64.deb -y

# Download ChromeDriver
CHROME_VERSION=$(google-chrome --version | grep -oP '\d+\.\d+\.\d+')
wget https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION%.*}
CHROMEDRIVER_VERSION=$(cat LATEST_RELEASE_${CHROME_VERSION%.*})
wget https://chromedriver.storage.googleapis.com/${CHROMEDRIVER_VERSION}/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/local/bin/
```

## Step 6: Setup Project

```bash
# Clone repository
cd /home/ubuntu
git clone https://github.com/AITF-Universitas-Brawijaya/prototype-dashboard-chatbot.git
cd prototype-dashboard-chatbot

# Install Python dependencies
conda activate prd6
cd backend
pip install -r requirements.txt

# Install Node.js dependencies
cd ../frontend
pnpm install

# Build frontend
pnpm build

# Setup environment
cd ..
cp env.example .env
nano .env  # Edit with your configuration
```

## Step 7: Setup Database Schema

```bash
# Import schema
cd /home/ubuntu/prototype-dashboard-chatbot
/home/ubuntu/postgresql/bin/psql -d prd -f backend/database/schema.sql
```

## Verification

After setup (automated or manual), verify all components:

```bash
# Check Conda
conda --version
conda env list | grep prd6

# Check PostgreSQL
/home/ubuntu/postgresql/bin/psql --version
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data status

# Check Node.js
node --version
npm --version
pnpm --version
pm2 --version

# Check Nginx
nginx -v

# Check Chrome
google-chrome --version
chromedriver --version

# Check Python packages
conda activate prd6
python -c "import fastapi; print('FastAPI OK')"
python -c "import uvicorn; print('Uvicorn OK')"
```

## Common Setup Issues

### Issue: Conda not found

```bash
# Add conda to PATH
echo 'export PATH="/home/ubuntu/miniconda3/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Issue: PostgreSQL won't start

```bash
# Check if already running
ps aux | grep postgres

# Check logs
cat /home/ubuntu/postgresql/data/logfile

# Try starting manually
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data -l logfile start
```

### Issue: Permission denied errors

```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /home/ubuntu/prototype-dashboard-chatbot
sudo chown -R ubuntu:ubuntu /home/ubuntu/postgresql
```

## Verify installations

```bash
pm2 --version
nginx -v
conda --version
node --version
pnpm --version
psql --version
```