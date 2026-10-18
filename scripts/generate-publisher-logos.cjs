const sharp = require('../web/node_modules/sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../web/public');
const artifactDir = 'C:\\Users\\barun\\.gemini\\antigravity\\brain\\5e675529-61b4-4bb1-a693-4ab81862044d';

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

// 1. Square Logo (512x512) for Google Publisher Center Publication Icon
const squareSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B1120" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>
    <linearGradient id="brandGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="45%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="liveRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444" />
      <stop offset="100%" stop-color="#DC2626" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Background Container -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>

  <!-- Centered Gold Badge -->
  <rect x="76" y="76" width="360" height="360" rx="80" fill="url(#brandGold)" filter="url(#shadow)" stroke="#FDE68A" stroke-width="6"/>

  <!-- Rupee Symbol -->
  <text 
    x="256" 
    y="328" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="234" 
    font-weight="900" 
    fill="#0F172A" 
    text-anchor="middle"
    letter-spacing="-6"
  >₹</text>

  <!-- Red LIVE Badge Indicator -->
  <circle cx="396" cy="116" r="42" fill="url(#liveRed)" stroke="#FFFFFF" stroke-width="8"/>
  <circle cx="396" cy="116" r="16" fill="#FFFFFF"/>
</svg>
`;

// 2. Wide Logo - Light Theme (600x120) with transparent background
const wideLightSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 600 120">
  <defs>
    <linearGradient id="brandGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="45%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="liveRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444" />
      <stop offset="100%" stop-color="#DC2626" />
    </linearGradient>
  </defs>

  <!-- Logo Mark on Left -->
  <rect x="10" y="10" width="100" height="100" rx="24" fill="url(#brandGold)" stroke="#FDE68A" stroke-width="2"/>
  <text 
    x="60" 
    y="80" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="64" 
    font-weight="900" 
    fill="#0F172A" 
    text-anchor="middle"
  >₹</text>
  <circle cx="96" cy="24" r="14" fill="url(#liveRed)" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="96" cy="24" r="5" fill="#FFFFFF"/>

  <!-- Brand Typography -->
  <text 
    x="135" 
    y="62" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="42" 
    font-weight="900" 
    letter-spacing="-0.5"
    fill="#0F172A"
  >DEAR RESULT LIVE</text>

  <rect x="135" y="78" width="52" height="20" rx="5" fill="#DC2626"/>
  <text 
    x="161" 
    y="92" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="11" 
    font-weight="900" 
    letter-spacing="1.5"
    fill="#FFFFFF"
    text-anchor="middle"
  >LIVE</text>

  <text 
    x="198" 
    y="92" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="13" 
    font-weight="700" 
    letter-spacing="0.2"
    fill="#475569"
  >Official Lottery Sambad Portal</text>
</svg>
`;

// 3. Wide Logo - Dark Theme (600x120) with transparent background
const wideDarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 600 120">
  <defs>
    <linearGradient id="brandGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="45%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="liveRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444" />
      <stop offset="100%" stop-color="#DC2626" />
    </linearGradient>
  </defs>

  <!-- Logo Mark on Left -->
  <rect x="10" y="10" width="100" height="100" rx="24" fill="url(#brandGold)" stroke="#FDE68A" stroke-width="2"/>
  <text 
    x="60" 
    y="80" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="64" 
    font-weight="900" 
    fill="#0F172A" 
    text-anchor="middle"
  >₹</text>
  <circle cx="96" cy="24" r="14" fill="url(#liveRed)" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="96" cy="24" r="5" fill="#FFFFFF"/>

  <!-- Brand Typography (White text for dark background) -->
  <text 
    x="135" 
    y="62" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="42" 
    font-weight="900" 
    letter-spacing="-0.5"
    fill="#FFFFFF"
  >DEAR RESULT LIVE</text>

  <rect x="135" y="78" width="52" height="20" rx="5" fill="#DC2626"/>
  <text 
    x="161" 
    y="92" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="11" 
    font-weight="900" 
    letter-spacing="1.5"
    fill="#FFFFFF"
    text-anchor="middle"
  >LIVE</text>

  <text 
    x="198" 
    y="92" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="13" 
    font-weight="700" 
    letter-spacing="0.2"
    fill="#CBD5E1"
  >Official Lottery Sambad Portal</text>
</svg>
`;

async function generate() {
  const squareBuf = await sharp(Buffer.from(squareSvg)).png().toBuffer();
  const wideLightBuf = await sharp(Buffer.from(wideLightSvg)).png().toBuffer();
  const wideDarkBuf = await sharp(Buffer.from(wideDarkSvg)).png().toBuffer();

  // Save to web/public
  fs.writeFileSync(path.join(publicDir, 'publisher-square-512x512.png'), squareBuf);
  fs.writeFileSync(path.join(publicDir, 'publisher-wide-logo.png'), wideLightBuf);
  fs.writeFileSync(path.join(publicDir, 'publisher-wide-logo-dark.png'), wideDarkBuf);

  // Save to artifact directory
  fs.writeFileSync(path.join(artifactDir, 'publisher-square-512x512.png'), squareBuf);
  fs.writeFileSync(path.join(artifactDir, 'publisher-wide-logo.png'), wideLightBuf);
  fs.writeFileSync(path.join(artifactDir, 'publisher-wide-logo-dark.png'), wideDarkBuf);

  console.log('SUCCESS: All Publisher Center logos generated successfully.');
}

generate().catch(console.error);
