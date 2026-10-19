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

          const sambadSheetUrl = `https://lottery.sambad.com/images/mobile/lottery-sambad-${slotKey}-${dateKey}.webp`;
          const sambadPdfUrl = `https://lottery.sambad.com/pdf/lottery-sambad-${slotKey}-${dateKey}.pdf`;

          const newlyFoundDraw = {
            first_prize: { series, number },
            consolation_prize_amount: 1000,
            second_prize: [],
            third_prize: [],
            fourth_prize: [],
            fifth_prize: [],
            image_r2_url: sambadSheetUrl,
            pdf_r2_url: sambadPdfUrl,
            source_url: sambadSheetUrl
          };

          if (!DYNAMIC_DRAWS_CACHE[dateStr]) DYNAMIC_DRAWS_CACHE[dateStr] = {};
          DYNAMIC_DRAWS_CACHE[dateStr][slot] = newlyFoundDraw;

          return {
            slot,
            status: 'RESULT_OUT',
            first_prize: { series, number },
            imageUrl: sambadSheetUrl,
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
    const shortDate = `${day}/${month}/${year.slice(2)}`;
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
          if (b.toLowerCase().includes('published') && (b.includes(shortDate) || b.includes(dateStr))) {
            const imgMatch = b.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
            if (imgMatch) {
              const existing = DYNAMIC_DRAWS_CACHE[dateStr]?.[slot] || {};
              existing.image_r2_url = imgMatch[1];
              if (!DYNAMIC_DRAWS_CACHE[dateStr]) DYNAMIC_DRAWS_CACHE[dateStr] = {};
              DYNAMIC_DRAWS_CACHE[dateStr][slot] = existing;

              return {
                slot,
                status: 'RESULT_OUT',
                first_prize: existing.first_prize,
                imageUrl: imgMatch[1],
                prizes: existing
              };
            }
          }
        }
      }
    }
  } catch (e) {}

  // Not published yet, draw is currently underway
  return {
    slot,
    status: 'DRAWING'
  };
}
