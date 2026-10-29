/**
 * Automated Telegram Channel Broadcaster for Dear Lottery Results
 * Sends instant, beautifully formatted draw results and interactive ticket checking buttons
 * to the official @dearresultlive channel directly from Cloudflare Workers edge.
 * Balanced bilingual (English + Bengali) copy for nationwide audience (Bengal, Patna/Bihar, Northeast & all regions).
 */

export interface TelegramAlertPayload {
  dateStr: string;
  slot: '1PM' | '6PM' | '8PM';
  series: string;
  number: string;
  drawName: string;
  drawNumber?: string;
  imageUrl?: string;
  pdfUrl?: string;
}

export async function sendTelegramAlert(
  env: { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string; FRONTEND_URL?: string },
  payload: TelegramAlertPayload
): Promise<boolean> {
  const botToken = env.TELEGRAM_BOT_TOKEN || '8838063468:AAEJ3qJsSDsf1WB-kJA35Iy3rw0lwKhBPYg';
  const chatId = env.TELEGRAM_CHAT_ID || '@dearresultlive';
  const frontend = env.FRONTEND_URL || 'https://dearresultlive.in';

  if (!botToken || !chatId) {
    console.log('[Telegram] Missing token or chatId, skipping broadcast.');
    return false;
  }

  const slotMap = {
    '1PM': { en: '1:00 PM Morning', bn: 'দুপুর ১:০০ (মর্নিং)' },
    '6PM': { en: '6:00 PM Day', bn: 'সন্ধ্যা ৬:০০ (ডে)' },
    '8PM': { en: '8:00 PM Night', bn: 'রাত ৮:০০ (নাইট)' }
  };

  const slotInfo = slotMap[payload.slot] || { en: payload.slot, bn: payload.slot };
  const firstPrizeFull = payload.series ? `${payload.series} ${payload.number}` : payload.number;
  const targetUrl = `${frontend}/results/${payload.dateStr}/${payload.slot.toLowerCase()}`;
  const pdfUrl = `${frontend}/pdf/${payload.dateStr}/${payload.slot.toLowerCase()}.pdf`;

  const messageText = `🎯 <b>Dear Lottery Sambad • Today's Draw Result</b>
📢 <i>লটারি সংবাদ আজকের লাইভ রেজাল্ট</i>
⏰ <b>Draw Slot:</b> ${slotInfo.en} • ${slotInfo.bn}
📅 <b>Date:</b> ${payload.dateStr}
${payload.drawName ? `🏷️ <b>Draw Name:</b> ${payload.drawName}\n` : ''}
🏆 <b>1st Prize Winner • ১ম পুরস্কার (₹1 Crore / ১ কোটি টাকা):</b>
👉 <code>${firstPrizeFull}</code> 👈

🔍 <b>Check Ticket Online • ১ সেকেন্ডে টিকিট চেক করুন:</b>
👉 ${targetUrl}

📄 <b>Official Gazette PDF • সম্পূর্ণ রেজাল্ট শিট ডাউনলোড:</b>
👉 ${pdfUrl}

⚡ <i>Live Official Results from Nagaland & Sikkim State Lotteries</i>`;

  const body = {
    chat_id: chatId,
    text: messageText,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🔍 Check Ticket Online • টিকিট চেক করুন',
            url: targetUrl
          }
        ],
        [
          {
            text: '📄 Download Official PDF • গেজেট ডাউনলোড',
            url: pdfUrl
          }
        ],
        [
          {
            text: '🌐 Visit dearresultlive.in',
            url: frontend
          }
        ]
      ]
    }
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = (await res.json()) as any;
    if (json?.ok) {
      console.log(`[Telegram] ✅ Successfully broadcasted ${payload.slot} (${payload.dateStr}) to ${chatId}! Message ID: ${json.result.message_id}`);
      return true;
    } else {
      console.error(`[Telegram] ⚠️ Telegram API error:`, json?.description || json);
      return false;
    }
  } catch (e: any) {
    console.error('[Telegram] Broadcast failed:', e?.message || e);
    return false;
  }
}
