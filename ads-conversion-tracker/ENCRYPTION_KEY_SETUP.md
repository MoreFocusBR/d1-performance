# Configuração da Chave de Criptografia (ENCRYPTION_KEY)

## Problema

O erro `Unsupported state or unable to authenticate data` ocorre quando a chave de criptografia (`ENCRYPTION_KEY`) não está configurada corretamente ou mudou entre deployments.

## Solução

### 1. Gerar uma Chave Segura

Execute o comando abaixo para gerar uma chave segura de 32 bytes em base64:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Bun
bun -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'))"

# OpenSSL
openssl rand -base64 32
```

Exemplo de saída:
```
AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp==
```

### 2. Configurar a Variável de Ambiente

#### Opção A: Docker Compose

Adicione a variável ao seu arquivo `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      - ENCRYPTION_KEY=AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp==
```

#### Opção B: Arquivo .env

Crie ou edite o arquivo `.env`:

```bash
ENCRYPTION_KEY=AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp==
```

#### Opção C: Variável de Ambiente do Sistema

```bash
export ENCRYPTION_KEY=AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp==
```

#### Opção D: Secrets do Docker/Kubernetes

```bash
# Docker Secrets
echo "AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp==" | docker secret create encryption_key -

# Kubernetes Secrets
kubectl create secret generic encryption-key --from-literal=key=AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp==
```

### 3. Reiniciar a Aplicação

Após configurar a chave, reinicie a aplicação:

```bash
# Docker
docker-compose restart

# Bun
bun run dev
```

## ⚠️ Importante

1. **Guarde a chave em local seguro** - Você precisará dela se precisar restaurar dados criptografados
2. **Não mude a chave frequentemente** - Dados criptografados com a chave antiga não poderão ser descriptografados
3. **Use a mesma chave em todos os ambientes** - Se usar chaves diferentes, os dados não serão compatíveis
4. **Mantenha a chave em segredo** - Nunca compartilhe ou commit a chave no repositório

## Recuperação de Dados

Se você perdeu a chave original e tem dados criptografados:

### Opção 1: Usar a Chave Correta

Se você tem a chave original, configure-a novamente e os dados serão descriptografados automaticamente.

### Opção 2: Limpar Dados Antigos

Se não tem a chave original e os dados não são importantes:

```sql
-- Limpar todos os leads
DELETE FROM leads;

-- Limpar todas as conversões
DELETE FROM conversoes;
```

Depois, gere uma nova chave e configure-a.

### Opção 3: Descriptografar Manualmente

Se você tem a chave original mas não consegue acessá-la, você pode:

1. Exportar os dados criptografados
2. Usar a chave para descriptografar offline
3. Reimportar os dados descriptografados

## Verificação

Para verificar se a chave está configurada corretamente:

```bash
# Verificar se a variável está definida
echo $ENCRYPTION_KEY

# Verificar nos logs da aplicação
docker logs <container-id> | grep "ENCRYPTION_KEY"
```

Se a chave não estiver definida, você verá a mensagem:
```
Using default encryption key (not recommended for production)
```

## Troubleshooting

### Erro: "Unsupported state or unable to authenticate data"

- Verifique se a chave está configurada corretamente
- Verifique se a chave não mudou
- Verifique se os dados não foram corrompidos

### Erro: "Invalid IV length"

- Os dados podem estar corrompidos
- Tente limpar os dados antigos e começar novamente

### Erro: "Invalid auth tag length"

- Os dados podem estar em um formato incorreto
- Verifique se a chave está correta

## Referências

- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [AES-256-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [OWASP Encryption Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
