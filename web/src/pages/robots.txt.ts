import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const host = new URL(request.url).origin;

  const robots = `User-agent: *
Disallow: /

User-agent: Googlebot-Image
Disallow: /

User-agent: msnbot-media
Disallow: /

User-agent: Bingbot
Disallow: /
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};
