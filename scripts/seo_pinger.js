#!/usr/bin/env node
/**
 * Instant Search Engine Indexing & Sitemap Pinger
 * Automatically notifies Google, Bing, Yahoo, and IndexNow
 * the moment a new Dear Lottery draw result is published.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { publishToGoogleIndexing } from './google-instant-index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_GOOGLE_CREDS = path.join(__dirname, '..', 'google-credentials.json');

const HOST = 'dearresultlive.in';
const INDEXNOW_KEY = 'dearlotteryindexnowkey2026';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;

export async function pingSearchEngines(dateStr, slot = '') {
  // SAFETY GATE: Protect Google Search Console & Search Bots from premature crawls
  const istNow = new Date(Date.now() + 5.5 * 3600000);
  const todayStr = istNow.toISOString().slice(0, 10);

  if (dateStr && dateStr > todayStr) {
    console.log(`[SEO-Pinger] 🛑 SAFETY SHIELD: Refusing to ping search engines for future date ${dateStr}. Protecting Search Console trust!`);
    return;
  }

  // If slot is specified, verify that the slot is declared before pinging
  if (dateStr && slot) {
    try {
      const liveFile = path.join(__dirname, '..', 'web', 'src', 'data', 'live_draws.json');
      if (fs.existsSync(liveFile)) {
        const liveData = JSON.parse(fs.readFileSync(liveFile, 'utf-8'));
        const slotData = liveData[dateStr]?.[slot.toUpperCase()];
        if (!slotData?.first_prize?.number) {
          console.log(`[SEO-Pinger] 🛑 SAFETY SHIELD: Refusing to ping search engines for undeclared slot ${slot} on ${dateStr}. Protecting SEO credibility!`);
          return;
        }
      }
    } catch (_) {}
  }

  const targetUrls = [
    `https://${HOST}/`,
    `https://${HOST}/sitemap.xml`,
    `https://${HOST}/rss.xml`,
    `https://${HOST}/yesterday`,
    `https://${HOST}/target-numbers`,
    `https://${HOST}/checker`,
    `https://${HOST}/analytics`,
    `https://${HOST}/old-results`
  ];

  if (dateStr) {
    targetUrls.push(`https://${HOST}/results/${dateStr}`);
    if (slot) {
      targetUrls.push(`https://${HOST}/results/${dateStr}/${slot.toLowerCase()}`);
    } else {
      targetUrls.push(`https://${HOST}/results/${dateStr}/1pm`);
      targetUrls.push(`https://${HOST}/results/${dateStr}/6pm`);
      targetUrls.push(`https://${HOST}/results/${dateStr}/8pm`);
    }
  }

  console.log(`[SEO-Pinger] Submitting ${targetUrls.length} URLs to IndexNow & Search Bots...`);

  // 1. IndexNow API (Bing, Yandex, Seznam, Naver)
  try {
    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: targetUrls
    };

    const endpoints = [
      'https://api.indexnow.org/indexnow',
      'https://www.bing.com/indexnow'
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          console.log(`[SEO-Pinger] ✅ IndexNow Ping OK (${endpoint}) -> HTTP ${res.status}`);
        } else {
          console.log(`[SEO-Pinger] ⚠️ IndexNow Ping (${endpoint}) -> HTTP ${res.status}`);
        }
      } catch (err) {
        console.warn(`[SEO-Pinger] Warning pinging ${endpoint}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[SEO-Pinger] Error in IndexNow ping:', err.message);
  }

  // 2. Google Instant Indexing API (if Google Service Account Credentials configured)
  try {
    const hasGoogleCreds = fs.existsSync(LOCAL_GOOGLE_CREDS) ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON || 
      (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (hasGoogleCreds) {
      console.log(`[SEO-Pinger] 🚀 Submitting to Google Indexing API...`);
      await publishToGoogleIndexing({
        urls: targetUrls,
        credentialsPath: fs.existsSync(LOCAL_GOOGLE_CREDS) ? LOCAL_GOOGLE_CREDS : undefined,
        type: 'URL_UPDATED'
      });
    } else {
      console.log(`[SEO-Pinger] ℹ️ Google Service Account credentials not detected. (Skipping Google Indexing API)`);
    }
  } catch (gErr) {
    console.warn('[SEO-Pinger] Google Indexing API skipped/failed:', gErr.message);
  }
}

// Allow CLI execution: node scripts/seo_pinger.js [date] [slot]
if (process.argv[1] && process.argv[1].endsWith('seo_pinger.js')) {
  const dateArg = process.argv[2] || new Date().toISOString().slice(0, 10);
  const slotArg = process.argv[3] || '';
  pingSearchEngines(dateArg, slotArg)
    .then(() => console.log('[SEO-Pinger] Finished SEO pings.'))
    .catch(console.error);
}
