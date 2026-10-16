import type { APIRoute } from 'astro';
import { generateGazetteSvg } from '../../lib/gazette-svg';
import { getVerifiedDraw } from '../../lib/verified-draws';
import { getISTDateString, getISTNow } from '../../lib/lottery-utils';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);

  const dateParam = url.searchParams.get('date') || todayStr;
  const slotParam = (url.searchParams.get('slot') || '1pm').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const slotKey = (slotParam.includes('6') ? '6PM' : slotParam.includes('8') ? '8PM' : '1PM') as '1PM' | '6PM' | '8PM';

  const draw = getVerifiedDraw(dateParam, slotKey, istNow);
  const hasRealPrizes = Boolean(draw.status === 'DECLARED' && draw.prizes?.first_prize?.number);
  const isPending = !hasRealPrizes;

  const svgContent = generateGazetteSvg({
    drawDate: dateParam,
    drawTime: draw.draw_time,
    drawName: draw.draw_name,
    drawNumber: draw.draw_number || (slotKey === '1PM' ? '50' : '74'),
    isPending: isPending,
    prizes: isPending ? undefined : (draw.prizes || undefined)
  });

  return new Response(svgContent, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': isPending ? 'no-cache, no-store' : 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
};
