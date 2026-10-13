/**
 * Serverless Edge OCR / Vision Parser Fallback.
 * Parses raw lottery text or image buffers directly inside Cloudflare Workers.
 */

export interface ParsedEdgeDraw {
  firstPrize: { series: string; number: string };
  secondPrize: string[];
  thirdPrize: string[];
  fourthPrize: string[];
  fifthPrize: string[];
}

export function parseLotterySheetText(rawText: string): ParsedEdgeDraw {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1st Prize: Series + 5 digits
  let firstSeries = '84D';
  let firstNumber = '00000';
  const firstMatch = rawText.match(/(?:1st\s*Prize|First\s*Prize)[^\n]*?([0-9]{1,2}[A-Z]{1,2})\s*([0-9]{5})/i);
  if (firstMatch) {
    firstSeries = firstMatch[1].toUpperCase();
    firstNumber = firstMatch[2];
  } else {
    for (const line of lines.slice(0, 15)) {
      const m = line.match(/\b([0-9]{1,2}[A-Z]{1,2})\s+([0-9]{5})\b/);
      if (m) {
        firstSeries = m[1].toUpperCase();
        firstNumber = m[2];
        break;
      }
    }
  }

  // 2nd Prize: 10 five-digit numbers
  const all5 = rawText.match(/\b\d{5}\b/g) || [];
  const secondPrize = Array.from(new Set(all5.filter(n => n !== firstNumber))).slice(0, 10);

  // 4-digit numbers: partition into 3rd (10), 4th (10), 5th (100)
  const all4 = rawText.match(/\b\d{4}\b/g) || [];
  const unique4 = Array.from(new Set(all4));

  const thirdPrize = unique4.slice(0, 10);
  const fourthPrize = unique4.slice(10, 20);
  const fifthPrize = unique4.slice(20, 120);

  return {
    firstPrize: { series: firstSeries, number: firstNumber },
    secondPrize,
    thirdPrize,
    fourthPrize,
    fifthPrize
  };
}
