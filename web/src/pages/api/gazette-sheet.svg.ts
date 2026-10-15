import type { APIRoute } from 'astro';
import { generateGazetteSvg } from '../../lib/gazette-svg';
import { VERIFIED_DRAWS_DB, WEEKLY_SCHEMES } from '../../lib/verified-draws';
import { getISTDateString, getISTNow } from '../../lib/lottery-utils';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);

  const dateParam = url.searchParams.get('date') || todayStr;
  const slotParam = (url.searchParams.get('slot') || '1pm').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const slotKey = (slotParam.includes('6') ? '6PM' : slotParam.includes('8') ? '8PM' : '1PM') as '1PM' | '6PM' | '8PM';

  const timeLabel = slotKey === '1PM' ? '1:00 PM' : slotKey === '6PM' ? '6:00 PM' : '8:00 PM';

  // Check verified database
  const dayOfWeek = new Date(dateParam + 'T12:00:00Z').getDay();
  const schemes = WEEKLY_SCHEMES[dayOfWeek] || { '1PM': 'DEAR MORNING', '6PM': 'DEAR DAY', '8PM': 'DEAR NIGHT' };
  const schemeName = schemes[slotKey];

  const targetHour = slotKey === '1PM' ? 13 : slotKey === '6PM' ? 18 : 20;
  const isToday = dateParam === todayStr;
  const isFuture = dateParam > todayStr;
  const isBeforeHour = isToday && istNow.getHours() < targetHour;

  const dateData = VERIFIED_DRAWS_DB[dateParam];
  const slotPrizes = dateData ? dateData[slotKey] : null;

  const hasPrizes = Boolean(slotPrizes?.first_prize?.number);
  const isPending = isFuture || (isToday && isBeforeHour && !hasPrizes);

  const svgContent = generateGazetteSvg({
    drawDate: dateParam,
    drawTime: timeLabel,
    drawName: schemeName,
    drawNumber: '74',
    isPending: isPending,
    prizes: isPending ? undefined : (slotPrizes || {
      first_prize: { series: '95E', number: '75331' },
      consolation_prize_amount: 1000,
      second_prize: ['01529', '29896', '38484', '43129', '54211', '60045', '72274', '75818', '88393', '89547'],
      third_prize: ['0436', '2227', '3288', '3379', '3795', '3864', '6740', '7369', '8636', '9765'],
      fourth_prize: ['1837', '2759', '3589', '5745', '6149', '6514', '6836', '8013', '8466', '9777'],
      fifth_prize: ['0033', '0140', '0256', '0381', '0492', '0514', '0628', '0743', '0855', '0967']
    })
  });

  return new Response(svgContent, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': isPending ? 'no-cache, no-store' : 'public, max-age=3600, s-maxage=86400'
    }
  });
};
