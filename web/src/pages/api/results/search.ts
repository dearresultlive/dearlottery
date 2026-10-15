import type { APIRoute } from 'astro';
import { searchVerifiedPrizes } from '../../../lib/verified-draws';
import { getISTNow } from '../../../lib/lottery-utils';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const number = url.searchParams.get('number') || '';
  const series = url.searchParams.get('series') || undefined;
  const drawId = url.searchParams.get('draw_id') || undefined;

  if (!number || number.trim().length < 4) {
    return new Response(JSON.stringify({
      matched: false,
      prizes: [],
      error: 'Invalid ticket number (min 4 digits required)'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const istNow = getISTNow();
  let matches: any[] = [];

  // 1. Try D1 database if bound in Cloudflare runtime
  const db = (locals as any)?.runtime?.env?.DB;
  if (db) {
    try {
      const cleanNum = number.replace(/\D/g, '');
      const query = `SELECT * FROM prize_tickets WHERE ticket_number LIKE ? LIMIT 20`;
      const stmt = db.prepare(query).bind(`%${cleanNum}%`);
      const res = await stmt.all();
      if (res.results && res.results.length > 0) {
        matches = res.results.map((r: any) => ({
          draw_name: r.draw_name || 'DEAR LOTTERY',
          draw_time: r.draw_time || '',
          draw_date: r.draw_date || '',
          prize_rank: r.prize_rank || 'Prize',
          prize_amount: Number(r.prize_amount) || 0,
          ticket_number: r.ticket_number,
          series_matched: !series || (r.series && r.series.toUpperCase() === series.toUpperCase()),
          required_series: r.series || null
        }));
      }
    } catch (e) {
      console.error('D1 ticket search error:', e);
    }
  }

  // 2. Query verified official gazette database
  if (matches.length === 0) {
    matches = searchVerifiedPrizes(number, series, drawId, istNow);
  }

  return new Response(JSON.stringify({
    matched: matches.length > 0,
    prizes: matches,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60, s-maxage=120'
    }
  });
};
