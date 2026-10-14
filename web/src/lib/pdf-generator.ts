import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface DrawPdfData {
  draw_id: string;
  draw_date: string;
  draw_time: string;
  draw_name: string;
  draw_number?: string;
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
 * Generates an official, publication-quality Dear Lottery Gazette PDF.
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

  // Colors
  const black = rgb(0.08, 0.08, 0.08);
  const darkBlue = rgb(0.05, 0.2, 0.55);
  const darkRed = rgb(0.75, 0.1, 0.1);
  const darkGreen = rgb(0.05, 0.45, 0.2);
  const lightGray = rgb(0.94, 0.94, 0.94);
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
  const subHeader = "GOVERNMENT OFFICIAL GAZETTE RESULT PUBLICATION";
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

  const drawNameStr = data.draw_name || 'DEAR LOTTERY LIVE';
  page.drawText(`DRAW: ${drawNameStr.toUpperCase()}`, {
    x: 36,
    y: currentY - 12,
    size: 11,
    font: fontHelveticaBold,
    color: darkBlue
  });

  const metaRight = `DATE: ${data.draw_date}   |   TIME: ${data.draw_time}   |   DRAW #${data.draw_number || '74'}`;
  const metaRightWidth = fontHelveticaBold.widthOfTextAtSize(metaRight, 9.5);
  page.drawText(metaRight, {
    x: width - 36 - metaRightWidth,
    y: currentY - 12,
    size: 9.5,
    font: fontHelveticaBold,
    color: black
  });

  currentY -= 48;

  // Extract Prizes
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

  const firstBadge = "★ 1ST PRIZE: Rs. 1,00,00,000/- (1 CRORE WINNER / ১ম পুরস্কার) ★";
  const firstBadgeWidth = fontHelveticaBold.widthOfTextAtSize(firstBadge, 11);
  page.drawText(firstBadge, {
    x: (width - firstBadgeWidth) / 2,
    y: currentY - 17,
    size: 11,
    font: fontHelveticaBold,
    color: darkRed
  });

  const ticketStr = `${first.series} ${first.number}`;
  const ticketWidth = fontCourierBold.widthOfTextAtSize(ticketStr, 28);
  page.drawText(ticketStr, {
    x: (width - ticketWidth) / 2,
    y: currentY - 48,
    size: 28,
    font: fontCourierBold,
    color: black
  });

  const consoStr = `Consolation Prize: Rs. 1,000/- (Awarded to all remaining series of ticket ${first.number})`;
  const consoWidth = fontHelvetica.widthOfTextAtSize(consoStr, 8.5);
  page.drawText(consoStr, {
    x: (width - consoWidth) / 2,
    y: currentY - 65,
    size: 8.5,
    font: fontHelvetica,
    color: rgb(0.3, 0.3, 0.3)
  });

  currentY -= (firstBoxHeight + 16);

  // Helper for Section Titles
  const drawSectionHeader = (title: string, yPos: number, color = darkBlue) => {
    page.drawRectangle({
      x: 28,
      y: yPos - 16,
      width: width - 56,
      height: 18,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: color,
      borderWidth: 1
    });
    page.drawText(title, {
      x: 36,
      y: yPos - 12,
      size: 9.5,
      font: fontHelveticaBold,
      color: color
    });
  };

  // 4. 2ND PRIZE (Rs. 9,000 - 10 Winners)
  drawSectionHeader("2ND PRIZE: Rs. 9,000/- (10 WINNERS - 5 DIGITS / ২য় পুরস্কার)", currentY, darkGreen);
  currentY -= 20;

  const secPadded = [...seconds];
  while (secPadded.length < 10) secPadded.push('00000');

  // Draw 2 rows of 5
  for (let row = 0; row < 2; row++) {
    const rowY = currentY - 14;
    for (let col = 0; col < 5; col++) {
      const idx = row * 5 + col;
      const num = secPadded[idx];
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
  drawSectionHeader("3RD PRIZE: Rs. 450/- (10 WINNERS - LAST 4 DIGITS / ৩য় পুরস্কার)", currentY, darkBlue);
  currentY -= 20;

  const thirdPadded = [...thirds];
  while (thirdPadded.length < 10) thirdPadded.push('0000');

  for (let row = 0; row < 2; row++) {
    const rowY = currentY - 13;
    for (let col = 0; col < 5; col++) {
      const idx = row * 5 + col;
      const num = thirdPadded[idx];
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
  drawSectionHeader("4TH PRIZE: Rs. 250/- (10 WINNERS - LAST 4 DIGITS / ৪র্থ পুরস্কার)", currentY, darkBlue);
  currentY -= 20;

  const fourthPadded = [...fourths];
  while (fourthPadded.length < 10) fourthPadded.push('0000');

  for (let row = 0; row < 2; row++) {
    const rowY = currentY - 13;
    for (let col = 0; col < 5; col++) {
      const idx = row * 5 + col;
      const num = fourthPadded[idx];
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
  drawSectionHeader("5TH PRIZE: Rs. 120/- (100 WINNERS - MATCHES LAST 4 DIGITS / ৫ম পুরস্কার)", currentY, rgb(0.8, 0.4, 0));
  currentY -= 18;

  const fifthPadded = [...fifths];
  while (fifthPadded.length < 100) fifthPadded.push('0000');

  const colWidth = (width - 64) / 10;
  for (let row = 0; row < 10; row++) {
    const rowY = currentY - 11;
    for (let col = 0; col < 10; col++) {
      const idx = row * 10 + col;
      const num = fifthPadded[idx];
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
  const legal2 = `Published by Dear Result Live • Verification Ref: ${data.draw_id || 'OFFICIAL'} • directoratestate.lotteries.gov.in`;
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
