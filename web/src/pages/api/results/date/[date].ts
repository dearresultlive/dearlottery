import type { APIRoute } from 'astro';
import { fetchDrawsByDate } from '../../../../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const dateStr = params.date || '';
  
  try {
    const draws = await fetchDrawsByDate(dateStr);
    return new Response(JSON.stringify({ date: dateStr, draws }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=3600'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, date: dateStr, draws: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
