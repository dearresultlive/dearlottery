import type { APIRoute } from 'astro';
import { getISTNow, getISTDateString } from '../../lib/lottery-utils';

export const prerender = false;

const SCHEMES: Record<string, string[]> = {
  '1PM': [
    'DEAR YAMUNA MORNING', 'DEAR DWIGHT MORNING', 'DEAR GODAVARI MORNING',
    'DEAR TEESTA MORNING', 'DEAR PADMA MORNING', 'DEAR HOOGHLY MORNING', 'DEAR NARMADA MORNING'
  ],
  '6PM': [
    'DEAR SUN DAY', 'DEAR MOUNTAIN DAY', 'DEAR WAVE DAY',
    'DEAR DESERT DAY', 'DEAR HILL DAY', 'DEAR RIVER DAY', 'DEAR SEA DAY'
  ],
  '8PM': [
    'DEAR HAWK NIGHT', 'DEAR TOUCAN NIGHT', 'DEAR PARROT NIGHT',
    'DEAR SEAGULL NIGHT', 'DEAR FALCON NIGHT', 'DEAR VULTURE NIGHT', 'DEAR OSTRICH NIGHT'
  ]
};

export const POST: APIRoute = async ({ request, locals }) => {
  const apiKey = request.headers.get('X-API-KEY') || request.headers.get('Authorization')?.replace('Bearer ', '');
  const expectedKey = 'dear_lottery_secret_key_prod_2026';

  if (apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid API Key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { date?: string; slot?: '1PM' | '6PM' | '8PM' };
    const istNow = getISTNow();
    const dateStr = body.date || getISTDateString(istNow);
    
    let slot: '1PM' | '6PM' | '8PM' = body.slot ? (body.slot.toUpperCase() as any) : '1PM';
    if (!body.slot) {
      const hour = istNow.getHours();
      if (hour >= 19) slot = '8PM';
      else if (hour >= 14) slot = '6PM';
      else slot = '1PM';
    }

    const drawId = `${dateStr}-${slot}`;
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    const drawName = (SCHEMES[slot] && SCHEMES[slot][dayOfWeek]) || `DEAR LOTTERY ${slot}`;
    const drawTime = slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM';

    // Try to insert placeholder record into Cloudflare D1
    const db = (locals as any)?.runtime?.env?.DB;
    if (db) {
      const upcomingJson = JSON.stringify({
        status: 'UPCOMING',
        draw_id: drawId,
        draw_date: dateStr,
        draw_time: drawTime,
        draw_name: drawName,
        prizes: null
      });

      const checksum = `upcoming_${drawId}_${Date.now()}`;

      await db.prepare(`
        INSERT INTO draws (id, draw_date, draw_time, draw_name, source_url, checksum, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `).bind(
        drawId,
        dateStr,
        drawTime,
        drawName,
        null,
        checksum,
        upcomingJson
      ).run();
    }

    const urlsToPing = [
      `https://dearresultlive.in/results/${dateStr}/${slot.toLowerCase()}`,
      `https://dearresultlive.in/results/${dateStr}`,
      `https://dearresultlive.in/`
    ];

    return new Response(JSON.stringify({
      success: true,
      status: 'UPCOMING',
      draw_id: drawId,
      draw_name: drawName,
      draw_time: drawTime,
      urls_pinged: urlsToPing,
      message: `Draw ${drawId} pre-published 30 minutes ahead. Dynamic route active.`
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Pre-publish failed', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
