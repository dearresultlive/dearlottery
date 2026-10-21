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
  const slotParam = (url.searchParams.get('slot') || '1pm').toLowerCase().replace(/[^0-9a-z]/g, '');
  const slotKey = slotParam.includes('6') ? '6pm' : slotParam.includes('8') ? '8pm' : '1pm';
  const slotUpper = slotKey.toUpperCase() as '1PM' | '6PM' | '8PM';

  const [year, month, day] = dateParam.split('-');
  const dateKey = `${day}-${month}-${year}`;

  // Upstream candidate waterfall:
  // 1. High-Res JPEG (1202x1650 official sheet)
  // 2. Mobile WebP (compressed official sheet)
  // 3. Worker API Proxy
  const candidateUrls = [
    `https://lottery.sambad.com/images/lottery-sambad-${slotKey}-${dateKey}.jpg`,
    `https://lottery.sambad.com/images/mobile/lottery-sambad-${slotKey}-${dateKey}.webp`,
    `https://dear-lottery-api.dearresultlive.workers.dev/api/sheet-image?date=${dateParam}&slot=${slotKey}`
  ];

  const debugLog: string[] = [];

  for (const targetUrl of candidateUrls) {
    try {
      const upstreamRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(6000)
      });

      debugLog.push(`${targetUrl.split('/').pop()} => ${upstreamRes.status}`);

      if (upstreamRes.ok) {
        const contentType = upstreamRes.headers.get('content-type') || (targetUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
        // Verify it is an image and not an HTML error
        if (contentType.startsWith('image/')) {
          const imageBytes = await upstreamRes.arrayBuffer();
          return new Response(imageBytes, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Length': String(imageBytes.byteLength),
              'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
              'Access-Control-Allow-Origin': '*',
              'X-Proxy-Origin': 'DearResultLive-Edge-Image-Proxy',
              'Vary': 'Accept'
            }
          });
        }
      }
    } catch (err: any) {
      debugLog.push(`${targetUrl.split('/').pop()} => ERR: ${err?.message || err}`);
    }
  }

  // If official sheet image is not published yet, serve authentic vector SVG gazette replica
  const draw = getVerifiedDraw(dateParam, slotUpper, istNow);
  const hasRealPrizes = Boolean(draw.status === 'DECLARED' && draw.prizes?.first_prize?.number);
  const isPending = !hasRealPrizes;

  const svgContent = generateGazetteSvg({
    drawDate: dateParam,
    drawTime: draw.draw_time,
    drawName: draw.draw_name,
    drawNumber: draw.draw_number || (slotUpper === '1PM' ? '50' : '74'),
    isPending: isPending,
    prizes: isPending ? undefined : (draw.prizes || undefined)
  });

  return new Response(svgContent, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': isPending ? 'public, max-age=15, stale-while-revalidate=30' : 'public, max-age=3600, s-maxage=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Proxy-Fallback': 'SVG-Replica',
      'X-Debug-Log': debugLog.join(' | ')
    }
  });
};
