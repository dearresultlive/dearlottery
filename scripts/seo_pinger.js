#!/usr/bin/env node
/**
 * Instant Search Engine Indexing & Sitemap Pinger
 * Automatically notifies Google, Bing, Yahoo, and IndexNow
 * the moment a new Dear Lottery draw result is published.
 */

const HOST = 'dearresultlive.in';
const INDEXNOW_KEY = 'dearlotteryindexnowkey2026';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;

export async function pingSearchEngines(dateStr, slot = '') {
  const targetUrls = [
    `https://${HOST}/`,
    `https://${HOST}/sitemap.xml`,
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
}

// Allow CLI execution: node scripts/seo_pinger.js [date] [slot]
if (process.argv[1] && process.argv[1].endsWith('seo_pinger.js')) {
  const dateArg = process.argv[2] || new Date().toISOString().slice(0, 10);
  const slotArg = process.argv[3] || '';
  pingSearchEngines(dateArg, slotArg)
    .then(() => console.log('[SEO-Pinger] Finished SEO pings.'))
    .catch(console.error);
}
