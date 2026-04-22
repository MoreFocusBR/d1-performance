-- Backfill de conversoes confirmadas (Venda + leads + rdstation_webhook_logs)
-- Regras aplicadas:
-- 1) Ignora vendas ja convertidas (codigo_venda existente em conversoes)
-- 2) Ignora vendas canceladas
-- 3) Exige email valido em Venda
-- 4) Ignora dominios de marketplace:
--    %@mercadolivre.com%, %@shopee.com%, %@marketplace.amazon.com.br%
-- 5) Match por email (case-insensitive) com leads
-- 6) Exige campanha valida no last_conversion do rdstation_webhook_logs
--
-- Execucao recomendada:
-- 1) Rode o bloco "DRY RUN"
-- 2) Rode o bloco "BACKFILL" dentro de transacao
-- 3) Valide com o bloco "POS-VALIDACAO"

-- ============================================
-- DRY RUN (nao altera dados)
-- ============================================
WITH candidate_vendas AS (
  SELECT
    v."Codigo"::text AS codigo_venda,
    LOWER(TRIM(v."EntregaEmail")) AS email_key
  FROM "Venda" v
  LEFT JOIN conversoes c
    ON c.codigo_venda = v."Codigo"::text
  WHERE c.id IS NULL
    AND v."Cancelada" = false
    AND v."EntregaEmail" IS NOT NULL
    AND TRIM(v."EntregaEmail") <> ''
    AND NOT (
      v."EntregaEmail" ILIKE ANY (
        ARRAY[
          '%@mercadolivre.com%',
          '%@shopee.com%',
          '%@marketplace.amazon.com.br%'
        ]
      )
    )
),
eligible AS (
  SELECT
    cv.codigo_venda
  FROM candidate_vendas cv
  JOIN LATERAL (
    SELECT ld.id
    FROM leads ld
    WHERE ld.email IS NOT NULL
      AND LOWER(ld.email) = cv.email_key
    ORDER BY ld.created_at DESC, ld.id DESC
    LIMIT 1
  ) l ON true
  JOIN LATERAL (
    SELECT r.last_conversion
    FROM rdstation_webhook_logs r
    WHERE r.email IS NOT NULL
      AND LOWER(r.email) = cv.email_key
    ORDER BY COALESCE(r.updated_at, r.received_at) DESC, r.id DESC
    LIMIT 1
  ) rd ON true
  WHERE rd.last_conversion->'conversion_origin'->>'campaign' IS NOT NULL
    AND rd.last_conversion->'conversion_origin'->>'campaign' <> ''
    AND rd.last_conversion->'conversion_origin'->>'campaign' <> '(not set)'
)
SELECT COUNT(*)::bigint AS eligible_total
FROM eligible;

-- ============================================
-- BACKFILL (altera dados)
-- ============================================
BEGIN;

WITH candidate_vendas AS (
  SELECT
    v."Codigo"::text AS codigo_venda,
    LOWER(TRIM(v."EntregaEmail")) AS email_key,
    COALESCE(v."ValorTotal"::numeric, 0) AS valor_venda,
    COALESCE(NULLIF(v."OrigemPedido", ''), 'comercial') AS canal,
    CASE
      WHEN v."DataVenda" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      THEN v."DataVenda"::timestamp
      ELSE NOW()
    END AS data_venda
  FROM "Venda" v
  LEFT JOIN conversoes c
    ON c.codigo_venda = v."Codigo"::text
  WHERE c.id IS NULL
    AND v."Cancelada" = false
    AND v."EntregaEmail" IS NOT NULL
    AND TRIM(v."EntregaEmail") <> ''
    AND NOT (
      v."EntregaEmail" ILIKE ANY (
        ARRAY[
          '%@mercadolivre.com%',
          '%@shopee.com%',
          '%@marketplace.amazon.com.br%'
        ]
      )
    )
),
eligible AS (
  SELECT
    l.id AS lead_id,
    cv.codigo_venda,
    cv.valor_venda,
    cv.canal,
    cv.data_venda
  FROM candidate_vendas cv
  JOIN LATERAL (
    SELECT ld.id
    FROM leads ld
    WHERE ld.email IS NOT NULL
      AND LOWER(ld.email) = cv.email_key
    ORDER BY ld.created_at DESC, ld.id DESC
    LIMIT 1
  ) l ON true
  JOIN LATERAL (
    SELECT r.last_conversion
    FROM rdstation_webhook_logs r
    WHERE r.email IS NOT NULL
      AND LOWER(r.email) = cv.email_key
    ORDER BY COALESCE(r.updated_at, r.received_at) DESC, r.id DESC
    LIMIT 1
  ) rd ON true
  WHERE rd.last_conversion->'conversion_origin'->>'campaign' IS NOT NULL
    AND rd.last_conversion->'conversion_origin'->>'campaign' <> ''
    AND rd.last_conversion->'conversion_origin'->>'campaign' <> '(not set)'
),
inserted AS (
  INSERT INTO conversoes (
    lead_id,
    codigo_venda,
    valor_venda,
    canal,
    data_venda,
    events_payload,
    google_ads_enviado,
    meta_ads_enviado
  )
  SELECT
    e.lead_id,
    e.codigo_venda,
    e.valor_venda,
    e.canal,
    e.data_venda,
    '[]'::jsonb,
    false,
    false
  FROM eligible e
  ON CONFLICT (codigo_venda) DO NOTHING
  RETURNING id, codigo_venda
)
SELECT
  (SELECT COUNT(*)::bigint FROM eligible) AS eligible_count,
  (SELECT COUNT(*)::bigint FROM inserted) AS inserted_count;

-- Se validou e estiver tudo certo:
COMMIT;
-- Se precisar desfazer (em teste), use:
-- ROLLBACK;

-- ============================================
-- POS-VALIDACAO (nao altera dados)
-- ============================================
-- Quantas vendas ainda restaram elegiveis apos o backfill:
WITH candidate_vendas AS (
  SELECT
    v."Codigo"::text AS codigo_venda,
    LOWER(TRIM(v."EntregaEmail")) AS email_key
  FROM "Venda" v
  LEFT JOIN conversoes c
    ON c.codigo_venda = v."Codigo"::text
  WHERE c.id IS NULL
    AND v."Cancelada" = false
    AND v."EntregaEmail" IS NOT NULL
    AND TRIM(v."EntregaEmail") <> ''
    AND NOT (
      v."EntregaEmail" ILIKE ANY (
        ARRAY[
          '%@mercadolivre.com%',
          '%@shopee.com%',
          '%@marketplace.amazon.com.br%'
        ]
      )
    )
),
eligible AS (
  SELECT
    cv.codigo_venda
  FROM candidate_vendas cv
  JOIN LATERAL (
    SELECT ld.id
    FROM leads ld
    WHERE ld.email IS NOT NULL
      AND LOWER(ld.email) = cv.email_key
    ORDER BY ld.created_at DESC, ld.id DESC
    LIMIT 1
  ) l ON true
  JOIN LATERAL (
    SELECT r.last_conversion
    FROM rdstation_webhook_logs r
    WHERE r.email IS NOT NULL
      AND LOWER(r.email) = cv.email_key
    ORDER BY COALESCE(r.updated_at, r.received_at) DESC, r.id DESC
    LIMIT 1
  ) rd ON true
  WHERE rd.last_conversion->'conversion_origin'->>'campaign' IS NOT NULL
    AND rd.last_conversion->'conversion_origin'->>'campaign' <> ''
    AND rd.last_conversion->'conversion_origin'->>'campaign' <> '(not set)'
)
SELECT COUNT(*)::bigint AS remaining_eligible_total
FROM eligible;
