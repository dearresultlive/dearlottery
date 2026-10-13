import { Env } from '../types';

/**
 * Instant Indexing Service using the IndexNow Protocol.
 * Immediately notifies Bing, Yandex, Seznam, and partner search engines
 * the moment a lottery draw is parsed and published.
 */
export async function submitIndexNow(
  env: Env,
  urlsToIndex: string[],
  drawId: string
): Promise<{ success: boolean; status: number; message: string }> {
  const host = new URL(env.FRONTEND_URL || 'https://dearresultlive.in').hostname;
  const key = env.INDEXNOW_KEY || 'dearlotteryindexnowkey2026';

  const payload = {
    host: host,
    key: key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: urlsToIndex
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const isSuccess = res.status === 200 || res.status === 202;

    // Log to D1 indexing_logs table
    await env.DB.prepare(`
      INSERT INTO indexing_logs (draw_id, service, status, response_payload)
      VALUES (?, 'INDEXNOW', ?, ?)
    `).bind(
      drawId,
      isSuccess ? 'SUCCESS' : 'FAILED',
      `HTTP ${res.status}: ${await res.text()}`
    ).run();

    return {
      success: isSuccess,
      status: res.status,
      message: isSuccess ? 'IndexNow submitted successfully' : `HTTP ${res.status}`
    };
  } catch (error: any) {
    console.error('IndexNow ping error:', error);
    return {
      success: false,
      status: 500,
      message: error.message || 'Unknown network error'
    };
  }
}
