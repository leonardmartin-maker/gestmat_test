#!/bin/bash
set -e

# ============================================================
# Deployment script for gestion-materiel
# Run on VPS: ./deploy.sh
# ============================================================

DOMAIN_FRONT="gestion-materiel.swissworktogether.ch"
DOMAIN_API="api-gestion-materiel.swissworktogether.ch"
EMAIL="admin@swissworktogether.ch"  # For Let's Encrypt notifications

echo "=== Gestion Matériel - Deployment ==="

# 1. Check prerequisites
echo ""
echo "[1/6] Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Please log out and back in, then re-run this script."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "ERROR: docker compose not available"
    exit 1
fi

echo "  Docker: OK"

# 2. Create .env.prod if missing
echo ""
echo "[2/6] Checking environment..."

if [ ! -f .env.prod ]; then
    echo "  Creating .env.prod from template..."
    cp .env.prod.example .env.prod

    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32)
    AUDIT_SALT=$(openssl rand -hex 16)
    DB_PASSWORD=$(openssl rand -hex 16)

    sed -i "s/CHANGE_ME_RANDOM_64_CHARS/$JWT_SECRET/g" .env.prod
    sed -i "s/CHANGE_ME_RANDOM_SALT/$AUDIT_SALT/g" .env.prod
    sed -i "s/CHANGE_ME_STRONG_PASSWORD/$DB_PASSWORD/g" .env.prod

    echo "  .env.prod created with random secrets"
    echo "  Review it: nano .env.prod"
else
    echo "  .env.prod exists"
fi

# 3. SSL Certificates
echo ""
echo "[3/6] SSL Certificates..."

mkdir -p nginx/certbot/conf nginx/certbot/www

if [ ! -d "nginx/certbot/conf/live/$DOMAIN_FRONT" ]; then
    echo "  Obtaining SSL certificates..."

    # Use init config (HTTP only) temporarily
    cp nginx/conf.d/default.conf nginx/conf.d/default.conf.bak
    cp nginx/conf.d/init-ssl.conf nginx/conf.d/default.conf

    # Start nginx only
    docker compose -f docker-compose.prod.yml up -d nginx
    sleep 3

    # Get certificates
    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot --webroot-path=/var/www/certbot \
        --email "$EMAIL" --agree-tos --no-eff-email \
        -d "$DOMAIN_FRONT"

    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot --webroot-path=/var/www/certbot \
        --email "$EMAIL" --agree-tos --no-eff-email \
        -d "$DOMAIN_API"

    # Restore full config
    cp nginx/conf.d/default.conf.bak nginx/conf.d/default.conf
    rm nginx/conf.d/default.conf.bak

    docker compose -f docker-compose.prod.yml down

    echo "  SSL certificates obtained"
else
    echo "  SSL certificates already exist"
fi

# 4. Build
echo ""
echo "[4/6] Building images..."

docker compose -f docker-compose.prod.yml build

# 5. Deploy
echo ""
echo "[5/6] Starting services..."

docker compose -f docker-compose.prod.yml up -d

echo "  Waiting for services to start..."
sleep 5

# 6. Health check
echo ""
echo "[6/6] Health check..."

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/health" || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "  API: OK (200)"
else
    echo "  API: WARNING (status: $API_STATUS)"
    echo "  Check logs: docker compose -f docker-compose.prod.yml logs api"
fi

echo ""
echo "=== Deployment complete ==="
echo ""
echo "  Frontend: https://$DOMAIN_FRONT"
echo "  API:      https://$DOMAIN_API"
echo "  API docs: https://$DOMAIN_API/docs"
echo ""
echo "=== Useful commands ==="
echo "  Logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "  Restart: docker compose -f docker-compose.prod.yml restart"
echo "  Stop:    docker compose -f docker-compose.prod.yml down"
echo "  Update:  git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "=== SSL renewal (add to crontab) ==="
echo '  0 3 * * 1 cd /path/to/gestionmateriel && docker compose -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload'
