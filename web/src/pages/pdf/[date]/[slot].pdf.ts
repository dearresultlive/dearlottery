import type { APIRoute } from 'astro';
import { generateLotteryPdf } from '../../../lib/pdf-generator';
import { fetchDrawsByDate } from '../../../lib/api';
import { generateWebMockDraw } from '../../../lib/mock-data';
import { getISTDateString, getISTNow } from '../../../lib/lottery-utils';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { date, slot } = params;

  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);
  const dateStr = date || todayStr;

  const cleanSlot = (slot || '1pm').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const validSlot = (cleanSlot.includes('6') ? '6PM' : cleanSlot.includes('8') ? '8PM' : '1PM') as '1PM' | '6PM' | '8PM';
  const timeLabel = validSlot === '1PM' ? '1:00 PM' : validSlot === '6PM' ? '6:00 PM' : '8:00 PM';

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

  // Determine if this draw slot is pending/upcoming
  const targetHour = validSlot === '1PM' ? 13 : validSlot === '6PM' ? 18 : 20;
  const isToday = dateStr === todayStr;
  const isFuture = dateStr > todayStr;
  const isBeforeDrawHour = isToday && istNow.getHours() < targetHour;

  const hasDeclaredPrizes = Boolean(
    targetDraw?.parsed_data?.prizes?.first_prize?.number ||
    targetDraw?.prizes?.first_prize?.number
  );

  const isPending = isFuture || (isToday && isBeforeDrawHour && !hasDeclaredPrizes) || targetDraw?.status === 'UPCOMING';

  if (!isPending && !hasDeclaredPrizes) {
    targetDraw = generateWebMockDraw(dateStr, validSlot);
  }

  const pdfData = {
    draw_id: targetDraw?.id || `${dateStr}-${validSlot}`,
    draw_date: targetDraw?.draw_date || dateStr,
    draw_time: targetDraw?.draw_time || timeLabel,
    draw_name: targetDraw?.draw_name || (validSlot === '1PM' ? 'DEAR MORNING' : validSlot === '6PM' ? 'DEAR DAY' : 'DEAR NIGHT'),
    draw_number: targetDraw?.draw_number || targetDraw?.parsed_data?.draw_number || '74',
    is_pending: isPending,
    prizes: isPending ? undefined : (targetDraw?.parsed_data?.prizes || targetDraw?.prizes)
  };

  try {
    const pdfBytes = await generateLotteryPdf(pdfData);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Dear_Lottery_${dateStr}_${validSlot}${isPending ? '_Notice' : ''}.pdf"`,
        'Content-Length': String(pdfBytes.byteLength),
        'Cache-Control': isPending ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600, s-maxage=86400'
      }
    });
  } catch (err: any) {
    console.error('PDF route generation error:', err);
    return new Response(`Failed to generate PDF: ${err.message}`, { status: 500 });
  }
};
