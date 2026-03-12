# Resumo das Mudanças - Adição do Campo "Canal da Venda" (OrigemPedido)

## Data: 12 de Março de 2026
## Objetivo: Adicionar o campo "Canal da Venda" (Venda.OrigemPedido) ao painel admin com filtro, gráfico de pizza e coluna na tabela de campanhas

---

## 📋 Mudanças Realizadas

### 1. Backend - Arquivo: `src/routes/campaigns.ts`

#### Adições:
- **Novo parâmetro de query**: `origem_pedido` para filtrar por Canal da Venda
- **Nova variável**: `origemPedidoFilter` para capturar o filtro
- **Novo filtro SQL**: `origemPedidoFilterSQL` para aplicar o filtro na query
- **Nova coluna na query**: `v."OrigemPedido" AS origem_pedido` selecionada do banco
- **Novo GROUP BY**: Adicionado `v."OrigemPedido"` ao agrupamento
- **Nova query**: `origemPedidoResult` para buscar todos os valores únicos de OrigemPedido disponíveis
- **Novo campo no objeto campaign**: `origem_pedido` com valor padrão "Não informado"
- **Novo campo na resposta JSON**: `available_origem_pedido` contendo lista de canais de venda disponíveis

#### Modificações:
- Query principal agora inclui `v."OrigemPedido"` e filtra por `origemPedidoFilterSQL`
- Objeto de retorno da campanha agora inclui `origem_pedido`

---

### 2. Frontend - Arquivo: `public/admin.html`

#### Adições de Variáveis Globais:
```javascript
let selectedOrigemPedido = new Set();
let allOrigemPedido = [];
let chartOrigemPedidoVendas = null;
let chartOrigemPedidoValor = null;
```

#### Adições de Cores:
```javascript
const ORIGEM_PEDIDO_COLORS = {
    'loja fisica': { bg: '#FF6B3555', border: '#FF6B35', text: '#FF6B35' },
    'loja física': { bg: '#FF6B3555', border: '#FF6B35', text: '#FF6B35' },
    'e-commerce': { bg: '#4488ff55', border: '#4488ff', text: '#4488ff' },
    'ecommerce': { bg: '#4488ff55', border: '#4488ff', text: '#4488ff' },
    'telefone': { bg: '#44cc8855', border: '#44cc88', text: '#44cc88' },
    'whatsapp': { bg: '#22aa4455', border: '#22aa44', text: '#44dd66' },
    'presencial': { bg: '#aa662255', border: '#aa6622', text: '#dd8844' },
    'online': { bg: '#8844cc55', border: '#8844cc', text: '#aa66ff' },
};
```

#### Adições de Funções:
- `renderOrigemPedidoTags()` - Renderiza os botões de filtro de Canal da Venda
- `toggleOrigemPedido(op)` - Alterna seleção de um canal de venda
- `selectAllOrigemPedido()` - Seleciona todos os canais de venda
- `clearAllOrigemPedido()` - Limpa todos os canais de venda selecionados
- `getOrigemPedidoColor(origemPedido)` - Retorna as cores para cada canal de venda
- `renderOrigemPedidoCharts(campaigns)` - Renderiza os gráficos de pizza de distribuição por canal de venda

#### Adições de HTML:
- **Novo card de filtro**: "Filtro por Canal da Venda" com botões Todos/Limpar
- **Novo card de gráficos**: "Distribuição por Canal da Venda" com dois gráficos de pizza:
  - Quantidade de Vendas por Canal
  - Valor Total (R$) por Canal

#### Modificações de Estilos:
- `.campaign-item` grid-template-columns alterado de `1.2fr 0.8fr 1fr 1.2fr 1fr 0.8fr` para `1.2fr 0.8fr 0.8fr 1fr 1.2fr 1fr 0.8fr` (adicionada uma coluna)

#### Modificações de Funções:
- `loadDashboard()` - Agora inclui parâmetros `origem_pedido` na URL da API
- `renderFilteredData()` - Agora filtra também por `selectedOrigemPedido`
- `renderCampaignList()` - Agora exibe a coluna "Canal da Venda" com badge colorido em cada campanha

---

## 🎯 Funcionalidades Implementadas

### 1. Filtro de Canal da Venda
- ✅ Filtro interativo com tags clicáveis
- ✅ Botões "Todos" e "Limpar" para gerenciar seleção
- ✅ Filtro funciona em conjunto com outros filtros (AND)
- ✅ Cores distintas para cada canal de venda

### 2. Gráficos de Pizza
- ✅ Gráfico de pizza com quantidade de vendas por canal
- ✅ Gráfico de pizza com valor total (R$) por canal
- ✅ Legendas dinâmicas baseadas nos dados
- ✅ Cores consistentes com o padrão do dashboard

### 3. Coluna na Tabela de Campanhas
- ✅ Nova coluna "Canal da Venda" exibida após "Campanha"
- ✅ Badge colorido indicando o canal de venda
- ✅ Cores baseadas no tipo de canal (Loja Física, E-commerce, Telefone, WhatsApp, etc.)

---

## 🔄 Fluxo de Dados

```
1. Frontend carrega dashboard
   ↓
2. API retorna available_origem_pedido
   ↓
3. Frontend renderiza filtros de Canal da Venda
   ↓
4. Usuário seleciona canais de venda
   ↓
5. Frontend envia parâmetro origem_pedido na requisição
   ↓
6. Backend filtra campanhas por OrigemPedido
   ↓
7. Frontend exibe gráficos e tabela filtrados
```

---

## 📊 Dados Retornados pela API

A API `/api/campaigns/performance` agora retorna:

```json
{
  "success": true,
  "campaigns": [
    {
      "utm_campaign": "summer_sale",
      "origem": "google",
      "origem_pedido": "e-commerce",
      "total_vendas": 10,
      "valor_total": 5000,
      ...
    }
  ],
  "available_origem_pedido": ["e-commerce", "loja fisica", "telefone", "whatsapp"],
  ...
}
```

---

## 🎨 Cores Utilizadas

| Canal da Venda | Cor | Código |
|---|---|---|
| Loja Física | Laranja | #FF6B35 |
| E-commerce | Azul | #4488ff |
| Telefone | Verde | #44cc88 |
| WhatsApp | Verde Claro | #22aa44 |
| Presencial | Laranja Escuro | #aa6622 |
| Online | Roxo | #8844cc |

---

## ✅ Validações Realizadas

- ✅ Sintaxe TypeScript do backend validada
- ✅ Sintaxe JavaScript do frontend validada
- ✅ Funções de filtro implementadas
- ✅ Gráficos de pizza implementados
- ✅ Coluna na tabela de campanhas adicionada
- ✅ Cores e estilos aplicados

---

## 🚀 Próximos Passos (Opcional)

1. Testar a aplicação em ambiente de desenvolvimento
2. Validar filtros com dados reais do banco de dados
3. Ajustar cores se necessário baseado em feedback do usuário
4. Adicionar mais valores de OrigemPedido conforme necessário

---

## 📝 Notas Importantes

- O campo `OrigemPedido` é consultado da tabela `Venda` do banco de dados remoto
- O filtro funciona com AND (intersecção) com outros filtros
- Valores nulos de `OrigemPedido` são tratados como "Não informado"
- Os gráficos são dinâmicos e se atualizam conforme os filtros mudam

