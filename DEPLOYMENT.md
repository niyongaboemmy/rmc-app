# RMC Platform — Production Deployment Guide

Single EC2 · Nginx Reverse Proxy · Let's Encrypt SSL · GitHub Actions CI/CD  
Domain: **isengesho.com** (Namecheap → AWS Route 53)

---

## Architecture Overview

```
Internet
   │
   ▼
Route 53 (isengesho.com)
   │
   ▼
EC2 Elastic IP  (Ubuntu 22.04, t3.medium)
   │
   ▼
Nginx (80/443)
 ├─ isengesho.com        → Next.js frontend   :3001
 ├─ api.isengesho.com    → NestJS backend      :3000
 └─ cdn.isengesho.com    → NestJS file-server  :3002

EC2 also runs locally:
  PostgreSQL  :5432
  Redis       :6379
  MinIO       :9000
```

---

## Table of Contents

1. [AWS EC2 — Launch Instance](#1-aws-ec2--launch-instance)
2. [AWS Route 53 — Create Hosted Zone](#2-aws-route-53--create-hosted-zone)
3. [Namecheap — Point to AWS Nameservers](#3-namecheap--point-to-aws-nameservers)
4. [Route 53 — Create DNS Records](#4-route-53--create-dns-records)
5. [EC2 — Server Bootstrap](#5-ec2--server-bootstrap)
6. [EC2 — Install Application Dependencies](#6-ec2--install-application-dependencies)
7. [EC2 — Configure Nginx](#7-ec2--configure-nginx)
8. [EC2 — SSL with Certbot](#8-ec2--ssl-with-certbot)
9. [EC2 — Deploy the Application](#9-ec2--deploy-the-application)
10. [PM2 — Process Management](#10-pm2--process-management)
11. [GitHub Actions — CI/CD Pipeline](#11-github-actions--cicd-pipeline)
12. [GitHub Secrets Reference](#12-github-secrets-reference)
13. [Maintenance & Runbook](#13-maintenance--runbook)

---

## 1. AWS EC2 — Launch Instance

### 1.1 Launch via AWS Console

1. Open **EC2 → Instances → Launch instances**
2. **Name**: `rmc-production`
3. **AMI**: Ubuntu Server 22.04 LTS (64-bit x86)
4. **Instance type**: `t3.medium` (2 vCPU, 4 GB RAM — minimum for all 3 apps + DB)
5. **Key pair**: Create new → name `rmc-production-key` → Download `.pem` file and store it safely
6. **Network settings**:
   - VPC: default
   - Auto-assign public IP: **Disable** (we'll use an Elastic IP)
   - Create a new security group named `rmc-sg` with these inbound rules:

| Type        | Protocol | Port | Source        |
|-------------|----------|------|---------------|
| SSH         | TCP      | 22   | Your IP only  |
| HTTP        | TCP      | 80   | 0.0.0.0/0    |
| HTTPS       | TCP      | 443  | 0.0.0.0/0    |

7. **Storage**: 30 GB gp3 (increase to 50 GB if using MinIO for file uploads)
8. Click **Launch instance**

### 1.2 Allocate and Associate Elastic IP

```
EC2 → Elastic IPs → Allocate Elastic IP address → Allocate
                 → Actions → Associate Elastic IP address
                 → Instance: rmc-production → Associate
```

Note the Elastic IP — you'll need it for DNS. Call it `YOUR_ELASTIC_IP`.

---

## 2. AWS Route 53 — Create Hosted Zone

1. Open **Route 53 → Hosted zones → Create hosted zone**
2. **Domain name**: `isengesho.com`
3. **Type**: Public hosted zone
4. Click **Create hosted zone**

After creation, click the hosted zone. You'll see an **NS record** with 4 nameservers like:

```
ns-123.awsdns-45.com
ns-678.awsdns-90.net
ns-111.awsdns-22.org
ns-999.awsdns-01.co.uk
```

Copy all 4 — you need them in step 3.

---

## 3. Namecheap — Point to AWS Nameservers

1. Log in to [namecheap.com](https://namecheap.com)
2. Go to **Domain List → isengesho.com → Manage**
3. Under **Nameservers**, select **Custom DNS**
4. Enter the 4 Route 53 nameservers from step 2 (one per line)
5. Click the green checkmark to save

> **DNS propagation takes 15 minutes to 48 hours.** Use `dig NS isengesho.com` to verify.

---

## 4. Route 53 — Create DNS Records

In your hosted zone, create these **A records**:

| Record name          | Type | Value            | TTL |
|----------------------|------|------------------|-----|
| (blank / `@`)        | A    | `YOUR_ELASTIC_IP` | 300 |
| `api`                | A    | `YOUR_ELASTIC_IP` | 300 |
| `cdn`                | A    | `YOUR_ELASTIC_IP` | 300 |

**How to create each record:**
```
Route 53 → Hosted zones → isengesho.com → Create record
  Record name: (leave blank for root, or type "api" / "cdn")
  Record type: A
  Value: YOUR_ELASTIC_IP
  TTL: 300
→ Create records
```

Verify propagation:
```bash
dig A isengesho.com +short
dig A api.isengesho.com +short
dig A cdn.isengesho.com +short
# All three should return YOUR_ELASTIC_IP
```

---

## 5. EC2 — Server Bootstrap

SSH into the instance:
```bash
chmod 400 rmc-production-key.pem
ssh -i rmc-production-key.pem ubuntu@YOUR_ELASTIC_IP
```

Run these commands on the server:
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install essentials
sudo apt-get install -y \
  git curl wget unzip build-essential \
  nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib \
  redis-server \
  ufw

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 6. EC2 — Install Application Dependencies

### 6.1 Node.js 20 (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node -v   # should print v20.x.x
npm -v
```

### 6.2 PM2 (process manager)

```bash
npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu
# Copy and run the command it prints
sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/$(node -v)/bin \
  pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### 6.3 PostgreSQL — Create database and user

```bash
sudo -u postgres psql <<'SQL'
CREATE USER rmc_user WITH PASSWORD 'STRONG_DB_PASSWORD_HERE';
CREATE DATABASE rmc_db OWNER rmc_user;
GRANT ALL PRIVILEGES ON DATABASE rmc_db TO rmc_user;
SQL
```

Enable and start PostgreSQL:
```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 6.4 Redis — Configure password

```bash
sudo sed -i 's/# requirepass foobared/requirepass STRONG_REDIS_PASSWORD_HERE/' /etc/redis/redis.conf
sudo systemctl enable redis-server
sudo systemctl restart redis-server
```

### 6.5 MinIO (optional — skip if using S3)

```bash
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

sudo useradd -r minio-user -s /sbin/nologin
sudo mkdir -p /opt/minio/data
sudo chown minio-user:minio-user /opt/minio/data

sudo tee /etc/systemd/system/minio.service > /dev/null <<'EOF'
[Unit]
Description=MinIO
After=network.target

[Service]
User=minio-user
Group=minio-user
ExecStart=/usr/local/bin/minio server /opt/minio/data --console-address ":9001"
Environment=MINIO_ROOT_USER=minioadmin
Environment=MINIO_ROOT_PASSWORD=STRONG_MINIO_PASSWORD_HERE
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl start minio
```

---

## 7. EC2 — Configure Nginx

### 7.1 Frontend — isengesho.com

```bash
sudo tee /etc/nginx/sites-available/isengesho.com > /dev/null <<'EOF'
server {
    listen 80;
    server_name isengesho.com www.isengesho.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### 7.2 Backend — api.isengesho.com

```bash
sudo tee /etc/nginx/sites-available/api.isengesho.com > /dev/null <<'EOF'
server {
    listen 80;
    server_name api.isengesho.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### 7.3 File Server — cdn.isengesho.com

```bash
sudo tee /etc/nginx/sites-available/cdn.isengesho.com > /dev/null <<'EOF'
server {
    listen 80;
    server_name cdn.isengesho.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### 7.4 Enable sites and test

```bash
sudo ln -s /etc/nginx/sites-available/isengesho.com    /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.isengesho.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/cdn.isengesho.com /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t          # Must print: configuration file test is successful
sudo systemctl reload nginx
```

---

## 8. EC2 — SSL with Certbot

> **Wait until DNS has propagated** before running certbot (verify with `dig A isengesho.com`).

```bash
sudo certbot --nginx \
  -d isengesho.com \
  -d www.isengesho.com \
  -d api.isengesho.com \
  -d cdn.isengesho.com \
  --non-interactive \
  --agree-tos \
  --email your-email@example.com \
  --redirect
```

Certbot will:
- Issue a wildcard-ready certificate via Let's Encrypt
- Automatically edit the Nginx configs to add HTTPS (443) blocks
- Set up a 301 redirect from HTTP → HTTPS
- Install a cron job for auto-renewal

Verify auto-renewal:
```bash
sudo certbot renew --dry-run
```

---

## 9. EC2 — Deploy the Application

### 9.1 Clone the repository

```bash
sudo mkdir -p /opt/rmc-platform
sudo chown ubuntu:ubuntu /opt/rmc-platform

# Generate SSH deploy key for GitHub
ssh-keygen -t ed25519 -C "deploy@isengesho.com" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
# Add this public key to GitHub → repo Settings → Deploy keys (read-only is enough)

# Configure SSH to use it for GitHub
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
  StrictHostKeyChecking no
EOF

git clone git@github.com:YOUR_ORG/rmc-app.git /opt/rmc-platform
```

### 9.2 Create the production .env file

```bash
cat > /opt/rmc-platform/.env <<'EOF'
NODE_ENV=production
APP_PORT=3000
APP_URL=https://api.isengesho.com
FRONTEND_URL=https://isengesho.com

DATABASE_URL=postgresql://rmc_user:STRONG_DB_PASSWORD_HERE@localhost:5432/rmc_db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=rmc_db
DATABASE_USER=rmc_user
DATABASE_PASSWORD=STRONG_DB_PASSWORD_HERE

REDIS_URL=redis://:STRONG_REDIS_PASSWORD_HERE@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD_HERE

JWT_ACCESS_SECRET=GENERATE_WITH_openssl_rand_hex_64
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=GENERATE_WITH_openssl_rand_hex_64
JWT_REFRESH_EXPIRY=7d

MFA_APP_NAME=RMC Platform
BCRYPT_ROUNDS=12
OTP_EXPIRY_MINUTES=5
PASSWORD_RESET_EXPIRY_MINUTES=15

SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@isengesho.com

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=STRONG_MINIO_PASSWORD_HERE
MINIO_ENDPOINT=http://localhost:9000
S3_BUCKET_NAME=rmc-platform-uploads
EOF

# Lock down the .env file
chmod 600 /opt/rmc-platform/.env
```

> Generate strong secrets: `openssl rand -hex 64`

### 9.3 Build all apps

```bash
cd /opt/rmc-platform

# Install all workspace dependencies
npm ci --workspace=apps/backend
npm ci --workspace=apps/frontend
npm ci --workspace=apps/file-server

# Run DB migrations
cd apps/backend && npm run migration:run && cd ../..

# Build all apps
npm run build --workspace=apps/backend
npm run build --workspace=apps/frontend
npm run build --workspace=apps/file-server
```

---

## 10. PM2 — Process Management

### 10.1 Create PM2 ecosystem file

```bash
cat > /opt/rmc-platform/ecosystem.config.js <<'EOF'
require('dotenv').config({ path: '/opt/rmc-platform/.env' });

module.exports = {
  apps: [
    {
      name: 'rmc-backend',
      cwd: '/opt/rmc-platform/apps/backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '/opt/rmc-platform/.env',
      error_file: '/var/log/rmc/backend-error.log',
      out_file: '/var/log/rmc/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'rmc-frontend',
      cwd: '/opt/rmc-platform/apps/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_file: '/opt/rmc-platform/.env',
      error_file: '/var/log/rmc/frontend-error.log',
      out_file: '/var/log/rmc/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'rmc-file-server',
      cwd: '/opt/rmc-platform/apps/file-server',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      env_file: '/opt/rmc-platform/.env',
      error_file: '/var/log/rmc/file-server-error.log',
      out_file: '/var/log/rmc/file-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
EOF

# Create log directory
sudo mkdir -p /var/log/rmc
sudo chown ubuntu:ubuntu /var/log/rmc

# Start all apps
cd /opt/rmc-platform
pm2 start ecosystem.config.js
pm2 save   # persist across reboots
```

### 10.2 Verify all processes are running

```bash
pm2 list
# Expected output:
# ┌─ rmc-backend     │ online │ ...
# ├─ rmc-frontend    │ online │ ...
# └─ rmc-file-server │ online │ ...

# Spot-check health endpoints
curl http://localhost:3000/api/v1/health
curl http://localhost:3001
curl http://localhost:3002
```

Then verify through nginx:
```bash
curl https://isengesho.com
curl https://api.isengesho.com/api/v1/health
curl https://cdn.isengesho.com
```

---

## 11. GitHub Actions — CI/CD Pipeline

Replace the content of `.github/workflows/cd-production.yml` with the following:

```yaml
# .github/workflows/cd-production.yml
name: CD — Production Deploy

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type DEPLOY to confirm production deployment'
        required: true
  push:
    tags:
      - 'v*.*.*'

concurrency:
  group: production-deploy
  cancel-in-progress: false   # Never cancel an in-flight deploy

jobs:
  # ──────────────────────────────────────────────
  # 1. Build verification (fast gate before SSH)
  # ──────────────────────────────────────────────
  build-check:
    name: Build Check
    runs-on: ubuntu-latest
    timeout-minutes: 15
    if: >
      github.event_name == 'push' ||
      (github.event_name == 'workflow_dispatch' && github.event.inputs.confirm == 'DEPLOY')
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: |
            apps/backend/package-lock.json
            apps/frontend/package-lock.json
            apps/file-server/package-lock.json

      - name: Install — backend
        working-directory: apps/backend
        run: npm ci

      - name: Install — frontend
        working-directory: apps/frontend
        run: npm ci

      - name: Install — file-server
        working-directory: apps/file-server
        run: npm ci

      - name: Build — backend
        working-directory: apps/backend
        run: npm run build

      - name: Build — frontend
        working-directory: apps/frontend
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: https://api.isengesho.com

      - name: Build — file-server
        working-directory: apps/file-server
        run: npm run build

  # ──────────────────────────────────────────────
  # 2. Deploy to production EC2
  # ──────────────────────────────────────────────
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    timeout-minutes: 30
    needs: [build-check]
    environment:
      name: production
      url: https://isengesho.com
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ubuntu
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            set -e

            cd /opt/rmc-platform

            echo "==> Fetching latest code..."
            git fetch --all --tags
            git checkout ${{ github.ref_name }} 2>/dev/null || git checkout main

            echo "==> Installing dependencies..."
            npm ci --workspace=apps/backend
            npm ci --workspace=apps/frontend
            npm ci --workspace=apps/file-server

            echo "==> Running DB migrations..."
            cd apps/backend && npm run migration:run && cd ../..

            echo "==> Building apps..."
            npm run build --workspace=apps/backend
            npm run build --workspace=apps/frontend
            npm run build --workspace=apps/file-server

            echo "==> Reloading processes (zero-downtime)..."
            pm2 reload ecosystem.config.js --update-env

            echo "==> Health checks..."
            sleep 5
            curl -f http://localhost:3000/api/v1/health || (pm2 logs rmc-backend --lines 50 && exit 1)
            curl -f http://localhost:3001 || (pm2 logs rmc-frontend --lines 50 && exit 1)
            curl -f http://localhost:3002 || (pm2 logs rmc-file-server --lines 50 && exit 1)

            echo "==> Saving PM2 state..."
            pm2 save

            echo "✅ Deployment successful: ${{ github.ref_name }}"

  # ──────────────────────────────────────────────
  # 3. Notify result
  # ──────────────────────────────────────────────
  notify:
    name: Notify Result
    runs-on: ubuntu-latest
    needs: [deploy]
    if: always()
    steps:
      - name: Notify success
        if: needs.deploy.result == 'success'
        uses: slackapi/slack-github-action@v1
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": ":white_check_mark: Production deploy SUCCEEDED — ${{ github.ref_name }} by ${{ github.actor }}\nhttps://isengesho.com"
            }

      - name: Notify failure
        if: needs.deploy.result == 'failure'
        uses: slackapi/slack-github-action@v1
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": ":x: Production deploy FAILED — ${{ github.ref_name }} by ${{ github.actor }} — check GitHub Actions immediately"
            }
```

---

## 12. GitHub Secrets Reference

Go to **GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name           | Value                                         |
|-----------------------|-----------------------------------------------|
| `PRODUCTION_HOST`     | Your EC2 Elastic IP (e.g. `13.51.xxx.xxx`)    |
| `PRODUCTION_SSH_KEY`  | Contents of `rmc-production-key.pem`          |
| `SLACK_WEBHOOK_URL`   | Slack incoming webhook URL (optional)         |
| `CODECOV_TOKEN`       | Codecov upload token (optional, used by CI)   |

### How to get the SSH key value

```bash
cat rmc-production-key.pem
# Copy the entire output including -----BEGIN RSA PRIVATE KEY----- and -----END RSA PRIVATE KEY-----
```

---

## 13. Maintenance & Runbook

### View live logs

```bash
pm2 logs rmc-backend     --lines 100
pm2 logs rmc-frontend    --lines 100
pm2 logs rmc-file-server --lines 100
```

### Restart a specific app

```bash
pm2 restart rmc-backend
pm2 restart rmc-frontend
pm2 restart rmc-file-server
```

### Rollback a deployment

```bash
cd /opt/rmc-platform
git log --oneline -10          # find the tag/commit to roll back to
git checkout v1.2.3            # switch to previous version
npm run build --workspace=apps/backend
npm run build --workspace=apps/frontend
npm run build --workspace=apps/file-server
pm2 reload ecosystem.config.js
```

### SSL certificate renewal (auto — manual check)

```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

### Database backup

```bash
pg_dump -U rmc_user -d rmc_db -h localhost \
  -f /opt/backups/rmc_db_$(date +%Y%m%d_%H%M%S).sql
```

### Check Nginx status

```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Disk usage

```bash
df -h
du -sh /opt/rmc-platform/
du -sh /opt/minio/data/
```

---

## Quick Reference — Port Map

| App         | Internal Port | Public URL                   |
|-------------|--------------|------------------------------|
| Backend     | 3000         | https://api.isengesho.com    |
| Frontend    | 3001         | https://isengesho.com        |
| File Server | 3002         | https://cdn.isengesho.com    |
| PostgreSQL  | 5432         | localhost only               |
| Redis       | 6379         | localhost only               |
| MinIO API   | 9000         | localhost only               |
| MinIO UI    | 9001         | localhost only               |

---

*Generated for RMC Digital Platform — isengesho.com*
