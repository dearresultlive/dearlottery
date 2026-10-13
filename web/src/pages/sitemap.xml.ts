import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const host = new URL(request.url).origin;
  const today = new Date().toISOString().slice(0, 10);

  // Core static & high-priority landing URLs
  const urls: Array<{ loc: string; priority: string; changefreq: string; lastmod: string }> = [
    { loc: `${host}/`, priority: '1.0', changefreq: 'hourly', lastmod: today },
    { loc: `${host}/checker`, priority: '0.9', changefreq: 'daily', lastmod: today },
    { loc: `${host}/analytics`, priority: '0.9', changefreq: 'daily', lastmod: today },
    { loc: `${host}/results/${today}`, priority: '0.9', changefreq: 'hourly', lastmod: today },
    { loc: `${host}/results/${today}/1pm`, priority: '0.9', changefreq: 'hourly', lastmod: today },
    { loc: `${host}/results/${today}/6pm`, priority: '0.9', changefreq: 'hourly', lastmod: today },
    { loc: `${host}/results/${today}/8pm`, priority: '0.9', changefreq: 'hourly', lastmod: today }
  ];

  // Include past 30 days historical dates and their individual draw URLs
  for (let i = 1; i <= 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    // Daily index
    urls.push({
      loc: `${host}/results/${dateStr}`,
      priority: i <= 7 ? '0.8' : '0.6',
      changefreq: i <= 7 ? 'daily' : 'monthly',
      lastmod: dateStr
    });

    // 3 Individual daily draw URLs
    urls.push(
      {
        loc: `${host}/results/${dateStr}/1pm`,
        priority: i <= 7 ? '0.7' : '0.5',
        changefreq: 'monthly',
        lastmod: dateStr
      },
      {
        loc: `${host}/results/${dateStr}/6pm`,
        priority: i <= 7 ? '0.7' : '0.5',
        changefreq: 'monthly',
        lastmod: dateStr
      },
      {
        loc: `${host}/results/${dateStr}/8pm`,
        priority: i <= 7 ? '0.7' : '0.5',
        changefreq: 'monthly',
        lastmod: dateStr
      }
    );
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400'
    }
  });
};
