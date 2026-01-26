# Guia de Setup do Banco de Dados Remoto

## 📍 Informações de Conexão

```
Host: 200.80.111.222
Porta: 10103
Banco: d1_performance
Usuário: morefocus
Senha: m0rolZgKrck23Yd1p7rS72euVOtqxdI7
```

## ✅ Pré-requisitos

- PostgreSQL 12+
- Acesso à rede do servidor (firewall configurado)
- Cliente PostgreSQL (`psql`) ou ferramenta de administração

## 🚀 Opção 1: Criar Tabelas via Script SQL (Recomendado)

### 1.1 Usando pgAdmin

1. Acesse pgAdmin ou sua ferramenta de administração PostgreSQL
2. Conecte ao servidor: `200.80.111.222:10103`
3. Selecione o banco: `d1_performance`
4. Abra a aba "Query Tool"
5. Copie e cole o conteúdo de `scripts/schema.sql`
6. Execute (F5 ou botão "Execute")

### 1.2 Usando psql (Linha de Comando)

```bash
# Conectar ao banco de dados
psql -h 200.80.111.222 -p 10103 -U morefocus -d d1_performance

# Dentro do psql, execute:
\i scripts/schema.sql

# Ou execute diretamente:
psql -h 200.80.111.222 -p 10103 -U morefocus -d d1_performance < scripts/schema.sql
```

### 1.3 Usando DBeaver

1. Crie uma nova conexão PostgreSQL
2. Configure:
   - **Host:** 200.80.111.222
   - **Port:** 10103
   - **Database:** d1_performance
   - **Username:** morefocus
   - **Password:** m0rolZgKrck23Yd1p7rS72euVOtqxdI7
3. Teste a conexão
4. Abra um novo SQL Script
5. Copie o conteúdo de `scripts/schema.sql`
6. Execute (Ctrl+Enter)

## 🚀 Opção 2: Criar Tabelas via Bun (Se a Conexão Funcionar)

```bash
# Certifique-se de que o .env está configurado corretamente
cd /home/ubuntu/ads-conversion-tracker

# Execute o script de migração
bun run scripts/migrate-remote.ts
```

## 📋 O Que Será Criado

### Tabelas

#### 1. `leads`
Armazena informações dos leads capturados pela landing page.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| telefone | VARCHAR(255) | Telefone criptografado |
| telefone_hash | VARCHAR(64) | Hash do telefone (UNIQUE) |
| utm_source | VARCHAR(100) | Origem da campanha |
| utm_medium | VARCHAR(100) | Meio da campanha |
| utm_campaign | VARCHAR(255) | Nome da campanha |
| utm_content | VARCHAR(255) | Conteúdo do anúncio |
| utm_term | VARCHAR(255) | Termo de busca |
| gclid | VARCHAR(255) | Google Click ID |
| fbclid | VARCHAR(255) | Facebook Click ID |
| ip_address | VARCHAR(45) | IP do cliente |
| user_agent | TEXT | User Agent do navegador |
| created_at | TIMESTAMP | Data/hora de criação |
| status | VARCHAR(50) | Status (novo, convertido, expirado) |

#### 2. `conversoes`
Armazena informações das conversões (vendas).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| lead_id | UUID | FK para tabela leads |
| codigo_venda | VARCHAR(50) | Código da venda (UNIQUE) |
| valor_venda | DECIMAL(15,2) | Valor total da venda |
| canal | VARCHAR(50) | Canal de venda |
| data_venda | TIMESTAMP | Data/hora da venda |
| google_ads_enviado | BOOLEAN | Flag de envio para Google |
| meta_ads_enviado | BOOLEAN | Flag de envio para Meta |
| created_at | TIMESTAMP | Data/hora de criação |

### Índices

Para otimizar performance:

```
idx_leads_telefone_hash       - Busca rápida por telefone
idx_leads_status              - Filtro por status
idx_leads_created_at          - Filtro por data
idx_leads_status_created      - Filtro combinado
idx_conversoes_lead_id        - Busca de conversões por lead
idx_conversoes_codigo_venda   - Busca de conversão por código
idx_conversoes_created_at     - Filtro de conversões por data
```

### Views

Para análise de dados:

```
vw_conversoes_stats    - Estatísticas de conversões por dia
vw_leads_status        - Contagem de leads por status por dia
```

### Triggers

Automação de processos:

```
trg_update_lead_status - Atualiza status do lead para "convertido" 
                         quando uma conversão é criada
```

## ✅ Verificação

Após criar as tabelas, verifique se tudo foi criado corretamente:

### Via psql

```bash
# Conectar ao banco
psql -h 200.80.111.222 -p 10103 -U morefocus -d d1_performance

# Listar tabelas
\dt

# Listar índices
\di

# Listar views
\dv

# Listar funções
\df

# Sair
\q
```

### Via SQL

```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Verificar índices
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' ORDER BY indexname;

-- Verificar views
SELECT viewname FROM pg_views 
WHERE schemaname = 'public' ORDER BY viewname;

-- Contar registros
SELECT COUNT(*) FROM leads;
SELECT COUNT(*) FROM conversoes;
```

## 🔧 Troubleshooting

### Erro: "Connection refused"

**Causa:** Firewall ou servidor bloqueando conexões
**Solução:** 
- Verifique se o IP está na whitelist do servidor
- Teste com: `telnet 200.80.111.222 10103`
- Contate o administrador do servidor

### Erro: "FATAL: password authentication failed"

**Causa:** Credenciais incorretas
**Solução:**
- Verifique o usuário: `morefocus`
- Verifique a senha: `m0rolZgKrck23Yd1p7rS72euVOtqxdI7`
- Verifique o banco: `d1_performance`

### Erro: "relation already exists"

**Causa:** Tabelas já foram criadas
**Solução:**
- Isso é normal se executar o script novamente
- As tabelas não serão recriadas (cláusula `IF NOT EXISTS`)

### Erro: "permission denied"

**Causa:** Usuário sem permissões
**Solução:**
- Verifique se o usuário `morefocus` tem permissões de CREATE
- Contate o administrador do banco

## 📊 Próximos Passos

Após criar as tabelas:

1. **Configurar a Aplicação**
   ```bash
   cd /home/ubuntu/ads-conversion-tracker
   # Verifique se o .env está correto
   cat .env
   ```

2. **Iniciar o Servidor**
   ```bash
   bun run dev
   ```

3. **Testar a API**
   ```bash
   curl -X POST http://localhost:3001/api/leads \
     -H "Content-Type: application/json" \
     -d '{
       "telefone": "(11) 98765-4321",
       "utm_source": "google",
       "utm_campaign": "test"
     }'
   ```

4. **Acessar o Painel Admin**
   ```
   http://localhost:3001/admin.html
   ```

## 📝 Backup e Manutenção

### Backup Manual

```bash
# Fazer backup completo
pg_dump -h 200.80.111.222 -p 10103 -U morefocus -d d1_performance > backup.sql

# Fazer backup comprimido
pg_dump -h 200.80.111.222 -p 10103 -U morefocus -d d1_performance | gzip > backup.sql.gz
```

### Restauração

```bash
# Restaurar do backup
psql -h 200.80.111.222 -p 10103 -U morefocus -d d1_performance < backup.sql

# Restaurar do backup comprimido
gunzip < backup.sql.gz | psql -h 200.80.111.222 -p 10103 -U morefocus -d d1_performance
```

## 🔐 Segurança

### Recomendações

1. **Alterar a Senha**
   ```sql
   ALTER USER morefocus WITH PASSWORD 'nova_senha_segura';
   ```

2. **Limitar Acesso**
   - Configure firewall para aceitar apenas IPs autorizados
   - Use SSL/TLS para conexões

3. **Monitorar Acessos**
   - Verifique logs do PostgreSQL
   - Configure alertas para tentativas de acesso

4. **Backup Regular**
   - Configure backups automáticos
   - Teste restauração periodicamente

## 📞 Suporte

Se encontrar problemas:

1. Verifique o arquivo `DATABASE_SETUP.md` (este arquivo)
2. Consulte a documentação do PostgreSQL
3. Verifique os logs do servidor
4. Contate o administrador do banco de dados

---

**Última atualização:** 26 de Janeiro de 2024
