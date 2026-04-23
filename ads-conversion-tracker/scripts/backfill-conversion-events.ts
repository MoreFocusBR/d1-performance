import { closePool, query } from '../src/utils/db';

type PendingConversion = {
  id: string;
  codigo_venda: string;
  rdstation_contact_id: string | null;
};

type EmptyApiSample = {
  conversion_id: string;
  codigo_venda: string;
  rdstation_contact_id: string | null;
};

function normalizeBaseUrl(url?: string) {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (const arg of args) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    parsed[key] = value ?? 'true';
  }

  return {
    batchSize: Math.max(1, Math.min(1000, parseInt(parsed.batchSize || '200', 10) || 200)),
    concurrency: Math.max(1, Math.min(50, parseInt(parsed.concurrency || '10', 10) || 10)),
    maxBatches: Math.max(1, Math.min(100000, parseInt(parsed.maxBatches || '500', 10) || 500)),
    requestDelayMs: Math.max(0, Math.min(60000, parseInt(parsed.requestDelayMs || '200', 10) || 0)),
    dryRun: parsed.dryRun === 'true',
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isApiEventsEmpty(payload: unknown): boolean {
  if (payload == null) return true;
  if (Array.isArray(payload)) return payload.length === 0;
  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.events)) return record.events.length === 0;
    if (Array.isArray(record.data)) return record.data.length === 0;
    return Object.keys(record).length === 0;
  }
  return false;
}

async function fetchRDStationEvents(rdstationContactId: string): Promise<unknown | null> {
  const baseUrl = normalizeBaseUrl("http://localhost:8000");
  const apiKey = "RDSTATION_API_KEY";

  if (!baseUrl || !apiKey || !rdstationContactId) return null;

  const url = `${baseUrl}/contact/${encodeURIComponent(rdstationContactId)}/events`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`RD events request failed (${response.status}): ${body}`);
  }

  return await response.json().catch(() => null);
}

async function updateEventsPayload(conversionId: string, eventsPayload: unknown | null) {
  await query(
    `UPDATE conversoes
     SET events_payload = $1::jsonb
     WHERE id = $2`,
    [JSON.stringify(eventsPayload || []), conversionId]
  );
}

async function listPendingConversions(lastId: string, batchSize: number): Promise<PendingConversion[]> {
  const result = await query<PendingConversion>(
    `SELECT
      c.id,
      c.codigo_venda,
      l.rdstation_contact_id
    FROM conversoes c
    JOIN leads l ON l.id = c.lead_id
    WHERE c.id::text > $1
      AND (
        c.events_payload IS NULL
        OR c.events_payload = '[]'::jsonb
      )
    ORDER BY c.id ASC
    LIMIT $2`,
    [lastId, batchSize]
  );

  return result.rows;
}

async function hydrateChunk(chunk: PendingConversion[], concurrency: number, requestDelayMs: number) {
  let hydrated = 0;
  let failed = 0;
  let withoutContact = 0;
  let apiEmpty = 0;
  const emptyApiSamples: EmptyApiSample[] = [];
  const errors: Array<{ conversion_id: string; codigo_venda: string; error: string }> = [];

  // Quando requestDelayMs > 0, processa sequencialmente para garantir espacamento real entre requests.
  if (requestDelayMs > 0) {
    let hasRequested = false;
    for (const row of chunk) {
      try {
        if (!row.rdstation_contact_id) {
          withoutContact++;
          await updateEventsPayload(row.id, []);
          hydrated++;
          continue;
        }

        if (hasRequested) {
          await sleep(requestDelayMs);
        }

        const events = await fetchRDStationEvents(row.rdstation_contact_id);
        if (isApiEventsEmpty(events)) {
          apiEmpty++;
          if (emptyApiSamples.length < 20) {
            emptyApiSamples.push({
              conversion_id: row.id,
              codigo_venda: row.codigo_venda,
              rdstation_contact_id: row.rdstation_contact_id,
            });
          }
        }
        await updateEventsPayload(row.id, events);
        hydrated++;
        hasRequested = true;
      } catch (error) {
        failed++;
        errors.push({
          conversion_id: row.id,
          codigo_venda: row.codigo_venda,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return { hydrated, failed, withoutContact, apiEmpty, emptyApiSamples, errors };
  }

  for (let i = 0; i < chunk.length; i += concurrency) {
    const group = chunk.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      group.map(async (row) => {
        if (!row.rdstation_contact_id) {
          withoutContact++;
          await updateEventsPayload(row.id, []);
          return { emptyFromApi: false };
        }

        const events = await fetchRDStationEvents(row.rdstation_contact_id);
        const emptyFromApi = isApiEventsEmpty(events);
        await updateEventsPayload(row.id, events);
        return { emptyFromApi };
      })
    );

    settled.forEach((result, idx) => {
      const row = group[idx];
      if (result.status === 'fulfilled') {
        hydrated++;
        if (result.value?.emptyFromApi) {
          apiEmpty++;
          if (emptyApiSamples.length < 20) {
            emptyApiSamples.push({
              conversion_id: row.id,
              codigo_venda: row.codigo_venda,
              rdstation_contact_id: row.rdstation_contact_id,
            });
          }
        }
      } else {
        failed++;
        errors.push({
          conversion_id: row.id,
          codigo_venda: row.codigo_venda,
          error: result.reason instanceof Error ? result.reason.message : 'Erro desconhecido',
        });
      }
    });
  }

  return { hydrated, failed, withoutContact, apiEmpty, emptyApiSamples, errors };
}

async function main() {
  const { batchSize, concurrency, maxBatches, requestDelayMs, dryRun } = parseArgs();
  const startedAt = Date.now();

  console.log(
    `[Backfill Events] starting with batchSize=${batchSize}, concurrency=${concurrency}, maxBatches=${maxBatches}, requestDelayMs=${requestDelayMs}, dryRun=${dryRun}`
  );

  if (!process.env.RDSTATION_URI || !process.env.RDSTATION_API_KEY) {
    console.warn('[Backfill Events] RDSTATION_URI/RDSTATION_API_KEY ausentes. Conversoes sem contact_id ainda serão marcadas com []');
  }

  if (dryRun) {
    const count = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM conversoes c
       WHERE c.events_payload IS NULL OR c.events_payload = '[]'::jsonb`
    );
    console.log(`[Backfill Events] dry run total pending=${count.rows[0]?.total || '0'}`);
    return;
  }

  let lastId = '';
  let processed = 0;
  let hydrated = 0;
  let failed = 0;
  let withoutContact = 0;
  let apiEmpty = 0;
  let batches = 0;
  const sampleErrors: Array<{ conversion_id: string; codigo_venda: string; error: string }> = [];
  const sampleApiEmpty: EmptyApiSample[] = [];

  while (batches < maxBatches) {
    const pending = await listPendingConversions(lastId, batchSize);
    if (pending.length === 0) break;

    batches++;
    processed += pending.length;
    lastId = pending[pending.length - 1].id;

    const result = await hydrateChunk(pending, concurrency, requestDelayMs);
    hydrated += result.hydrated;
    failed += result.failed;
    withoutContact += result.withoutContact;
    apiEmpty += result.apiEmpty;
    sampleErrors.push(...result.errors.slice(0, Math.max(0, 20 - sampleErrors.length)));
    sampleApiEmpty.push(...result.emptyApiSamples.slice(0, Math.max(0, 20 - sampleApiEmpty.length)));

    console.log(
      `[Backfill Events] batch=${batches} rows=${pending.length} hydrated=${result.hydrated} failed=${result.failed} without_contact=${result.withoutContact} api_empty=${result.apiEmpty}`
    );
  }

  console.log('[Backfill Events] done', {
    batches,
    processed,
    hydrated,
    failed,
    without_contact: withoutContact,
    api_empty: apiEmpty,
    duration_ms: Date.now() - startedAt,
    sample_errors: sampleErrors,
    sample_api_empty: sampleApiEmpty,
  });
}

main()
  .catch((error) => {
    console.error('[Backfill Events] fatal error', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
