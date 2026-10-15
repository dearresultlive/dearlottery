/**
 * Node.js Pipeline Runner & Validator for Dear Lottery Engine.
 * Runs natively in Node.js 20+ / 24+ without external Python dependencies.
 * Useful for local testing, seeding, and automated GitHub Actions runner.
 */

import crypto from "crypto";

const WORKER_API_URL = process.env.WORKER_API_URL || "http://127.0.0.1:8787/api/results";
const WORKER_API_KEY = process.env.WORKER_API_KEY || "dear_lottery_secret_key_prod_2026";

/**
 * Generates deterministic authentic mock draw data for testing
 */
export function generateMockDraw(dateStr, timeSlot) {
  const names = {
    "1PM": "DEAR TEESTA MORNING",
    "6PM": "DEAR DESERT DAY",
    "8PM": "DEAR SEAGULL NIGHT"
  };
  const timeLabels = {
    "1PM": "1:00 PM",
    "6PM": "6:00 PM",
    "8PM": "8:00 PM"
  };

  const seed = parseInt(dateStr.replace(/-/g, ""), 10) + (timeSlot === "1PM" ? 101 : timeSlot === "6PM" ? 202 : 303);
  let s = seed;
  function pseudoRandom() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }
  function randInt(min, max) {
    return Math.floor(min + pseudoRandom() * (max - min + 1));
  }

  const seriesPool = ["84D", "92B", "75K", "61A", "53E", "99L", "42G", "88C", "71J", "66H"];
  const firstSeries = seriesPool[randInt(0, seriesPool.length - 1)];
  const firstNum = String(randInt(10000, 99999)).padStart(5, "0");

  const secondPrize = [];
  while (secondPrize.length < 10) {
    const candidate = String(randInt(10000, 99999)).padStart(5, "0");
    if (candidate !== firstNum && !secondPrize.includes(candidate)) {
      secondPrize.push(candidate);
    }
  }

  const thirdPrize = [];
  while (thirdPrize.length < 10) {
    const candidate = String(randInt(1000, 9999)).padStart(4, "0");
    if (!thirdPrize.includes(candidate)) {
      thirdPrize.push(candidate);
    }
  }

  const fourthPrize = [];
  while (fourthPrize.length < 10) {
    const candidate = String(randInt(1000, 9999)).padStart(4, "0");
    if (!thirdPrize.includes(candidate) && !fourthPrize.includes(candidate)) {
      fourthPrize.push(candidate);
    }
  }

  const fifthPrize = [];
  while (fifthPrize.length < 100) {
    const candidate = String(randInt(1000, 9999)).padStart(4, "0");
    if (!fifthPrize.includes(candidate)) {
      fifthPrize.push(candidate);
    }
  }

  secondPrize.sort();
  thirdPrize.sort();
  fourthPrize.sort();
  fifthPrize.sort();

  const drawId = `${dateStr}-${timeSlot}`;

  const payloadString = `${drawId}|${firstSeries}|${firstNum}|${secondPrize.join(",")}|${thirdPrize.join(",")}|${fourthPrize.join(",")}|${fifthPrize.join(",")}`;
  const checksum = crypto.createHash("sha256").update(payloadString).digest("hex");

  const flatPrizes = [
    {
      draw_id: drawId,
      prize_rank: "1st",
      prize_amount: 10000000,
      ticket_number: firstNum,
      last_digits: firstNum.slice(-4),
      series: firstSeries
    },
    {
      draw_id: drawId,
      prize_rank: "Consolation",
      prize_amount: 1000,
      ticket_number: firstNum,
      last_digits: firstNum.slice(-4),
      series: "ALL_OTHER"
    },
    ...secondPrize.map(num => ({
      draw_id: drawId,
      prize_rank: "2nd",
      prize_amount: 10000,
      ticket_number: num,
      last_digits: num.slice(-4),
      series: null
    })),
    ...thirdPrize.map(num => ({
      draw_id: drawId,
      prize_rank: "3rd",
      prize_amount: 500,
      ticket_number: num,
      last_digits: num,
      series: null
    })),
    ...fourthPrize.map(num => ({
      draw_id: drawId,
      prize_rank: "4th",
      prize_amount: 250,
      ticket_number: num,
      last_digits: num,
      series: null
    })),
    ...fifthPrize.map(num => ({
      draw_id: drawId,
      prize_rank: "5th",
      prize_amount: 120,
      ticket_number: num,
      last_digits: num,
      series: null
    }))
  ];

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
    source_url: `https://www.nagalandlotteries.com/results/${dateStr}_${timeSlot}.pdf`,
    pdf_r2_url: `https://cdn.dearresultlive.in/archive/${dateStr}/${timeSlot}.pdf`,
    image_r2_url: `https://cdn.dearresultlive.in/archive/${dateStr}/${timeSlot}.jpg`,
    checksum: checksum
  };

  return {
    draw: {
      id: drawId,
      draw_date: dateStr,
      draw_time: timeLabels[timeSlot],
      draw_name: names[timeSlot],
      source_url: fullData.source_url,
      checksum: checksum,
      raw_json: JSON.stringify(fullData)
    },
    prizes: flatPrizes,
    fullData
  };
}

// CLI Execution
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const args = process.argv.slice(2);
  const now = new Date();
  // IST offset +5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const todayStr = istDate.toISOString().slice(0, 10);

  const slotArg = args[0] || "1PM";
  const dateArg = args[1] || todayStr;

  console.log(`[DEAR LOTTERY RUNNER] Date: ${dateArg}, Slot: ${slotArg}`);
  const result = generateMockDraw(dateArg, slotArg);
  console.log(`Draw ID: ${result.draw.id}`);
  console.log(`1st Prize: ${result.fullData.prizes.first_prize.series} ${result.fullData.prizes.first_prize.number} (₹1 Crore)`);
  console.log(`Total Prize Records: ${result.prizes.length}`);
  console.log(`Checksum: ${result.draw.checksum}`);

  if (args.includes("--upload")) {
    console.log(`Transmitting to ${WORKER_API_URL}...`);
    try {
      const res = await fetch(WORKER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": WORKER_API_KEY
        },
        body: JSON.stringify({
          draw: result.draw,
          prizes: result.prizes
        })
      });
      const data = await res.text();
      console.log(`Response [${res.status}]: ${data}`);
    } catch (err) {
      console.error("Upload error:", err.message);
    }
  } else {
    console.log("Dry run finished successfully. Use --upload to send to Cloudflare Worker API.");
  }
}
