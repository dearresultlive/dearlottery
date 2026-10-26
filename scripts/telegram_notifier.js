#!/usr/bin/env node
/**
 * Automated Telegram Channel Broadcaster for Dear Lottery Results
 * Automatically sends instant, beautifully formatted draw results and interactive
 * ticket checking buttons to @dearresultlive channel.
 */

export async function sendTelegramResultPost({ dateStr, slot, prizeData }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8838063468:AAEJ3qJsSDsf1WB-kJA35Iy3rw0lwKhBPYg';
  const chatId = process.env.TELEGRAM_CHAT_ID || '@dearresultlive';

  if (!botToken) {
    console.log('[Telegram] ℹ️ TELEGRAM_BOT_TOKEN not configured. Skipping Telegram broadcast.');
    return false;
  }

  const slotMap = {
    '1PM': { en: '1:00 PM Morning', bn: '১:০০ দুপুর (Morning)' },
    '6PM': { en: '6:00 PM Day', bn: '৬:০০ সন্ধ্যা (Day)' },
    '8PM': { en: '8:00 PM Night', bn: '৮:০০ রাত (Night)' }
  };

  const slotInfo = slotMap[slot] || { en: slot, bn: slot };

  // First prize extraction
  const firstPrizeSeries = prizeData?.first_prize?.series || '';
  const firstPrizeNum = prizeData?.first_prize?.number || '';
  const firstPrizeFull = firstPrizeSeries ? `${firstPrizeSeries} ${firstPrizeNum}` : (firstPrizeNum || 'Published');

  // Second prize extraction (top 5 numbers if available)
  const secondPrizes = Array.isArray(prizeData?.second_prize)
    ? prizeData.second_prize.slice(0, 5).join(', ')
    : '';

  const pdfUrl = `https://dearresultlive.in/pdf/${dateStr}/${slot.toLowerCase()}.pdf`;
  const targetUrl = `https://dearresultlive.in/results/${dateStr}/${slot.toLowerCase()}`;

  // Formatted HTML message - Links are embedded directly in the message text
  // so long-pressing "Copy" in Telegram copies 100% of the content with all clickable links!
  const messageText = `🎯 <b>Dear Lottery Sambad Result Out!</b>
⏰ <b>Draw Slot:</b> ${slotInfo.en} (${slotInfo.bn})
📅 <b>Date:</b> ${dateStr}

🏆 <b>১ম পুরস্কার (১ কোটি টাকা):</b>
👉 <code>${firstPrizeFull}</code> 👈
${secondPrizes ? `\n🥈 <b>২য় পুরস্কার (₹৯,০০০):</b>\n<code>${secondPrizes}</code>\n` : ''}
🔍 <b>১ সেকেন্ডে টিকিট চেক করুন ও সম্পূর্ণ রেজাল্ট দেখুন:</b>
👉 ${targetUrl}

📄 <b>অফিসিয়াল গেজেট PDF ডাউনলোড:</b>
👉 ${pdfUrl}`;

  // One-tap direct WhatsApp Share link (pre-populates WhatsApp with clean WhatsApp markdown)
  const whatsappShareText = `🎯 *Dear Lottery Result Out! (${slotInfo.en})*
📅 Date: ${dateStr}

🏆 *১ম পুরস্কার (₹1 Crore Winner)*:
👉 *${firstPrizeFull}* 👈
${secondPrizes ? `\n🥈 *২য় পুরস্কার (₹9,000)*:\n${secondPrizes}\n` : ''}
🔍 *১ সেকেন্ডে টিকিট চেক ও সম্পূর্ণ রেজাল্ট শিট*:
👉 ${targetUrl}

📄 *অফিসিয়াল গেজেট PDF*:
👉 ${pdfUrl}`;

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;

  const payload = {
    chat_id: chatId,
    text: messageText,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '📲 Share to WhatsApp Channel',
            url: whatsappShareUrl
          }
        ],
        [
          {
            text: '🔍 ১ সেকেন্ডে টিকিট চেক করুন (Check Ticket)',
            url: targetUrl
          }
        ],
        [
          {
            text: '📄 অফিসিয়াল গেজেট PDF ডাউনলোড',
            url: pdfUrl
          }
        ]
      ]
    }
  };

  try {
    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const result = await res.json();
    if (result.ok) {
      console.log(`[Telegram] ✅ Successfully broadcasted ${slot} (${dateStr}) to ${chatId}! Message ID: ${result.result.message_id}`);
      return true;
    } else {
      console.error(`[Telegram] ⚠️ Telegram API error:`, result.description || result);
      return false;
    }
  } catch (err) {
    console.error(`[Telegram] ⚠️ Failed to send Telegram broadcast:`, err.message);
    return false;
  }
}
