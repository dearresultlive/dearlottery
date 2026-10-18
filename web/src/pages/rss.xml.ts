import type { APIRoute } from 'astro';
import { getISTNow, getISTDateString } from '../lib/lottery-utils';
import liveDraws from '../data/live_draws.json';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const host = request.url.includes('localhost') ? new URL(request.url).origin : 'https://dearresultlive.in';
  const istNow = getISTNow();
  const today = getISTDateString(istNow);

  const items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
    guid: string;
  }> = [];

  // 1. Add draws from live_draws.json
  const dates = Object.keys(liveDraws).sort().reverse().slice(0, 10);
  
  for (const date of dates) {
    const dayData = (liveDraws as any)[date] || {};
    for (const slot of ['8PM', '6PM', '1PM']) {
      const draw = dayData[slot];
      if (draw && draw.first_prize) {
        const slotKey = slot.toLowerCase();
        const slotHour = slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM';
        const fp = draw.first_prize;
        const fpText = typeof fp === 'object' ? `${fp.series || ''} ${fp.number || ''}`.trim() : String(fp);

        // Format RFC 822 date
        const d = new Date(date);
        const hours = slot === '1PM' ? 13 : slot === '6PM' ? 18 : 20;
        d.setHours(hours, 0, 0, 0);

        items.push({
          title: `Dear Lottery Result ${slotHour} (${date}) - 1st Prize ₹1 Crore: ${fpText}`,
          link: `${host}/results/${date}/${slotKey}`,
          description: `Dear Lottery live draw result for ${date} at ${slotHour}. Official 1st Prize ₹1 Crore winning ticket number is ${fpText}. Download gazette PDF and verify all prize tiers.`,
          pubDate: d.toUTCString(),
          guid: `${host}/results/${date}/${slotKey}#${fpText}`
        });
      }
    }
  }

  // 2. If today's upcoming draws aren't in live_draws yet, add today's upcoming slot placeholders
  for (const slotKey of ['1pm', '6pm', '8pm']) {
    const slotHour = slotKey === '1pm' ? '1:00 PM' : slotKey === '6pm' ? '6:00 PM' : '8:00 PM';
    const existing = items.find(i => i.link === `${host}/results/${today}/${slotKey}`);
    if (!existing) {
      items.unshift({
        title: `Dear Lottery Result Today ${slotHour} Live - ${today} (লটারি সংবাদ / डियर लॉटरी)`,
        link: `${host}/results/${today}/${slotKey}`,
        description: `Official Dear Lottery Sambad result for today's ${slotHour} draw (${today}). Watch live countdown and instant ticket checking.`,
        pubDate: new Date().toUTCString(),
        guid: `${host}/results/${today}/${slotKey}#upcoming`
      });
    }
  }

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Dear Lottery Result Live - Official Sambad Draw Feed</title>
    <link>${host}/</link>
    <description>Fastest real-time updates for Nagaland and Sikkim State Dear Lottery results (1:00 PM, 6:00 PM, 8:00 PM draws).</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${host}/rss.xml" rel="self" type="application/rss+xml" />
${items
  .slice(0, 20)
  .map(
    (item) => `    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <guid isPermaLink="false">${item.guid}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <description><![CDATA[${item.description}]]></description>
    </item>`
  )
  .join('\n')}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=1800'
    }
  });
};
