#!/usr/bin/env node
/**
 * Automated OneSignal Web Push Notification Sender for Dear Lottery Results
 * Automatically sends push alerts to all subscribed browser users the instant a draw result is released.
 */

export async function sendOneSignalResultPush({ dateStr, slot, prizeData }) {
  const appId = process.env.ONESIGNAL_APP_ID || 'c36d01eb-f965-4d04-a906-8d6268fa82c4';
  const apiKey = process.env.ONESIGNAL_API_KEY || process.env.ONESIGNAL_REST_KEY;

  if (!apiKey) {
    console.log('[OneSignal] ℹ️ ONESIGNAL_API_KEY secret not found in environment. Skipping push notification.');
    return false;
  }

  const slotTimeMap = {
    '1PM': '1:00 PM (Morning)',
    '6PM': '6:00 PM (Day)',
    '8PM': '8:00 PM (Night)'
  };
  const slotTimeBnMap = {
    '1PM': '১:০০ দুপুর (Morning)',
    '6PM': '৬:০০ সন্ধ্যা (Day)',
    '8PM': '৮:০০ রাত (Night)'
  };
  const slotTimeHiMap = {
    '1PM': '1:00 PM (दोपहर)',
    '6PM': '6:00 PM (शाम)',
    '8PM': '8:00 PM (रात)'
  };

  const timeLabel = slotTimeMap[slot] || slot;
  const timeLabelBn = slotTimeBnMap[slot] || slot;
  const timeLabelHi = slotTimeHiMap[slot] || slot;

  const firstPrizeSeries = prizeData?.first_prize?.series || '';
  const firstPrizeNum = prizeData?.first_prize?.number || '';
  const firstPrizeFull = firstPrizeSeries ? `${firstPrizeSeries} ${firstPrizeNum}` : (firstPrizeNum || 'Published');

  const targetUrl = `https://dearresultlive.in/results/${dateStr}/${slot.toLowerCase()}`;

  const payload = {
    app_id: appId,
    included_segments: ['Subscribed Users', 'Total Subscriptions'],
    headings: {
      en: `🎯 Dear Lottery ${timeLabel} Result OUT!`,
      bn: `🎯 ডিয়ার লটারি ${timeLabelBn} রেজাল্ট প্রকাশিত!`,
      hi: `🎯 डियर लॉटरी ${timeLabelHi} रिजल्ट घोषित!`
    },
    contents: {
      en: `1st Prize (₹1 Crore): ${firstPrizeFull}. Tap to check full official result sheet & prize tables!`,
      bn: `১ম পুরস্কার (₹১ কোটি): ${firstPrizeFull}। অফিসিয়াল রেজাল্ট শিট ও সব পুরস্কার মিলিয়ে নিন!`,
      hi: `पहला पुरस्कार (₹1 करोड़): ${firstPrizeFull}। ऑफिशियल रिजल्ट शीट और सभी पुरस्कार चेक करें!`
    },
    url: targetUrl,
    web_url: targetUrl,
    chrome_web_icon: 'https://dearresultlive.in/favicon.png',
    chrome_web_badge: 'https://dearresultlive.in/favicon.png',
    priority: 10
  };

  console.log(`[OneSignal] 🚀 Sending Automated Push Notification for ${dateStr} [${slot}] (1st Prize: ${firstPrizeFull})...`);

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`[OneSignal] ✅ Push sent successfully! Recipients: ${data.recipients || 'all subscribers'} (ID: ${data.id})`);
      return true;
    } else {
      console.warn(`[OneSignal] ⚠️ Push API returned HTTP ${res.status}:`, JSON.stringify(data));
      return false;
    }
  } catch (err) {
    console.error('[OneSignal] ❌ Failed to dispatch push notification:', err.message);
    return false;
  }
}
