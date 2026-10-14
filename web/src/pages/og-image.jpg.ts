import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  
  <!-- Subtle Border -->
  <rect x="20" y="20" width="1160" height="590" rx="32" fill="none" stroke="#f59e0b" stroke-width="3" stroke-opacity="0.4"/>

  <!-- Logo Pill -->
  <g transform="translate(80, 80)">
    <rect width="70" height="70" rx="20" fill="url(#gold)"/>
    <text x="35" y="50" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#020617" text-anchor="middle">₹</text>
    <text x="90" y="38" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900" fill="#ffffff" letter-spacing="2">DEAR RESULT LIVE</text>
    <text x="90" y="62" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#fbbf24">ডিয়ার লটারি রেজাল্ট লাইভ পোর্টাল</text>
  </g>

  <!-- Main Headline -->
  <text x="80" y="250" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="900" fill="#ffffff">
    Dear Lottery Result Today Live
  </text>
  
  <!-- Sub-headline -->
  <text x="80" y="310" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#94a3b8">
    Nagaland &amp; Sikkim State Lotteries (Lottery Sambad লটারি সংবাদ)
  </text>

  <!-- 3 Time Slot Pills -->
  <g transform="translate(80, 360)">
    <!-- 1:00 PM -->
    <rect x="0" y="0" width="310" height="85" rx="18" fill="#1e293b" stroke="#334155" stroke-width="2"/>
    <text x="25" y="38" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#f59e0b">☀️ 1:00 PM</text>
    <text x="25" y="64" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#94a3b8">Morning (দুপুর ১টা)</text>

    <!-- 6:00 PM -->
    <rect x="340" y="0" width="310" height="85" rx="18" fill="#1e293b" stroke="#334155" stroke-width="2"/>
    <text x="365" y="38" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#f59e0b">🌅 6:00 PM</text>
    <text x="365" y="64" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#94a3b8">Day (সন্ধ্যা ৬টা)</text>

    <!-- 8:00 PM -->
    <rect x="680" y="0" width="310" height="85" rx="18" fill="#1e293b" stroke="#334155" stroke-width="2"/>
    <text x="705" y="38" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#f59e0b">🌙 8:00 PM</text>
    <text x="705" y="64" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#94a3b8">Night (রাত ৮টা)</text>
  </g>

  <!-- 1st Prize Gold Badge -->
  <g transform="translate(80, 485)">
    <rect width="1040" height="70" rx="20" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-width="2"/>
    <text x="520" y="44" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="#fde68a" text-anchor="middle">
      🏆 1st Prize: ₹1,00,00,000 (1 Crore Winner / ১ম পুরস্কার) • Fast Ticket Checker
    </text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=604800, immutable'
    }
  });
};
