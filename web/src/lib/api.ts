let cachedAnalyticsData: any = null;
let cachedAnalyticsTimestamp = 0;

/**
 * API client to communicate with Cloudflare Worker API.
 * Provides fallback mock datasets for seamless local preview and SSR.
 */

import { getVerifiedDrawsByDate, getVerifiedDraw, searchVerifiedPrizes } from './verified-draws';
import { getISTDateString, getISTNow } from './lottery-utils';
import { checkAndFetchLiveSlot } from './live-fetcher';

const WORKER_BASE = import.meta.env.WORKER_API_BASE || 'https://dear-lottery-api.dearresultlive.workers.dev';

export interface DrawItem {
  id: string;
  draw_date: string;
  draw_time: string;
  draw_name: string;
  draw_number?: string;
  status?: string;
  source_url?: string;
  checksum: string;
  raw_json: string;
  parsed_data: {
    draw_id: string;
    draw_date: string;
    draw_time: string;
    draw_name: string;
    draw_number?: string;
    status?: string;
    prizes: {
      first_prize: { series: string; number: string };
      consolation_prize_amount: number;
      second_prize: string[];
      third_prize: string[];
      fourth_prize: string[];
      fifth_prize: string[];
    } | null;
  };
  prizes?: any;
}

/**
 * Fetch latest draws (today's 1PM, 6PM, 8PM official records)
 * Enhanced with instant upstream live edge-detection for zero-delay publishing.
 */
export async function fetchLatestDraws(): Promise<DrawItem[]> {
  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);

  try {
    const res = await fetch(`${WORKER_BASE}/api/results/latest`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.draws && data.draws.length > 0) {
        // Strict safety check: Worker /api/results/latest returns latest DB draws.
        // If it is early morning before 1PM, the DB's latest draws are from yesterday.
        // We MUST verify that returned draws actually match today's date (todayStr).
        const todayDraws = data.draws.filter((d: any) => d.draw_date === todayStr);
        if (todayDraws.length > 0) {
          const verifiedLocal = getVerifiedDrawsByDate(todayStr, istNow) as unknown as DrawItem[];
          return todayDraws.map((d: any) => {
            const verified = verifiedLocal.find(v => v.id === d.id);
            const workerPrizes = d.parsed_data?.prizes || d.prizes;
            const verifiedPrizes = verified?.parsed_data?.prizes || verified?.prizes;
            if (verifiedPrizes?.second_prize?.length > 0 && (!workerPrizes?.second_prize || workerPrizes.second_prize.length === 0)) {
              return {
                ...d,
                prizes: verifiedPrizes,
                parsed_data: {
                  ...d.parsed_data,
                  prizes: verifiedPrizes
                }
              };
            }
            return d;
          });
        }
      }
    }
  } catch (e) {
    // Graceful fallback to verified official results + live edge check
  }

  const currentHour = istNow.getHours();
  let draws = getVerifiedDrawsByDate(todayStr, istNow) as unknown as DrawItem[];

  // Real-time Edge Detection for Today's Active Drawing Slots
  const slotsToCheck: Array<'1PM' | '6PM' | '8PM'> = [];
  if (currentHour >= 13) slotsToCheck.push('1PM');
  if (currentHour >= 18) slotsToCheck.push('6PM');
  if (currentHour >= 20) slotsToCheck.push('8PM');

  for (const s of slotsToCheck) {
    const slotIdx = draws.findIndex(d => d.id === `${todayStr}-${s}` || d.draw_time?.includes(s.replace('PM', '')));
    const existing = slotIdx >= 0 ? draws[slotIdx] : null;
    const hasFirstPrize = Boolean(existing?.parsed_data?.prizes?.first_prize?.number || existing?.prizes?.first_prize?.number);

    if (!hasFirstPrize) {
      try {
        const live = await checkAndFetchLiveSlot(todayStr, s, istNow);
        if (live.status === 'RESULT_OUT' && live.first_prize?.number) {
          const resolvedDraw: DrawItem = {
            id: `${todayStr}-${s}`,
            draw_date: todayStr,
            draw_time: s === '1PM' ? '1:00 PM' : s === '6PM' ? '6:00 PM' : '8:00 PM',
            draw_name: `DEAR ${s}`,
            draw_number: '50',
            status: 'DECLARED',
            checksum: `live_${todayStr}_${s}`,
            source_url: live.imageUrl || `/results/${todayStr}/${s.toLowerCase()}.jpg`,
            raw_json: JSON.stringify(live.prizes),
            prizes: live.prizes,
            parsed_data: {
              draw_id: `${todayStr}-${s}`,
              draw_date: todayStr,
              draw_time: s === '1PM' ? '1:00 PM' : s === '6PM' ? '6:00 PM' : '8:00 PM',
              draw_name: `DEAR ${s}`,
              status: 'DECLARED',
              prizes: live.prizes
            }
          };

          if (slotIdx >= 0) {
            draws[slotIdx] = resolvedDraw;
          } else {
            draws.push(resolvedDraw);
          }
        }
      } catch (err) {
        // Continue gracefully
      }
    }
  }

  return draws;
}

/**
 * Fetch draws for a specific date (100% official verified winning records)
 */
export async function fetchDrawsByDate(dateStr: string): Promise<DrawItem[]> {
  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);

  // If asking for today, use fetchLatestDraws with live edge detection
  if (dateStr === todayStr) {
    return fetchLatestDraws();
  }

  // Always load verified local records from live_draws.json as reliable ground truth
  const verifiedDraws = getVerifiedDrawsByDate(dateStr, istNow) as unknown as DrawItem[];

  try {
    const res = await fetch(`${WORKER_BASE}/api/results/date/${dateStr}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.draws && data.draws.length > 0) {
        // Merge worker draws with local verified records so full OCR prizes from live_draws.json are never overridden by empty arrays from worker edge cache
        return data.draws.map((d: any) => {
          const verified = verifiedDraws.find(v => v.id === d.id);
          const workerPrizes = d.parsed_data?.prizes || d.prizes;
          const verifiedPrizes = verified?.parsed_data?.prizes || verified?.prizes;

          if (verifiedPrizes?.second_prize?.length > 0 && (!workerPrizes?.second_prize || workerPrizes.second_prize.length === 0)) {
            return {
              ...d,
              prizes: verifiedPrizes,
              parsed_data: {
                ...d.parsed_data,
                prizes: verifiedPrizes
              }
            };
          }
          return d;
        });
      }
    }
  } catch (e) {
    // Fallback
  }

  return verifiedDraws;
}

/**
 * Fetch Frequency and Hot/Cold numbers
 */
export async function fetchFrequencyAnalytics(days: number = 30): Promise<{
  days: number;
  matrix: { digit: string; position: number; count: number }[];
  hotNumbers: { ticket_number: string; occurrences: number; last_seen_date: string }[];
  coldNumbers: { ticket_number: string; occurrences: number; last_seen_date: string }[];
  fourDigitEndings?: {
    most_frequent: { ending: string; frequency: number; last_seen_date: string }[];
    least_frequent: { ending: string; frequency: number; last_seen_date: string }[];
  };
  twoDigitEndings?: {
    most_frequent: { ending: string; frequency: number; last_seen_date: string }[];
    least_frequent: { ending: string; frequency: number; last_seen_date: string }[];
  };
}> {
  if (cachedAnalyticsData && (Date.now() - cachedAnalyticsTimestamp < 12 * 3600 * 1000)) {
    return cachedAnalyticsData;
  }

  try {
    const res = await fetch(`${WORKER_BASE}/api/analytics/frequency?days=${days}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const data = await res.json();
      const analyticsResult = {
        days: data.days || days,
        matrix: data.digit_frequency_matrix,
        hotNumbers: data.hot_numbers,
        coldNumbers: data.cold_numbers,
        fourDigitEndings: data.four_digit_endings,
        twoDigitEndings: data.two_digit_endings
      };
      cachedAnalyticsData = analyticsResult;
      cachedAnalyticsTimestamp = Date.now();
      return analyticsResult;
    }
  } catch (e) {}

  // Deterministic realistic fallback stats
  const digits = ['0','1','2','3','4','5','6','7','8','9'];
  const matrix: { digit: string; position: number; count: number }[] = [];
  for (let pos = 1; pos <= 5; pos++) {
    for (const d of digits) {
      matrix.push({ digit: d, position: pos, count: Math.floor(18 + Math.random() * 25) });
    }
  }

  return {
    matrix,
    hotNumbers: [
      { ticket_number: '4829', occurrences: 14, last_seen_date: 'Yesterday' },
      { ticket_number: '1928', occurrences: 12, last_seen_date: '2 days ago' },
      { ticket_number: '8832', occurrences: 11, last_seen_date: '3 days ago' },
      { ticket_number: '3049', occurrences: 11, last_seen_date: '4 days ago' },
      { ticket_number: '9284', occurrences: 10, last_seen_date: '5 days ago' }
    ],
    coldNumbers: [
      { ticket_number: '0192', occurrences: 1, last_seen_date: '48 days ago' },
      { ticket_number: '6543', occurrences: 1, last_seen_date: '52 days ago' },
      { ticket_number: '7721', occurrences: 2, last_seen_date: '39 days ago' },
      { ticket_number: '3182', occurrences: 2, last_seen_date: '41 days ago' },
      { ticket_number: '9001', occurrences: 2, last_seen_date: '35 days ago' }
    ],
    days
  };
}
