import type { APIRoute } from 'astro';
import { generateLotteryPdf } from '../../lib/pdf-generator';
import { fetchDrawsByDate } from '../../lib/api';
import { generateWebMockDraw } from '../../lib/mock-data';
import { getISTDateString, getISTNow } from '../../lib/lottery-utils';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const dateParam = url.searchParams.get('date');
  const slotParam = url.searchParams.get('slot') || '1pm';

  const istNow = getISTNow();
  const dateStr = dateParam || getISTDateString(istNow);

  const normSlot = slotParam.toUpperCase().replace(/[^0-9A-Z]/g, '') as '1PM' | '6PM' | '8PM';
  const validSlot = (normSlot === '6PM' || normSlot === '8PM') ? normSlot : '1PM';

  // Attempt to fetch real draw data
  let targetDraw: any = null;
  try {
    const draws = await fetchDrawsByDate(dateStr);
    targetDraw = draws.find(d => 
      d.draw_time?.includes(validSlot.replace('PM', '')) ||
      d.id?.includes(validSlot)
    );
  } catch (e) {
    // Fallback
  }

  if (!targetDraw || !targetDraw.parsed_data?.prizes?.first_prize?.number) {
    targetDraw = generateWebMockDraw(dateStr, validSlot);
  }

  const pdfData = {
    draw_id: targetDraw.id || `${dateStr}-${validSlot}`,
    draw_date: targetDraw.draw_date || dateStr,
    draw_time: targetDraw.draw_time || (validSlot === '1PM' ? '1:00 PM' : validSlot === '6PM' ? '6:00 PM' : '8:00 PM'),
    draw_name: targetDraw.draw_name || 'DEAR LOTTERY LIVE',
    draw_number: targetDraw.draw_number || targetDraw.parsed_data?.draw_number || '74',
    prizes: targetDraw.parsed_data?.prizes || targetDraw.prizes
  };

  try {
    const pdfBytes = await generateLotteryPdf(pdfData);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Dear_Lottery_${dateStr}_${validSlot}.pdf"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      }
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return new Response(`Failed to generate PDF: ${err.message}`, { status: 500 });
  }
};
