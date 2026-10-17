import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const host = request.url.includes('localhost') ? new URL(request.url).origin : 'https://dearresultlive.in';

  const robots = `User-agent: *
Allow: /
Disallow: /api/

User-agent: Googlebot-Image
Allow: /

Sitemap: ${host}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};
