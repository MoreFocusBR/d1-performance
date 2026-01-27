> # Relatório de Correção - Dockerfile

## 1. 🕵️ Análise do Erro

Ao tentar fazer deploy com o Dockerfile, o seguinte erro foi encontrado:

```
useradd: UID 1000 is not unique
ERROR: process "/bin/sh -c useradd -m -u 1000 appuser && chown -R appuser:appuser /app" did not complete successfully: exit code: 4
```

### Causa do Problema

A imagem base `oven/bun:1.3.6-slim` já possui um usuário com UID 1000. Quando o Dockerfile tentava criar um novo usuário `appuser` com o mesmo UID 1000, o comando `useradd` falhava porque o UID já estava em uso.

## 2. 🛠️ Solução Implementada

A correção foi aplicada na linha 17 do Dockerfile:

### Antes

```dockerfile
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser
```

### Depois

```dockerfile
RUN useradd -m -u 1001 appuser 2>/dev/null || useradd -m appuser && chown -R appuser:appuser /app
USER appuser
```

### Explicação da Correção

1. **Mudança de UID:** Alteramos o UID de 1000 para 1001, evitando conflito com a imagem base.

2. **Tratamento de Erro:** Adicionamos `2>/dev/null || useradd -m appuser`:
   - Se o comando com UID 1001 falhar (por qualquer motivo), ele cria o usuário sem especificar um UID.
   - Isso garante que o usuário será criado mesmo se houver conflitos.

3. **Flexibilidade:** A solução é flexível e funciona em diferentes ambientes Docker.

## 3. ✅ Benefícios da Correção

- ✅ Evita conflitos de UID com a imagem base
- ✅ Garante que o usuário não-root será criado
- ✅ Mantém a segurança executando a aplicação como usuário não-root
- ✅ Compatível com diferentes versões da imagem base

## 4. 🚀 Próximos Passos

Com essa correção, o Dockerfile agora deve fazer build com sucesso. Para testar:

```bash
docker build -t ads-conversion-tracker:latest .
docker run -p 3001:3001 ads-conversion-tracker:latest
```

## 5. 📝 Notas Adicionais

- O UID 1001 foi escolhido para evitar conflitos comuns (1000 é frequentemente usado em imagens base).
- Se mesmo 1001 estiver em uso, o comando alternativo `useradd -m appuser` criará o usuário com um UID automático.
- A aplicação continuará sendo executada como um usuário não-root, mantendo a segurança.
