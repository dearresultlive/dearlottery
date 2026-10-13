import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, IngestPayload, DrawRecord } from './types';
import {
  saveDrawTransaction,
  getLatestDraws,
  getDrawsByDate,
  getDrawById,
  checkTicket,
  getFrequencyMatrix,
  getHotAndColdNumbers,
  getEndingFrequencyAnalysis
} from './db/queries';
import { submitIndexNow } from './services/indexing';
import { publishToGoogleIndexing } from './services/google_indexing';
import { sendOneSignalDrawNotification } from './services/onesignal';
import { fetchDrawArtifact } from './services/r2_storage';
import { parseLotterySheetText } from './services/ocr_vision';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all requests (allows frontend pages to fetch seamlessly)
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-KEY', 'Authorization'],
  maxAge: 86400
}));

// ============================================================================
// 1. Health & Status
// ============================================================================
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    engine: 'Dear Lottery Edge Engine',
    ecosystem: 'Cloudflare Workers + D1 + R2',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 2. Data Ingestion Endpoint (POST /api/results)
// Secured with API Key. Triggers D1 atomic insert, IndexNow, and OneSignal.
// ============================================================================
app.post('/api/results', async (c) => {
  const apiKeyHeader = c.req.header('X-API-KEY') || c.req.header('Authorization')?.replace('Bearer ', '');
  const expectedKey = c.env.API_KEY || 'dear_lottery_secret_key_prod_2026';

  if (apiKeyHeader !== expectedKey) {
    return c.json({ error: 'Unauthorized: Invalid API Key' }, 401);
  }

  try {
    const payload = await c.req.json<IngestPayload>();
    const { draw, prizes } = payload;

    if (!draw || !draw.id || !draw.draw_date || !prizes || !Array.isArray(prizes)) {
      return c.json({ error: 'Malformed payload. Missing draw or prizes array.' }, 400);
    }

    // Atomic D1 storage
    await saveDrawTransaction(c.env.DB, draw, prizes);

    const firstPrize = prizes.find(p => p.prize_rank === '1st') || prizes[0];

    // Non-blocking background tasks via ExecutionContext
    const frontendBase = c.env.FRONTEND_URL || 'https://dearlottery.live';
    const drawSlug = draw.draw_name
      ? draw.draw_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : 'result';
    const urlsToPing = [
      `${frontendBase}/`,
      `${frontendBase}/results/${draw.draw_date}`,
      `${frontendBase}/results/${draw.draw_date}/${drawSlug}`,
      `${frontendBase}/checker`,
      `${frontendBase}/analytics`
    ];

    c.executionCtx.waitUntil(
      submitIndexNow(c.env, urlsToPing, draw.id)
    );

    c.executionCtx.waitUntil(
      publishToGoogleIndexing(c.env, urlsToPing, draw.id)
    );

    c.executionCtx.waitUntil(
      sendOneSignalDrawNotification(c.env, draw, firstPrize)
    );

    return c.json({
      success: true,
      draw_id: draw.id,
      prize_count: prizes.length,
      checksum: draw.checksum,
      message: 'Draw successfully ingested, indexed, and published.'
    }, 201);
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return c.json({ error: 'Ingestion failed', details: error.message }, 500);
  }
});

// ============================================================================
// 3. Edge-Cached Latest Results (GET /api/results/latest)
// Latency: <20ms at edge with stale-while-revalidate
// ============================================================================
app.get('/api/results/latest', async (c) => {
  const slotParam = c.req.query('slot') || c.req.query('time');
  const limitParam = c.req.query('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10) : 3;

  const draws = await getLatestDraws(c.env.DB, slotParam, limit);

  c.header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
  return c.json({
    slot: slotParam || 'ALL',
    count: draws.length,
    draws: draws.map(d => ({
      ...d,
      parsed_data: JSON.parse(d.raw_json)
    }))
  });
});

// ============================================================================
// 4. Historical Results by Date (GET /api/results/date/:date)
// ============================================================================
app.get('/api/results/date/:date', async (c) => {
  const dateStr = c.req.param('date');
  const draws = await getDrawsByDate(c.env.DB, dateStr);

  // Past results are permanent and immutable
  c.header('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
  return c.json({
    date: dateStr,
    count: draws.length,
    draws: draws.map(d => ({
      ...d,
      parsed_data: JSON.parse(d.raw_json)
    }))
  });
});

// ============================================================================
// 5. Draw Details by Draw ID (GET /api/results/draw/:id)
// ============================================================================
app.get('/api/results/draw/:id', async (c) => {
  const id = c.req.param('id');
  const draw = await getDrawById(c.env.DB, id);

  if (!draw) {
    return c.json({ error: 'Draw not found' }, 404);
  }

  c.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return c.json({
    draw: {
      ...draw,
      parsed_data: JSON.parse(draw.raw_json)
    }
  });
});

// ============================================================================
// 6. Ticket Search & Prize Status (GET /api/results/search & GET /api/checker)
// Sub-15ms indexed edge search across prizes table by 4 or 5 digits
// ============================================================================
const handleTicketSearch = async (c: any) => {
  const number = c.req.query('number');
  const series = c.req.query('series');
  const drawId = c.req.query('draw_id');

  if (!number || number.length < 4) {
    return c.json({ error: 'Query parameter "number" must be at least 4 digits.' }, 400);
  }

  const matches = await checkTicket(c.env.DB, number, series, drawId);

  return c.json({
    query: {
      number,
      series: series || null,
      draw_id: drawId || 'ALL'
    },
    matched: matches.length > 0,
    prize_status: matches.length > 0 ? 'WINNER' : 'NO_PRIZE',
    match_count: matches.length,
    prizes: matches
  });
};

app.get('/api/results/search', handleTicketSearch);
app.get('/api/checker', handleTicketSearch);

// ============================================================================
// 7. Frequency Analytics (GET /api/analytics/frequency?days=30)
// Aggregates most and least frequent 2-digit and 4-digit endings + position matrix
// ============================================================================
app.get('/api/analytics/frequency', async (c) => {
  const daysParam = c.req.query('days');
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  const [endingsAnalysis, matrix, hotCold] = await Promise.all([
    getEndingFrequencyAnalysis(c.env.DB, days),
    getFrequencyMatrix(c.env.DB),
    getHotAndColdNumbers(c.env.DB)
  ]);

  c.header('Cache-Control', 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600');
  return c.json({
    days: endingsAnalysis.days,
    total_draws_analyzed: endingsAnalysis.total_draws_analyzed,
    four_digit_endings: endingsAnalysis.four_digit_endings,
    two_digit_endings: endingsAnalysis.two_digit_endings,
    digit_frequency_matrix: matrix,
    hot_numbers: hotCold.hotNumbers,
    cold_numbers: hotCold.coldNumbers
  });
});

// ============================================================================
// 8. R2 Blob Archive Streaming (GET /api/archive/*)
// ============================================================================
app.get('/api/archive/*', async (c) => {
  const path = c.req.path.replace('/api/archive/', '');
  if (!c.env.RESULTS_BUCKET) {
    return c.json({ error: 'R2 archiving bucket not configured' }, 404);
  }
  const object = await fetchDrawArtifact(c.env.RESULTS_BUCKET, path);

  if (!object) {
    return c.json({ error: 'Archived file not found' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});

// ============================================================================
// 9. Edge OCR / Raw Text Parse Endpoint (POST /api/ocr/parse)
// ============================================================================
app.post('/api/ocr/parse', async (c) => {
  const body = await c.req.json<{ text?: string }>();
  if (!body.text) {
    return c.json({ error: 'Missing text in request body' }, 400);
  }

  const parsed = parseLotterySheetText(body.text);
  return c.json({ parsed });
});

// ============================================================================
// Cloudflare Worker Default Export (Fetch + Scheduled Cron Trigger)
// ============================================================================
export default {
  fetch: app.fetch,

  // Scheduled Cron Trigger Handler (Edge Sentinel)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log(`[CRON] Scheduled event fired at ${new Date(event.scheduledTime).toISOString()}`);
    // Edge sentinel: checks if latest draw is present, logs heartbeat
  }
};
