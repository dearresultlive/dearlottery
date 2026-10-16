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

  // If draw just started (e.g. within first 5 minutes of draw hour)
  if (dateStr === todayStr && currentHour === targetHour && currentMin < 5) {
    return {
      slot,
      status: 'DRAWING'
    };
  }

  // Attempt live upstream detection from official feeds
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

          const newlyFoundDraw = {
            first_prize: { series, number },
            consolation_prize_amount: 1000,
            second_prize: [],
            third_prize: [],
            fourth_prize: [],
            fifth_prize: []
          };

          if (!DYNAMIC_DRAWS_CACHE[dateStr]) DYNAMIC_DRAWS_CACHE[dateStr] = {};
          DYNAMIC_DRAWS_CACHE[dateStr][slot] = newlyFoundDraw;

          return {
            slot,
            status: 'RESULT_OUT',
            first_prize: { series, number },
            imageUrl: `/api/gazette-sheet.svg?date=${dateStr}&slot=${slotKey}`,
            prizes: newlyFoundDraw
          };
        }
      }
    }
  } catch (e) {
    // Upstream network timeout / offline
  }

  // Not published yet, draw is currently underway
  return {
    slot,
    status: 'DRAWING'
  };
}
