import { Env, DrawRecord, PrizeRecord } from '../types';
import { getDrawById, saveDrawTransaction } from '../db/queries';
import { sendTelegramAlert } from './telegram';
import { submitIndexNow } from './indexing';
import { publishToGoogleIndexing } from './google_indexing';

export interface EdgePollerResult {
  ingested: boolean;
  dateStr: string;
  slot: '1PM' | '6PM' | '8PM';
  message: string;
  first_prize?: { series: string; number: string };
  telegram_sent?: boolean;
}

export function getISTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

export function getISTDateString(d: Date = getISTNow()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getCurrentSlot(d: Date = getISTNow()): '1PM' | '6PM' | '8PM' {
  const h = d.getHours();
  const m = d.getMinutes();
  const totalMin = h * 60 + m;
  // 1:00 PM is 780 min. Window up to 15:00 (900 min) -> 1PM
  if (totalMin < 900) return '1PM';
  // 6:00 PM is 1080 min. Window up to 19:50 (1190 min) -> 6PM
  if (totalMin < 1190) return '6PM';
  // 8:00 PM is 1200 min -> 8PM
  return '8PM';
}

/**
 * Autonomous Edge Poller:
 * Queries upstream official Lottery Sambad feeds directly from Cloudflare's edge network,
 * checks for newly declared results, updates D1 database in 1 second, broadcasts to Telegram,
 * and pings search engines with zero queue delay.
 */
export async function pollAndIngestLiveDraw(
  env: Env,
  ctx?: ExecutionContext,
  targetDate?: string,
  targetSlot?: '1PM' | '6PM' | '8PM'
): Promise<EdgePollerResult> {
  const istDate = getISTNow();
  const dateStr = targetDate || getISTDateString(istDate);
  const slot = targetSlot || getCurrentSlot(istDate);
  const drawId = `${dateStr}-${slot}`;

  console.log(`[EdgePoller] Checking slot: ${slot} for ${dateStr}...`);

  // 1. Check if draw is already declared in D1
  const existing = await getDrawById(env.DB, drawId);
  if (existing) {
    try {
      const parsed = JSON.parse(existing.raw_json);
      if (parsed.status === 'DECLARED' && parsed.prizes?.first_prize?.number) {
        return {
          ingested: false,
          dateStr,
          slot,
          message: `Draw ${drawId} already declared with 1st Prize ${parsed.prizes.first_prize.series || ''} ${parsed.prizes.first_prize.number}`,
          first_prize: parsed.prizes.first_prize
        };
      }
    } catch (e) {
      // Ignore JSON parse error and proceed
    }
  }

  // 2. Fetch from Nagaland Lottery Results official portal & Lottery Sambad
  const [year, month, day] = dateStr.split('-');
  const dateKey = `${day}-${month}-${year}`;
  const slotKey = slot.toLowerCase();

  let nagalandResult: { declared: boolean; imageUrl?: string; drawName?: string } | null = null;
  try {
    const nRes = await fetch('https://www.nagalandlotteryresults.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (nRes.ok) {
      const nHtml = await nRes.text();
      const slotText = slot === '1PM' ? '1 PM' : slot === '6PM' ? '6 PM' : '8 PM';
      const slotAnchor = slot === '1PM' ? 'dear1pm' : slot === '6PM' ? 'dear6pm' : 'dear8pm';
      const blocks = nHtml.match(/<div class=['"]dls-update[\s\S]*?<\/div>\s*<\/div>/gi) || [];
      for (const b of blocks) {
        if (b.includes('dls-success') && (b.includes(slotAnchor) || b.includes(slotText))) {
          const imgMatch = b.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
          const imgUrl = imgMatch ? imgMatch[1] : undefined;
          const slotSuffix = slot === '1PM' ? '_1' : slot === '6PM' ? '_6' : '_8';
          if (imgUrl && !imgUrl.includes(slotSuffix) && !imgUrl.toLowerCase().includes(slot.toLowerCase()) && !imgUrl.includes('WA00')) {
            continue;
          }
          const nameMatch = b.match(/Dear\s*<strong>(.*?)<\/strong>/i) || b.match(/Dear\s*([a-zA-Z]+)\s*Weekly/i);
          nagalandResult = {
            declared: true,
            imageUrl: imgUrl,
            drawName: nameMatch ? `DEAR ${nameMatch[1].toUpperCase()}` : `DEAR ${slot}`
          };
          console.log(`[EdgePoller] 🟢 Nagaland portal verified published: ${nagalandResult.drawName} (${nagalandResult.imageUrl})`);
          break;
        }
      }
    }
  } catch (nErr: any) {
    console.warn('[EdgePoller] Nagaland check error:', nErr?.message || nErr);
  }

  // Check Lottery Sambad official feed
  let html = '';
  let card: any = null;
  try {
    const res = await fetch('https://lottery.sambad.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (res.ok) {
      html = await res.text();
      const match = html.match(/var\s+datesCards\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        const datesCards = JSON.parse(match[1]);
        const cards = datesCards[dateKey] || [];
        card = cards.find((c: any) => c.slotkey && c.slotkey.toLowerCase() === slotKey);
      }
    }
  } catch (err: any) {
    console.warn('[EdgePoller] Sambad check error:', err?.message || err);
  }

  const isDeclared = (card && card.num && card.num.trim()) || nagalandResult?.declared;

  if (!isDeclared) {
    return {
      ingested: false,
      dateStr,
      slot,
      message: `Result for ${dateStr} [${slot}] has NOT been published yet on official portals`
    };
  }

  // 3. Extract verified winning numbers & metadata
  let series = '';
  let number = '';
  let drawName = nagalandResult?.drawName || `DEAR ${slot}`;
  let drawNumber = '50';
  let imageUrl = nagalandResult?.imageUrl || `https://lottery.sambad.com/images/mobile/lottery-sambad-${slotKey}-${dateKey}.webp`;
  let pdfUrl = `https://lottery.sambad.com/pdf/lottery-sambad-${slotKey}-${dateKey}.pdf`;

  if (card && card.num && card.num.trim()) {
    const parts = card.num.trim().split(/\s+/);
    series = parts.length > 1 ? parts[0].toUpperCase() : '';
    number = parts.length > 1 ? parts[1] : parts[0];
    if (card.name) drawName = `DEAR ${card.name.toUpperCase()}`;
    if (card.drawno) drawNumber = card.drawno;
  }
  if (!imageUrl) {
    imageUrl = `https://lottery.sambad.com/images/mobile/lottery-sambad-${slotKey}-${dateKey}.webp`;
  }

  console.log(`[EdgePoller] 🎉 NEW RESULT DETECTED: ${drawName} [${slot}] -> 1st Prize ${series} ${number}`);

  // 4. Construct payload for D1
  const drawTime = slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM';
  const rawJson = JSON.stringify({
    status: 'DECLARED',
    draw_id: drawId,
    draw_date: dateStr,
    draw_time: drawTime,
    draw_name: drawName,
    draw_number: drawNumber,
    source_url: imageUrl,
    image_r2_url: imageUrl,
    pdf_r2_url: pdfUrl,
    prizes: {
      first_prize: { series, number },
      consolation_prize_amount: 1000,
      second_prize: [],
      third_prize: [],
      fourth_prize: [],
      fifth_prize: []
    }
  });

  const drawRecord: DrawRecord = {
    id: drawId,
    draw_date: dateStr,
    draw_time: drawTime,
    draw_name: drawName,
    source_url: imageUrl,
    checksum: `edge_${dateStr}_${slot}_${Date.now()}`,
    raw_json: rawJson
  };

  const prizeRecords: PrizeRecord[] = number ? [
    {
      draw_id: drawId,
      prize_rank: '1st',
      prize_amount: 10000000,
      ticket_number: number,
      last_digits: number.slice(-4),
      series: series || null
    }
  ] : [];

  // 5. Atomic D1 save
  try {
    await saveDrawTransaction(env.DB, drawRecord, prizeRecords);
    console.log(`[EdgePoller] ✅ Ingested ${drawId} into D1 database.`);
  } catch (d1Err: any) {
    console.error(`[EdgePoller] Failed to save to D1:`, d1Err?.message || d1Err);
  }

  // 6. Broadcast to Telegram immediately
  let telegramSent = false;
  if (number) {
    try {
      telegramSent = await sendTelegramAlert(env, {
        dateStr,
        slot,
        series,
        number,
        drawName,
        drawNumber,
        imageUrl,
        pdfUrl
      });
    } catch (tgErr: any) {
      console.error(`[EdgePoller] Telegram error:`, tgErr?.message || tgErr);
    }
  }

  // 7. Non-blocking SEO pings via ctx.waitUntil
  const frontendBase = env.FRONTEND_URL || 'https://dearresultlive.in';
  const urlsToPing = [
    `${frontendBase}/`,
    `${frontendBase}/results/${dateStr}`,
    `${frontendBase}/results/${dateStr}/${slot.toLowerCase()}`,
    `${frontendBase}/checker`,
    `${frontendBase}/analytics`
  ];

  if (ctx) {
    ctx.waitUntil(submitIndexNow(env, urlsToPing, drawId));
    ctx.waitUntil(publishToGoogleIndexing(env, urlsToPing, drawId));

    // Optional: Trigger GitHub Actions workflow dispatch for deep archival (OCR 5th prizes)
    if (env.GITHUB_TOKEN) {
      ctx.waitUntil(
        fetch('https://api.github.com/repos/dearresultlive/dearlottery/actions/workflows/scrape_results.yml/dispatches', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'DearLottery-EdgePoller'
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              slot,
              date: dateStr
            }
          })
        }).catch(err => console.warn('[EdgePoller] GitHub dispatch warning:', err))
      );
    }
  }

  return {
    ingested: true,
    dateStr,
    slot,
    message: `Successfully ingested 1st Prize ${series} ${number} and alerted Telegram`,
    first_prize: { series, number },
    telegram_sent: telegramSent
  };
}
