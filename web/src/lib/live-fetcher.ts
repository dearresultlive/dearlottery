/**
 * Autonomous Live Draw Checker & Dynamic Ingestion Module.
 * Detects newly published official lottery gazettes at 1:08 PM, 6:08 PM, and 8:08 PM IST.
 */

import liveDrawsData from '../data/live_draws.json';
import { getISTDateString, getISTNow } from './lottery-utils';

export interface LiveSlotCheck {
  slot: '1PM' | '6PM' | '8PM';
  status: 'UPCOMING' | 'DRAWING' | 'RESULT_OUT';
  first_prize?: { series: string; number: string };
  imageUrl?: string;
  prizes?: any;
}

// In-memory runtime cache for dynamically detected draws
export const DYNAMIC_DRAWS_CACHE: Record<string, Partial<Record<'1PM' | '6PM' | '8PM', any>>> = {
  ...(liveDrawsData as any)
};

/**
 * Checks whether a given slot for a date is published, upcoming, or drawing.
 */
export async function checkAndFetchLiveSlot(
  dateStr: string,
  slot: '1PM' | '6PM' | '8PM',
  istNow: Date = getISTNow()
): Promise<LiveSlotCheck> {
  const targetHour = slot === '1PM' ? 13 : slot === '6PM' ? 18 : 20;
  const currentHour = istNow.getHours();
  const currentMin = istNow.getMinutes();
  const todayStr = getISTDateString(istNow);

  // If already in runtime cache
  if (DYNAMIC_DRAWS_CACHE[dateStr]?.[slot]?.first_prize?.number) {
    return {
      slot,
      status: 'RESULT_OUT',
      first_prize: DYNAMIC_DRAWS_CACHE[dateStr][slot].first_prize,
      imageUrl: `/results/${dateStr}/${slot.toLowerCase()}.jpg`,
      prizes: DYNAMIC_DRAWS_CACHE[dateStr][slot]
    };
  }

  // If this draw is in the future
  if (dateStr > todayStr || (dateStr === todayStr && currentHour < targetHour)) {
    return {
      slot,
      status: 'UPCOMING'
    };
  }

  // Attempt live upstream detection from official feeds immediately without artificial delay
  try {
    const [year, month, day] = dateStr.split('-');
    const dateKey = `${day}-${month}-${year}`;
    const slotKey = slot.toLowerCase();

    // Query Lottery Sambad
    const res = await fetch('https://lottery.sambad.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(3000)
    });

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/var\s+datesCards\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        const datesCards = JSON.parse(match[1]);
        const cards = datesCards[dateKey] || [];
        const card = cards.find((c: any) => c.slotkey.toLowerCase() === slotKey);

        if (card && card.num) {
          const parts = card.num.trim().split(/\s+/);
          const series = parts.length > 1 ? parts[0].toUpperCase() : '';
          const number = parts.length > 1 ? parts[1] : parts[0];

          const sambadSheetUrl = `https://lottery.sambad.com/images/lottery-sambad-${slotKey}-${dateKey}.jpg`;
          const proxySheetUrl = `/api/sheet-image?date=${dateStr}&slot=${slotKey}`;
          const sambadPdfUrl = `https://lottery.sambad.com/pdf/lottery-sambad-${slotKey}-${dateKey}.pdf`;

          const newlyFoundDraw = {
            first_prize: { series, number },
            consolation_prize_amount: 1000,
            second_prize: [],
            third_prize: [],
            fourth_prize: [],
            fifth_prize: [],
            image_r2_url: proxySheetUrl,
            pdf_r2_url: sambadPdfUrl,
            source_url: sambadSheetUrl
          };

          if (!DYNAMIC_DRAWS_CACHE[dateStr]) DYNAMIC_DRAWS_CACHE[dateStr] = {};
          DYNAMIC_DRAWS_CACHE[dateStr][slot] = newlyFoundDraw;

          return {
            slot,
            status: 'RESULT_OUT',
            first_prize: { series, number },
            imageUrl: proxySheetUrl,
            prizes: newlyFoundDraw
          };
        }
      }
    }
  } catch (e) {
    // Upstream network timeout / offline
  }

  // Secondary check: Nagaland official results portal
  try {
    const [year, month, day] = dateStr.split('-');
    const dateCode = `${day}${month}${year.slice(2)}`;
    const shortDate = `${day}/${month}/${year.slice(2)}`;
    const dashDate = `${day}-${month}-${year}`;
    const dotDate = `${day}.${month}.${year}`;
    const slotText = slot === '1PM' ? '1 PM' : slot === '6PM' ? '6 PM' : '8 PM';
    const slotAnchor = slot === '1PM' ? 'dear1pm' : slot === '6PM' ? 'dear6pm' : 'dear8pm';

    const nRes = await fetch('https://www.nagalandlotteryresults.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(6000)
    });
    if (nRes.ok) {
      const nHtml = await nRes.text();
      const blocks = nHtml.match(/<div class=['"]dls-update[\s\S]*?<\/div>\s*<\/div>/gi) || [];
      for (const b of blocks) {
        if (b.includes('dls-success') && (b.includes(slotAnchor) || b.includes(slotText))) {
          const matchesDate = b.includes(shortDate) || b.includes(dashDate) || b.includes(dotDate) || b.includes(dateStr);
          if (b.toLowerCase().includes('published') && matchesDate) {
            const imgMatch = b.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
            if (imgMatch) {
              const imgUrl = imgMatch[1];
              const isWrongSlot = 
                (slot === '1PM' && (imgUrl.includes('/DN') || imgUrl.includes('/EN') || imgUrl.includes('6pm') || imgUrl.includes('8pm'))) ||
                (slot === '6PM' && (imgUrl.includes('/MN') || imgUrl.includes('/EN') || imgUrl.includes('1pm') || imgUrl.includes('8pm'))) ||
                (slot === '8PM' && (imgUrl.includes('/MN') || imgUrl.includes('/DN') || imgUrl.includes('1pm') || imgUrl.includes('6pm')));
              if (!isWrongSlot && !imgUrl.includes('WA00') && !imgUrl.includes('logo')) {
                const existing = DYNAMIC_DRAWS_CACHE[dateStr]?.[slot] || {};
                existing.image_r2_url = imgUrl;
                if (!DYNAMIC_DRAWS_CACHE[dateStr]) DYNAMIC_DRAWS_CACHE[dateStr] = {};
                DYNAMIC_DRAWS_CACHE[dateStr][slot] = existing;

                return {
                  slot,
                  status: 'RESULT_OUT',
                  first_prize: existing.first_prize,
                  imageUrl: imgUrl,
                  prizes: existing
                };
              }
            }
          }
        }
      }
    }

    // Direct image check fallback
    const prefix = slot === '6PM' ? 'DN' : slot === '8PM' ? 'EN' : 'MN';
    const directUrl = `https://www.nagalandlotteryresults.com/wp-content/uploads/${year}/${month}/${prefix}${day}${month}${year.slice(2)}_1.jpeg`;
    try {
      const headRes = await fetch(directUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      if (headRes.ok) {
        const existing = DYNAMIC_DRAWS_CACHE[dateStr]?.[slot] || {};
        existing.image_r2_url = directUrl;
        if (!DYNAMIC_DRAWS_CACHE[dateStr]) DYNAMIC_DRAWS_CACHE[dateStr] = {};
        DYNAMIC_DRAWS_CACHE[dateStr][slot] = existing;
        return {
          slot,
          status: 'RESULT_OUT',
          first_prize: existing.first_prize,
          imageUrl: directUrl,
          prizes: existing
        };
      }
    } catch (_) {}
  } catch (e) {}

  // Not published yet, draw is currently underway
  return {
    slot,
    status: 'DRAWING'
  };
}
