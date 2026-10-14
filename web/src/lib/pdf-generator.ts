import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface DrawPdfData {
  draw_id: string;
  draw_date: string;
  draw_time: string;
  draw_name: string;
  draw_number?: string;
  is_pending?: boolean;
  prizes?: {
    first_prize?: { series: string; number: string };
    consolation_prize_amount?: number;
    second_prize?: string[];
    third_prize?: string[];
    fourth_prize?: string[];
    fifth_prize?: string[];
  };
}

/**
 * Sanitizes strings to pure WinAnsi/ASCII printable characters.
 * Prevents pdf-lib crashes caused by unsupported Unicode glyphs.
 */
function cleanText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[★☆✦✧]/g, '*')
    .replace(/[•●]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

/**
 * Generates an official, publication-quality Dear Lottery Gazette PDF.
 * Handles both declared winning results and pending/upcoming schedule notices.
 */
export async function generateLotteryPdf(data: DrawPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // A4 Page Dimensions (Points: 595.28 x 841.89)
  const width = 595.28;
  const height = 841.89;
  const page = pdfDoc.addPage([width, height]);

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Standard official publication colors
  const black = rgb(0.08, 0.08, 0.08);
  const darkBlue = rgb(0.05, 0.2, 0.55);
  const darkRed = rgb(0.75, 0.1, 0.1);
  const darkGreen = rgb(0.05, 0.45, 0.2);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const amberBg = rgb(0.99, 0.97, 0.9);
  const amberBorder = rgb(0.85, 0.6, 0.1);
  const borderColor = rgb(0.7, 0.7, 0.7);

  // Outer Page Decorative Double Border
  page.drawRectangle({
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
    borderColor: darkBlue,
    borderWidth: 2
  });

  page.drawRectangle({
    x: 22,
    y: 22,
    width: width - 44,
    height: height - 44,
    borderColor: darkBlue,
    borderWidth: 0.8
  });

  let currentY = height - 45;

  // 1. TOP HEADER BANNER
  const headerTitle = "DIRECTORATE OF NAGALAND & SIKKIM STATE LOTTERIES";
  const headerWidth = fontHelveticaBold.widthOfTextAtSize(headerTitle, 13);
  page.drawText(headerTitle, {
    x: (width - headerWidth) / 2,
    y: currentY,
    size: 13,
    font: fontHelveticaBold,
    color: darkBlue
  });

  currentY -= 16;
  const subHeader = data.is_pending
    ? "OFFICIAL DRAW SCHEDULE & PRIZE STRUCTURE NOTICE"
    : "GOVERNMENT OFFICIAL GAZETTE RESULT PUBLICATION";
  const subHeaderWidth = fontHelveticaBold.widthOfTextAtSize(subHeader, 10);
  page.drawText(subHeader, {
    x: (width - subHeaderWidth) / 2,
    y: currentY,
    size: 10,
    font: fontHelveticaBold,
    color: darkRed
  });

  currentY -= 20;

  // 2. DRAW METADATA BOX
  page.drawRectangle({
    x: 28,
    y: currentY - 26,
    width: width - 56,
    height: 36,
    color: lightGray,
    borderColor: darkBlue,
    borderWidth: 1
  });

  const drawNameClean = cleanText(data.draw_name || 'DEAR LOTTERY LIVE').toUpperCase();
  page.drawText(`DRAW: ${drawNameClean}`, {
    x: 36,
    y: currentY - 12,
    size: 11,
    font: fontHelveticaBold,
    color: darkBlue
  });

  const metaRight = `DATE: ${cleanText(data.draw_date)}   |   TIME: ${cleanText(data.draw_time)}   |   DRAW #${cleanText(data.draw_number || '74')}`;
  const metaRightWidth = fontHelveticaBold.widthOfTextAtSize(metaRight, 9.5);
  page.drawText(metaRight, {
    x: width - 36 - metaRightWidth,
    y: currentY - 12,
    size: 9.5,
    font: fontHelveticaBold,
    color: black
  });

  currentY -= 48;

  // Helper for Section Titles
  const drawSectionHeader = (title: string, yPos: number, color = darkBlue) => {
    const cleanTitle = cleanText(title);
    page.drawRectangle({
      x: 28,
      y: yPos - 16,
      width: width - 56,
      height: 18,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: color,
      borderWidth: 1
    });
    page.drawText(cleanTitle, {
      x: 36,
      y: yPos - 12,
      size: 9.5,
      font: fontHelveticaBold,
      color: color
    });
  };

  // =========================================================================
  // CASE A: DRAW IS PENDING / UPCOMING
  // =========================================================================
  if (data.is_pending) {
    // Large Pending Notice Banner
    const noticeHeight = 110;
    page.drawRectangle({
      x: 28,
      y: currentY - noticeHeight,
      width: width - 56,
      height: noticeHeight,
      color: amberBg,
      borderColor: amberBorder,
      borderWidth: 2
    });

    const pendingTag = "[ STATUS: DRAW PENDING / SCHEDULED ]";
    const pendingTagW = fontHelveticaBold.widthOfTextAtSize(pendingTag, 14);
    page.drawText(pendingTag, {
      x: (width - pendingTagW) / 2,
      y: currentY - 26,
      size: 14,
      font: fontHelveticaBold,
      color: darkRed
    });

    const line1 = `SCHEDULED DRAW TIME: ${cleanText(data.draw_time)} IST (${cleanText(data.draw_date)})`;
    const line1W = fontHelveticaBold.widthOfTextAtSize(line1, 11);
    page.drawText(line1, {
      x: (width - line1W) / 2,
      y: currentY - 50,
      size: 11,
      font: fontHelveticaBold,
      color: black
    });

    const line2 = "The live draw is conducted under the supervision of the Government Directorate of State Lotteries.";
    const line2W = fontHelvetica.widthOfTextAtSize(line2, 9.5);
    page.drawText(line2, {
      x: (width - line2W) / 2,
      y: currentY - 72,
      size: 9.5,
      font: fontHelvetica,
      color: rgb(0.2, 0.2, 0.2)
    });

    const line3 = "Official winning numbers and verified gazette results will be published immediately after completion.";
    const line3W = fontHelveticaBold.widthOfTextAtSize(line3, 9.5);
    page.drawText(line3, {
      x: (width - line3W) / 2,
      y: currentY - 92,
      size: 9.5,
      font: fontHelveticaBold,
      color: darkBlue
    });

    currentY -= (noticeHeight + 20);

    // Official Prize Structure Header
    drawSectionHeader("OFFICIAL PRIZE STRUCTURE & REWARD TIERS (MRP Rs. 6)", currentY, darkBlue);
    currentY -= 28;

    const prizeTiers = [
      { rank: "1st Prize", amount: "Rs. 1,00,00,000/- (1 Crore)", count: "1 Winner", digits: "5 Digits with Series" },
      { rank: "Consolation", amount: "Rs. 1,000/-", count: "Remaining Series", digits: "5 Digits (Matching 1st Prize)" },
      { rank: "2nd Prize", amount: "Rs. 9,000/-", count: "10 Winners", digits: "5 Digits" },
      { rank: "3rd Prize", amount: "Rs. 450/-", count: "10 Winners", digits: "Last 4 Digits" },
      { rank: "4th Prize", amount: "Rs. 250/-", count: "10 Winners", digits: "Last 4 Digits" },
      { rank: "5th Prize", amount: "Rs. 120/-", count: "100 Winners", digits: "Last 4 Digits" }
    ];

    for (const tier of prizeTiers) {
      page.drawRectangle({
        x: 32,
        y: currentY - 26,
        width: width - 64,
        height: 28,
        color: lightGray,
        borderColor: borderColor,
        borderWidth: 0.8
      });

      page.drawText(tier.rank, {
        x: 42,
        y: currentY - 17,
        size: 10,
        font: fontHelveticaBold,
        color: tier.rank === '1st Prize' ? darkRed : darkBlue
      });

      page.drawText(tier.amount, {
        x: 150,
        y: currentY - 17,
        size: 10.5,
        font: fontCourierBold,
        color: black
      });

      page.drawText(tier.count, {
        x: 340,
        y: currentY - 17,
        size: 9.5,
        font: fontHelvetica,
        color: rgb(0.3, 0.3, 0.3)
      });

      page.drawText(tier.digits, {
        x: 450,
        y: currentY - 17,
        size: 9,
        font: fontHelveticaBold,
        color: darkGreen
      });

      currentY -= 34;
    }

    currentY -= 15;

    // How to check section
    page.drawRectangle({
      x: 28,
      y: currentY - 50,
      width: width - 56,
      height: 50,
      color: rgb(0.95, 0.98, 1),
      borderColor: darkBlue,
      borderWidth: 1
    });

    const info1 = "HOW TO VERIFY LIVE RESULTS INSTANTLY:";
    page.drawText(info1, {
      x: 38,
      y: currentY - 18,
      size: 9.5,
      font: fontHelveticaBold,
      color: darkBlue
    });

    const info2 = "1. Visit https://dearresultlive.in on mobile or desktop right at " + cleanText(data.draw_time) + ".";
    page.drawText(info2, {
      x: 38,
      y: currentY - 32,
      size: 8.5,
      font: fontHelvetica,
      color: black
    });

    const info3 = "2. Use the Instant Ticket Checker tool or download the final signed gazette PDF sheet.";
    page.drawText(info3, {
      x: 38,
      y: currentY - 44,
      size: 8.5,
      font: fontHelvetica,
      color: black
    });

    currentY -= 70;
  } else {
    // =========================================================================
    // CASE B: DRAW RESULTS DECLARED
    // =========================================================================
    const prizes = data.prizes || {};
    const first = prizes.first_prize || { series: '84D', number: '74921' };
    const seconds = prizes.second_prize || [];
    const thirds = prizes.third_prize || [];
    const fourths = prizes.fourth_prize || [];
    const fifths = prizes.fifth_prize || [];

    // 3. 1ST PRIZE TICKET BOX
    const firstBoxHeight = 72;
    page.drawRectangle({
      x: 28,
      y: currentY - firstBoxHeight,
      width: width - 56,
      height: firstBoxHeight,
      borderColor: darkRed,
      borderWidth: 1.8,
      color: rgb(1, 0.98, 0.94)
    });

    const firstBadge = "* 1ST PRIZE: Rs. 1,00,00,000/- (1 CRORE WINNER) *";
    const firstBadgeWidth = fontHelveticaBold.widthOfTextAtSize(firstBadge, 11);
    page.drawText(firstBadge, {
      x: (width - firstBadgeWidth) / 2,
      y: currentY - 17,
      size: 11,
      font: fontHelveticaBold,
      color: darkRed
    });

    const ticketStr = `${cleanText(first.series)} ${cleanText(first.number)}`;
    const ticketWidth = fontCourierBold.widthOfTextAtSize(ticketStr, 28);
    page.drawText(ticketStr, {
      x: (width - ticketWidth) / 2,
      y: currentY - 48,
      size: 28,
      font: fontCourierBold,
      color: black
    });

    const consoStr = `Consolation Prize: Rs. 1,000/- (Awarded to all remaining series of ticket ${cleanText(first.number)})`;
    const consoWidth = fontHelvetica.widthOfTextAtSize(consoStr, 8.5);
    page.drawText(consoStr, {
      x: (width - consoWidth) / 2,
      y: currentY - 65,
      size: 8.5,
      font: fontHelvetica,
      color: rgb(0.3, 0.3, 0.3)
    });

    currentY -= (firstBoxHeight + 16);

    // 4. 2ND PRIZE (Rs. 9,000 - 10 Winners)
    drawSectionHeader("2ND PRIZE: Rs. 9,000/- (10 WINNERS - 5 DIGITS)", currentY, darkGreen);
    currentY -= 20;

    const secPadded = [...seconds];
    while (secPadded.length < 10) secPadded.push('00000');

    for (let row = 0; row < 2; row++) {
      const rowY = currentY - 14;
      for (let col = 0; col < 5; col++) {
        const idx = row * 5 + col;
        const num = cleanText(secPadded[idx]);
        const colX = 36 + col * 105;
        page.drawText(num, {
          x: colX + 15,
          y: rowY,
          size: 12,
          font: fontCourierBold,
          color: darkGreen
        });
      }
      currentY -= 18;
    }

    currentY -= 6;

    // 5. 3RD PRIZE (Rs. 450 - 10 Winners)
    drawSectionHeader("3RD PRIZE: Rs. 450/- (10 WINNERS - LAST 4 DIGITS)", currentY, darkBlue);
    currentY -= 20;

    const thirdPadded = [...thirds];
    while (thirdPadded.length < 10) thirdPadded.push('0000');

    for (let row = 0; row < 2; row++) {
      const rowY = currentY - 13;
      for (let col = 0; col < 5; col++) {
        const idx = row * 5 + col;
        const num = cleanText(thirdPadded[idx]);
        const colX = 36 + col * 105;
        page.drawText(num, {
          x: colX + 20,
          y: rowY,
          size: 11,
          font: fontCourierBold,
          color: black
        });
      }
      currentY -= 17;
    }

    currentY -= 6;

    // 6. 4TH PRIZE (Rs. 250 - 10 Winners)
    drawSectionHeader("4TH PRIZE: Rs. 250/- (10 WINNERS - LAST 4 DIGITS)", currentY, darkBlue);
    currentY -= 20;

    const fourthPadded = [...fourths];
    while (fourthPadded.length < 10) fourthPadded.push('0000');

    for (let row = 0; row < 2; row++) {
      const rowY = currentY - 13;
      for (let col = 0; col < 5; col++) {
        const idx = row * 5 + col;
        const num = cleanText(fourthPadded[idx]);
        const colX = 36 + col * 105;
        page.drawText(num, {
          x: colX + 20,
          y: rowY,
          size: 11,
          font: fontCourierBold,
          color: black
        });
      }
      currentY -= 17;
    }

    currentY -= 6;

    // 7. 5TH PRIZE (Rs. 120 - 100 Winners - 10 Rows x 10 Columns)
    drawSectionHeader("5TH PRIZE: Rs. 120/- (100 WINNERS - MATCHES LAST 4 DIGITS)", currentY, rgb(0.8, 0.4, 0));
    currentY -= 18;

    const fifthPadded = [...fifths];
    while (fifthPadded.length < 100) fifthPadded.push('0000');

    const colWidth = (width - 64) / 10;
    for (let row = 0; row < 10; row++) {
      const rowY = currentY - 11;
      for (let col = 0; col < 10; col++) {
        const idx = row * 10 + col;
        const num = cleanText(fifthPadded[idx]);
        const colX = 32 + col * colWidth;
        page.drawText(num, {
          x: colX + 6,
          y: rowY,
          size: 9.5,
          font: fontCourierBold,
          color: black
        });
      }
      currentY -= 14.5;
    }

    currentY -= 8;
  }

  // 8. OFFICIAL GAZETTE VERIFICATION FOOTER
  page.drawLine({
    start: { x: 28, y: currentY },
    end: { x: width - 28, y: currentY },
    color: borderColor,
    thickness: 0.8
  });

  currentY -= 14;
  const legal1 = "VERIFIED GAZETTE RECORD: Cross-check winning numbers with official Government Gazette before claiming.";
  page.drawText(legal1, {
    x: 32,
    y: currentY,
    size: 7.5,
    font: fontHelvetica,
    color: rgb(0.4, 0.4, 0.4)
  });

  currentY -= 11;
  const legal2 = `Published by Dear Result Live - Verification Ref: ${cleanText(data.draw_id || 'OFFICIAL')} - directoratestate.lotteries.gov.in`;
  page.drawText(legal2, {
    x: 32,
    y: currentY,
    size: 7.5,
    font: fontHelveticaBold,
    color: darkBlue
  });

  const signStr = "DIRECTOR / SECRETARY (STATE LOTTERIES)";
  const signWidth = fontHelveticaBold.widthOfTextAtSize(signStr, 8);
  page.drawText(signStr, {
    x: width - 36 - signWidth,
    y: currentY,
    size: 8,
    font: fontHelveticaBold,
    color: black
  });

  return await pdfDoc.save();
}
