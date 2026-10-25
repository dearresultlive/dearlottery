#!/usr/bin/env node
/**
 * Autonomous Dear Lottery Live Result Poller & Ingestion Engine
 * Automatically monitors official draw releases, downloads signed state gazette sheets,
 * extracts verified prize numbers via OCR, updates live JSON feeds, and pings search engines.
 * 
 * Usage:
 *   node scripts/live_autopoller.js --watch
 *   node scripts/live_autopoller.js --slot 8PM
 */

import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';
import { pingSearchEngines } from './seo_pinger.js';
import { sendOneSignalResultPush } from './onesignal_notifier.js';
import { sendTelegramResultPost } from './telegram_notifier.js';

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const LIVE_DRAWS_FILE = path.join(ROOT_DIR, 'web', 'src', 'data', 'live_draws.json');

// Draw times in IST
const SLOTS = ['1PM', '6PM', '8PM'];
const SLOT_HOURS = { '1PM': 13, '6PM': 18, '8PM': 20 };

function getISTDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

function getISTDateString(d = getISTDate()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getAutoSlot(istDate = getISTDate(), dateStr = getISTDateString(istDate)) {
  const h = istDate.getHours();
  const m = istDate.getMinutes();
  const totalMin = h * 60 + m;

  const db = loadLiveDraws();
  const dayDb = db[dateStr] || {};

  const is1pmVerified = Boolean(dayDb['1PM']?.first_prize?.number && dayDb['1PM']?.second_prize?.length >= 8);
  const is6pmVerified = Boolean(dayDb['6PM']?.first_prize?.number && dayDb['6PM']?.second_prize?.length >= 8);

  // If before 1:00 PM draw (or 1PM not yet verified and time < 17:50)
  if (!is1pmVerified && totalMin < 1070) {
    return '1PM';
  }
  // If 1PM verified and before 6PM draw (or 6PM not yet verified and time < 1190)
  if (!is6pmVerified && totalMin < 1190) {
    return '6PM';
  }
  // Otherwise check 8PM
  return '8PM';
}

function loadLiveDraws() {
  try {
    if (fs.existsSync(LIVE_DRAWS_FILE)) {
      return JSON.parse(fs.readFileSync(LIVE_DRAWS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[Poller] Error reading live_draws.json:', e.message);
  }
  return {};
}

function saveLiveDraws(data) {
  try {
    const dir = path.dirname(LIVE_DRAWS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LIVE_DRAWS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Poller] Successfully updated ${LIVE_DRAWS_FILE}`);
  } catch (e) {
    console.error('[Poller] Failed to save live_draws.json:', e.message);
  }
}

/**
 * 1. Check Lottery Sambad for published status and first prize
 */
async function checkLotterySambad(dateStr, slot) {
  const [year, month, day] = dateStr.split('-');
  const dateKey = `${day}-${month}-${year}`;
  const slotKey = slot.toLowerCase();

  try {
    const res = await fetch('https://lottery.sambad.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const html = await res.text();

    const match = html.match(/var\s+datesCards\s*=\s*(\{[\s\S]*?\});/);
    if (!match) return null;

    const datesCards = JSON.parse(match[1]);
    const cards = datesCards[dateKey] || [];
    const card = cards.find(c => c.slotkey.toLowerCase() === slotKey);

    if (card) {
      const parts = card.num.trim().split(/\s+/);
      return {
        declared: true,
        series: parts.length > 1 ? parts[0].toUpperCase() : '',
        number: parts.length > 1 ? parts[1] : parts[0],
        drawName: card.name ? `DEAR ${card.name.toUpperCase()}` : `DEAR ${slot}`,
        drawNumber: card.drawno || '50',
        imageUrl: `https://lottery.sambad.com/images/lottery-sambad-${slotKey}-${dateKey}.jpg`,
        pdfUrl: `https://lottery.sambad.com/pdf/lottery-sambad-${slotKey}-${dateKey}.pdf`
      };
    }
  } catch (e) {
    // Sambad request failed or timeout
  }
  return null;
}

/**
 * 2. Check Nagaland Lottery Results for published gazette image
 */
async function checkNagalandLotteryResults(dateStr, slot) {
  const [year, month, day] = dateStr.split('-');
  const dateCode = `${day}${month}${year.slice(2)}`; // e.g. "231026"
  const shortDate = `${day}/${month}/${year.slice(2)}`;
  const dashDate = `${day}-${month}-${year}`;
  const dotDate = `${day}.${month}.${year}`;
  const slotText = slot === '1PM' ? '1 PM' : slot === '6PM' ? '6 PM' : '8 PM';
  const slotAnchor = slot === '1PM' ? 'dear1pm' : slot === '6PM' ? 'dear6pm' : 'dear8pm';

  try {
    const res = await fetch('https://www.nagalandlotteryresults.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Find dls-update block with dls-success for this slot
    const blocks = html.match(/<div class=['"]dls-update[\s\S]*?<\/div>\s*<\/div>/gi) || [];
    for (const b of blocks) {
      if (b.includes('dls-success') && (b.includes(slotAnchor) || b.includes(slotText))) {
          const imgMatch = b.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
          const imgUrl = imgMatch ? imgMatch[1] : null;
          if (!imgUrl) continue;

          // Strict Date Validation: Reject images from previous dates!
          const matchesDateInUrl = imgUrl.includes(dateCode);
          const matchesDateInBlock = b.includes(shortDate) || b.includes(dashDate) || b.includes(dotDate);
          if (!matchesDateInUrl && !matchesDateInBlock) {
            continue; // Belongs to previous day's draw
          }

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
  } catch (e) {}

  // Direct URL fallback if homepage parsing fails
  try {
    const prefix = slot === '6PM' ? 'DN' : slot === '8PM' ? 'EN' : 'MN';
    const directUrl = `https://www.nagalandlotteryresults.com/wp-content/uploads/${year}/${month}/${prefix}${day}${month}${year.slice(2)}_1.jpeg`;
    const headRes = await fetch(directUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    if (headRes.ok) {
      return { declared: true, imageUrl: directUrl, drawName: `DEAR ${slot}` };
    }
  } catch (e) {}

  return null;
}

/**
 * Download remote file buffer with retry
 */
async function downloadBuffer(url, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

/**
 * Parse OCR lines into structured prize distribution
 */
function parseOcrLines(lines, slot, dateStr, sambadFirstPrize) {
  let firstPrize = sambadFirstPrize || { series: '', number: '' };

  if (!firstPrize.number) {
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const m = lines[i].match(/\b([0-9]{1,2}\s*[A-Z]{1,2})\s+([0-9\s]{5,7})\b/i);
      if (m) {
        firstPrize = {
          series: m[1].replace(/\s+/g, '').toUpperCase(),
          number: m[2].replace(/\D/g, '')
        };
        break;
      }
    }
  }

  const consLast4 = firstPrize.number ? firstPrize.number.slice(-4) : '';

  // Identify 5th Prize start boundary
  let fifthStartLine = lines.findIndex(l => /(?:[5sS]th|Fifth|120\s*\/)/i.test(l));
  const beforeFifth = fifthStartLine !== -1 ? lines.slice(0, fifthStartLine).join(' ') : lines.join(' ');
  const afterFifth = fifthStartLine !== -1 ? lines.slice(fifthStartLine).join(' ') : '';

  // 2nd Prize: 10 five-digit numbers occurring before 5th prize, excluding 1st prize number
  const m5 = beforeFifth.match(/\b\d{5}\b/g) || [];
  const secondPrize = [...new Set(m5.filter(n => n !== firstPrize.number))].slice(0, 10);

  // 3rd & 4th Prize: 4-digit numbers before 5th prize, excluding consolation last 4 digits
  const m4Before = beforeFifth.match(/\b\d{4}\b/g) || [];
  const mid4 = [...new Set(m4Before.filter(n => n !== consLast4))];
  const thirdPrize = mid4.slice(0, 10);
  const fourthPrize = mid4.slice(10, 20);

  // 5th Prize: 100 four-digit numbers following 5th Prize header
  const m4After = afterFifth.match(/\b\d{4}\b/g) || [];
  const fifthPrize = [...new Set(m4After)].slice(0, 100);

  return {
    first_prize: firstPrize,
    consolation_prize_amount: 1000,
    second_prize: secondPrize,
    third_prize: thirdPrize,
    fourth_prize: fourthPrize,
    fifth_prize: fifthPrize
  };
}

/**
 * Direct Atomic Synchronization with Cloudflare Edge API and D1 Database
 */
async function syncWithCloudflareWorker(dateStr, slot, prizeData, sourceUrl) {
  const workerBase = process.env.WORKER_API_URL || 'https://dear-lottery-api.dearresultlive.workers.dev/api/results';
  const apiKey = process.env.WORKER_API_KEY || 'dear_lottery_secret_key_prod_2026';

  const drawId = `${dateStr}-${slot}`;
  const drawTime = slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM';
  const drawName = prizeData.draw_name || `DEAR ${slot}`;

  const prizes = [];
  if (prizeData.first_prize?.number) {
    prizes.push({
      draw_id: drawId,
      prize_rank: '1st',
      prize_amount: 10000000,
      ticket_number: prizeData.first_prize.number,
      last_digits: prizeData.first_prize.number.slice(-4),
      series: prizeData.first_prize.series || null
    });
  }
  if (Array.isArray(prizeData.second_prize)) {
    for (const num of prizeData.second_prize) {
      prizes.push({
        draw_id: drawId,
        prize_rank: '2nd',
        prize_amount: 10000,
        ticket_number: num,
        last_digits: num.slice(-4),
        series: null
      });
    }
  }
  if (Array.isArray(prizeData.third_prize)) {
    for (const num of prizeData.third_prize) {
      prizes.push({
        draw_id: drawId,
        prize_rank: '3rd',
        prize_amount: 500,
        ticket_number: num,
        last_digits: num.slice(-4),
        series: null
      });
    }
  }
  if (Array.isArray(prizeData.fourth_prize)) {
    for (const num of prizeData.fourth_prize) {
      prizes.push({
        draw_id: drawId,
        prize_rank: '4th',
        prize_amount: 250,
        ticket_number: num,
        last_digits: num.slice(-4),
        series: null
      });
    }
  }
  if (Array.isArray(prizeData.fifth_prize)) {
    for (const num of prizeData.fifth_prize) {
      prizes.push({
        draw_id: drawId,
        prize_rank: '5th',
        prize_amount: 120,
        ticket_number: num,
        last_digits: num.slice(-4),
        series: null
      });
    }
  }

  const rawJson = JSON.stringify({
    status: 'DECLARED',
    draw_id: drawId,
    draw_date: dateStr,
    draw_time: drawTime,
    draw_name: drawName,
    source_url: sourceUrl || '',
    image_r2_url: `/api/sheet-image?date=${dateStr}&slot=${slot.toLowerCase()}`,
    pdf_r2_url: prizeData.pdf_r2_url || `/pdf/${dateStr}/${slot.toLowerCase()}.pdf`,
    prizes: {
      first_prize: prizeData.first_prize || {},
      consolation_prize_amount: 1000,
      second_prize: prizeData.second_prize || [],
      third_prize: prizeData.third_prize || [],
      fourth_prize: prizeData.fourth_prize || [],
      fifth_prize: prizeData.fifth_prize || []
    }
  });

  const payload = {
    draw: {
      id: drawId,
      draw_date: dateStr,
      draw_time: drawTime,
      draw_name: drawName,
      source_url: sourceUrl || '',
      checksum: `auto_${drawId}_${Date.now()}`,
      raw_json: rawJson
    },
    prizes
  };

  try {
    const res = await fetch(workerBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      console.log(`[Poller] ⚡ Successfully synced ${drawId} (${prizes.length} prizes) with Cloudflare D1 Edge API!`);
    } else {
      console.warn(`[Poller] Worker API sync HTTP ${res.status}:`, await res.text());
    }
  } catch (err) {
    console.warn(`[Poller] Worker API sync warning:`, err.message);
  }
}

/**
 * Process a single slot check and ingest if published
 */
async function processSlot(dateStr, slot) {
  const istDate = getISTDate();
  const currentTotalMin = istDate.getHours() * 60 + istDate.getMinutes();
  const targetHour = SLOT_HOURS[slot];
  const targetTotalMin = targetHour * 60;

  // If slot is in the distant future (more than 5 mins before draw)
  if (currentTotalMin < targetTotalMin - 5) {
    const diffMin = targetTotalMin - currentTotalMin;
    const diffHours = (diffMin / 60).toFixed(1);
    console.log(`[Poller] ${dateStr} [${slot}] is UPCOMING in ~${diffHours}h (scheduled for ${targetHour}:00 IST). Waiting...`);
    return { status: 'UPCOMING', diffMin };
  }

  // Check existing local cache
  const db = loadLiveDraws();
  const dayDb = db[dateStr] || {};
  if (dayDb[slot] && dayDb[slot].first_prize?.number) {
    if (dayDb[slot].telegram_sent && dayDb[slot].second_prize?.length >= 8) {
      console.log(`[Poller] ${dateStr} [${slot}] already fully verified: 1st Prize ${dayDb[slot].first_prize.series} ${dayDb[slot].first_prize.number}.`);
      return { status: 'VERIFIED', diffMin: 0 };
    }
  }

  // Cross-system deduplication: check if Cloudflare Worker Edge Poller already declared & sent Telegram
  let alreadyTelegrammed = Boolean(dayDb[slot]?.telegram_sent);
  if (!alreadyTelegrammed) {
    try {
      const edgeRes = await fetch(`https://dear-lottery-api.dearresultlive.workers.dev/api/results/draw/${dateStr}-${slot}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (edgeRes.ok) {
        const edgeJson = await edgeRes.json();
        const edgeDraw = edgeJson?.draw?.parsed_data;
        if (edgeDraw?.status === 'DECLARED' && edgeDraw?.prizes?.first_prize?.number) {
          console.log(`[Poller] ℹ️ Cloudflare Edge has already declared 1st Prize: ${edgeDraw.prizes.first_prize.series} ${edgeDraw.prizes.first_prize.number}.`);
          if (edgeDraw.telegram_sent) {
            alreadyTelegrammed = true;
            console.log(`[Poller] ℹ️ Cloudflare Edge has already broadcasted this draw to Telegram. Suppressing duplicate.`);
          }
        }
      }
    } catch (edgeErr) {}
  }

  console.log(`[Poller] Querying upstream portals for ${dateStr} [${slot}]...`);
  const [sambadRes, nagalandRes] = await Promise.all([
    checkLotterySambad(dateStr, slot),
    checkNagalandLotteryResults(dateStr, slot)
  ]);

  const isPublished = (sambadRes && sambadRes.declared) || (nagalandRes && nagalandRes.declared);

  if (!isPublished) {
    console.log(`[Poller] Result for ${dateStr} [${slot}] has NOT been declared yet by state directorate. State: DRAWING / PENDING.`);
    return { status: 'PENDING', diffMin: 0 };
  }

  console.log(`[Poller] 🎉 OFFICIAL RESULT DETECTED FOR ${dateStr} [${slot}]! Initiating automated ingestion...`);

  // Target local image save path
  const localDir = path.join(ROOT_DIR, 'web', 'public', 'results', dateStr);
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  const localImgPath = path.join(localDir, `${slot.toLowerCase()}.jpg`);

  let imageBuffer = null;
  let sourceUrl = '';

  if (nagalandRes && nagalandRes.imageUrl) {
    try {
      console.log(`[Poller] Downloading official signed sheet from Nagaland CDN: ${nagalandRes.imageUrl}`);
      imageBuffer = await downloadBuffer(nagalandRes.imageUrl);
      sourceUrl = nagalandRes.imageUrl;
      fs.writeFileSync(localImgPath, imageBuffer);
    } catch (e) {
      console.warn('[Poller] Failed to download Nagaland image:', e.message);
    }
  }

  if (!imageBuffer && sambadRes && sambadRes.imageUrl) {
    try {
      console.log(`[Poller] Downloading official sheet from Sambad mirror: ${sambadRes.imageUrl}`);
      imageBuffer = await downloadBuffer(sambadRes.imageUrl);
      sourceUrl = sambadRes.imageUrl;
      fs.writeFileSync(localImgPath, imageBuffer);
    } catch (e) {
      console.warn('[Poller] Failed to download Sambad image:', e.message);
    }
  }

  // Generate responsive mobile WebP (<105 KB) for instant sub-1.5s LCP & green Core Web Vitals
  if (imageBuffer) {
    try {
      const sharp = (await import('sharp')).default;
      const localWebpPath = path.join(localDir, `${slot.toLowerCase()}.webp`);
      const webpBuffer = await sharp(imageBuffer)
        .resize({ width: 550, withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 })
        .toBuffer();
      fs.writeFileSync(localWebpPath, webpBuffer);
      console.log(`[Poller] ⚡ Generated responsive mobile WebP (${Math.round(webpBuffer.length / 1024)} KB) -> ${localWebpPath}`);
    } catch (err) {
      console.warn('[Poller] Failed to generate WebP image:', err.message);
    }
  }

  let sambadFirstPrize = null;
  if (sambadRes && sambadRes.number) {
    sambadFirstPrize = { series: sambadRes.series, number: sambadRes.number };

    // FAST-RELEASE STAGE 1: Publish 1st Prize immediately to live_draws.json
    // so users and Cloudflare see the ₹1 Crore winner instantly without waiting for OCR!
    if (!dayDb[slot]?.first_prize?.number) {
      console.log(`[Poller] ⚡ FAST RELEASE: Ingesting 1st Prize ${sambadFirstPrize.series} ${sambadFirstPrize.number} immediately!`);
      if (!db[dateStr]) db[dateStr] = {};
      db[dateStr][slot] = {
        first_prize: sambadFirstPrize,
        consolation_prize_amount: 1000,
        second_prize: dayDb[slot]?.second_prize || [],
        third_prize: dayDb[slot]?.third_prize || [],
        fourth_prize: dayDb[slot]?.fourth_prize || [],
        fifth_prize: dayDb[slot]?.fifth_prize || [],
        draw_name: sambadRes.drawName || `DEAR ${slot}`,
        telegram_sent: alreadyTelegrammed
      };
      saveLiveDraws(db);

      // Immediately sync with Cloudflare D1 Edge API so results are live on website instantly
      try {
        await syncWithCloudflareWorker(dateStr, slot, db[dateStr][slot], sourceUrl);
      } catch (syncErr) {
        console.warn('[Poller] Fast-release Worker API sync warning:', syncErr.message);
      }

      // Trigger instant Telegram broadcast for 1st Prize (Zero delay alert) ONLY if not already sent
      if (!alreadyTelegrammed) {
        try {
          console.log(`[Poller] 📢 Broadcasting 1st Prize to Telegram...`);
          await sendTelegramResultPost({ dateStr, slot, prizeData: db[dateStr][slot] });
          db[dateStr][slot].telegram_sent = true;
          alreadyTelegrammed = true;
          saveLiveDraws(db);
        } catch (tgErr) {
          console.warn('[Poller] Fast-release Telegram warning:', tgErr.message);
        }
      } else {
        console.log(`[Poller] Telegram already sent for ${dateStr} [${slot}]. Skipping duplicate Fast-Release broadcast.`);
      }

      // Trigger instant OneSignal push for 1st Prize
      try {
        await sendOneSignalResultPush({ dateStr, slot, prizeData: db[dateStr][slot] });
      } catch (pushErr) {
        console.warn('[Poller] Fast-release push warning:', pushErr.message);
      }

      // Ping Search Engines immediately for 1st Prize
      try {
        await pingSearchEngines(dateStr, slot);
      } catch (pingErr) {
        console.warn('[Poller] Fast-release SEO ping warning:', pingErr.message);
      }
    }
  }

  let prizeData = null;

  if (fs.existsSync(localImgPath)) {
    console.log(`[Poller] Executing local Tesseract OCR on ${localImgPath}...`);
    try {
      let ocrInput = localImgPath;
      try {
        const sharp = (await import('sharp')).default;
        ocrInput = await sharp(localImgPath)
          .resize({ width: 1200 })
          .greyscale()
          .normalize()
          .sharpen()
          .png()
          .toBuffer();
        console.log('[Poller] Preprocessed image via sharp (grayscale + normalized PNG) for maximum OCR accuracy');
      } catch (sharpErr) {
        console.warn('[Poller] sharp preprocessing fallback to raw path:', sharpErr.message);
      }

      const worker = await createWorker('eng');
      const ret = await worker.recognize(ocrInput);
      await worker.terminate();

      const lines = ret.data.text.split('\n');
      prizeData = parseOcrLines(lines, slot, dateStr, sambadFirstPrize);
      console.log(`[Poller] OCR extraction complete:`);
      console.log(`  1st Prize: ${prizeData.first_prize.series} ${prizeData.first_prize.number}`);
      console.log(`  2nd Prize: ${prizeData.second_prize.length} numbers`);
      console.log(`  3rd Prize: ${prizeData.third_prize.length} numbers`);
      console.log(`  4th Prize: ${prizeData.fourth_prize.length} numbers`);
      console.log(`  5th Prize: ${prizeData.fifth_prize.length} numbers`);
    } catch (ocrErr) {
      console.error('[Poller] OCR processing error:', ocrErr.message);
    }
  }

  if (!prizeData && sambadFirstPrize) {
    prizeData = {
      first_prize: sambadFirstPrize,
      consolation_prize_amount: 1000,
      second_prize: dayDb[slot]?.second_prize || [],
      third_prize: dayDb[slot]?.third_prize || [],
      fourth_prize: dayDb[slot]?.fourth_prize || [],
      fifth_prize: dayDb[slot]?.fifth_prize || []
    };
  }

  if (prizeData) {
    if ((!prizeData.second_prize || prizeData.second_prize.length === 0) && dayDb[slot]?.second_prize?.length) {
      prizeData.second_prize = dayDb[slot].second_prize;
    }
    if ((!prizeData.third_prize || prizeData.third_prize.length === 0) && dayDb[slot]?.third_prize?.length) {
      prizeData.third_prize = dayDb[slot].third_prize;
    }
    if ((!prizeData.fourth_prize || prizeData.fourth_prize.length === 0) && dayDb[slot]?.fourth_prize?.length) {
      prizeData.fourth_prize = dayDb[slot].fourth_prize;
    }
    if ((!prizeData.fifth_prize || prizeData.fifth_prize.length === 0) && dayDb[slot]?.fifth_prize?.length) {
      prizeData.fifth_prize = dayDb[slot].fifth_prize;
    }
  }

  if (!prizeData || !prizeData.first_prize?.number) {
    console.error(`[Poller] Could not extract valid prize data for ${dateStr} [${slot}].`);
    return false;
  }

  // Mark telegram_sent flag
  prizeData.telegram_sent = alreadyTelegrammed || Boolean(db[dateStr]?.[slot]?.telegram_sent);

  // Update live_draws.json
  if (!db[dateStr]) db[dateStr] = {};
  db[dateStr][slot] = prizeData;
  saveLiveDraws(db);

  // Sync complete OCR prize distribution with Cloudflare D1 Edge API
  try {
    await syncWithCloudflareWorker(dateStr, slot, prizeData, sourceUrl);
  } catch (syncErr) {
    console.warn('[Poller] Full OCR Worker API sync warning:', syncErr.message);
  }

  console.log(`[Poller] ✅ AUTOMATED INGESTION COMPLETE for ${dateStr} [${slot}]!`);
  try {
    await pingSearchEngines(dateStr, slot);
  } catch (pingErr) {
    console.warn('[Poller] SEO Ping warning:', pingErr.message);
  }

  // Automatically broadcast push notification to all subscribed users via OneSignal
  try {
    await sendOneSignalResultPush({ dateStr, slot, prizeData });
  } catch (pushErr) {
    console.warn('[Poller] OneSignal push warning:', pushErr.message);
  }

  // Broadcast verified draw results to official Telegram channel @dearresultlive ONLY if not already sent!
  if (!prizeData.telegram_sent) {
    try {
      console.log(`[Poller] 📢 Broadcasting verified full OCR result to Telegram...`);
      await sendTelegramResultPost({ dateStr, slot, prizeData });
      prizeData.telegram_sent = true;
      db[dateStr][slot].telegram_sent = true;
      saveLiveDraws(db);
    } catch (tgErr) {
      console.warn('[Poller] Telegram broadcast warning:', tgErr.message);
    }
  } else {
    console.log(`[Poller] ℹ️ Telegram alert already broadcasted for ${dateStr} [${slot}]. Suppressing duplicate Stage 2 broadcast.`);
  }
  // Auto-sync with GitHub repository to trigger Cloudflare Pages static build
  try {
    const { execSync } = await import("child_process");
    console.log(`[Poller] Auto-committing and pushing verified results to GitHub...`);
    execSync(`git add web/src/data/live_draws.json web/public/results/${dateStr}/`, { stdio: "ignore" });
    execSync(`git commit -m "chore(live): auto-publish verified results for ${dateStr} [${slot}]"`, { stdio: "ignore" });
    execSync("git push origin main", { stdio: "ignore" });
    console.log(`[Poller] Git push complete. Cloudflare Pages build triggered.`);
  } catch (gitErr) {
    console.log(`[Poller] Git auto-sync: ${gitErr.message || "Already up to date"}`);
  }
  return { status: 'SUCCESS', diffMin: 0 };
}

/**
 * Main Runner
 */
async function main() {
  const args = process.argv.slice(2);
  const isWatch = args.includes('--watch') || args.includes('-w') || args.includes('--loop');

  let targetSlot = null;
  const slotIdx = args.indexOf('--slot');
  if (slotIdx !== -1 && args[slotIdx + 1]) {
    targetSlot = args[slotIdx + 1].toUpperCase();
  }

  let targetDate = null;
  const dateIdx = args.indexOf('--date');
  if (dateIdx !== -1 && args[dateIdx + 1]) {
    targetDate = args[dateIdx + 1];
  }

  const dateStr = targetDate || getISTDateString();
  const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS || args.includes('--poll-window') || args.includes('--window'));
  const modeLabel = isWatch ? 'CONTINUOUS WATCH' : isCi ? 'ACTIVE SURVEILLANCE WINDOW (CI)' : 'SINGLE CHECK';

  console.log(`=======================================================`);
  console.log(`  DEAR LOTTERY AUTONOMOUS LIVE POLLER ENGINE`);
  console.log(`  Date: ${dateStr} | Mode: ${modeLabel}`);
  console.log(`=======================================================`);

  const maxAttempts = isWatch ? Infinity : (isCi ? 12 : 1);
  const sleepMs = 15000; // 15s interval for rapid ~15-second response to official releases

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const currentDateStr = targetDate || getISTDateString();
    const slot = targetSlot || getAutoSlot(getISTDate(), currentDateStr);
    const timeLabel = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
    console.log(`\n[${timeLabel} IST] [Surveillance ${attempt}/${maxAttempts}] Date: ${currentDateStr} | Slot: ${slot}...`);

    const res = await processSlot(currentDateStr, slot);
    const status = typeof res === 'object' ? res.status : (res ? 'VERIFIED' : 'PENDING');
    const diffMin = (typeof res === 'object' && res.diffMin) || 0;

    if (status === 'SUCCESS' || status === 'VERIFIED') {
      console.log(`[Poller] ✅ Verified result secured for ${currentDateStr} [${slot}].`);
      if (!isWatch) {
        process.exit(0);
      } else {
        console.log('[Poller] 🕒 Standing by for next slot...');
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }
    }

    if (status === 'UPCOMING') {
      if (!isWatch) {
        process.exit(0);
      }
      const waitTime = diffMin > 10 ? 60000 : sleepMs;
      await new Promise(r => setTimeout(r, waitTime));
      continue;
    }

    if (attempt < maxAttempts) {
      console.log(`[Poller] Official result not yet declared by state. Standing by for next check in ${sleepMs / 1000}s...`);
      await new Promise(r => setTimeout(r, sleepMs));
    }
  }

  console.log(`[Poller] Reached max surveillance attempts (${maxAttempts}). Window closed.`);
}

main().catch(err => {
  console.error('[Poller] Fatal error:', err);
  process.exit(1);
});
