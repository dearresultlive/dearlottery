import type { APIRoute } from 'astro';
import { generateGazetteSvg } from '../../lib/gazette-svg';
import { getVerifiedDraw } from '../../lib/verified-draws';
import { getISTDateString, getISTNow } from '../../lib/lottery-utils';

export const prerender = false;

const RELAY_BASE = 'https://script.google.com/macros/s/AKfycbzPpSKnFJ9AQaJI05q7foByTEPq4iwVySDR591yFkeAaY0s65EpKyfkPkFz8cM5mcOh/exec';

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

  // 0. Priority 0: Check if static gazette sheet is already cached locally on origin (Instant <15ms)
  try {
    const originStaticUrl = new URL(`/results/${dateParam}/${slotKey}.jpg`, request.url).toString();
    const staticRes = await fetch(originStaticUrl, {
      signal: AbortSignal.timeout(2000)
    });
    if (staticRes.ok) {
      const contentType = staticRes.headers.get('content-type') || 'image/jpeg';
      if (contentType.startsWith('image/') && !contentType.includes('svg')) {
        const imageBytes = await staticRes.arrayBuffer();
        return new Response(imageBytes, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(imageBytes.byteLength),
            'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
            'Access-Control-Allow-Origin': '*',
            'X-Proxy-Origin': 'Local-Static-Asset'
          }
        });
      }
    }
  } catch (staticErr) {
    // Continue to live relays
  }

  const sambadJpgUrl = `https://lottery.sambad.com/images/lottery-sambad-${slotKey}-${dateKey}.jpg`;
  const sambadWebpUrl = `https://lottery.sambad.com/images/mobile/lottery-sambad-${slotKey}-${dateKey}.webp`;

  // 1. Priority 1: Attempt Google Apps Script Relay (bypasses Cloudflare Error 403 on Sambad)
  try {
    const relayRes = await fetch(`${RELAY_BASE}?img=${encodeURIComponent(sambadJpgUrl)}`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(6000)
    });
    if (relayRes.ok) {
      const json = (await relayRes.json()) as any;
      if (json && json.success && json.base64) {
        const binaryString = atob(json.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type': json.contentType || 'image/jpeg',
            'Content-Length': String(bytes.byteLength),
            'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
            'Access-Control-Allow-Origin': '*',
            'X-Proxy-Origin': 'GoogleAppsScript-Relay'
          }
        });
      }
    }
  } catch (relayErr) {
    // Continue to direct candidates
  }

  const prefix = slotKey.includes('6') ? 'DN' : slotKey.includes('8') ? 'EN' : 'MN';
  const nagalandUrl1 = `https://www.nagalandlotteryresults.com/wp-content/uploads/${year}/${month}/${prefix}${day}${month}${year.slice(2)}_1.jpeg`;
  const nagalandUrl2 = `https://www.nagalandlotteryresults.com/wp-content/uploads/${year}/${month}/${prefix}${day}${month}${year.slice(2)}_${slotKey.replace('pm', '')}.jpeg`;

  // 2. Priority 2: Direct upstream waterfall candidates
  const candidateUrls = [
    nagalandUrl1,
    nagalandUrl2,
    sambadJpgUrl,
    sambadWebpUrl,
    `https://dear-lottery-api.dearresultlive.workers.dev/api/sheet-image?date=${dateParam}&slot=${slotKey}`
  ];

  for (const targetUrl of candidateUrls) {
    try {
      const upstreamRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (upstreamRes.ok) {
        const contentType = upstreamRes.headers.get('content-type') || (targetUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
        if (contentType.startsWith('image/') && !contentType.includes('svg')) {
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
    } catch (err) {
      // Continue to next candidate
    }
  }

  // 3. Fallback: Redirect directly to official Lottery Sambad JPEG URL
  // Client browsers load official Sambad JPEG directly without datacenter WAF blocks
  return new Response(null, {
    status: 302,
    headers: {
      'Location': sambadJpgUrl,
      'Cache-Control': 'no-cache, no-store'
    }
  });
};

export const HEAD: APIRoute = GET;
