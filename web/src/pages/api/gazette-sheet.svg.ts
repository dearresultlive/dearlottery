import type { APIRoute } from 'astro';
import { getISTDateString, getISTNow } from '../../lib/lottery-utils';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);

  const dateParam = url.searchParams.get('date') || todayStr;
  const slotParam = (url.searchParams.get('slot') || '1pm').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const slotKey = (slotParam.includes('6') ? '6pm' : slotParam.includes('8') ? '8pm' : '1pm');
  const dateKey = dateParam.split('-').reverse().join('-');

  const sambadDirect = `https://lottery.sambad.com/images/lottery-sambad-${slotKey}-${dateKey}.jpg`;
  return Response.redirect(sambadDirect, 302);
};
