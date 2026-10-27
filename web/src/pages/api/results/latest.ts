import type { APIRoute } from 'astro';
import { fetchLatestDraws } from '../../../lib/api';
import { checkAndFetchLiveSlot } from '../../../lib/live-fetcher';
import { getISTDateString, getISTNow } from '../../../lib/lottery-utils';

export const prerender = false;

// Module-level in-memory cache for SSR runtime (15s TTL)
let memoryCache: Record<string, { data: any; timestamp: number }> = {};

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const slot = url.searchParams.get('slot') || url.searchParams.get('time');
  const cacheKeyStr = slot || 'ALL';

  // 1. Return from in-memory cache if available (shields D1 from redundant hits)
  const memCached = memoryCache[cacheKeyStr];
  if (memCached && (Date.now() - memCached.timestamp < 15000)) {
    return new Response(JSON.stringify(memCached.data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=5, s-maxage=15, stale-while-revalidate=60',
        'X-SSR-Cache': 'HIT',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // Try to query D1 database if bound in Cloudflare runtime
  const db = (locals as any)?.runtime?.env?.DB;
  let draws: any[] = [];
  
  if (db) {
    try {
      // Read top 10 draws from index (reads only 10 rows from D1, no full table scans)
      const query = 'SELECT id, draw_date, draw_time, draw_name, draw_number, source_url, checksum, raw_json FROM draws ORDER BY draw_date DESC, id DESC LIMIT 10';
      const stmt = db.prepare(query);
      const res = await stmt.all();
      
      if (res.results && res.results.length > 0) {
        draws = res.results.map((r: any) => ({
          ...r,
          parsed_data: typeof r.raw_json === 'string' ? JSON.parse(r.raw_json) : r.raw_json
        }));
      }
    } catch (e) {
      console.error('D1 fetch error in API route:', e);
    }
  }

  // Fallback to api.ts fetchLatestDraws()
  if (!draws || draws.length === 0) {
    draws = await fetchLatestDraws();
  }

  // Autonomous on-demand live check: if active slot has passed scheduled draw time and is not yet declared
  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);
  const currentHour = istNow.getHours();

  // Determine which slot is relevant
  const targetSlot: '1PM' | '6PM' | '8PM' = slot
    ? (slot.includes('1') ? '1PM' : slot.includes('6') ? '6PM' : '8PM')
    : (currentHour >= 20 ? '8PM' : currentHour >= 18 ? '6PM' : '1PM');

  const isPastSlotTime = (targetSlot === '1PM' && currentHour >= 13) ||
                         (targetSlot === '6PM' && currentHour >= 18) ||
                         (targetSlot === '8PM' && currentHour >= 20);

  const existingDeclared = draws.find(d => 
    d.draw_date === todayStr &&
    (d.draw_time?.includes(targetSlot.replace('PM', '')) || d.id?.includes(targetSlot)) &&
    (d.parsed_data?.prizes?.first_prize?.number || d.prizes?.first_prize?.number)
  );

  if (!existingDeclared && isPastSlotTime) {
    try {
      const check = await checkAndFetchLiveSlot(todayStr, targetSlot, istNow);
      if (check.status === 'RESULT_OUT' && check.first_prize?.number) {
        const resolvedDraw = {
          id: `${todayStr}-${targetSlot}`,
          draw_date: todayStr,
          draw_time: targetSlot === '1PM' ? '1:00 PM' : targetSlot === '6PM' ? '6:00 PM' : '8:00 PM',
          draw_name: `DEAR ${targetSlot}`,
          draw_number: '50',
          status: 'DECLARED',
          source_url: check.imageUrl,
          prizes: check.prizes,
          parsed_data: {
            status: 'DECLARED',
            prizes: check.prizes,
            image_r2_url: check.imageUrl,
            source_url: check.imageUrl
          }
        };
        const idx = draws.findIndex(d => d.id === resolvedDraw.id);
        if (idx !== -1) {
          draws[idx] = resolvedDraw;
        } else {
          draws.unshift(resolvedDraw);
        }
      }
    } catch (e) {
      console.error('On-demand live fetch error:', e);
    }
  }

  // Filter by slot if requested
  if (slot && draws.length > 0) {
    const norm = slot.toLowerCase().replace(/[^0-9apm]/g, '');
    const filtered = draws.filter(d => 
      d.draw_time?.toLowerCase().includes(norm) ||
      d.id?.toLowerCase().includes(norm) ||
      (norm.includes('1') && d.draw_time?.includes('1:00')) ||
      (norm.includes('6') && d.draw_time?.includes('6:00')) ||
      (norm.includes('8') && d.draw_time?.includes('8:00'))
    );
    if (filtered.length > 0) {
      draws = filtered;
    }
  }

  const responseObj = {
    success: true,
    slot: slot || 'ALL',
    count: draws.length,
    timestamp: new Date().toISOString(),
    draws
  };

  // Cache in memory for 15 seconds
  memoryCache[cacheKeyStr] = { data: responseObj, timestamp: Date.now() };

  return new Response(JSON.stringify(responseObj), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=5, s-maxage=10, stale-while-revalidate=30',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
};
