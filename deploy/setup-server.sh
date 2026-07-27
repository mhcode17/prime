#!/usr/bin/env bash
# One-time droplet bootstrap. Run as root on a fresh Ubuntu 22.04/24.04 droplet:
#   ssh root@YOUR_DROPLET_IP 'bash -s' < deploy/setup-server.sh
set -euo pipefail

APP_DIR=/opt/trucking-crm

echo "==> Installing Docker Engine + compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker --version
docker compose version

echo "==> Enabling Docker on boot"
systemctl enable --now docker

echo "==> Creating app directory at ${APP_DIR}"
mkdir -p "${APP_DIR}"

echo "==> Configuring firewall (allow SSH, HTTP, HTTPS)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  yes | ufw enable || true
fi

echo
echo "✅ Server ready."
echo
echo "NEXT STEPS (do these manually, on the server):"
echo "  1. Create the environment file:  nano ${APP_DIR}/.env"
echo "     (use deploy/.env.server.example as a template)"
echo "  2. Point your domain's A record at this droplet's public IP."
echo "  3. Push to GitHub 'main' — the Deploy workflow will ship the app here."
echo
echo "  The GitHub Action copies docker-compose.prod.yml + Caddyfile into ${APP_DIR}"
echo "  and runs 'docker compose up -d' for you on every push."
