# Guia de Deployment - Ads Conversion Tracker

## Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL 12+ (se não usar Docker)
- Bun 1.3.6+ (se não usar Docker)

## Desenvolvimento Local

### 1. Setup Inicial

```bash
# Clone o repositório
git clone <repository-url>
cd ads-conversion-tracker

# Instale as dependências
bun install

# Configure as variáveis de ambiente
cp .env.example .env

# Edite o arquivo .env com suas configurações
nano .env
```

### 2. Inicie o Banco de Dados

```bash
# Usando Docker Compose
docker-compose up -d postgres

# Ou usando PostgreSQL local
createdb ads_conversion_tracker
```

### 3. Execute as Migrações

```bash
bun run db:migrate
```

### 4. Inicie o Servidor

```bash
# Modo desenvolvimento (com hot reload)
bun run dev

# Modo produção
bun run build
bun run start
```

O servidor estará disponível em `http://localhost:3001`

## Docker Compose (Recomendado para Desenvolvimento)

```bash
# Inicie todos os serviços
docker-compose up

# Em background
docker-compose up -d

# Visualize os logs
docker-compose logs -f app

# Pare os serviços
docker-compose down
```

## Deployment em Produção

### Opção 1: Docker (Recomendado)

#### 1.1 Build da Imagem

```bash
# Build local
docker build -t ads-conversion-tracker:latest .

# Build com tag de versão
docker build -t ads-conversion-tracker:1.0.0 .
```

#### 1.2 Push para Registry

```bash
# Faça login no seu registry (Docker Hub, ECR, etc)
docker login

# Tag a imagem
docker tag ads-conversion-tracker:latest seu-registry/ads-conversion-tracker:latest

# Push
docker push seu-registry/ads-conversion-tracker:latest
```

#### 1.3 Deploy em Servidor

```bash
# SSH no servidor
ssh user@production-server

# Pull da imagem
docker pull seu-registry/ads-conversion-tracker:latest

# Crie arquivo docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ads_conversion_tracker
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ads-tracker

  app:
    image: seu-registry/ads-conversion-tracker:latest
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ads_conversion_tracker
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      GOOGLE_ADS_API_KEY: ${GOOGLE_ADS_API_KEY}
      GOOGLE_ADS_CUSTOMER_ID: ${GOOGLE_ADS_CUSTOMER_ID}
      META_PIXEL_ID: ${META_PIXEL_ID}
      META_ACCESS_TOKEN: ${META_ACCESS_TOKEN}
      FRONTEND_URL: ${FRONTEND_URL}
    ports:
      - "3001:3001"
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - ads-tracker

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - ads-tracker

volumes:
  postgres_data:

networks:
  ads-tracker:
    driver: bridge
EOF

# Configure as variáveis de ambiente
cat > .env.prod << 'EOF'
DB_USER=prod_user
DB_PASSWORD=secure_password_here
ENCRYPTION_KEY=your-32-char-encryption-key-here
GOOGLE_ADS_API_KEY=your-api-key
GOOGLE_ADS_CUSTOMER_ID=your-customer-id
META_PIXEL_ID=your-pixel-id
META_ACCESS_TOKEN=your-token
FRONTEND_URL=https://yourdomain.com
EOF

# Inicie os serviços
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Verifique o status
docker-compose -f docker-compose.prod.yml ps
```

### Opção 2: Heroku

```bash
# Instale o Heroku CLI
curl https://cli.heroku.com/install.sh | sh

# Faça login
heroku login

# Crie uma nova aplicação
heroku create ads-conversion-tracker

# Configure as variáveis de ambiente
heroku config:set NODE_ENV=production
heroku config:set DB_HOST=your-db-host
heroku config:set DB_USER=your-db-user
heroku config:set DB_PASSWORD=your-db-password
heroku config:set ENCRYPTION_KEY=your-encryption-key

# Deploy
git push heroku main
```

### Opção 3: AWS ECS

```bash
# Configure AWS CLI
aws configure

# Crie um repositório ECR
aws ecr create-repository --repository-name ads-conversion-tracker

# Build e push da imagem
docker build -t ads-conversion-tracker:latest .
docker tag ads-conversion-tracker:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/ads-conversion-tracker:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/ads-conversion-tracker:latest

# Crie a task definition e serviço ECS
# (Configure via AWS Console ou CLI)
```

### Opção 4: DigitalOcean App Platform

```bash
# Conecte seu repositório GitHub
# Configure as variáveis de ambiente no painel
# Deploy automático a cada push

# Variáveis necessárias:
# - NODE_ENV: production
# - DB_HOST: seu-db-host
# - DB_USER: seu-db-user
# - DB_PASSWORD: sua-senha
# - ENCRYPTION_KEY: sua-chave-de-encriptação
```

## Nginx Reverse Proxy

Crie um arquivo `nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml application/atom+xml image/svg+xml 
               text/x-component text/x-cross-domain-policy;

    upstream app {
        server app:3001;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        # Redirecione HTTP para HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL certificates
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Proxy configuration
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Cache static files
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## SSL/TLS

### Let's Encrypt com Certbot

```bash
# Instale Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtenha um certificado
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Configure renovação automática
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Monitoramento

### Logs

```bash
# Visualize logs em tempo real
docker-compose logs -f app

# Salve logs em arquivo
docker-compose logs app > app.log
```

### Health Check

```bash
# Verifique a saúde do servidor
curl https://yourdomain.com/health

# Verifique as estatísticas
curl https://yourdomain.com/health/stats?days=30
```

### Métricas

Implemente Prometheus e Grafana para monitoramento:

```bash
# Adicione ao docker-compose.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Backup e Recuperação

### Backup do Banco de Dados

```bash
# Backup completo
docker-compose exec postgres pg_dump -U postgres ads_conversion_tracker > backup.sql

# Backup com compressão
docker-compose exec postgres pg_dump -U postgres ads_conversion_tracker | gzip > backup.sql.gz

# Backup automático (cron)
0 2 * * * docker-compose exec postgres pg_dump -U postgres ads_conversion_tracker | gzip > /backups/backup-$(date +\%Y\%m\%d).sql.gz
```

### Restauração

```bash
# Restaure do backup
docker-compose exec -T postgres psql -U postgres ads_conversion_tracker < backup.sql

# Restaure do backup comprimido
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U postgres ads_conversion_tracker
```

## Escalabilidade

### Múltiplas Instâncias

```bash
# Scale com Docker Compose
docker-compose up -d --scale app=3

# Load balancing com Nginx
upstream app {
    server app:3001;
    server app:3002;
    server app:3003;
}
```

### Cache com Redis

```bash
# Adicione Redis ao docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

## Troubleshooting

### Aplicação não inicia

```bash
# Verifique os logs
docker-compose logs app

# Verifique a conexão com banco de dados
docker-compose exec app bun run -e "import { query } from './src/utils/db'; query('SELECT 1')"
```

### Banco de dados não conecta

```bash
# Verifique o status do PostgreSQL
docker-compose ps postgres

# Verifique os logs do PostgreSQL
docker-compose logs postgres

# Reinicie o PostgreSQL
docker-compose restart postgres
```

### Porta já em uso

```bash
# Mude a porta no docker-compose.yml
ports:
  - "3002:3001"

# Ou libere a porta
lsof -i :3001
kill -9 <PID>
```

## Checklist de Deployment

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados criado e migrado
- [ ] SSL/TLS configurado
- [ ] Nginx reverse proxy configurado
- [ ] Backups automatizados configurados
- [ ] Monitoramento ativo
- [ ] Health checks funcionando
- [ ] Logs sendo coletados
- [ ] Firewall configurado
- [ ] DNS apontando para o servidor

---

**Última atualização:** 26 de Janeiro de 2024
