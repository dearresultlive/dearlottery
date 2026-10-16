import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const host = new URL(request.url).origin;

  const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${host}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};
