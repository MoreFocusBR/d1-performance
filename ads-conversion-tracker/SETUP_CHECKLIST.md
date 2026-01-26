# Checklist de Setup - Ads Conversion Tracker

## ✅ Pré-Requisitos do Sistema

- [ ] PostgreSQL 12+ instalado ou acesso a servidor remoto
- [ ] Bun 1.3.6+ instalado (`bun --version`)
- [ ] Node.js 18+ (opcional, para ferramentas auxiliares)
- [ ] Docker 20.10+ (para containerização)
- [ ] Git (para versionamento)

## ✅ Configuração do Banco de Dados

### Informações de Conexão

```
Host:     200.80.111.222
Porta:    10103
Banco:    d1_performance
Usuário:  morefocus
Senha:    m0rolZgKrck23Yd1p7rS72euVOtqxdI7
```

### Checklist de Criação

- [ ] Banco de dados `d1_performance` criado
- [ ] Usuário `morefocus` com permissões
- [ ] Tabela `leads` criada
- [ ] Tabela `conversoes` criada
- [ ] Índices criados
- [ ] Views criadas
- [ ] Triggers configurados

**Como criar:** Consulte `DATABASE_SETUP.md`

## ✅ Configuração da Aplicação

### 1. Variáveis de Ambiente

- [ ] Arquivo `.env` criado (copiar de `.env.example`)
- [ ] `DB_HOST` configurado: `200.80.111.222`
- [ ] `DB_PORT` configurado: `10103`
- [ ] `DB_NAME` configurado: `d1_performance`
- [ ] `DB_USER` configurado: `morefocus`
- [ ] `DB_PASSWORD` configurado: `m0rolZgKrck23Yd1p7rS72euVOtqxdI7`
- [ ] `ENCRYPTION_KEY` configurado (mínimo 32 caracteres)
- [ ] `NODE_ENV` configurado: `development` ou `production`
- [ ] `PORT` configurado: `3001`
- [ ] `FRONTEND_URL` configurado: `http://localhost:3000` (ou seu domínio)

### 2. Dependências

- [ ] `bun install` executado com sucesso
- [ ] Arquivo `bun.lockb` criado
- [ ] Pasta `node_modules` criada

### 3. Estrutura de Diretórios

- [ ] Pasta `src/` com subpastas:
  - [ ] `routes/`
  - [ ] `services/`
  - [ ] `models/`
  - [ ] `middleware/`
  - [ ] `utils/`
- [ ] Pasta `public/` com:
  - [ ] `index.html` (landing page)
  - [ ] `admin.html` (painel admin)
- [ ] Pasta `scripts/` com:
  - [ ] `migrate-remote.ts`
  - [ ] `schema.sql`

## ✅ Testes Básicos

### 1. Teste de Conexão com BD

```bash
# Opção 1: Usando psql
psql -h 200.80.111.222 -p 10103 -U morefocus -d d1_performance -c "SELECT NOW();"

# Opção 2: Usando Bun (se a conexão remota funcionar)
bun run scripts/migrate-remote.ts
```

- [ ] Conexão com banco de dados bem-sucedida
- [ ] Tabelas criadas corretamente
- [ ] Índices criados corretamente

### 2. Teste de Servidor

```bash
# Iniciar servidor em desenvolvimento
bun run dev
```

- [ ] Servidor iniciado sem erros
- [ ] Servidor rodando em `http://localhost:3001`
- [ ] Não há erros de conexão com banco de dados

### 3. Teste de Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Capturar lead
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "(11) 98765-4321",
    "utm_source": "google",
    "utm_campaign": "test"
  }'

# Obter estatísticas
curl http://localhost:3001/health/stats?days=30
```

- [ ] Health check retorna status `ok`
- [ ] Captura de lead retorna `success: true`
- [ ] Estatísticas retornam dados válidos

### 4. Teste de Landing Page

- [ ] Acessar `http://localhost:3001/` carrega a página
- [ ] Formulário de telefone é visível
- [ ] Botão "Continuar no WhatsApp" funciona
- [ ] Página carrega em menos de 2 segundos

### 5. Teste de Painel Admin

- [ ] Acessar `http://localhost:3001/admin.html` carrega o painel
- [ ] Estatísticas são exibidas
- [ ] Tabelas de conversões carregam
- [ ] Filtros funcionam

## ✅ Configuração de Produção

### 1. Segurança

- [ ] `ENCRYPTION_KEY` alterado para valor seguro
- [ ] `NODE_ENV` configurado como `production`
- [ ] HTTPS/SSL configurado
- [ ] CORS configurado corretamente
- [ ] Firewall configurado

### 2. Performance

- [ ] Índices de banco de dados criados
- [ ] Cache configurado (Redis opcional)
- [ ] Compressão Gzip habilitada
- [ ] CDN configurado (opcional)

### 3. Monitoramento

- [ ] Logs configurados
- [ ] Alertas configurados
- [ ] Health checks configurados
- [ ] Métricas sendo coletadas

### 4. Backup

- [ ] Backup automático configurado
- [ ] Retenção de backups definida (mínimo 30 dias)
- [ ] Teste de restauração realizado

## ✅ Deploy

### Opção 1: Docker Compose (Recomendado para Desenvolvimento)

```bash
docker-compose up -d
```

- [ ] Container PostgreSQL iniciado
- [ ] Container da aplicação iniciado
- [ ] Ambos os containers estão saudáveis
- [ ] Aplicação acessível em `http://localhost:3001`

### Opção 2: Servidor Linux

```bash
# Build
bun run build

# Iniciar
bun run start
```

- [ ] Build concluído sem erros
- [ ] Servidor iniciado com sucesso
- [ ] Aplicação acessível no domínio configurado

### Opção 3: Docker Registry

```bash
docker build -t seu-registry/ads-conversion-tracker:latest .
docker push seu-registry/ads-conversion-tracker:latest
```

- [ ] Imagem buildada com sucesso
- [ ] Imagem pushed para registry
- [ ] Imagem pode ser puxada de outro local

### Opção 4: Heroku

```bash
heroku create ads-conversion-tracker
git push heroku main
```

- [ ] Aplicação criada no Heroku
- [ ] Deploy bem-sucedido
- [ ] Aplicação acessível em `https://ads-conversion-tracker.herokuapp.com`

## ✅ Integração com Ads Platforms

### Google Ads

- [ ] `GOOGLE_ADS_API_KEY` configurado
- [ ] `GOOGLE_ADS_CUSTOMER_ID` configurado
- [ ] Conversão de ação criada no Google Ads
- [ ] Testes de envio de conversão realizados

### Meta Ads

- [ ] `META_PIXEL_ID` configurado
- [ ] `META_ACCESS_TOKEN` configurado
- [ ] Pixel criado no Meta Business Manager
- [ ] Testes de envio de conversão realizados

## ✅ Documentação

- [ ] `README.md` lido e entendido
- [ ] `API.md` consultado para referência
- [ ] `DEPLOYMENT.md` consultado para deploy
- [ ] `INTEGRATIONS.md` consultado para integrações
- [ ] `DATABASE_SETUP.md` consultado para BD
- [ ] `PROJECT_SUMMARY.md` lido para visão geral

## ✅ Testes de Carga

- [ ] Teste com 100 requisições/segundo
- [ ] Teste com 1000 requisições/segundo
- [ ] Teste com 10000 requisições/segundo
- [ ] Tempo de resposta aceitável (< 100ms)
- [ ] Sem erros de conexão com BD

## ✅ Testes de Segurança

- [ ] Validação de entrada testada
- [ ] SQL injection testado
- [ ] XSS testado
- [ ] CSRF testado
- [ ] Rate limiting testado (se implementado)

## ✅ Testes de Conformidade

- [ ] LGPD verificada
- [ ] GDPR verificada
- [ ] Criptografia de dados sensíveis verificada
- [ ] Logs de auditoria verificados

## 📋 Próximos Passos

1. **Desenvolvimento**
   - [ ] Implementar integrações com Google Ads
   - [ ] Implementar integrações com Meta Ads
   - [ ] Adicionar autenticação (JWT)
   - [ ] Adicionar rate limiting

2. **Operação**
   - [ ] Configurar monitoramento (Prometheus, Grafana)
   - [ ] Configurar alertas (PagerDuty, Slack)
   - [ ] Configurar logs centralizados (ELK Stack)
   - [ ] Configurar CI/CD (GitHub Actions, GitLab CI)

3. **Escalabilidade**
   - [ ] Configurar Redis para cache
   - [ ] Configurar load balancer
   - [ ] Configurar replicação de BD
   - [ ] Configurar CDN

## 📞 Suporte

Se encontrar problemas durante o setup:

1. Consulte a documentação relevante
2. Verifique os logs da aplicação
3. Verifique os logs do PostgreSQL
4. Teste a conectividade de rede
5. Contate o administrador do sistema

---

## 📊 Resumo

| Item | Status | Data |
|------|--------|------|
| Banco de dados | ⏳ | |
| Aplicação | ⏳ | |
| Testes básicos | ⏳ | |
| Produção | ⏳ | |
| Documentação | ✅ | 26/01/2024 |

---

**Última atualização:** 26 de Janeiro de 2024
