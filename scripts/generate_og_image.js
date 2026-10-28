import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateOgImage() {
  const width = 1200;
  const height = 630;

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="60%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="#EFF6FF" />
    </linearGradient>

    <!-- Top Ribbon Gradient -->
    <linearGradient id="topRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="35%" stop-color="#1E3A8A" />
      <stop offset="70%" stop-color="#1D4ED8" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>

    <!-- Golden Prize Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#B45309" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>

    <!-- Card 1 Morning Gradient -->
    <linearGradient id="card1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="100%" stop-color="#FEF3C7" />
    </linearGradient>

    <!-- Card 2 Day Gradient -->
    <linearGradient id="card2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EFF6FF" />
      <stop offset="100%" stop-color="#DBEAFE" />
    </linearGradient>

    <!-- Card 3 Night Gradient -->
    <linearGradient id="card3Grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5F3FF" />
      <stop offset="100%" stop-color="#EDE9FE" />
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0F172A" flood-opacity="0.08" />
    </filter>

    <filter id="ribbonShadow" x="-5%" y="-10%" width="110%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>

  <style>
    .font-main { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .font-mono { font-family: "JetBrains Mono", Consolas, "Liberation Mono", Courier, monospace; }
  </style>

  <!-- 1. Base Clean White Canvas -->
  <rect width="100%" height="100%" fill="url(#bgGrad)" />

  <!-- Outer Elegant Border -->
  <rect x="12" y="12" width="1176" height="606" rx="20" fill="none" stroke="#CBD5E1" stroke-width="2" />
  <rect x="18" y="18" width="1164" height="594" rx="16" fill="none" stroke="#E2E8F0" stroke-width="1" />

  <!-- 2. Authoritative Top Header Bar -->
  <g filter="url(#ribbonShadow)">
    <rect x="22" y="22" width="1156" height="58" rx="12" fill="url(#topRibbon)" />
  </g>

  <!-- Top Bar Elements -->
  <!-- Left Badge: Official Trust Badge -->
  <rect x="38" y="32" width="280" height="38" rx="19" fill="#1E293B" stroke="#3B82F6" stroke-width="1.5" />
  <circle cx="56" cy="51" r="9" fill="#3B82F6" />
  <text x="56" y="55" font-size="12" text-anchor="middle" fill="#FFFFFF" class="font-main" font-weight="900">✓</text>
  <text x="74" y="55" font-size="13" fill="#F8FAFC" class="font-main" font-weight="800" letter-spacing="0.8">OFFICIAL VERIFIED PORTAL</text>

  <!-- Center: Government States Covered -->
  <text x="600" y="56" font-size="14" text-anchor="middle" fill="#93C5FD" class="font-main" font-weight="700" letter-spacing="1">
    NAGALAND &amp; SIKKIM STATE LOTTERIES
  </text>

  <!-- Right: Live Indicator -->
  <rect x="948" y="32" width="214" height="38" rx="19" fill="#DC2626" />
  <circle cx="968" cy="51" r="6" fill="#FFFFFF" />
  <text x="984" y="56" font-size="13" fill="#FFFFFF" class="font-main" font-weight="900" letter-spacing="1">
    🔴 LIVE DRAWS TODAY
  </text>

  <!-- 3. Main Brand Title & Bengali Headline -->
  <text x="600" y="142" font-size="46" text-anchor="middle" fill="#0F172A" class="font-main" font-weight="900" letter-spacing="-0.5">
    DEAR LOTTERY LIVE RESULTS
  </text>

  <!-- Bengali Subtitle Badge -->
  <g>
    <rect x="340" y="160" width="520" height="40" rx="20" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1" />
    <text x="600" y="186" font-size="22" text-anchor="middle" fill="#B91C1C" class="font-main" font-weight="800">
      ডিয়ার লটারি লাইভ রেজাল্ট • লটারি সংবাদ
    </text>
  </g>

  <!-- Tagline under Brand -->
  <text x="600" y="224" font-size="16" text-anchor="middle" fill="#475569" class="font-main" font-weight="600">
    Instant 1st Prize ₹1 Crore Results • Official Gazette Sheet PDF • 1-Second Ticket Checker
  </text>

  <!-- 4. Three Draw Slot Showcase Cards -->
  <!-- CARD 1: 1:00 PM MORNING -->
  <g filter="url(#cardShadow)">
    <rect x="55" y="250" width="330" height="205" rx="18" fill="url(#card1Grad)" stroke="#FDE68A" stroke-width="2" />
    <!-- Slot Header Pill -->
    <rect x="75" y="270" width="160" height="32" rx="16" fill="#F59E0B" />
    <text x="155" y="291" font-size="13" text-anchor="middle" fill="#FFFFFF" class="font-main" font-weight="900" letter-spacing="0.5">
      ☀️ 1:00 PM DRAW
    </text>
    <!-- Slot Sub-name -->
    <text x="75" y="335" font-size="28" fill="#78350F" class="font-main" font-weight="900">
      DEAR MORNING
    </text>
    <text x="75" y="360" font-size="16" fill="#92400E" class="font-main" font-weight="700">
      ডিয়ার মর্নিং (দুপুর ১:০০)
    </text>
    <!-- Prize Badge -->
    <rect x="75" y="385" width="290" height="48" rx="12" fill="#FFFFFF" stroke="#FCD34D" stroke-width="1.5" />
    <text x="95" y="415" font-size="18" fill="#B45309" class="font-main" font-weight="900">
      🏆 1st Prize ₹1 Crore
    </text>
  </g>

  <!-- CARD 2: 6:00 PM DAY -->
  <g filter="url(#cardShadow)">
    <rect x="435" y="250" width="330" height="205" rx="18" fill="url(#card2Grad)" stroke="#BFDBFE" stroke-width="2" />
    <!-- Slot Header Pill -->
    <rect x="455" y="270" width="160" height="32" rx="16" fill="#2563EB" />
    <text x="535" y="291" font-size="13" text-anchor="middle" fill="#FFFFFF" class="font-main" font-weight="900" letter-spacing="0.5">
      🌅 6:00 PM DRAW
    </text>
    <!-- Slot Sub-name -->
    <text x="455" y="335" font-size="28" fill="#1E3A8A" class="font-main" font-weight="900">
      DEAR DAY
    </text>
    <text x="455" y="360" font-size="16" fill="#1D4ED8" class="font-main" font-weight="700">
      ডিয়ার ডে (সন্ধ্যা ৬:০০)
    </text>
    <!-- Prize Badge -->
    <rect x="455" y="385" width="290" height="48" rx="12" fill="#FFFFFF" stroke="#93C5FD" stroke-width="1.5" />
    <text x="475" y="415" font-size="18" fill="#1D4ED8" class="font-main" font-weight="900">
      🏆 1st Prize ₹1 Crore
    </text>
  </g>

  <!-- CARD 3: 8:00 PM NIGHT -->
  <g filter="url(#cardShadow)">
    <rect x="815" y="250" width="330" height="205" rx="18" fill="url(#card3Grad)" stroke="#DDD6FE" stroke-width="2" />
    <!-- Slot Header Pill -->
    <rect x="835" y="270" width="160" height="32" rx="16" fill="#4F46E5" />
    <text x="915" y="291" font-size="13" text-anchor="middle" fill="#FFFFFF" class="font-main" font-weight="900" letter-spacing="0.5">
      🌙 8:00 PM DRAW
    </text>
    <!-- Slot Sub-name -->
    <text x="835" y="335" font-size="28" fill="#312E81" class="font-main" font-weight="900">
      DEAR NIGHT
    </text>
    <text x="835" y="360" font-size="16" fill="#4338CA" class="font-main" font-weight="700">
      ডিয়ার নাইট (রাত ৮:০০)
    </text>
    <!-- Prize Badge -->
    <rect x="835" y="385" width="290" height="48" rx="12" fill="#FFFFFF" stroke="#C4B5FD" stroke-width="1.5" />
    <text x="855" y="415" font-size="18" fill="#4338CA" class="font-main" font-weight="900">
      🏆 1st Prize ₹1 Crore
    </text>
  </g>

  <!-- 5. High-Impact Trust Banner Bar -->
  <g filter="url(#cardShadow)">
    <rect x="55" y="475" width="1090" height="60" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" />
  </g>
  
  <!-- Left: Official Gazette Indicator -->
  <circle cx="95" cy="505" r="18" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1.5" />
  <text x="95" y="512" font-size="18" text-anchor="middle" fill="#15803D" class="font-main" font-weight="900">✓</text>
  <text x="125" y="502" font-size="15" fill="#166534" class="font-main" font-weight="900">
    100% OFFICIAL GAZETTE ACCURACY
  </text>
  <text x="125" y="520" font-size="12" fill="#15803D" class="font-main" font-weight="600">
    সবচেয়ে দ্রুত ও নির্ভুল লাইভ সরকারি রেজাল্ট
  </text>

  <!-- Center Divider Line -->
  <line x1="560" y1="488" x2="560" y2="522" stroke="#E2E8F0" stroke-width="1.5" />

  <!-- Right: Speed Guarantee -->
  <circle cx="595" cy="505" r="18" fill="#FEF3C7" stroke="#FDE68A" stroke-width="1.5" />
  <text x="595" y="512" font-size="18" text-anchor="middle" fill="#B45309" class="font-main" font-weight="900">⚡</text>
  <text x="625" y="502" font-size="15" fill="#92400E" class="font-main" font-weight="900">
    INSTANT RESULT &amp; PDF DOWNLOAD
  </text>
  <text x="625" y="520" font-size="12" fill="#B45309" class="font-main" font-weight="600">
    ড্র সম্পন্ন হওয়ার সাথে সাথে অফিশিয়াল রেজাল্ট শিট
  </text>

  <!-- 6. Bottom Brand & Domain Footer -->
  <rect x="22" y="555" width="1156" height="50" rx="12" fill="#0F172A" />

  <!-- Domain Pill (White/Blue Contrast) -->
  <g>
    <rect x="42" y="565" width="280" height="30" rx="8" fill="#1E3A8A" stroke="#3B82F6" stroke-width="1" />
    <text x="182" y="585" font-size="16" text-anchor="middle" fill="#FFFFFF" class="font-mono" font-weight="900" letter-spacing="1">
      🌐 dearresultlive.in
    </text>
  </g>

  <!-- Center Disclaimer Text -->
  <text x="660" y="585" font-size="13" text-anchor="middle" fill="#94A3B8" class="font-main" font-weight="600">
    India's Leading Fast Dear Lottery Portal • Daily 1PM, 6PM &amp; 8PM Draw Updates
  </text>

  <!-- Right Tag -->
  <text x="1135" y="585" font-size="12" text-anchor="end" fill="#38BDF8" class="font-main" font-weight="800" letter-spacing="0.5">
    FREE &amp; SECURE • কোনো ফি নেই
  </text>
</svg>
`;

  const outputJpgPath = path.resolve('web/public/og-image.jpg');
  const outputPngPath = path.resolve('web/public/og-image.png');

  console.log('Rendering SVG with sharp to 1200x630 JPEG & PNG...');
  
  // Render high-res JPEG (quality 95)
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toFile(outputJpgPath);

  // Render lossless PNG
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 8 })
    .toFile(outputPngPath);

  const stats = fs.statSync(outputJpgPath);
  console.log(`Success! og-image.jpg written (${stats.size} bytes).`);
}

generateOgImage().catch(console.error);
