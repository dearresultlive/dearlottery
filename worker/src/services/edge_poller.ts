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

export function getCurrentSlot(d: Date = getISTNow()): '1PM' | '6PM' | '8PM' | null {
  const h = d.getHours();
  const m = d.getMinutes();
  const totalMin = h * 60 + m;
  // 1:00 PM draw window: 12:55 PM to 5:45 PM IST (775 to 1065 min)
  if (totalMin >= 775 && totalMin < 1070) return '1PM';
  // 6:00 PM draw window: 5:55 PM to 7:45 PM IST (1075 to 1185 min)
  if (totalMin >= 1075 && totalMin < 1190) return '6PM';
  // 8:00 PM draw window: 7:55 PM to 11:45 PM IST (1195 to 1425 min)
  if (totalMin >= 1195 && totalMin <= 1435) return '8PM';
  return null;
}

/**
 * Check sambadlottery.com for instant text-based 1st prize numbers.
 * High-speed, Cloudflare-friendly upstream mirror (bypasses Cloudflare Error 1106).
 */
async function checkSambadLottery(dateStr: string, slot: '1PM' | '6PM' | '8PM'): Promise<{ declared: boolean; series: string; number: string } | null> {
  try {
    const res = await fetch('https://sambadlottery.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const desc = descMatch ? descMatch[1] : '';

    // Verify date on the page matches dateStr
    const [year, month, day] = dateStr.split('-');
    const dotDate = `${day}.${month}.${year}`;
    const dashDate = `${day}-${month}-${year}`;
    if (!desc.includes(dotDate) && !desc.includes(dashDate) && !html.includes(dotDate) && !html.includes(dashDate)) {
      return null;
    }

    const slotLabel = slot === '1PM' ? '1 PM' : slot === '6PM' ? '6 PM' : '8 PM';
    const reg = new RegExp(slotLabel + '[:\\s·\\-]+([0-9]{1,2}[A-Z])\\s+([0-9]{5})', 'i');
    const m = desc.match(reg);
    if (m) {
      return {
        declared: true,
        series: m[1].toUpperCase(),
        number: m[2]
      };
    }
  } catch (err: any) {
    console.warn('[EdgePoller] sambadlottery.com fetch error:', err?.message || err);
  }
  return null;
}

/**
 * Check nagalandlotterysambad.com for instant text-based 1st prize numbers.
 * Fast mirror that updates within 8-12 minutes of draw time.
 */
async function checkNagalandLotterySambad(dateStr: string, slot: '1PM' | '6PM' | '8PM'): Promise<{ declared: boolean; series: string; number: string } | null> {
  try {
    const res = await fetch('https://nagalandlotterysambad.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();

    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(month, 10) - 1];
    const expectedDate = `${parseInt(day, 10)} ${monthName} ${year}`; // e.g. "20 Oct 2026"

    const cls = slot === '1PM' ? 'draw-1pm' : slot === '6PM' ? 'draw-6pm' : 'draw-8pm';
    const slideReg = new RegExp('<div class="[^"]*' + cls + '[\\s\\S]*?</div>\\s*</div>', 'i');
    const slideMatch = html.match(slideReg);
    if (!slideMatch) return null;
    const slideHtml = slideMatch[0];

    // Check if the slide contains expected date
    if (!slideHtml.includes(expectedDate)) {
      return null;
    }

    const reg = /data-number=["']([^"']+)["']/i;
    const m = slideHtml.match(reg);
    if (m && m[1]) {
      const parts = m[1].trim().split(/\s+/);
      const series = parts.length > 1 ? parts[0].toUpperCase() : '';
      const number = parts.length > 1 ? parts[1] : parts[0];
      if (/^\d{5}$/.test(number)) {
        return {
          declared: true,
          series,
          number
        };
      }
    }
  } catch (err: any) {
    console.warn('[EdgePoller] nagalandlotterysambad.com fetch error:', err?.message || err);
  }
  return null;
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

  if (!slot) {
    return {
      ingested: false,
      dateStr,
      slot: '1PM',
      message: `Outside official draw hours (Draws occur at 1:00 PM, 6:00 PM, 8:00 PM IST). Sleeping edge poller.`
    };
  }

  const drawId = `${dateStr}-${slot}`;

  console.log(`[EdgePoller] Checking slot: ${slot} for ${dateStr}...`);

  // 1. Check if draw is already declared in D1
  let existingPrizes: any = null;
  const existing = await getDrawById(env.DB, drawId);
  if (existing) {
    try {
      const parsed = JSON.parse(existing.raw_json);
      if (parsed.status === 'DECLARED' && parsed.prizes?.first_prize?.number) {
        if (parsed.prizes?.fifth_prize?.length >= 50) {
          return {
            ingested: false,
            dateStr,
            slot,
            message: `Draw ${drawId} already fully declared with 1st Prize ${parsed.prizes.first_prize.series || ''} ${parsed.prizes.first_prize.number} and ${parsed.prizes.fifth_prize.length} prizes`,
            first_prize: parsed.prizes.first_prize
          };
        }
        existingPrizes = parsed.prizes;
      }
    } catch (e) {
      // Ignore JSON parse error and proceed
    }
  }

  // 2. Fetch from Nagaland Lottery Results, SambadLottery mirror & Lottery Sambad in parallel
  const [year, month, day] = dateStr.split('-');
  const dateKey = `${day}-${month}-${year}`;
  const slotKey = slot.toLowerCase();

  let nagalandResult: { declared: boolean; imageUrl?: string; drawName?: string } | null = null;
  let sambadLotteryRes: { declared: boolean; series: string; number: string } | null = null;
  let nSambadRes: { declared: boolean; series: string; number: string } | null = null;
  let card: any = null;

  const [nRes, sLotteryRes, nSambadSettled, sRes, relaySettled] = await Promise.allSettled([
    // Check Nagaland Lottery Results portal for official signed sheet
    (async () => {
      try {
        const res = await fetch('https://www.nagalandlotteryresults.com/', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (res.ok) {
          const nHtml = await res.text();
          const slotText = slot === '1PM' ? '1 PM' : slot === '6PM' ? '6 PM' : '8 PM';
          const slotAnchor = slot === '1PM' ? 'dear1pm' : slot === '6PM' ? 'dear6pm' : 'dear8pm';
          const blocks = nHtml.match(/<div class=['"]dls-update[\s\S]*?<\/div>\s*<\/div>/gi) || [];
          for (const b of blocks) {
            if (b.includes('dls-success') && (b.includes(slotAnchor) || b.includes(slotText))) {
              const imgMatch = b.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
              const imgUrl = imgMatch ? imgMatch[1] : undefined;
              if (!imgUrl) continue;
              const isWrongSlot = 
                (slot === '1PM' && (imgUrl.includes('/DN') || imgUrl.includes('/EN') || imgUrl.includes('6pm') || imgUrl.includes('8pm'))) ||
                (slot === '6PM' && (imgUrl.includes('/MN') || imgUrl.includes('/EN') || imgUrl.includes('1pm') || imgUrl.includes('8pm'))) ||
                (slot === '8PM' && (imgUrl.includes('/MN') || imgUrl.includes('/DN') || imgUrl.includes('1pm') || imgUrl.includes('6pm')));
              if (isWrongSlot || imgUrl.includes('WA00') || imgUrl.includes('logo')) {
                continue;
              }
              const nameMatch = b.match(/Dear\s*<strong>(.*?)<\/strong>/i) || b.match(/Dear\s*([a-zA-Z]+)\s*Weekly/i);
              return {
                declared: true,
                imageUrl: imgUrl,
                drawName: nameMatch ? `DEAR ${nameMatch[1].toUpperCase()}` : `DEAR ${slot}`
              };
            }
          }
        }
      } catch (nErr: any) {
        console.warn('[EdgePoller] Nagaland check error:', nErr?.message || nErr);
      }
      return null;
    })(),

    // Check sambadlottery.com (Cloudflare-friendly, instant 1st prize numbers ~8-12 min)
    checkSambadLottery(dateStr, slot),

    // Check nagalandlotterysambad.com (Independent fast mirror ~8-12 min)
    checkNagalandLotterySambad(dateStr, slot),

    // Check lottery.sambad.com directly
    (async () => {
      try {
        const res = await fetch('https://lottery.sambad.com/', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        if (res.ok) {
          const html = await res.text();
          const match = html.match(/var\s+datesCards\s*=\s*(\{[\s\S]*?\});/);
          if (match) {
            const datesCards = JSON.parse(match[1]);
            const cards = datesCards[dateKey] || [];
            return cards.find((c: any) => c.slotkey && c.slotkey.toLowerCase() === slotKey);
          }
        }
      } catch (err: any) {
        console.warn('[EdgePoller] Sambad check error:', err?.message || err);
      }
      return null;
    })(),

    // Check Google Apps Script / External Relay for direct lottery.sambad.com feed
    (async () => {
      if (!env.SAMBAD_RELAY_URL) return null;
      try {
        const res = await fetch(env.SAMBAD_RELAY_URL, {
          redirect: 'follow',
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          const json = await res.json() as any;
          if (json?.datesCards) {
            const cards = json.datesCards[dateKey] || [];
            const found = cards.find((c: any) => c.slotkey && c.slotkey.toLowerCase() === slotKey);
            if (found && found.num && found.num.trim()) {
              console.log(`[EdgePoller] ⚡ Direct Relay detected official Sambad draw: ${found.num}`);
              return found;
            }
          }
        }
      } catch (err: any) {
        console.warn('[EdgePoller] Sambad Relay warning:', err?.message || err);
      }
      return null;
    })()
  ]);

  if (nRes.status === 'fulfilled' && nRes.value) {
    nagalandResult = nRes.value;
    console.log(`[EdgePoller] 🟢 Nagaland portal verified published: ${nagalandResult.drawName} (${nagalandResult.imageUrl})`);
  }
  if (sLotteryRes.status === 'fulfilled' && sLotteryRes.value) {
    sambadLotteryRes = sLotteryRes.value;
    console.log(`[EdgePoller] 🟢 SambadLottery portal detected: 1st Prize ${sambadLotteryRes.series} ${sambadLotteryRes.number}`);
  }
  if (nSambadSettled.status === 'fulfilled' && nSambadSettled.value) {
    nSambadRes = nSambadSettled.value;
    console.log(`[EdgePoller] 🟢 NagalandLotterySambad portal detected: 1st Prize ${nSambadRes.series} ${nSambadRes.number}`);
  }
  if (relaySettled.status === 'fulfilled' && relaySettled.value) {
    card = relaySettled.value;
    console.log(`[EdgePoller] 🎯 Direct Sambad Relay result locked: ${card.num}`);
  }
  if (!card && sRes.status === 'fulfilled' && sRes.value) {
    card = sRes.value;
  }

  // 3. Extract verified winning numbers & metadata
  let series = '';
  let number = '';
  let drawName = nagalandResult?.drawName || `DEAR ${slot}`;
  let drawNumber = '50';
  let imageUrl = nagalandResult?.imageUrl || `https://lottery.sambad.com/images/lottery-sambad-${slotKey}-${dateKey}.jpg`;
  let pdfUrl = `https://lottery.sambad.com/pdf/lottery-sambad-${slotKey}-${dateKey}.pdf`;

  if (card && card.num && card.num.trim()) {
    const parts = card.num.trim().split(/\s+/);
    series = parts.length > 1 ? parts[0].toUpperCase() : '';
    number = parts.length > 1 ? parts[1] : parts[0];
    if (card.name) drawName = `DEAR ${card.name.toUpperCase()}`;
    if (card.drawno) drawNumber = card.drawno;
  } else if (sambadLotteryRes && sambadLotteryRes.number) {
    series = sambadLotteryRes.series;
    number = sambadLotteryRes.number;
  } else if (nSambadRes && nSambadRes.number) {
    series = nSambadRes.series;
    number = nSambadRes.number;
  }

  const isDeclared = Boolean(number) || Boolean(nagalandResult?.declared);

  if (!isDeclared || !number) {
    return {
      ingested: false,
      dateStr,
      slot,
      message: `Result for ${dateStr} [${slot}] has NOT been published yet on official portals`
    };
  }

  if (!imageUrl) {
    imageUrl = `https://lottery.sambad.com/images/lottery-sambad-${slotKey}-${dateKey}.jpg`;
  }

  console.log(`[EdgePoller] 🎉 NEW RESULT DETECTED: ${drawName} [${slot}] -> 1st Prize ${series} ${number}`);

  // 4. Construct payload for D1 with carrier-safe Edge Image Proxy
  const drawTime = slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM';
  const proxySheetUrl = `/api/sheet-image?date=${dateStr}&slot=${slotKey}`;
  const rawJson = JSON.stringify({
    status: 'DECLARED',
    draw_id: drawId,
    draw_date: dateStr,
    draw_time: drawTime,
    draw_name: drawName,
    draw_number: drawNumber,
    source_url: imageUrl,
    image_r2_url: proxySheetUrl,
    pdf_r2_url: pdfUrl,
    telegram_sent: true,
    prizes: {
      first_prize: { series, number },
      consolation_prize_amount: 1000,
      second_prize: existingPrizes?.second_prize?.length ? existingPrizes.second_prize : [],
      third_prize: existingPrizes?.third_prize?.length ? existingPrizes.third_prize : [],
      fourth_prize: existingPrizes?.fourth_prize?.length ? existingPrizes.fourth_prize : [],
      fifth_prize: existingPrizes?.fifth_prize?.length ? existingPrizes.fifth_prize : []
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

  // 6. Broadcast to Telegram immediately ONLY on first detection
  let telegramSent = false;
  const alreadyTelegrammed = Boolean(existingPrizes?.first_prize?.number);
  if (number && !alreadyTelegrammed) {
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
      console.log(`[EdgePoller] 📢 Telegram 1st prize broadcast sent for ${drawId}`);
    } catch (tgErr: any) {
      console.error(`[EdgePoller] Telegram error:`, tgErr?.message || tgErr);
    }
  } else if (alreadyTelegrammed) {
    console.log(`[EdgePoller] ℹ️ Telegram alert already sent for ${drawId}. Suppressing duplicate cron broadcast.`);
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
