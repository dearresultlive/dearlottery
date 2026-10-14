import type { APIRoute } from 'astro';
import { fetchLatestDraws } from '../../../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const slot = url.searchParams.get('slot') || url.searchParams.get('time');
  
  // Try to query D1 database if bound in Cloudflare runtime
  const db = (locals as any)?.runtime?.env?.DB;
  let draws: any[] = [];
  
  if (db) {
    try {
      const query = slot
        ? `SELECT id, draw_date, draw_time, draw_name, draw_number, source_url, checksum, raw_json FROM draws WHERE draw_time LIKE ? ORDER BY draw_date DESC LIMIT 3`
        : `SELECT id, draw_date, draw_time, draw_name, draw_number, source_url, checksum, raw_json FROM draws ORDER BY draw_date DESC, created_at DESC LIMIT 6`;
      
      const stmt = slot ? db.prepare(query).bind(`%${slot}%`) : db.prepare(query);
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

  return new Response(JSON.stringify({
    success: true,
    slot: slot || 'ALL',
    count: draws.length,
    timestamp: new Date().toISOString(),
    draws
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=5, s-maxage=10, stale-while-revalidate=30'
    }
  });
};
