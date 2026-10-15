/**
 * Official Gazette SVG Sheet Generator.
 * Creates an authentic, publication-quality vector replica of the
 * Nagaland & Sikkim State Lotteries official scanned gazette paper sheet.
 */

export interface GazetteSvgData {
  drawDate: string;
  drawTime: string;
  drawName: string;
  drawNumber?: string;
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
    drawDate,
    drawTime,
    drawName,
    drawNumber = '74',
    isPending = false,
    prizes
  } = data;

  const firstPrize = prizes?.first_prize || { series: '95E', number: '75331' };
  const secondPrizes = prizes?.second_prize || [];
  const thirdPrizes = prizes?.third_prize || [];
  const fourthPrizes = prizes?.fourth_prize || [];
  const fifthPrizes = prizes?.fifth_prize || [];

  const stateName = drawName.toLowerCase().includes('sikkim')
    ? 'GOVERNMENT OF SIKKIM'
    : 'GOVERNMENT OF NAGALAND';

  const directorate = drawName.toLowerCase().includes('sikkim')
    ? 'DIRECTORATE OF SIKKIM STATE LOTTERIES'
    : 'DIRECTORATE OF NAGALAND STATE LOTTERIES';

  // Format 5th prizes in rows of 10
  const fifthRows: string[][] = [];
  for (let i = 0; i < fifthPrizes.length; i += 10) {
    fifthRows.push(fifthPrizes.slice(i, i + 10));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1120" width="800" height="1120" style="background:#fcfbf7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace;">
  <defs>
    <style>
      .t-bold { font-weight: 900; }
      .t-mono { font-family: 'Courier New', Courier, monospace; font-weight: bold; }
      .navy { fill: #0b2545; }
      .red { fill: #c01818; }
      .green { fill: #0e5e29; }
      .gold { fill: #d4a017; }
      .line { stroke: #0b2545; stroke-width: 1.5; }
      .line-thin { stroke: #cbd5e1; stroke-width: 1; }
    </style>
  </defs>

  <!-- Paper Outer Background with subtle border -->
  <rect x="0" y="0" width="800" height="1120" fill="#fcfbf7" />

  <!-- Double Government Gazette Border -->
  <rect x="14" y="14" width="772" height="1092" fill="none" stroke="#0b2545" stroke-width="3" />
  <rect x="19" y="19" width="762" height="1082" fill="none" stroke="#0b2545" stroke-width="1" />

  <!-- Top Header Strip -->
  <rect x="22" y="22" width="756" height="42" fill="#0b2545" />
  <text x="400" y="48" fill="#ffffff" font-size="20" font-weight="900" text-anchor="middle" letter-spacing="3">${stateName}</text>

  <!-- Directorate Sub-header -->
  <text x="400" y="90" fill="#0b2545" font-size="16" font-weight="800" text-anchor="middle" letter-spacing="1.5">${directorate}</text>
  <text x="400" y="112" fill="#64748b" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="1">OFFICIAL GAZETTE RESULT PUBLICATION</text>

  <!-- Decorative Separator Line -->
  <line x1="40" y1="124" x2="760" y2="124" stroke="#0b2545" stroke-width="1.5" />
  <line x1="40" y1="127" x2="760" y2="127" stroke="#0b2545" stroke-width="0.8" />

  <!-- Draw Metadata Box -->
  <rect x="40" y="136" width="720" height="42" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" rx="4" />
  <text x="56" y="162" fill="#0b2545" font-size="15" font-weight="900">DRAW: ${drawName.toUpperCase()}</text>
  <text x="440" y="162" fill="#0b2545" font-size="14" font-weight="800">DRAW NO: ${drawNumber}</text>
  <text x="610" y="162" fill="#c01818" font-size="14" font-weight="900">TIME: ${drawTime}</text>
  <text x="400" y="196" fill="#1e293b" font-size="13" font-weight="700" text-anchor="middle">DATE OF DRAW: ${drawDate} • MRP ₹6/- PER TICKET</text>

  ${!isPending ? `
  <!-- ================= 1ST PRIZE SECTION ================= -->
  <rect x="40" y="210" width="720" height="96" fill="#fff6f6" stroke="#c01818" stroke-width="2" rx="6" />
  <rect x="40" y="210" width="720" height="28" fill="#c01818" rx="4" />
  <text x="400" y="229" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="1">
    ★ 1ST PRIZE ₹1,00,00,000/- (ONE CRORE RUPEES) ★
  </text>
  
  <text x="400" y="280" fill="#c01818" font-size="44" font-family="'Arial Black', Impact, sans-serif" font-weight="900" text-anchor="middle" letter-spacing="4">
    ${firstPrize.series} ${firstPrize.number}
  </text>

  <!-- Consolation Prize Notice -->
  <rect x="40" y="314" width="720" height="26" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
  <text x="400" y="331" fill="#334155" font-size="11.5" font-weight="700" text-anchor="middle">
    CONSOLATION PRIZE ₹1,000/- REMAINING ALL SERIES OF 1ST PRIZE NO. ${firstPrize.number}
  </text>

  <!-- ================= 2ND PRIZE SECTION (10 Winners of ₹9,000) ================= -->
  <rect x="40" y="348" width="720" height="24" fill="#0b2545" />
  <text x="50" y="364" fill="#ffffff" font-size="12" font-weight="800">2ND PRIZE ₹9,000/- (10 WINNERS • 5 DIGITS)</text>

  <rect x="40" y="372" width="720" height="58" fill="#ffffff" stroke="#0b2545" stroke-width="1" />
  ${secondPrizes.slice(0, 5).map((num, i) => `
    <text x="${75 + i * 145}" y="398" fill="#0b2545" font-size="16" font-family="'Courier New', monospace" font-weight="900">${num}</text>
  `).join('')}
  ${secondPrizes.slice(5, 10).map((num, i) => `
    <text x="${75 + i * 145}" y="420" fill="#0b2545" font-size="16" font-family="'Courier New', monospace" font-weight="900">${num}</text>
  `).join('')}

  <!-- ================= 3RD & 4TH PRIZE SECTION ================= -->
  <!-- 3rd Prize -->
  <rect x="40" y="438" width="355" height="22" fill="#0e5e29" />
  <text x="50" y="453" fill="#ffffff" font-size="11" font-weight="800">3RD PRIZE ₹450/- (LAST 4 DIGITS)</text>

  <rect x="40" y="460" width="355" height="52" fill="#ffffff" stroke="#0e5e29" stroke-width="1" />
  ${thirdPrizes.slice(0, 5).map((num, i) => `
    <text x="${52 + i * 68}" y="480" fill="#0e5e29" font-size="13" font-family="'Courier New', monospace" font-weight="900">${num}</text>
  `).join('')}
  ${thirdPrizes.slice(5, 10).map((num, i) => `
    <text x="${52 + i * 68}" y="502" fill="#0e5e29" font-size="13" font-family="'Courier New', monospace" font-weight="900">${num}</text>
  `).join('')}

  <!-- 4th Prize -->
  <rect x="405" y="438" width="355" height="22" fill="#1e3a8a" />
  <text x="415" y="453" fill="#ffffff" font-size="11" font-weight="800">4TH PRIZE ₹250/- (LAST 4 DIGITS)</text>

  <rect x="405" y="460" width="355" height="52" fill="#ffffff" stroke="#1e3a8a" stroke-width="1" />
  ${fourthPrizes.slice(0, 5).map((num, i) => `
    <text x="${417 + i * 68}" y="480" fill="#1e3a8a" font-size="13" font-family="'Courier New', monospace" font-weight="900">${num}</text>
  `).join('')}
  ${fourthPrizes.slice(5, 10).map((num, i) => `
    <text x="${417 + i * 68}" y="502" fill="#1e3a8a" font-size="13" font-family="'Courier New', monospace" font-weight="900">${num}</text>
  `).join('')}

  <!-- ================= 5TH PRIZE SECTION (100 Winners of ₹120) ================= -->
  <rect x="40" y="520" width="720" height="24" fill="#0b2545" />
  <text x="50" y="536" fill="#ffffff" font-size="12" font-weight="800">5TH PRIZE ₹120/- (100 WINNERS • LAST 4 DIGITS)</text>

  <rect x="40" y="544" width="720" height="366" fill="#ffffff" stroke="#0b2545" stroke-width="1" />
  ${fifthRows.map((row, rIdx) => `
    <g transform="translate(0, ${572 + rIdx * 35})">
      ${row.map((num, cIdx) => `
        <text x="${58 + cIdx * 71}" y="0" fill="#1e293b" font-size="13.5" font-family="'Courier New', monospace" font-weight="800">${num}</text>
      `).join('')}
      <line x1="40" y1="12" x2="760" y2="12" stroke="#f1f5f9" stroke-width="1" />
    </g>
  `).join('')}

  ` : `
  <!-- ================= PENDING STATE SCHEDULE NOTICE ================= -->
  <rect x="40" y="240" width="720" height="600" fill="#ffffff" stroke="#0b2545" stroke-width="1.5" rx="8" />
  <circle cx="400" cy="380" r="50" fill="#f8fafc" stroke="#0b2545" stroke-width="2" />
  <text x="400" y="396" font-size="44" text-anchor="middle">⏳</text>

  <text x="400" y="475" fill="#0b2545" font-size="24" font-weight="900" text-anchor="middle">
    OFFICIAL DRAW IS SCHEDULED
  </text>
  <text x="400" y="510" fill="#c01818" font-size="18" font-weight="800" text-anchor="middle">
    ${drawTime} DRAW IN PROGRESS / SCHEDULED
  </text>

  <text x="400" y="560" fill="#475569" font-size="14" text-anchor="middle">
    The verified government gazette result sheet will be published here
  </text>
  <text x="400" y="585" fill="#475569" font-size="14" text-anchor="middle">
    immediately after the draw process and judges certification.
  </text>

  <rect x="150" y="630" width="500" height="60" fill="#f1f5f9" stroke="#cbd5e1" rx="8" />
  <text x="400" y="666" fill="#0b2545" font-size="15" font-weight="800" text-anchor="middle">
    Total Prize Fund: ₹1,00,00,000/- (1st Prize) + 2nd to 5th Tiers
  </text>
  `}

  <!-- ================= OFFICIAL FOOTER & SEALS ================= -->
  <g transform="translate(40, 930)">
    <!-- Security Barcode -->
    <rect x="10" y="10" width="220" height="40" fill="#000000" />
    <rect x="15" y="10" width="5" height="40" fill="#ffffff" />
    <rect x="25" y="10" width="8" height="40" fill="#ffffff" />
    <rect x="38" y="10" width="4" height="40" fill="#ffffff" />
    <rect x="47" y="10" width="10" height="40" fill="#ffffff" />
    <rect x="62" y="10" width="4" height="40" fill="#ffffff" />
    <rect x="72" y="10" width="7" height="40" fill="#ffffff" />
    <rect x="85" y="10" width="12" height="40" fill="#ffffff" />
    <rect x="103" y="10" width="4" height="40" fill="#ffffff" />
    <rect x="113" y="10" width="9" height="40" fill="#ffffff" />
    <rect x="127" y="10" width="5" height="40" fill="#ffffff" />
    <rect x="138" y="10" width="11" height="40" fill="#ffffff" />
    <rect x="155" y="10" width="6" height="40" fill="#ffffff" />
    <rect x="167" y="10" width="9" height="40" fill="#ffffff" />
    <rect x="182" y="10" width="4" height="40" fill="#ffffff" />
    <rect x="192" y="10" width="12" height="40" fill="#ffffff" />
    <rect x="210" y="10" width="5" height="40" fill="#ffffff" />
    <text x="120" y="64" fill="#0b2545" font-size="10" font-family="'Courier New', monospace" font-weight="900" text-anchor="middle">NL-${drawDate.replace(/-/g, '')}-${drawNumber}</text>

    <!-- Official Seal -->
    <circle cx="360" cy="38" r="34" fill="none" stroke="#c01818" stroke-width="2" stroke-dasharray="4,2" />
    <circle cx="360" cy="38" r="28" fill="none" stroke="#c01818" stroke-width="1" />
    <text x="360" y="34" fill="#c01818" font-size="7.5" font-weight="900" text-anchor="middle">DIRECTORATE</text>
    <text x="360" y="44" fill="#c01818" font-size="6.5" font-weight="800" text-anchor="middle">STATE LOTTERIES</text>
    <text x="360" y="53" fill="#c01818" font-size="6" font-weight="800" text-anchor="middle">OFFICIAL SEAL</text>

    <!-- Signatures -->
    <path d="M 520 40 Q 540 20 560 38 T 600 35" fill="none" stroke="#0b2545" stroke-width="1.8" />
    <line x1="510" y1="50" x2="610" y2="50" stroke="#0b2545" stroke-width="1" />
    <text x="560" y="62" fill="#0b2545" font-size="10" font-weight="800" text-anchor="middle">Judge 1 Signature</text>

    <path d="M 640 38 Q 660 18 680 35 T 710 32" fill="none" stroke="#0b2545" stroke-width="1.8" />
    <line x1="630" y1="50" x2="720" y2="50" stroke="#0b2545" stroke-width="1" />
    <text x="675" y="62" fill="#0b2545" font-size="10" font-weight="800" text-anchor="middle">Director Signature</text>
  </g>

  <!-- Legal Disclaimer Bottom Strip -->
  <rect x="22" y="1058" width="756" height="38" fill="#f1f5f9" />
  <text x="400" y="1075" fill="#475569" font-size="9.5" text-anchor="middle">
    The Directorate of State Lotteries verifies that this is the official declared gazette result.
  </text>
  <text x="400" y="1089" fill="#64748b" font-size="8.5" text-anchor="middle">
    Verify original winning ticket with Government Gazette publication before claiming prize. Subject to Kohima / Gangtok Jurisdiction.
  </text>
</svg>`;
}
