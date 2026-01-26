# Detalhamento de Escopo
## Sistema de Rastreamento de Conversões de Campanhas Ads via WhatsApp

**Versão:** 1.0  
**Data:** 26 de Janeiro de 2026  
**Status:** Em Elaboração

---

## 1. Visão Geral do Projeto

### 1.1 Objetivo
Desenvolver um sistema capaz de rastrear a jornada completa do cliente desde o clique em uma campanha de anúncios (Google Ads, Meta Ads, etc.) até a conclusão de uma venda, permitindo a atribuição precisa de conversões aos respectivos UTMs de origem.

### 1.2 Problema a Ser Resolvido
Atualmente, existe uma lacuna no rastreamento de conversões quando o cliente é direcionado para o WhatsApp, pois a jornada de compra sai do ambiente digital rastreável e passa para uma interação humana. Este sistema visa preencher essa lacuna, conectando os dados de origem da campanha com a venda efetivada.

### 1.3 Benefícios Esperados
- Mensuração precisa do ROI de campanhas de marketing
- Identificação das campanhas mais efetivas em geração de vendas
- Otimização de investimentos em mídia paga
- Visibilidade completa do funil de vendas
- Dados para tomada de decisão estratégica em marketing

---

## 2. Fluxo do Processo

### 2.1 Diagrama do Fluxo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ETAPA 1       │     │   ETAPA 2       │     │   ETAPA 3       │
│ Clique na       │────▶│ Landing Page    │────▶│ Redirecionamento│
│ Campanha Ads    │     │ de Captura      │     │ para WhatsApp   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ Armazenamento   │
                        │ UTM + Telefone  │
                        │ + Timestamp     │
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ETAPA 4       │     │   ETAPA 5       │     │   ETAPA 6       │
│ Atendimento     │────▶│ Registro da     │────▶│ Vinculação      │
│ Comercial       │     │ Venda + Tel.    │     │ UTM + Venda     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                       │
                                                       ▼
                                                ┌─────────────────┐
                                                │ Disparo de      │
                                                │ Conversão       │
                                                └─────────────────┘
```

### 2.2 Descrição Detalhada das Etapas

| Etapa | Ação | Responsável | Sistema Envolvido |
|-------|------|-------------|-------------------|
| 1 | Cliente clica no anúncio da campanha | Cliente | Plataforma de Ads |
| 2 | Cliente acessa landing page com parâmetros UTM | Cliente | Aplicação Web |
| 3 | Cliente informa telefone e é redirecionado ao WhatsApp | Cliente | Aplicação Web |
| 4 | Consultor atende e conduz negociação | Consultor | WhatsApp Business |
| 5 | Consultor registra venda com telefone nas observações | Consultor | Sistema de Vendas |
| 6 | Sistema vincula UTM à venda e dispara conversão | Sistema | Aplicação de Rastreamento |

---

## 3. Requisitos Funcionais

### 3.1 Módulo de Captura de Dados (Landing Page)

| ID | Requisito | Prioridade | Descrição |
|----|-----------|------------|-----------|
| RF01 | Captura de parâmetros UTM | Alta | O sistema deve capturar automaticamente todos os parâmetros UTM da URL (utm_source, utm_medium, utm_campaign, utm_content, utm_term) |
| RF02 | Formulário de contato | Alta | Exibir formulário para coleta do telefone do cliente antes do redirecionamento |
| RF03 | Validação de telefone | Alta | Validar formato do telefone (DDD + número) antes de permitir prosseguimento |
| RF04 | Armazenamento de dados | Alta | Persistir os dados de UTM vinculados ao telefone em banco de dados |
| RF05 | Registro de timestamp | Média | Armazenar data/hora do acesso para análise de tempo de conversão |
| RF06 | Captura de dados adicionais | Baixa | Opcionalmente capturar nome, e-mail e outros dados do lead |
| RF07 | Redirecionamento automático | Alta | Após captura, redirecionar automaticamente para WhatsApp com mensagem pré-definida |
| RF08 | Identificador único | Alta | Gerar ID único para cada lead capturado |

### 3.2 Módulo de Integração com Sistema de Vendas

| ID | Requisito | Prioridade | Descrição |
|----|-----------|------------|-----------|
| RF09 | Monitoramento de novas vendas | Alta | Detectar automaticamente quando uma nova venda é registrada no sistema |
| RF10 | Identificação de canal | Alta | Verificar se a venda pertence ao canal comercial (WhatsApp) |
| RF11 | Extração de telefone | Alta | Extrair o número de telefone do campo de observações da venda |
| RF12 | Matching de leads | Alta | Buscar no banco de dados o lead correspondente ao telefone extraído |
| RF13 | Vinculação UTM-Venda | Alta | Associar os dados de UTM do lead à venda realizada |
| RF14 | Armazenamento de conversão | Alta | Registrar código da venda, valor total e dados de UTM vinculados |
| RF15 | Tratamento de múltiplos matches | Média | Definir regra para casos onde o mesmo telefone possui múltiplos registros de UTM |

### 3.3 Módulo de Disparo de Conversões

| ID | Requisito | Prioridade | Descrição |
|----|-----------|------------|-----------|
| RF16 | Gatilho de conversão | Alta | Disparar evento de conversão para as plataformas de ads configuradas |
| RF17 | Integração Google Ads | Alta | Enviar dados de conversão para Google Ads via API |
| RF18 | Integração Meta Ads | Alta | Enviar dados de conversão para Meta Ads via Conversions API |
| RF19 | Valor da conversão | Alta | Incluir valor monetário da venda no evento de conversão |
| RF20 | Deduplicação | Média | Evitar envio duplicado de conversões para a mesma venda |

### 3.4 Módulo de Relatórios e Dashboards

| ID | Requisito | Prioridade | Descrição |
|----|-----------|------------|-----------|
| RF21 | Dashboard de conversões | Média | Exibir painel com métricas de conversões por campanha |
| RF22 | Relatório de ROI | Média | Calcular e exibir retorno sobre investimento por campanha |
| RF23 | Funil de vendas | Média | Visualizar taxa de conversão em cada etapa do funil |
| RF24 | Exportação de dados | Baixa | Permitir exportação de relatórios em CSV/Excel |

---

## 4. Requisitos Não Funcionais

### 4.1 Performance

| ID | Requisito | Especificação |
|----|-----------|---------------|
| RNF01 | Tempo de resposta da landing page | Máximo de 2 segundos para carregamento completo |
| RNF02 | Processamento de vendas | Detecção e processamento em até 5 minutos após registro |
| RNF03 | Disparo de conversões | Envio para plataformas em até 1 minuto após vinculação |

### 4.2 Segurança

| ID | Requisito | Especificação |
|----|-----------|---------------|
| RNF04 | Criptografia de dados | Dados sensíveis (telefone) devem ser armazenados com criptografia |
| RNF05 | LGPD | Sistema deve estar em conformidade com a Lei Geral de Proteção de Dados |
| RNF06 | Autenticação | Acesso administrativo deve requerer autenticação segura |
| RNF07 | Logs de auditoria | Registrar todas as operações críticas para auditoria |

### 4.3 Disponibilidade e Escalabilidade

| ID | Requisito | Especificação |
|----|-----------|---------------|
| RNF08 | Disponibilidade | Sistema deve ter disponibilidade mínima de 99,5% |
| RNF09 | Escalabilidade | Suportar crescimento de até 10x no volume de leads sem degradação |
| RNF10 | Backup | Backup diário dos dados com retenção mínima de 30 dias |

---

## 5. Arquitetura Técnica Proposta

### 5.1 Componentes do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  ┌─────────────────┐                                            │
│  │  Landing Page   │  React/Next.js + Formulário de Captura     │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  API de Captura │  │  Serviço de     │  │  Serviço de     │ │
│  │  de Leads       │  │  Matching       │  │  Conversões     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BANCO DE DADOS                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Tabela Leads   │  │  Tabela         │  │  Tabela         │ │
│  │  (UTM + Tel)    │  │  Conversões     │  │  Logs           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRAÇÕES                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Sistema de     │  │  Google Ads     │  │  Meta Ads       │ │
│  │  Vendas (ERP)   │  │  API            │  │  Conversions API│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 5.1.1 Stack Técnico Final

| Camada | Tecnologia | Justificativa |
|-------|-----------|---------------|
| Frontend | HTML5 + CSS + HTMX/Vanilla JS | Carregamento ultra-rápido, sem framework pesado, otimizado para 3G |
| Backend | Bun Runtime | Performance superior, startup rápido, suporte nativo a TypeScript |
| Banco de Dados | PostgreSQL | Confiabilidade, ACID compliance, suporte a JSON |
| API | REST com Bun Hono | Framework leve e rápido para APIs |
| Hospedagem | Docker + Linux | Containerização para portabilidade |

### 5.2 Modelo de Dados

#### Tabela: leads

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone VARCHAR(20) NOT NULL,
    telefone_hash VARCHAR(64) NOT NULL,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    gclid VARCHAR(255),
    fbclid VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'novo',
    UNIQUE(telefone_hash)
);
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único do lead |
| telefone | VARCHAR(20) | Telefone do cliente (criptografado) |
| telefone_hash | VARCHAR(64) | Hash do telefone para busca |
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
| status | ENUM | Status do lead (novo, convertido, expirado) |

#### Tabela: conversoes

```sql
CREATE TABLE conversoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id),
    codigo_venda VARCHAR(50) NOT NULL UNIQUE,
    valor_venda DECIMAL(15,2) NOT NULL,
    canal VARCHAR(50) DEFAULT 'comercial',
    data_venda TIMESTAMP NOT NULL,
    google_ads_enviado BOOLEAN DEFAULT FALSE,
    meta_ads_enviado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único da conversão |
| lead_id | UUID | FK para tabela leads |
| codigo_venda | VARCHAR(50) | Código da venda no sistema |
| valor_venda | DECIMAL(15,2) | Valor total da venda |
| canal | VARCHAR(50) | Canal de venda (comercial/whatsapp) |
| data_venda | TIMESTAMP | Data/hora da venda |
| google_ads_enviado | BOOLEAN | Flag de envio para Google Ads |
| meta_ads_enviado | BOOLEAN | Flag de envio para Meta Ads |
| created_at | TIMESTAMP | Data/hora de criação do registro |

### 5.3 Integrações Necessárias

| Sistema | Tipo de Integração | Finalidade |
|---------|-------------------|------------|
| Sistema de Vendas/ERP | Webhook ou Polling | Detectar novas vendas e obter dados |
| Google Ads | API REST | Enviar conversões offline |
| Meta Ads | Conversions API | Enviar eventos de conversão |
| WhatsApp Business | Deep Link | Redirecionamento com mensagem |

---

## 6. Regras de Negócio

### 6.1 Captura de Leads

| ID | Regra | Descrição |
|----|-------|-----------|
| RN01 | Obrigatoriedade do telefone | O telefone é campo obrigatório para prosseguir |
| RN02 | Formato do telefone | Aceitar formatos: (XX) XXXXX-XXXX, XX XXXXX-XXXX, XXXXXXXXXXX |
| RN03 | Normalização | Armazenar telefone apenas com números, sem formatação |
| RN04 | Duplicidade | Permitir múltiplos registros do mesmo telefone (diferentes campanhas) |
| RN05 | Validade do lead | Lead expira após 90 dias sem conversão |

### 6.2 Matching de Vendas

| ID | Regra | Descrição |
|----|-------|-----------|
| RN06 | Extração de telefone | Buscar padrão de telefone no campo observações usando regex |
| RN07 | Prioridade de match | Em caso de múltiplos leads com mesmo telefone, usar o mais recente |
| RN08 | Janela de atribuição | Considerar apenas leads criados nos últimos 30 dias |
| RN09 | Canal comercial | Apenas vendas identificadas como canal comercial/WhatsApp são processadas |
| RN10 | Venda única | Cada venda pode ser vinculada a apenas um lead |

### 6.3 Disparo de Conversões

| ID | Regra | Descrição |
|----|-------|-----------|
| RN11 | Valor mínimo | Disparar conversão apenas para vendas acima de R$ 0,00 |
| RN12 | Retry | Em caso de falha no envio, tentar novamente até 3 vezes |
| RN13 | Deduplicação | Não enviar conversão se já foi enviada anteriormente |

---

## 7. Casos de Uso Detalhados

### 7.1 UC01 - Captura de Lead via Landing Page

**Ator Principal:** Cliente  
**Pré-condições:** Cliente clicou em anúncio com parâmetros UTM  
**Fluxo Principal:**
1. Sistema carrega landing page e captura parâmetros UTM da URL
2. Sistema exibe formulário solicitando telefone do cliente
3. Cliente informa seu telefone de contato
4. Sistema valida formato do telefone
5. Sistema armazena dados do lead (UTM + telefone + timestamp)
6. Sistema gera link do WhatsApp com mensagem pré-definida
7. Sistema redireciona cliente para WhatsApp

**Fluxos Alternativos:**
- 4a. Telefone inválido: Sistema exibe mensagem de erro e solicita correção
- 5a. Falha no armazenamento: Sistema registra log de erro e permite prosseguimento

**Pós-condições:** Lead registrado no banco de dados com status "novo"

### 7.2 UC02 - Registro de Venda pelo Consultor

**Ator Principal:** Consultor Comercial  
**Pré-condições:** Negociação concluída com sucesso via WhatsApp  
**Fluxo Principal:**
1. Consultor acessa sistema de vendas
2. Consultor registra nova venda com dados do cliente
3. Consultor informa no campo observações o telefone de contato original do lead
4. Sistema de vendas gera número/código da venda
5. Sistema de vendas confirma registro

**Pós-condições:** Venda registrada no sistema com telefone nas observações

### 7.3 UC03 - Vinculação Automática UTM-Venda

**Ator Principal:** Sistema (automático)  
**Pré-condições:** Nova venda registrada no sistema de vendas  
**Fluxo Principal:**
1. Sistema detecta nova venda registrada
2. Sistema verifica se venda é do canal comercial/WhatsApp
3. Sistema extrai telefone do campo observações
4. Sistema normaliza telefone extraído
5. Sistema busca lead correspondente no banco de dados
6. Sistema encontra lead com UTM vinculado
7. Sistema cria registro de conversão vinculando lead à venda
8. Sistema dispara eventos de conversão para plataformas de ads
9. Sistema atualiza status do lead para "convertido"

**Fluxos Alternativos:**
- 2a. Venda não é do canal comercial: Processo encerrado
- 3a. Telefone não encontrado nas observações: Registrar log e encerrar
- 6a. Lead não encontrado: Registrar log e encerrar
- 8a. Falha no disparo: Agendar retry e registrar log

**Pós-condições:** Conversão registrada e enviada para plataformas de ads

---

## 8. Critérios de Aceite

### 8.1 Módulo de Captura

| ID | Critério | Validação |
|----|----------|-----------|
| CA01 | Parâmetros UTM capturados corretamente | Verificar se todos os 5 parâmetros UTM são armazenados |
| CA02 | Telefone validado | Testar com formatos válidos e inválidos |
| CA03 | Dados persistidos | Confirmar registro no banco de dados |
| CA04 | Redirecionamento funcional | Verificar abertura do WhatsApp com mensagem |

### 8.2 Módulo de Integração

| ID | Critério | Validação |
|----|----------|-----------|
| CA05 | Detecção de vendas | Confirmar que novas vendas são detectadas em até 5 minutos |
| CA06 | Extração de telefone | Testar extração com diferentes formatos de observação |
| CA07 | Matching correto | Verificar vinculação correta entre lead e venda |
| CA08 | Conversão registrada | Confirmar registro com código e valor da venda |

### 8.3 Módulo de Conversões

| ID | Critério | Validação |
|----|----------|-----------|
| CA09 | Envio Google Ads | Verificar recebimento da conversão no Google Ads |
| CA10 | Envio Meta Ads | Verificar recebimento da conversão no Meta Ads |
| CA11 | Valor correto | Confirmar que valor da venda é enviado corretamente |
| CA12 | Sem duplicações | Verificar que mesma venda não gera múltiplas conversões |

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Consultor não informar telefone nas observações | Alta | Alto | Treinamento da equipe + campo obrigatório no sistema |
| Telefone informado com formato diferente | Média | Médio | Implementar múltiplos padrões de regex para extração |
| Lead não encontrado (telefone diferente) | Média | Alto | Implementar busca fuzzy ou normalização avançada |
| Falha na integração com sistema de vendas | Baixa | Alto | Implementar mecanismo de retry e alertas |
| Múltiplos leads com mesmo telefone | Média | Médio | Definir regra clara de priorização (mais recente) |
| Latência no disparo de conversões | Baixa | Médio | Implementar fila de processamento assíncrono |
| Dados de UTM incompletos | Baixa | Baixo | Registrar lead mesmo com dados parciais |

---

## 10. Premissas e Dependências

### 10.1 Premissas

1. O sistema de vendas atual possui API ou mecanismo de integração disponível
2. Os consultores serão treinados para informar o telefone nas observações
3. As campanhas de ads serão configuradas com parâmetros UTM padronizados
4. O cliente possui contas ativas no Google Ads e/ou Meta Ads com APIs habilitadas
5. O telefone do cliente é um identificador único suficiente para o matching

### 10.2 Dependências

| Dependência | Responsável | Status |
|-------------|-------------|--------|
| Acesso à API do sistema de vendas | Cliente | A definir |
| Credenciais Google Ads API | Cliente | A definir |
| Credenciais Meta Conversions API | Cliente | A definir |
| Definição do domínio da landing page | Cliente | A definir |
| Infraestrutura de hospedagem | A definir | A definir |

---

## 11. Escopo Não Incluído (Out of Scope)

Para fins de clareza, os seguintes itens **não estão incluídos** neste escopo:

- Desenvolvimento ou modificação do sistema de vendas/ERP existente
- Criação de campanhas de marketing ou configuração de anúncios
- Treinamento presencial da equipe comercial
- Integração com outras plataformas de ads além de Google e Meta
- Aplicativo mobile para consultores
- Chatbot ou automação de atendimento no WhatsApp
- CRM completo ou gestão de relacionamento com cliente
- Integração com sistemas de pagamento

---

## 12. Entregáveis

| Entregável | Descrição |
|------------|-----------|
| Landing Page | Página web responsiva com formulário de captura |
| API de Captura | Endpoints para registro e consulta de leads |
| Serviço de Integração | Módulo de integração com sistema de vendas |
| Serviço de Matching | Algoritmo de vinculação lead-venda |
| Serviço de Conversões | Módulo de disparo para plataformas de ads |
| Dashboard | Painel administrativo com métricas e relatórios |
| Documentação Técnica | Documentação de APIs e arquitetura |
| Manual de Operação | Guia de uso para equipe comercial |

---

## 13. Cronograma Estimado

| Fase | Atividades | Duração Estimada |
|------|------------|------------------|
| 1. Análise e Design | Levantamento detalhado, prototipação, arquitetura | 2 semanas |
| 2. Desenvolvimento - Captura | Landing page, API, banco de dados | 2 semanas |
| 3. Desenvolvimento - Integração | Integração com sistema de vendas, matching | 3 semanas |
| 4. Desenvolvimento - Conversões | Integração Google/Meta Ads, disparo | 2 semanas |
| 5. Dashboard e Relatórios | Painel administrativo, relatórios | 2 semanas |
| 6. Testes e Homologação | Testes integrados, correções, validação | 2 semanas |
| 7. Implantação | Deploy, configuração, go-live | 1 semana |
| **Total Estimado** | | **14 semanas** |

*Nota: Cronograma sujeito a ajustes após análise detalhada das integrações necessárias.*

---

## 14. Glossário

| Termo | Definição |
|-------|-----------|
| **UTM** | Urchin Tracking Module - parâmetros adicionados a URLs para rastreamento de campanhas |
| **Lead** | Potencial cliente que demonstrou interesse através do clique na campanha |
| **Conversão** | Ação desejada completada pelo lead (neste caso, uma venda) |
| **GCLID** | Google Click Identifier - ID único gerado pelo Google Ads para cada clique |
| **FBCLID** | Facebook Click Identifier - ID único gerado pelo Meta Ads para cada clique |
| **Matching** | Processo de correspondência entre o lead capturado e a venda realizada |
| **Conversions API** | API do Meta para envio de eventos de conversão server-side |
| **Webhook** | Mecanismo de notificação automática entre sistemas via HTTP |

---

## 15. Aprovações

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Solicitante | | | |
| Gerente de Projeto | | | |
| Líder Técnico | | | |
| Stakeholder | | | |

---

*Documento elaborado em 26 de Janeiro de 2026*
