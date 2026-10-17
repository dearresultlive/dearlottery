/**
 * Historical Number Intelligence & Pattern Analytics Engine.
 * Analyzes historical win occurrences, ending frequency, and middle pair patterns
 * across official Dear Lottery gazette archives.
 * 
 * 100% Client/Edge Compatible - Runs in sub-millisecond with zero server cost.
 */

import liveDrawsData from '../data/live_draws.json';
import { VERIFIED_DRAWS_DB } from './verified-draws';

export interface PastWinRecord {
  drawDate: string;
  drawTime: string;
  drawName: string;
  prizeRank: string;
  prizeAmount: number;
  ticketNumber: string;
  matchedPart: 'exact_5' | 'last_4' | 'last_3' | 'last_2';
}

export interface NumberHistoryAnalysis {
  cleanNumber: string;
  hasExactWin: boolean;
  exactWins: PastWinRecord[];
  last4Wins: PastWinRecord[];
  last2Digits: string;
  last2Frequency: number;
  last2Rank: number; // e.g. Rank 4 out of 100 endings
  middlePair: string;
  middleFrequency: number;
  middleRank: number;
  totalHistoricalHits: number;
  lastSeenDate: string | null;
  hotScore: number; // 0 to 100
  summaryEn: string;
  summaryBn: string;
  summaryHi: string;
}

export interface EndingFrequencyStat {
  ending: string;
  count: number;
  lastSeenDate: string;
}

export interface MiddleFrequencyStat {
  middle: string;
  count: number;
  lastSeenDate: string;
}

/**
 * Consolidates all known draws from live_draws.json and VERIFIED_DRAWS_DB
 */
function getAllHistoricalDraws(): Array<{ date: string; slot: string; prizes: any }> {
  const map = new Map<string, any>();

  // 1. Load from VERIFIED_DRAWS_DB
  for (const [date, slots] of Object.entries(VERIFIED_DRAWS_DB)) {
    for (const [slot, prizes] of Object.entries(slots || {})) {
      if (prizes && prizes.first_prize?.number) {
        map.set(`${date}-${slot}`, { date, slot, prizes });
      }
    }
  }

  // 2. Load from live_draws.json (overwrites with fresh gazette sheets)
  for (const [date, slots] of Object.entries(liveDrawsData as Record<string, any>)) {
    for (const [slot, prizes] of Object.entries(slots || {})) {
      if (prizes && prizes.first_prize?.number) {
        map.set(`${date}-${slot}`, { date, slot, prizes });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Analyzes full history and patterns for any ticket or prize number
 */
export function analyzeNumberHistory(inputNumber: string, currentDateStr?: string): NumberHistoryAnalysis {
  const clean = inputNumber.replace(/\D/g, '');
  const draws = getAllHistoricalDraws();

  const exactWins: PastWinRecord[] = [];
  const last4Wins: PastWinRecord[] = [];
  const last4 = clean.length >= 4 ? clean.slice(-4) : clean;
  const last2 = clean.length >= 2 ? clean.slice(-2) : clean;

  // Middle pair: 2nd and 3rd digit of 5-digit ticket, or first 2 digits of 4-digit
  const middle = clean.length === 5 ? clean.slice(1, 3) : clean.slice(0, 2);

  // Frequency accumulators across all historical records
  const ending2Counts: Record<string, { count: number; lastDate: string }> = {};
  const middleCounts: Record<string, { count: number; lastDate: string }> = {};

  for (const item of draws) {
    const { date, slot, prizes } = item;
    // Skip today's current draw when looking for *past* occurrences
    const isCurrentDraw = currentDateStr && date === currentDateStr;

    const slotLabel = slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM';
    const drawName = `DEAR ${slot}`;

    // 1st Prize
    if (prizes.first_prize?.number) {
      const fNum = String(prizes.first_prize.number);
      const fSeries = prizes.first_prize.series || '';
      const fEnd2 = fNum.slice(-2);
      const fMid = fNum.length === 5 ? fNum.slice(1, 3) : fNum.slice(0, 2);

      if (!ending2Counts[fEnd2]) ending2Counts[fEnd2] = { count: 0, lastDate: date };
      ending2Counts[fEnd2].count += 3; // Weighted higher for 1st prize

      if (!middleCounts[fMid]) middleCounts[fMid] = { count: 0, lastDate: date };
      middleCounts[fMid].count += 3;

      if (!isCurrentDraw) {
        if (fNum === clean) {
          exactWins.push({
            drawDate: date,
            drawTime: slotLabel,
            drawName,
            prizeRank: '1st Prize (১ম পুরস্কার)',
            prizeAmount: 10000000,
            ticketNumber: `${fSeries} ${fNum}`.trim(),
            matchedPart: 'exact_5'
          });
        } else if (last4 && fNum.endsWith(last4)) {
          last4Wins.push({
            drawDate: date,
            drawTime: slotLabel,
            drawName,
            prizeRank: '1st Prize Consolation (সান্ত্বনা)',
            prizeAmount: 1000,
            ticketNumber: `${fSeries} ${fNum}`.trim(),
            matchedPart: 'last_4'
          });
        }
      }
    }

    // 2nd Prize (5-digit numbers)
    if (Array.isArray(prizes.second_prize)) {
      for (const sNum of prizes.second_prize) {
        const sStr = String(sNum);
        const sEnd2 = sStr.slice(-2);
        const sMid = sStr.length === 5 ? sStr.slice(1, 3) : sStr.slice(0, 2);

        if (!ending2Counts[sEnd2]) ending2Counts[sEnd2] = { count: 0, lastDate: date };
        ending2Counts[sEnd2].count += 2;

        if (!middleCounts[sMid]) middleCounts[sMid] = { count: 0, lastDate: date };
        middleCounts[sMid].count += 2;

        if (!isCurrentDraw) {
          if (sStr === clean) {
            exactWins.push({
              drawDate: date,
              drawTime: slotLabel,
              drawName,
              prizeRank: '2nd Prize (২য় পুরস্কার)',
              prizeAmount: 9000,
              ticketNumber: sStr,
              matchedPart: 'exact_5'
            });
          } else if (last4 && sStr.endsWith(last4)) {
            last4Wins.push({
              drawDate: date,
              drawTime: slotLabel,
              drawName,
              prizeRank: '2nd Prize (২য় পুরস্কার)',
              prizeAmount: 9000,
              ticketNumber: sStr,
              matchedPart: 'last_4'
            });
          }
        }
      }
    }

    // 3rd & 4th Prize (4-digit numbers)
    if (Array.isArray(prizes.third_prize) && !isCurrentDraw) {
      for (const tNum of prizes.third_prize) {
        if (last4 && String(tNum) === last4) {
          last4Wins.push({
            drawDate: date,
            drawTime: slotLabel,
            drawName,
            prizeRank: '3rd Prize (৩য় পুরস্কার)',
            prizeAmount: 450,
            ticketNumber: String(tNum),
            matchedPart: 'last_4'
          });
        }
      }
    }

    if (Array.isArray(prizes.fourth_prize) && !isCurrentDraw) {
      for (const foNum of prizes.fourth_prize) {
        if (last4 && String(foNum) === last4) {
          last4Wins.push({
            drawDate: date,
            drawTime: slotLabel,
            drawName,
            prizeRank: '4th Prize (৪র্থ পুরস্কার)',
            prizeAmount: 250,
            ticketNumber: String(foNum),
            matchedPart: 'last_4'
          });
        }
      }
    }

    // 5th Prize (100 four-digit numbers)
    if (Array.isArray(prizes.fifth_prize)) {
      for (const fiNum of prizes.fifth_prize) {
        const fiStr = String(fiNum);
        const fiEnd2 = fiStr.slice(-2);

        if (!ending2Counts[fiEnd2]) ending2Counts[fiEnd2] = { count: 0, lastDate: date };
        ending2Counts[fiEnd2].count += 1;

        if (!isCurrentDraw && last4 && fiStr === last4) {
          last4Wins.push({
            drawDate: date,
            drawTime: slotLabel,
            drawName,
            prizeRank: '5th Prize (৫ম পুরস্কার)',
            prizeAmount: 120,
            ticketNumber: fiStr,
            matchedPart: 'last_4'
          });
        }
      }
    }
  }

  // Calculate Ranks
  const sortedEndings = Object.entries(ending2Counts).sort((a, b) => b[1].count - a[1].count);
  const endingRankIndex = sortedEndings.findIndex(([e]) => e === last2);
  const last2Rank = endingRankIndex !== -1 ? endingRankIndex + 1 : 50;
  const last2Frequency = ending2Counts[last2]?.count || 0;

  const sortedMiddles = Object.entries(middleCounts).sort((a, b) => b[1].count - a[1].count);
  const middleRankIndex = sortedMiddles.findIndex(([m]) => m === middle);
  const middleRank = middleRankIndex !== -1 ? middleRankIndex + 1 : 50;
  const middleFrequency = middleCounts[middle]?.count || 0;

  const totalHits = exactWins.length + last4Wins.length;
  const lastSeenDate = exactWins[0]?.drawDate || last4Wins[0]?.drawDate || null;

  // Hot Score algorithm (0-100) based on ranking and total win frequency
  const rankFactor = Math.max(0, 100 - last2Rank);
  const hitsFactor = Math.min(30, totalHits * 6);
  const hotScore = Math.min(99, Math.max(35, Math.round(rankFactor * 0.7 + hitsFactor)));

  // Generate localized summaries
  let summaryEn = '';
  let summaryBn = '';
  let summaryHi = '';

  if (exactWins.length > 0) {
    const firstHit = exactWins[0];
    summaryEn = `Exact number ${clean} won ${firstHit.prizeRank} previously on ${firstHit.drawDate} (${firstHit.drawTime}).`;
    summaryBn = `এই হুবহু নম্বর ${clean} এর আগে ${firstHit.drawDate} তারিখে (${firstHit.drawTime} ড্র)-এ ${firstHit.prizeRank} জিতেছিল!`;
    summaryHi = `यह सटीक नंबर ${clean} पहले ${firstHit.drawDate} को (${firstHit.drawTime} ड्रॉ) में ${firstHit.prizeRank} जीत चुका है!`;
  } else if (last4Wins.length > 0) {
    const firstHit = last4Wins[0];
    summaryEn = `Ending ${last4} appeared in ${last4Wins.length} past draws, most recently on ${firstHit.drawDate} (${firstHit.prizeRank}).`;
    summaryBn = `শেষ ৪-ডিজিট '${last4}' এর আগে ${last4Wins.length}টি ড্র-এ এসেছিল (সর্বশেষ ${firstHit.drawDate} তারিখে ${firstHit.prizeRank})।`;
    summaryHi = `अंतिम 4-अंक '${last4}' पहले ${last4Wins.length} ड्रॉ में आ चुका है (हाल ही में ${firstHit.drawDate} को)।`;
  } else {
    summaryEn = `Ending '${last2}' ranked #${last2Rank} in frequency (${last2Frequency} hits in official gazettes). Middle '${middle}' ranked #${middleRank}.`;
    summaryBn = `শেষ ২-ডিজিট '${last2}' ফ্রিকোয়েন্সিতে #${last2Rank} নম্বরে আছে (মোট ${last2Frequency} বার এসেছে)। মিডিল '${middle}' র‍্যাংক #${middleRank}।`;
    summaryHi = `अंतिम 2-अंक '${last2}' फ्रीक्वेंसी में #${last2Rank} पर है (कुल ${last2Frequency} बार)। मिडिल '${middle}' रैंक #${middleRank}।`;
  }

  return {
    cleanNumber: clean,
    hasExactWin: exactWins.length > 0,
    exactWins,
    last4Wins,
    last2Digits: last2,
    last2Frequency,
    last2Rank,
    middlePair: middle,
    middleFrequency,
    middleRank,
    totalHistoricalHits: totalHits,
    lastSeenDate,
    hotScore,
    summaryEn,
    summaryBn,
    summaryHi
  };
}

/**
 * Returns Top N Most Frequent 2-digit Endings (00-99)
 */
export function getTopFrequentEndings(limit: number = 10): EndingFrequencyStat[] {
  const draws = getAllHistoricalDraws();
  const counts: Record<string, { count: number; lastDate: string }> = {};

  for (const item of draws) {
    const { date, prizes } = item;
    const addEnding = (num: any, weight: number = 1) => {
      if (!num) return;
      const end2 = String(num).replace(/\D/g, '').slice(-2);
      if (end2.length === 2) {
        if (!counts[end2]) counts[end2] = { count: 0, lastDate: date };
        counts[end2].count += weight;
      }
    };

    if (prizes.first_prize?.number) addEnding(prizes.first_prize.number, 3);
    if (Array.isArray(prizes.second_prize)) prizes.second_prize.forEach(n => addEnding(n, 2));
    if (Array.isArray(prizes.fifth_prize)) prizes.fifth_prize.forEach(n => addEnding(n, 1));
  }

  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([ending, val]) => ({
      ending,
      count: val.count,
      lastSeenDate: val.lastDate
    }));
}

/**
 * Returns Top N Most Frequent Middle Pairs (00-99)
 */
export function getTopFrequentMiddles(limit: number = 10): MiddleFrequencyStat[] {
  const draws = getAllHistoricalDraws();
  const counts: Record<string, { count: number; lastDate: string }> = {};

  for (const item of draws) {
    const { date, prizes } = item;
    const addMiddle = (num: any, weight: number = 1) => {
      if (!num) return;
      const clean = String(num).replace(/\D/g, '');
      if (clean.length >= 4) {
        const mid = clean.length === 5 ? clean.slice(1, 3) : clean.slice(0, 2);
        if (!counts[mid]) counts[mid] = { count: 0, lastDate: date };
        counts[mid].count += weight;
      }
    };

    if (prizes.first_prize?.number) addMiddle(prizes.first_prize.number, 3);
    if (Array.isArray(prizes.second_prize)) prizes.second_prize.forEach(n => addMiddle(n, 2));
  }

  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([middle, val]) => ({
      middle,
      count: val.count,
      lastSeenDate: val.lastDate
    }));
}
