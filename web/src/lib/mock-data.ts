/**
 * Portable mock data generator for web SSR and client islands.
 * Zero external Node.js dependencies.
 */

export function generateWebMockDraw(dateStr: string, timeSlot: '1PM' | '6PM' | '8PM') {
  const names = {
    '1PM': 'DEAR TEESTA MORNING',
    '6PM': 'DEAR DESERT DAY',
    '8PM': 'DEAR SEAGULL NIGHT'
  };
  const timeLabels = {
    '1PM': '1:00 PM',
    '6PM': '6:00 PM',
    '8PM': '8:00 PM'
  };

  const seed = parseInt(dateStr.replace(/-/g, ''), 10) + (timeSlot === '1PM' ? 101 : timeSlot === '6PM' ? 202 : 303);
  let s = seed;
  function pseudoRandom() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }
  function randInt(min: number, max: number) {
    return Math.floor(min + pseudoRandom() * (max - min + 1));
  }

  const seriesPool = ['84D', '92B', '75K', '61A', '53E', '99L', '42G', '88C', '71J', '66H'];
  const firstSeries = seriesPool[randInt(0, seriesPool.length - 1)];
  const firstNum = String(randInt(10000, 99999)).padStart(5, '0');

  const secondPrize: string[] = [];
  while (secondPrize.length < 10) {
    const candidate = String(randInt(10000, 99999)).padStart(5, '0');
    if (candidate !== firstNum && !secondPrize.includes(candidate)) {
      secondPrize.push(candidate);
    }
  }

  const thirdPrize: string[] = [];
  while (thirdPrize.length < 10) {
    const candidate = String(randInt(1000, 9999)).padStart(4, '0');
    if (!thirdPrize.includes(candidate)) {
      thirdPrize.push(candidate);
    }
  }

  const fourthPrize: string[] = [];
  while (fourthPrize.length < 10) {
    const candidate = String(randInt(1000, 9999)).padStart(4, '0');
    if (!thirdPrize.includes(candidate) && !fourthPrize.includes(candidate)) {
      fourthPrize.push(candidate);
    }
  }

  const fifthPrize: string[] = [];
  while (fifthPrize.length < 100) {
    const candidate = String(randInt(1000, 9999)).padStart(4, '0');
    if (!fifthPrize.includes(candidate)) {
      fifthPrize.push(candidate);
    }
  }

  secondPrize.sort();
  thirdPrize.sort();
  fourthPrize.sort();
  fifthPrize.sort();

  const drawId = `${dateStr}-${timeSlot}`;

  const fullData = {
    draw_id: drawId,
    draw_date: dateStr,
    draw_time: timeLabels[timeSlot],
    draw_name: names[timeSlot],
    draw_number: String(randInt(100, 999)),
    prizes: {
      first_prize: { series: firstSeries, number: firstNum },
      consolation_prize_amount: 1000,
      second_prize: secondPrize,
      third_prize: thirdPrize,
      fourth_prize: fourthPrize,
      fifth_prize: fifthPrize
    },
    source_url: `https://www.nagalandlotteries.com/results/${dateStr}_${timeSlot}.pdf`
  };

  return {
    id: drawId,
    draw_date: dateStr,
    draw_time: timeLabels[timeSlot],
    draw_name: names[timeSlot],
    source_url: fullData.source_url,
    checksum: 'mock_checksum_' + drawId,
    raw_json: JSON.stringify(fullData),
    parsed_data: fullData
  };
}
