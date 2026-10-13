import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  const key = params.key;

  // Responds with key to authenticate ownership with IndexNow API
  return new Response(key || '', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000'
    }
  });
};
