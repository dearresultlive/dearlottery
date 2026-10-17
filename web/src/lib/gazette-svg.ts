/**
 * Authentic Lottery Sambad Gazette Sheet SVG Generator.
 * Creates an exact, vibrant, publication-grade vector replica of the
 * iconic colorful Lottery Sambad newspaper result sheet that lottery
 * players know and trust across India and West Bengal.
 */

export interface GazetteSvgData {
  drawDate: string;      // YYYY-MM-DD
  drawTime: string;      // 1:00 PM / 6:00 PM / 8:00 PM
  drawName: string;      // e.g. DEAR STAR THURSDAY, DEAR MEGHNA FRIDAY
  drawNumber?: string;   // e.g. 50, 74
  isPending?: boolean;
  prizes?: {
    first_prize?: { series: string; number: string };
    consolation_prize_amount?: number;
    second_prize?: string[];
    third_prize?: string[];
    fourth_prize?: string[];
    fifth_prize?: string[];
  };
}

export function generateGazetteSvg(data: GazetteSvgData): string {
  const {
    drawDate = '2026-10-15',
    drawTime = '1:00 PM',
    drawName = 'DEAR STAR THURSDAY',
    drawNumber = '50',
    isPending = false,
    prizes
  } = data;

  // Format date as DD/MM/YY (e.g. 15/10/26)
  const [yearStr, monthStr, dayStr] = (drawDate || '').split('-');
  const shortYear = yearStr ? yearStr.slice(-2) : '26';
  const displayDate = dayStr && monthStr ? `${dayStr}/${monthStr}/${shortYear}` : '15/10/26';

  // Normalize Slot Key: 1 PM, 6 PM, 8 PM
  const slotUpper = (drawTime || '').toUpperCase();
  const slotKey = slotUpper.includes('6') ? '6 PM' : slotUpper.includes('8') ? '8 PM' : '1 PM';

  // Determine State
  const isSikkim = slotKey === '6 PM' || drawName.toLowerCase().includes('sikkim');
  const stateTitle = isSikkim ? 'SIKKIM STATE LOTTERIES' : 'NAGALAND STATE LOTTERIES';

  // Clean Scheme Name (strip "DEAR " and " WEEKLY LOTTERY" for sub-label)
  const cleanScheme = drawName
    .toUpperCase()
    .replace(/^DEAR\s+/i, '')
    .replace(/\s+WEEKLY\s+LOTTERY$/i, '')
    .trim() || 'STAR THURSDAY';

  // Determine if result is actually pending or has authentic declared numbers
  const hasRealFirstPrize = Boolean(prizes?.first_prize?.number && prizes.first_prize.number.trim().length > 0);
  const actuallyPending = isPending || !hasRealFirstPrize;

  const firstPrize = actuallyPending ? { series: '', number: '' } : prizes!.first_prize;
  const firstDigitsOnly = firstPrize.number;

  const secondPrizes = !actuallyPending && prizes?.second_prize ? prizes.second_prize : [];
  const thirdPrizes = !actuallyPending && prizes?.third_prize ? prizes.third_prize : [];
  const fourthPrizes = !actuallyPending && prizes?.fourth_prize ? prizes.fourth_prize : [];
  const fifthPrizes = !actuallyPending && prizes?.fifth_prize ? prizes.fifth_prize : [];

  // Split 5th prizes into 10 columns of 10 items (column-major sorting like authentic paper)
  const columns: string[][] = Array.from({ length: 10 }, () => []);
  if (!actuallyPending && fifthPrizes.length >= 100) {
    for (let i = 0; i < 100; i++) {
      const colIdx = Math.floor(i / 10);
      if (fifthPrizes[i]) {
        columns[colIdx].push(fifthPrizes[i]);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 784" width="540" height="784" style="background:#ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Roboto, 'Courier New', sans-serif;">
  <defs>
    <style>
      .t-impact { font-family: 'Arial Black', Impact, sans-serif; font-weight: 900; }
      .t-mono { font-family: 'Courier New', Courier, monospace; font-weight: 900; }
    </style>
  </defs>

  <!-- Canvas Outer Background -->
  <rect x="0" y="0" width="540" height="784" fill="#ffffff" />
  
  <!-- Outer Green Paper Border -->
  <rect x="2" y="2" width="536" height="780" fill="none" stroke="#00802b" stroke-width="4" rx="4" />

  <!-- ================= 1. TOP HEADER GREEN BAR ================= -->
  <rect x="2" y="2" width="536" height="38" fill="#00802b" />
  
  <!-- State Logo Emblem -->
  <g transform="translate(14, 7)">
    <circle cx="12" cy="12" r="11" fill="#ffffff" stroke="#c01818" stroke-width="1.5" />
    <circle cx="12" cy="12" r="8" fill="#00802b" />
    <path d="M7 12 L12 7 L17 12 L12 17 Z" fill="#ffffff" />
  </g>

  <!-- State Title Header -->
  <text x="44" y="27" fill="#ffffff" font-size="18" font-weight="900" letter-spacing="1">
    ${stateTitle}
  </text>

  <!-- Right Red Slot Badge (1 PM / 6 PM / 8 PM) -->
  <rect x="460" y="2" width="78" height="38" fill="#e01a1a" />
  <text x="499" y="28" fill="#ffffff" font-size="22" font-weight="900" text-anchor="middle" class="t-impact">
    ${slotKey}
  </text>

  <!-- ================= 2. TITLE BOX + 1 CRORE BLOCK + MRP 7 ================= -->
  <!-- Left Giant 1 CRORE Yellow Block -->
  <rect x="2" y="40" width="170" height="110" fill="#fff100" />
  <text x="85" y="52" fill="#000000" font-size="8.5" font-weight="900" text-anchor="middle">
    1st PRIZE WINNER AMOUNT ₹
  </text>
  <!-- Giant Blue 1 -->
  <text x="75" y="112" fill="#0c2461" font-size="82" text-anchor="middle" class="t-impact" stroke="#ffe500" stroke-width="1.5">
    1
  </text>
  <!-- CRORE Text -->
  <text x="85" y="132" fill="#0c2461" font-size="24" text-anchor="middle" class="t-impact" letter-spacing="1">
    CRORE
  </text>
  <text x="85" y="146" fill="#000000" font-size="8.5" font-weight="800" text-anchor="middle">
    For Seller Amount <tspan fill="#e01a1a" font-weight="900">₹ 5 Lakhs</tspan>
  </text>

  <!-- Center Scheme Name Header (Navy Background) -->
  <rect x="174" y="42" width="288" height="66" fill="#0c2461" stroke="#ffe500" stroke-width="2" rx="4" />
  <text x="318" y="74" fill="#ffe500" font-size="34" font-weight="900" text-anchor="middle" class="t-impact" letter-spacing="2">
    DEAR
  </text>
  <text x="318" y="90" fill="#ffffff" font-size="13" font-weight="900" text-anchor="middle">
    ${cleanScheme}
  </text>
  <text x="318" y="103" fill="#ffe500" font-size="10.5" font-weight="800" text-anchor="middle">
    WEEKLY LOTTERY
  </text>

  <!-- Right MRP ₹7 Seal & QR Code -->
  <g transform="translate(466, 42)">
    <!-- Scalloped Purple MRP Seal -->
    <circle cx="33" cy="22" r="20" fill="#581c87" stroke="#ffe500" stroke-width="1.5" />
    <text x="33" y="16" fill="#ffffff" font-size="8" font-weight="800" text-anchor="middle">M.R.P.</text>
    <text x="33" y="31" fill="#ffe500" font-size="14" font-weight="900" text-anchor="middle">₹ 7</text>
    
    <!-- QR Code Box -->
    <rect x="11" y="46" width="44" height="44" fill="#ffffff" stroke="#000000" stroke-width="1" />
    <!-- QR Pattern Simulation -->
    <rect x="15" y="50" width="10" height="10" fill="#000000" />
    <rect x="17" y="52" width="6" height="6" fill="#ffffff" />
    <rect x="41" y="50" width="10" height="10" fill="#000000" />
    <rect x="43" y="52" width="6" height="6" fill="#ffffff" />
    <rect x="15" y="76" width="10" height="10" fill="#000000" />
    <rect x="17" y="78" width="6" height="6" fill="#ffffff" />
    <rect x="28" y="53" width="8" height="4" fill="#000000" />
    <rect x="30" y="60" width="6" height="8" fill="#000000" />
    <rect x="38" y="66" width="13" height="4" fill="#000000" />
    <rect x="28" y="76" width="10" height="8" fill="#000000" />
    <rect x="42" y="76" width="9" height="9" fill="#000000" />
    <text x="33" y="97" fill="#000000" font-size="4.5" font-weight="800" text-anchor="middle">VIEW RESULT ON MOBILE</text>
  </g>

  <!-- ================= 3. DRAW NO + DATE RIBBON + 1ST PRIZE CAPSULE ================= -->
  <!-- Draw No Oval -->
  <rect x="195" y="112" width="68" height="28" rx="14" fill="#ffffff" stroke="#e01a1a" stroke-width="1.5" />
  <text x="229" y="122" fill="#000000" font-size="7.5" font-weight="700" text-anchor="middle">Draw No.</text>
  <text x="229" y="136" fill="#e01a1a" font-size="14" font-weight="900" text-anchor="middle" class="t-impact">${drawNumber}</text>

  <!-- Red Date Ribbon with notched ends -->
  <polygon points="268,126 276,114 416,114 424,126 416,138 276,138" fill="#e01a1a" />
  <polygon points="268,126 276,114 274,126" fill="#fff100" />
  <polygon points="424,126 416,114 418,126" fill="#fff100" />
  <text x="346" y="132" fill="#ffffff" font-size="16" font-weight="900" text-anchor="middle" class="t-impact" letter-spacing="1">
    ${displayDate}
  </text>

  <!-- 1st Prize Number Stadium Capsule -->
  <g transform="translate(190, 146)">
    <rect x="0" y="0" width="244" height="36" rx="18" fill="#ffffff" stroke="#d946ef" stroke-width="3" />
    <text x="122" y="${actuallyPending ? '24' : '26'}" fill="${actuallyPending ? '#e01a1a' : '#0c2461'}" font-size="${actuallyPending ? '15' : '24'}" text-anchor="middle" class="t-impact" letter-spacing="${actuallyPending ? '1' : '2'}">
      ${actuallyPending ? 'DRAW IN PROGRESS' : `${firstPrize.series} ${firstPrize.number}`}
    </text>
  </g>

  ${!actuallyPending ? `
  <!-- ================= 4. CONSOLATION PRIZE BAR ================= -->
  <rect x="2" y="186" width="536" height="17" fill="#e0f4ff" />
  <text x="270" y="198" fill="#003366" font-size="8.5" font-weight="900" text-anchor="middle">
    Cons.Prize Amount for Winner <tspan fill="#e01a1a">₹ 1000/-</tspan> for Seller <tspan fill="#e01a1a">₹ 500/-</tspan> <tspan font-size="10.5" fill="#0c2461" font-weight="900">${firstDigitsOnly}</tspan> (All Remaining Serial &amp; Series Of 1st Prize No.)
  </text>

  <!-- ================= 5. 2ND PRIZE SECTION (₹ 10,000/-) ================= -->
  <g transform="translate(2, 205)">
    <!-- Yellow Chevron Left -->
    <polygon points="0,0 162,0 178,19 162,38 0,38" fill="#ffea00" stroke="#c01818" stroke-width="1" />
    <text x="10" y="12" fill="#0c2461" font-size="8.5" font-weight="900">2nd</text>
    <text x="28" y="11" fill="#000000" font-size="6.5" font-weight="700">Prize Amount</text>
    <text x="28" y="17" fill="#000000" font-size="6" font-weight="700">for Winner</text>
    <text x="8" y="31" fill="#e01a1a" font-size="16" font-weight="900" class="t-impact">₹ 10,000/-</text>
    <text x="95" y="34" fill="#000000" font-size="6.5" font-weight="800">for Seller ₹ 500/-</text>

    <!-- 10 Numbers (2 rows of 5) -->
    <g transform="translate(182, 0)">
      ${secondPrizes.slice(0, 5).map((num, i) => `
        <text x="${i * 70 + 20}" y="15" fill="#000000" font-size="13" font-weight="900" class="t-mono">${num}</text>
      `).join('')}
      ${secondPrizes.slice(5, 10).map((num, i) => `
        <text x="${i * 70 + 20}" y="32" fill="#000000" font-size="13" font-weight="900" class="t-mono">${num}</text>
      `).join('')}
    </g>
    <line x1="0" y1="39" x2="536" y2="39" stroke="#cbd5e1" stroke-width="1" />
  </g>

  <!-- ================= 6. 3RD PRIZE SECTION (₹ 500/-) ================= -->
  <g transform="translate(2, 246)">
    <!-- Blue Chevron Left -->
    <polygon points="0,0 162,0 178,17 162,34 0,34" fill="#0056b3" />
    <text x="10" y="12" fill="#ffffff" font-size="9" font-weight="900">3rd</text>
    <text x="28" y="11" fill="#ffffff" font-size="6.5" font-weight="700">Prize</text>
    <text x="28" y="17" fill="#ffffff" font-size="6" font-weight="700">Amount</text>
    <text x="60" y="18" fill="#ffffff" font-size="15" font-weight="900" class="t-impact">₹ 500/-</text>
    <text x="10" y="29" fill="#fff100" font-size="6.5" font-weight="800">for Winner / for Seller ₹ 50/-</text>

    <!-- 10 Numbers (2 rows of 5) -->
    <g transform="translate(182, 0)">
      ${thirdPrizes.slice(0, 5).map((num, i) => `
        <text x="${i * 70 + 22}" y="13" fill="#000000" font-size="13" font-weight="900" class="t-mono">${num}</text>
      `).join('')}
      ${thirdPrizes.slice(5, 10).map((num, i) => `
        <text x="${i * 70 + 22}" y="29" fill="#000000" font-size="13" font-weight="900" class="t-mono">${num}</text>
      `).join('')}
    </g>
    <line x1="0" y1="35" x2="536" y2="35" stroke="#cbd5e1" stroke-width="1" />
  </g>

  <!-- ================= 7. 4TH PRIZE SECTION (₹ 250/-) ================= -->
  <g transform="translate(2, 283)">
    <!-- Light Grey / Blue Chevron Left -->
    <polygon points="0,0 162,0 178,17 162,34 0,34" fill="#e5e7eb" stroke="#94a3b8" stroke-width="0.8" />
    <text x="10" y="12" fill="#0c2461" font-size="9" font-weight="900">4th</text>
    <text x="28" y="11" fill="#0c2461" font-size="6.5" font-weight="700">Prize</text>
    <text x="28" y="17" fill="#0c2461" font-size="6" font-weight="700">Amount</text>
    <text x="60" y="18" fill="#e01a1a" font-size="15" font-weight="900" class="t-impact">₹ 250/-</text>
    <text x="10" y="29" fill="#0c2461" font-size="6.5" font-weight="800">for Winner / for Seller ₹ 20/-</text>

    <!-- 10 Numbers (2 rows of 5) -->
    <g transform="translate(182, 0)">
      ${fourthPrizes.slice(0, 5).map((num, i) => `
        <text x="${i * 70 + 22}" y="13" fill="#000000" font-size="13" font-weight="900" class="t-mono">${num}</text>
      `).join('')}
      ${fourthPrizes.slice(5, 10).map((num, i) => `
        <text x="${i * 70 + 22}" y="29" fill="#000000" font-size="13" font-weight="900" class="t-mono">${num}</text>
      `).join('')}
    </g>
    <line x1="0" y1="35" x2="536" y2="35" stroke="#000000" stroke-width="1" />
  </g>

  <!-- ================= 8. ICONIC CROREPATIS & WINNERS PROMO SECTION ================= -->
  <g transform="translate(2, 320)">
    <!-- Left Winner Ad (8 PM Nagaland) -->
    <rect x="0" y="0" width="267" height="96" fill="#fdfbf0" stroke="#0284c7" stroke-width="1.5" />
    <!-- Top Bar -->
    <rect x="0" y="0" width="267" height="16" fill="#0284c7" />
    <rect x="2" y="1" width="30" height="14" fill="#0099ff" rx="2" />
    <text x="17" y="11" fill="#ffffff" font-size="7.5" font-weight="900" text-anchor="middle">8 PM</text>
    <text x="40" y="11" fill="#ffffff" font-size="7.5" font-weight="800">NAGALAND STATE LOTTERIES</text>
    <text x="180" y="11" fill="#ffe500" font-size="7" font-weight="900">DEAR GOVERNMENT LOTTERIES</text>

    <text x="6" y="26" fill="#e01a1a" font-size="8" font-weight="900">DEAR LUCKY SATURDAY WEEKLY LOTTERY</text>
    <text x="6" y="34" fill="#000000" font-size="6" font-weight="700">Draw Date: 10.10.2026 | Ticket No: 46G 52975</text>
    
    <!-- Giant 1 Crore -->
    <text x="16" y="58" fill="#0056b3" font-size="32" font-weight="900" class="t-impact">1</text>
    <text x="32" y="57" fill="#0056b3" font-size="12" font-weight="900" class="t-impact">CRORE</text>

    <!-- Seller Avatar Circle -->
    <circle cx="106" cy="62" r="18" fill="#fee2e2" stroke="#e01a1a" stroke-width="1.5" />
    <circle cx="106" cy="56" r="6" fill="#991b1b" />
    <path d="M96 73 C96 66 116 66 116 73 Z" fill="#991b1b" />

    <!-- Seller Info -->
    <text x="132" y="48" fill="#e01a1a" font-size="7.5" font-weight="900">Sold by SELLER</text>
    <text x="132" y="57" fill="#000000" font-size="8.5" font-weight="900">AMAL ROY</text>
    <text x="132" y="65" fill="#64748b" font-size="6.5" font-weight="700">KALIKAPUR</text>
    <text x="132" y="75" fill="#000000" font-size="6.5" font-weight="800">Seller Prize Amount</text>
    <text x="132" y="86" fill="#e01a1a" font-size="11" font-weight="900" class="t-impact">5 LAKHS</text>

    <!-- Right Winner Ad (6 PM Sikkim) -->
    <g transform="translate(269, 0)">
      <rect x="0" y="0" width="267" height="96" fill="#fdfbf0" stroke="#0284c7" stroke-width="1.5" />
      <rect x="0" y="0" width="267" height="16" fill="#ea580c" />
      <rect x="2" y="1" width="30" height="14" fill="#fff100" rx="2" />
      <text x="17" y="11" fill="#e01a1a" font-size="7.5" font-weight="900" text-anchor="middle">6 PM</text>
      <text x="40" y="11" fill="#ffffff" font-size="7.5" font-weight="800">SIKKIM STATE LOTTERIES</text>
      <text x="180" y="11" fill="#ffffff" font-size="7" font-weight="900">DEAR GOVERNMENT LOTTERIES</text>

      <text x="6" y="26" fill="#0c2461" font-size="8" font-weight="900">DEAR PRESTIGE TUESDAY WEEKLY LOTTERY</text>
      <text x="6" y="34" fill="#000000" font-size="6" font-weight="700">Draw Date: 28.07.2026 | Ticket No: 92C 43102</text>
      
      <!-- Winner Trophy & 1 Crore -->
      <text x="6" y="52" fill="#e01a1a" font-size="13" font-weight="900">₹</text>
      <text x="16" y="54" fill="#fff100" font-size="22" font-weight="900" class="t-impact" stroke="#e01a1a" stroke-width="1">1 CRORE</text>

      <!-- Winner Avatar Circle -->
      <circle cx="95" cy="70" r="16" fill="#dbeafe" stroke="#0284c7" stroke-width="1.5" />
      <circle cx="95" cy="65" r="5" fill="#1e40af" />
      <path d="M86 80 C86 74 104 74 104 80 Z" fill="#1e40af" />

      <!-- Winner Info -->
      <text x="120" y="44" fill="#0056b3" font-size="7" font-style="italic" font-weight="700">Congratulations to</text>
      <text x="120" y="54" fill="#e01a1a" font-size="9" font-weight="900" class="t-impact">★ WINNER ★</text>
      <text x="120" y="64" fill="#000000" font-size="7.5" font-weight="900">DHIRAJ BISWAKARMA</text>
      <text x="120" y="73" fill="#64748b" font-size="6" font-weight="700">CHAMPASARI, WEST BENGAL</text>
      <text x="120" y="85" fill="#0c2461" font-size="8" font-weight="900">WINNER 1 CRORE</text>
    </g>

    <!-- Bottom Full Width Blue Ribbon across promo -->
    <rect x="0" y="97" width="536" height="15" fill="#0c2461" />
    <text x="268" y="108" fill="#ffffff" font-size="7.5" font-weight="900" text-anchor="middle">
      <tspan fill="#ffe500">DEAR GOVERNMENT LOTTERIES</tspan> have created <tspan fill="#ff007f" font-size="9">4754 CROREPATIS</tspan> • <tspan fill="#ffe500">YOU MAY BE NEXT CROREPATI?</tspan>
    </text>
  </g>

  <!-- ================= 9. 5TH PRIZE HEADER BAR (₹ 120/-) ================= -->
  <rect x="2" y="434" width="536" height="18" fill="#0060cc" />
  <text x="268" y="447" fill="#ffffff" font-size="10.5" font-weight="900" text-anchor="middle">
    5th Prize Amount for Winner <tspan fill="#ffe500">₹ 120/-</tspan> for Seller <tspan fill="#ffe500">₹ 10/-</tspan>
  </text>

  <!-- ================= 10. 5TH PRIZE TABLE (10x10 = 100 NUMBERS) ================= -->
  <g transform="translate(2, 453)">
    <!-- Background grid box -->
    <rect x="0" y="0" width="536" height="268" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />

    <!-- 10 Vertical Columns with Thin Dividers -->
    ${columns.map((col, cIdx) => `
      <g transform="translate(${cIdx * 53.6}, 0)">
        ${cIdx > 0 ? `<line x1="0" y1="0" x2="0" y2="268" stroke="#e2e8f0" stroke-width="1" />` : ''}
        ${col.map((num, rIdx) => `
          <text x="26.8" y="${rIdx * 26.5 + 18}" fill="#000000" font-size="12" font-weight="900" text-anchor="middle" class="t-mono">${num}</text>
        `).join('')}
      </g>
    `).join('')}

    <!-- Horizontal Sub-lines every row -->
    ${Array.from({ length: 9 }).map((_, rIdx) => `
      <line x1="0" y1="${(rIdx + 1) * 26.5}" x2="536" y2="${(rIdx + 1) * 26.5}" stroke="#f1f5f9" stroke-width="0.8" />
    `).join('')}
  </g>
  ` : `
  <!-- ================= PENDING / DRAW IN PROGRESS STATE ================= -->
  <g transform="translate(2, 190)">
    <rect x="0" y="0" width="536" height="530" fill="#f8fafc" stroke="#00802b" stroke-width="2" />
    <circle cx="268" cy="160" r="45" fill="#fef3c7" stroke="#d97706" stroke-width="2" />
    <text x="268" y="175" font-size="38" text-anchor="middle">⏳</text>
    
    <text x="268" y="240" fill="#0c2461" font-size="22" font-weight="900" text-anchor="middle" class="t-impact">
      OFFICIAL DRAW SCHEDULED
    </text>
    <text x="268" y="268" fill="#e01a1a" font-size="16" font-weight="900" text-anchor="middle">
      ${slotKey} DRAW IN PROGRESS (${displayDate})
    </text>
    <text x="268" y="300" fill="#475569" font-size="12" font-weight="700" text-anchor="middle">
      The scanned official result gazette sheet will appear here
    </text>
    <text x="268" y="318" fill="#475569" font-size="12" font-weight="700" text-anchor="middle">
      within seconds of Directorate declaration.
    </text>
    <rect x="68" y="360" width="400" height="48" fill="#00802b" rx="8" />
    <text x="268" y="390" fill="#ffffff" font-size="13" font-weight="900" text-anchor="middle">
      TOTAL PRIZE: 1ST PRIZE ₹1 CRORE • 2ND PRIZE ₹10,000
    </text>
  </g>
  `}

  <!-- ================= 11. BOTTOM GREEN & YELLOW DATE/SLOT FOOTER ================= -->
  <g transform="translate(2, 724)">
    <rect x="0" y="0" width="536" height="34" fill="#00802b" />
    
    <!-- Left Date -->
    <text x="50" y="24" fill="#fff100" font-size="18" font-weight="900" text-anchor="middle" class="t-impact">
      ${displayDate}
    </text>

    <!-- Center Yellow Capsule with Slot -->
    <rect x="220" y="4" width="96" height="26" rx="13" fill="#ffe500" stroke="#000000" stroke-width="0.8" />
    <text x="268" y="23" fill="#e01a1a" font-size="16" font-weight="900" text-anchor="middle" class="t-impact">
      ${slotKey}
    </text>

    <!-- Right Date -->
    <text x="486" y="24" fill="#fff100" font-size="18" font-weight="900" text-anchor="middle" class="t-impact">
      ${displayDate}
    </text>
  </g>

  <!-- ================= 12. DOMAIN BRAND & AUTHENTICATION BAR ================= -->
  <g transform="translate(2, 758)">
    <rect x="0" y="0" width="536" height="22" fill="#0c2461" />
    <text x="268" y="15" fill="#38bdf8" font-size="10" font-weight="900" text-anchor="middle" letter-spacing="1">
      OFFICIAL GAZETTE • DEARRESULTLIVE.IN • LIVE 1PM, 6PM &amp; 8PM DRAWS
    </text>
  </g>

</svg>`;
}
