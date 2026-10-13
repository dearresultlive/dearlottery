import { Env, DrawRecord, PrizeRecord } from '../types';

/**
 * OneSignal Web Push Notification Service.
 * Immediately pushes result alerts to all subscribed browser users upon draw publication.
 */
export async function sendOneSignalDrawNotification(
  env: Env,
  draw: DrawRecord,
  firstPrize: PrizeRecord
): Promise<void> {
  if (!env.ONESIGNAL_APP_ID || !env.ONESIGNAL_REST_KEY) {
    console.log('OneSignal credentials not configured. Skipping push notification.');
    return;
  }

  const title = `🎯 Dear Lottery ${draw.draw_time} Result is OUT!`;
  const body = `1st Prize (₹1 Crore): ${firstPrize.series || ''} ${firstPrize.ticket_number}. Tap to check your ticket now!`;
  const targetUrl = `${env.FRONTEND_URL || 'https://dearlottery.live'}/results/${draw.draw_date}`;

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${env.ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: env.ONESIGNAL_APP_ID,
        included_segments: ['Subscribed Users'],
        headings: { en: title },
        contents: { en: body },
        url: targetUrl,
        chrome_web_icon: `${env.FRONTEND_URL}/favicon.png`,
        priority: 10
      })
    });

    const isSuccess = response.status === 200;
    const resText = await response.text();

    await env.DB.prepare(`
      INSERT INTO indexing_logs (draw_id, service, status, response_payload)
      VALUES (?, 'ONESIGNAL', ?, ?)
    `).bind(
      draw.id,
      isSuccess ? 'SUCCESS' : 'FAILED',
      `HTTP ${response.status}: ${resText}`
    ).run();

    console.log(`OneSignal Push sent: ${response.status}`);
  } catch (err: any) {
    console.error('OneSignal Push Error:', err.message);
  }
}
