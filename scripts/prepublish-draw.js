#!/usr/bin/env node

/**
 * Pre-publishing Automation for Dear Lottery
 * Automatically creates upcoming draw records 30 minutes before each draw
 * (12:30 PM, 5:30 PM, 7:30 PM IST) and pings search engines for instant indexing.
 * 
 * Usage:
 *   node scripts/prepublish-draw.js
 *   node scripts/prepublish-draw.js --date 2026-10-14 --slot 1pm
 *   node scripts/prepublish-draw.js --date 2026-10-14 --slot 6pm
 *   node scripts/prepublish-draw.js --date 2026-10-14 --slot 8pm
 */

const { publishToGoogleIndexing } = require('./google-instant-index');

// Nagaland & Sikkim State Lotteries weekday draw names
const SCHEMES = {
  '1PM': [
    'DEAR YAMUNA MORNING',   // 0: Sun
    'DEAR DWIGHT MORNING',   // 1: Mon
    'DEAR GODAVARI MORNING', // 2: Tue
    'DEAR TEESTA MORNING',   // 3: Wed
    'DEAR PADMA MORNING',    // 4: Thu
    'DEAR HOOGHLY MORNING',  // 5: Fri
    'DEAR NARMADA MORNING'   // 6: Sat
  ],
  '6PM': [
    'DEAR SUN DAY',       // 0: Sun
    'DEAR MOUNTAIN DAY',  // 1: Mon
    'DEAR WAVE DAY',      // 2: Tue
    'DEAR DESERT DAY',    // 3: Wed
    'DEAR HILL DAY',      // 4: Thu
    'DEAR RIVER DAY',     // 5: Fri
    'DEAR SEA DAY'        // 6: Sat
  ],
  '8PM': [
    'DEAR HAWK NIGHT',    // 0: Sun
    'DEAR TOUCAN NIGHT',  // 1: Mon
    'DEAR PARROT NIGHT',  // 2: Tue
    'DEAR SEAGULL NIGHT', // 3: Wed
    'DEAR FALCON NIGHT',  // 4: Thu
    'DEAR VULTURE NIGHT', // 5: Fri
    'DEAR OSTRICH NIGHT'  // 6: Sat
  ]
};

function getISTNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

function getISTDateString(d = getISTNow()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function prepublishDraw(options = {}) {
  const istNow = getISTNow();
  let date = options.date || getISTDateString(istNow);
  let slot = options.slot ? options.slot.toUpperCase() : null;

  if (!slot) {
    const hour = istNow.getHours();
    if (hour >= 19) slot = '8PM';
    else if (hour >= 14) slot = '6PM';
    else slot = '1PM';
  }

  const slotKey = slot.toLowerCase();
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  const drawName = (SCHEMES[slot] && SCHEMES[slot][dayOfWeek]) || `DEAR LOTTERY ${slot}`;

  const workerBase = process.env.WORKER_API_BASE || 'https://dearresultlive.in';
  const apiKey = process.env.API_KEY || 'dear_lottery_secret_key_prod_2026';

  console.log(`\n⏳ Dear Lottery 30-Min Pre-Publish Engine`);
  console.log(`========================================`);
  console.log(`Target Date: ${date}`);
  console.log(`Target Slot: ${slot} (${slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM'})`);
  console.log(`Scheme Name: ${drawName}`);
  console.log(`Route:       /results/${date}/${slotKey}\n`);

  // Step 1: Pre-publish upcoming record into Cloudflare D1 via Worker API
  console.log(`[1/2] Creating pre-published upcoming record in Cloudflare D1...`);
  try {
    const res = await fetch(`${workerBase}/api/prepublish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({
        date: date,
        slot: slot
      })
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✓ D1 Pre-publish confirmed: ${data.draw_id} (${data.status})`);
    } else {
      console.warn(`! Worker API returned HTTP ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.warn(`! Note: Local worker not reached (${err.message}). Route is generated on-demand.`);
  }

  // Step 2: Trigger Google Instant Indexing and IndexNow 30 minutes ahead
  console.log(`\n[2/2] Triggering Google Instant Indexing API for upcoming route...`);
  const urlsToPing = [
    `https://dearresultlive.in/results/${date}/${slotKey}`,
    `https://dearresultlive.in/results/${date}`,
    `https://dearresultlive.in/`
  ];

  await publishToGoogleIndexing({
    urls: urlsToPing,
    type: 'URL_UPDATED'
  });

  console.log(`\n🎉 Pre-publish complete! Dynamic route is live:`);
  console.log(`   👉 https://dearresultlive.in/results/${date}/${slotKey}`);
  console.log(`   (Displays Live Countdown Timer now, updates seamlessly once OCR extracts numbers)\n`);
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  let date = null;
  let slot = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) {
      date = args[i + 1];
      i++;
    } else if (args[i] === '--slot' && args[i + 1]) {
      slot = args[i + 1];
      i++;
    }
  }

  prepublishDraw({ date, slot })
    .catch(err => {
      console.error('Fatal error in prepublish script:', err);
      process.exit(1);
    });
}

module.exports = {
  prepublishDraw,
  SCHEMES
};
