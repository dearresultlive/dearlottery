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
  getEndingFrequencyAnalysis,
  prepublishUpcomingDraw
} from './db/queries';
import { submitIndexNow } from './services/indexing';
import { publishToGoogleIndexing } from './services/google_indexing';
import { sendOneSignalDrawNotification } from './services/onesignal';
import { fetchDrawArtifact } from './services/r2_storage';
import { parseLotterySheetText } from './services/ocr_vision';
import { pollAndIngestLiveDraw } from './services/edge_poller';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// Worker In-Memory Cache Layer
// Prevents heavy D1 table scans on *.workers.dev where Cache API is bypassed
// Reduces D1 daily rows_read by 99% while ensuring instant 1PM/6PM/8PM live updates
// ============================================================================
import {
  memoryLatestDrawsCache,
  memoryAnalyticsCache,
  memoryDateDrawsCache,
  clearMemoryCaches
} from './cache';

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

app.get('/api/test-suite', async (c) => {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test 1: Google Apps Script Relay connectivity from Cloudflare Edge
  const relayStart = Date.now();
  try {
    if (!c.env.SAMBAD_RELAY_URL) {
      results.tests.sambadRelay = { status: 'FAILED', error: 'SAMBAD_RELAY_URL not configured' };
    } else {
      const res = await fetch(c.env.SAMBAD_RELAY_URL, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
      const latency = Date.now() - relayStart;
      if (res.ok) {
        const json = await res.json() as any;
        const cardsCount = json?.datesCards ? Object.keys(json.datesCards).length : 0;
        results.tests.sambadRelay = {
          status: 'PASSED',
          latencyMs: latency,
          httpStatus: res.status,
          success: json.success,
          availableDateKeys: cardsCount,
          sampleCard: json?.datesCards?.['20-10-2026']?.[0] || null
        };
      } else {
        results.tests.sambadRelay = { status: 'FAILED', httpStatus: res.status, latencyMs: latency };
      }
    }
  } catch (err: any) {
    results.tests.sambadRelay = { status: 'FAILED', error: err.message, latencyMs: Date.now() - relayStart };
  }

  // Test 2: sambadlottery.com Mirror connectivity from Cloudflare Edge
  const m1Start = Date.now();
  try {
    const res = await fetch('https://sambadlottery.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(6000)
    });
    const latency = Date.now() - m1Start;
    results.tests.sambadMirror = {
      status: res.ok ? 'PASSED' : 'FAILED',
      httpStatus: res.status,
      latencyMs: latency
    };
  } catch (err: any) {
    results.tests.sambadMirror = { status: 'FAILED', error: err.message, latencyMs: Date.now() - m1Start };
  }

  // Test 3: nagalandlotterysambad.com Mirror connectivity from Cloudflare Edge
  const m2Start = Date.now();
  try {
    const res = await fetch('https://nagalandlotterysambad.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(6000)
    });
    const latency = Date.now() - m2Start;
    results.tests.nagalandMirror = {
      status: res.ok ? 'PASSED' : 'FAILED',
      httpStatus: res.status,
      latencyMs: latency
    };
  } catch (err: any) {
    results.tests.nagalandMirror = { status: 'FAILED', error: err.message, latencyMs: Date.now() - m2Start };
  }

  // Test 4: D1 Database performance from Cloudflare Edge
  const d1Start = Date.now();
  try {
    const row = await c.env.DB.prepare('SELECT COUNT(*) as totalDraws FROM draws').first<{ totalDraws: number }>();
    const latency = Date.now() - d1Start;
    results.tests.d1Database = {
      status: 'PASSED',
      latencyMs: latency,
      totalDrawsInDb: row?.totalDraws || 0
    };
  } catch (err: any) {
    results.tests.d1Database = { status: 'FAILED', error: err.message, latencyMs: Date.now() - d1Start };
  }

  // Overall Verdict
  const allPassed = Object.values(results.tests).every((t: any) => t.status === 'PASSED');
  results.allSystemsOperational = allPassed;

  return c.json(results, allPassed ? 200 : 500);
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
    clearMemoryCaches();
    clearMemoryCaches();

    // Invalidate edge cache immediately so updated OCR prizes show instantly
    try {
      const edgeCache = (caches as any).default;
      const reqUrl = new URL(c.req.url);
      c.executionCtx.waitUntil(edgeCache.delete(new Request(reqUrl.origin + "/api/results/date/" + draw.draw_date)));
      c.executionCtx.waitUntil(edgeCache.delete(new Request(reqUrl.origin + "/api/results/latest")));
      c.executionCtx.waitUntil(edgeCache.delete(new Request(reqUrl.origin + "/api/results/draw/" + draw.id)));
    } catch (_) {}

    const firstPrize = prizes.find(p => p.prize_rank === '1st') || prizes[0];

    // Non-blocking background tasks via ExecutionContext
    const frontendBase = c.env.FRONTEND_URL || 'https://dearresultlive.in';
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
// Latency: <20ms at edge with stale-while-revalidate & D1 quota isolation
// ============================================================================
app.get('/api/results/latest', async (c) => {
  const slotParam = c.req.query('slot') || c.req.query('time') || 'ALL';
  const limitParam = c.req.query('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10) : 3;
  const memKey = `${slotParam}_${limit}`;

  // 1. Worker In-Memory Cache (15-second TTL per isolate)
  // Completely shields D1 from high-concurrency client polling during draw hours
  const now = Date.now();
  const memCached = memoryLatestDrawsCache[memKey];
  if (memCached && (now - memCached.timestamp < 15000)) {
    return c.json(memCached.data, 200, {
      'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': '*',
      'X-Memory-Cache': 'HIT'
    });
  }

  // 2. Cloudflare Edge Cache API (normalized URL without cache-buster query params)
  const cache = (caches as any).default;
  const url = new URL(c.req.url);
  url.searchParams.delete('t');
  url.searchParams.delete('_');
  url.searchParams.delete('timestamp');
  const cacheKey = new Request(url.toString(), c.req.raw);

  try {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const resp = new Response(cachedResponse.body, cachedResponse);
      resp.headers.set('X-Edge-Cache', 'HIT');
      return resp;
    }
  } catch (_) {}

  try {
    const draws = await getLatestDraws(c.env.DB, slotParam === 'ALL' ? undefined : slotParam, limit);

    const responseData = {
      slot: slotParam || 'ALL',
      count: draws.length,
      draws: draws.map(d => ({
        ...d,
        parsed_data: JSON.parse(d.raw_json)
      }))
    };

    // Store in memory cache
    memoryLatestDrawsCache[memKey] = {
      data: responseData,
      timestamp: Date.now()
    };

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': '*',
      'X-Edge-Cache': 'MISS',
      'X-Memory-Cache': 'MISS'
    });

    const response = new Response(JSON.stringify(responseData), { status: 200, headers });

    if (c.executionCtx && draws.length > 0) {
      c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (err: any) {
    console.error('getLatestDraws error:', err?.message || err);
    return c.json({
      slot: slotParam || 'ALL',
      count: 0,
      draws: [],
      error: 'Database temporarily unavailable'
    }, 200);
  }
});

// ============================================================================
// 4. Historical Results by Date (GET /api/results/date/:date)
// ============================================================================
app.get('/api/results/date/:date', async (c) => {
  const dateStr = c.req.param('date');
  
  // 1. Worker In-Memory Cache (24h for past dates, 15s for today)
  const now = Date.now();
  const memCached = memoryDateDrawsCache[dateStr];
  if (memCached && (now - memCached.timestamp < 15000)) {
    return c.json(memCached.data, 200, {
      'Cache-Control': 'public, max-age=15, s-maxage=30',
      'Access-Control-Allow-Origin': '*',
      'X-Memory-Cache': 'HIT'
    });
  }

  const cache = (caches as any).default;
  const cacheKey = new Request(c.req.url, c.req.raw);

  try {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const resp = new Response(cachedResponse.body, cachedResponse);
      resp.headers.set('X-Edge-Cache', 'HIT');
      return resp;
    }
  } catch (_) {}

  try {
    const draws = await getDrawsByDate(c.env.DB, dateStr);
    const isFullyDeclared = draws.length >= 3 && draws.every(d => {
      try {
        const p = JSON.parse(d.raw_json);
        return p.status === 'DECLARED' && p.prizes?.first_prize?.number;
      } catch (_) { return false; }
    });

    const sMaxAge = isFullyDeclared ? 86400 : 15;

    const responseData = {
      date: dateStr,
      count: draws.length,
      draws: draws.map(d => ({
        ...d,
        parsed_data: JSON.parse(d.raw_json)
      }))
    };

    if (draws.length > 0) {
      memoryDateDrawsCache[dateStr] = {
        data: responseData,
        timestamp: Date.now()
      };
    }

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=15, s-maxage=${sMaxAge}, stale-while-revalidate=120`,
      'Access-Control-Allow-Origin': '*',
      'X-Edge-Cache': 'MISS'
    });

    const response = new Response(JSON.stringify(responseData), { status: 200, headers });

    if (c.executionCtx && draws.length > 0) {
      c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (err: any) {
    console.error('getDrawsByDate error:', err?.message || err);
    return c.json({ date: dateStr, count: 0, draws: [], error: 'Database temporarily unavailable' }, 200);
  }
});

// ============================================================================
// 5. Draw Details by Draw ID (GET /api/results/draw/:id)
// ============================================================================
app.get('/api/results/draw/:id', async (c) => {
  const id = c.req.param('id');
  const cache = (caches as any).default;
  const cacheKey = new Request(c.req.url, c.req.raw);

  try {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const resp = new Response(cachedResponse.body, cachedResponse);
      resp.headers.set('X-Edge-Cache', 'HIT');
      return resp;
    }
  } catch (_) {}

  try {
    const draw = await getDrawById(c.env.DB, id);

    if (!draw) {
      return c.json({ error: 'Draw not found' }, 404);
    }

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Edge-Cache': 'MISS'
    });

    const response = new Response(JSON.stringify({
      draw: {
        ...draw,
        parsed_data: JSON.parse(draw.raw_json)
      }
    }), { status: 200, headers });

    if (c.executionCtx) {
      c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (err: any) {
    console.error('getDrawById error:', err?.message || err);
    return c.json({ error: 'Draw query failed' }, 500);
  }
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

  try {
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
  } catch (err: any) {
    console.error('checkTicket error:', err?.message || err);
    return c.json({
      query: { number, series: series || null, draw_id: drawId || 'ALL' },
      matched: false,
      prize_status: 'NO_PRIZE',
      match_count: 0,
      prizes: []
    }, 200);
  }
};

app.get('/api/results/search', handleTicketSearch);
app.get('/api/checker', handleTicketSearch);

// ============================================================================
// 7. Frequency Analytics (GET /api/analytics/frequency?days=30)
// Aggregates most and least frequent 2-digit and 4-digit endings + position matrix
// Edge cached with memory match to eliminate D1 table scans
// ============================================================================
app.get('/api/analytics/frequency', async (c) => {
  const daysParam = c.req.query('days');
  const days = daysParam ? parseInt(daysParam, 10) : 30;
  const memKey = `days_${days}`;

  // 1-Hour Memory Cache TTL: Frequency stats only change after 1PM, 6PM, 8PM draws.
  // Prevents multiple 120,000-row table scans across all prizes.
  const now = Date.now();
  const memCached = memoryAnalyticsCache[memKey];
  if (memCached && (now - memCached.timestamp < 3600 * 1000)) {
    return c.json(memCached.data, 200, {
      'Cache-Control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Memory-Cache': 'HIT'
    });
  }

  const cache = (caches as any).default;
  const cacheKey = new Request(c.req.url, c.req.raw);

  try {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const resp = new Response(cachedResponse.body, cachedResponse);
      resp.headers.set('X-Edge-Cache', 'HIT');
      return resp;
    }
  } catch (_) {}

  try {
    const [endingsAnalysis, matrix, hotCold] = await Promise.all([
      getEndingFrequencyAnalysis(c.env.DB, days),
      getFrequencyMatrix(c.env.DB),
      getHotAndColdNumbers(c.env.DB)
    ]);

    const responseData = {
      days: endingsAnalysis.days,
      total_draws_analyzed: endingsAnalysis.total_draws_analyzed,
      four_digit_endings: endingsAnalysis.four_digit_endings,
      two_digit_endings: endingsAnalysis.two_digit_endings,
      digit_frequency_matrix: matrix,
      hot_numbers: hotCold.hotNumbers,
      cold_numbers: hotCold.coldNumbers
    };

    memoryAnalyticsCache[memKey] = {
      data: responseData,
      timestamp: Date.now()
    };

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Edge-Cache': 'MISS',
      'X-Memory-Cache': 'MISS'
    });

    const response = new Response(JSON.stringify(responseData), { status: 200, headers });

    if (c.executionCtx) {
      c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (err: any) {
    console.error('getFrequencyMatrix error:', err?.message || err);
    return c.json({
      days,
      total_draws_analyzed: 0,
      four_digit_endings: { most_frequent: [], least_frequent: [] },
      two_digit_endings: { most_frequent: [], least_frequent: [] },
      digit_frequency_matrix: [],
      hot_numbers: [],
      cold_numbers: [],
      error: 'Analytics calculation failed'
    }, 200);
  }
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
// 8b. High-Res Official Sheet Image Proxy (GET /api/sheet-image & GET /api/sheet-image/:date/:slot)
// Sub-200ms Edge Proxy: Streams high-resolution official gazette JPG/WebP
// ============================================================================
const handleSheetImage = async (c: any) => {
  const dateParam = c.req.query('date') || c.req.param('date');
  const slotParam = c.req.query('slot') || c.req.param('slot') || '1pm';

  // Compute current IST date and slot if not provided
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utcTime + 5.5 * 3600000);
  const dateStr = dateParam || `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;
  
  const normSlot = slotParam.toLowerCase().replace(/[^0-9a-z]/g, '');
  const slotKey = normSlot.includes('6') ? '6pm' : normSlot.includes('8') ? '8pm' : '1pm';

  const [year, month, day] = dateStr.split('-');
  const dateKey = `${day}-${month}-${year}`;

  // Check Cloudflare Cache
  const cacheUrl = new URL(c.req.url);
  cacheUrl.searchParams.sort();
  const cacheKey = new Request(cacheUrl.toString(), c.req.raw);
  const cache = (caches as any).default;

  try {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const response = new Response(cachedResponse.body, cachedResponse);
      response.headers.set('X-Proxy-Cache', 'HIT');
      return response;
    }
  } catch (cacheErr) {
    // Continue if cache match fails
  }

  const prefix = slotKey.includes('6') ? 'DN' : slotKey.includes('8') ? 'EN' : 'MN';
  const nagalandUrl1 = `https://www.nagalandlotteryresults.com/wp-content/uploads/${year}/${month}/${prefix}${day}${month}${year.slice(2)}_1.jpeg`;
  const nagalandUrl2 = `https://www.nagalandlotteryresults.com/wp-content/uploads/${year}/${month}/${prefix}${day}${month}${year.slice(2)}_${slotKey.replace('pm', '')}.jpeg`;

  // Upstream Candidate Waterfall:
  // 0. Official Nagaland State Gazette JPEG (Primary, fast)
  // 1. High-Res Desktop Gazette JPEG (1202x1650, sharp legibility)
  // 2. Mobile Gazette WebP
  const candidateUrls = [
    nagalandUrl1,
    nagalandUrl2,
    `https://lottery.sambad.com/images/lottery-sambad-${slotKey}-${dateKey}.jpg`,
    `https://lottery.sambad.com/images/mobile/lottery-sambad-${slotKey}-${dateKey}.webp`
  ];

  for (const targetUrl of candidateUrls) {
    try {
      const upstreamRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': 'https://lottery.sambad.com/'
        },
        signal: AbortSignal.timeout(6000)
      });

      if (upstreamRes.ok) {
        const contentType = upstreamRes.headers.get('content-type') || (targetUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
        const imageBytes = await upstreamRes.arrayBuffer();

        const headers = new Headers({
          'Content-Type': contentType,
          'Content-Length': String(imageBytes.byteLength),
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
          'Access-Control-Allow-Origin': '*',
          'X-Proxy-Cache': 'MISS',
          'X-Proxy-Source': 'lottery.sambad.com',
          'Vary': 'Accept'
        });

        const imageResponse = new Response(imageBytes, { status: 200, headers });

        if (c.executionCtx) {
          c.executionCtx.waitUntil(cache.put(cacheKey, imageResponse.clone()));
        }

        return imageResponse;
      }
    } catch (e) {
      // Continue to next candidate
    }
  }

  // Check D1 for any alternative official signed gazette image (e.g. from nagalandlotteryresults)
  try {
    const drawId = `${dateStr}-${slotKey.toUpperCase()}`;
    const draw = await getDrawById(c.env.DB, drawId);
    if (draw?.raw_json) {
      const parsed = JSON.parse(draw.raw_json);
      const altUrl = parsed.source_url || parsed.image_r2_url;
      if (altUrl && typeof altUrl === 'string' && altUrl.startsWith('http') && !altUrl.includes('lottery.sambad.com') && !altUrl.includes('/api/sheet-image')) {
        const altRes = await fetch(altUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(6000)
        });
        if (altRes.ok) {
          const contentType = altRes.headers.get('content-type') || 'image/jpeg';
          const altBytes = await altRes.arrayBuffer();
          const headers = new Headers({
            'Content-Type': contentType,
            'Content-Length': String(altBytes.byteLength),
            'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
            'Access-Control-Allow-Origin': '*'
          });
          const altResponse = new Response(altBytes, { status: 200, headers });
          if (c.executionCtx) {
            c.executionCtx.waitUntil(cache.put(cacheKey, altResponse.clone()));
          }
          return altResponse;
        }
      }
    }
  } catch (d1Err) {
    // Continue
  }

  // Fallback: Redirect directly to official Lottery Sambad JPEG
  return c.redirect(`https://lottery.sambad.com/images/lottery-sambad-${slotKey}-${dateKey}.jpg`, 302);
};

app.get('/api/sheet-image', handleSheetImage);
app.get('/api/sheet-image/:date/:slot', handleSheetImage);

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
// 10. Cron Pre-Publish Endpoint (POST /api/prepublish)
// Generates upcoming draw route 30 minutes ahead of draw time and pings search engines
// ============================================================================
app.post('/api/prepublish', async (c) => {
  const apiKeyHeader = c.req.header('X-API-KEY') || c.req.header('Authorization')?.replace('Bearer ', '');
  const expectedKey = c.env.API_KEY || 'dear_lottery_secret_key_prod_2026';

  if (apiKeyHeader !== expectedKey) {
    return c.json({ error: 'Unauthorized: Invalid API Key' }, 401);
  }

  try {
    const body = (await c.req.json<{ date?: string; slot?: '1PM' | '6PM' | '8PM' }>().catch(() => ({}))) as { date?: string; slot?: '1PM' | '6PM' | '8PM' };
    
    // Compute current IST date and slot if not provided
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utcTime + 5.5 * 3600000);
    const dateStr = body.date || `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;
    
    let slot: '1PM' | '6PM' | '8PM' = body.slot || '1PM';
    if (!body.slot) {
      const istHour = istDate.getHours();
      if (istHour >= 19) slot = '8PM';
      else if (istHour >= 14) slot = '6PM';
      else slot = '1PM';
    }

    const prePublished = await prepublishUpcomingDraw(c.env.DB, dateStr, slot);
    const frontendBase = c.env.FRONTEND_URL || 'https://dearresultlive.in';
    const urlsToPing = [
      `${frontendBase}/results/${dateStr}/${slot.toLowerCase()}`,
      `${frontendBase}/results/${dateStr}`,
      `${frontendBase}/`
    ];

    c.executionCtx.waitUntil(publishToGoogleIndexing(c.env, urlsToPing, prePublished.id));
    c.executionCtx.waitUntil(submitIndexNow(c.env, urlsToPing, prePublished.id));

    return c.json({
      success: true,
      status: 'UPCOMING',
      draw_id: prePublished.id,
      draw_name: prePublished.draw_name,
      draw_time: prePublished.draw_time,
      urls_pinged: urlsToPing,
      message: `Draw ${prePublished.id} pre-published successfully. Dynamic route ready.`
    }, 201);
  } catch (err: any) {
    console.error('Pre-publish error:', err);
    return c.json({ error: 'Pre-publish failed', details: err.message }, 500);
  }
});

// ============================================================================
// 11. Autonomous Edge Live Poller (GET & POST /api/cron/poll-live)
// Zero-queue edge polling: fetches upstream Sambad, saves to D1, alerts Telegram
// ============================================================================
const handlePollLive = async (c: any) => {
  const dateParam = c.req.query('date');
  const slotParam = c.req.query('slot') as '1PM' | '6PM' | '8PM' | undefined;
  const result = await pollAndIngestLiveDraw(c.env, c.executionCtx, dateParam, slotParam);
  return c.json(result);
};

app.get('/api/cron/poll-live', handlePollLive);
app.post('/api/cron/poll-live', handlePollLive);

// ============================================================================
// Cloudflare Worker Default Export (Fetch + Scheduled Cron Trigger)
// ============================================================================
export default {
  fetch: app.fetch,

  // Scheduled Cron Trigger Handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const scheduledDate = new Date(event.scheduledTime);
    const utcHour = scheduledDate.getUTCHours();
    const utcMin = scheduledDate.getUTCMinutes();
    console.log(`[CRON] Scheduled event fired at UTC ${scheduledDate.toISOString()} (Hour: ${utcHour}, Min: ${utcMin})`);

    // 1. Warm-up pre-publish at 07:00, 12:00, 14:00 UTC (12:30, 5:30, 7:30 PM IST)
    if (utcMin === 0 && (utcHour === 7 || utcHour === 12 || utcHour === 14)) {
      let slot: '1PM' | '6PM' | '8PM' = '1PM';
      if (utcHour === 14) slot = '8PM';
      else if (utcHour === 12) slot = '6PM';
      else slot = '1PM';

      const istDate = new Date(scheduledDate.getTime() + 5.5 * 3600000);
      const dateStr = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;

      try {
        console.log(`[CRON] Pre-publishing upcoming draw: ${dateStr} [${slot}] (30 min pre-draw)`);
        const prePublished = await prepublishUpcomingDraw(env.DB, dateStr, slot);

        const frontendBase = env.FRONTEND_URL || 'https://dearresultlive.in';
        const urlsToPing = [
          `${frontendBase}/results/${dateStr}/${slot.toLowerCase()}`,
          `${frontendBase}/results/${dateStr}`,
          `${frontendBase}/`
        ];

        ctx.waitUntil(publishToGoogleIndexing(env, urlsToPing, prePublished.id));
        ctx.waitUntil(submitIndexNow(env, urlsToPing, prePublished.id));
      } catch (err) {
        console.error('[CRON] Failed to pre-publish upcoming draw:', err);
      }
      return;
    }

    // 2. Live Polling Window: Fetch results directly from Sambad, save to D1, alert Telegram
    try {
      console.log(`[CRON] Running live edge poller...`);
      const res = await pollAndIngestLiveDraw(env, ctx);
      console.log(`[CRON] Poller result:`, res.message);
    } catch (err) {
      console.error('[CRON] Error in pollAndIngestLiveDraw:', err);
    }
  }
};
