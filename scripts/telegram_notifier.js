#!/usr/bin/env node
/**
 * Automated Telegram Channel Broadcaster for Dear Lottery Results
 * Automatically sends instant, beautifully formatted draw results and interactive
 * ticket checking buttons to @dearresultlive channel.
 * Designed with balanced bilingual (English + Bengali) copy for nationwide audience
 * (West Bengal, Patna/Bihar, Northeast & all regions).
 */

const SENT_NOTIFIER_KEYS = new Set();

export async function sendTelegramResultPost({ dateStr, slot, prizeData }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8838063468:AAEJ3qJsSDsf1WB-kJA35Iy3rw0lwKhBPYg';
  const chatId = process.env.TELEGRAM_CHAT_ID || '@dearresultlive';

  if (!botToken) {
    console.log('[Telegram] ℹ️ TELEGRAM_BOT_TOKEN not configured. Skipping Telegram broadcast.');
    return false;
  }

  const firstNum = prizeData?.first_prize?.number || '';
  const notifierDedupKey = `${dateStr}-${slot}-${firstNum}`;
  if (firstNum && SENT_NOTIFIER_KEYS.has(notifierDedupKey)) {
    console.log(`[Telegram] ℹ️ Duplicate broadcast suppressed by notifier memory lock: ${notifierDedupKey}`);
    return true;
  }
  if (firstNum) {
    SENT_NOTIFIER_KEYS.add(notifierDedupKey);
  }

  const slotMap = {
    '1PM': { en: '1:00 PM Morning', bn: 'দুপুর ১:০০ (মর্নিং)' },
    '6PM': { en: '6:00 PM Day', bn: 'সন্ধ্যা ৬:০০ (ডে)' },
    '8PM': { en: '8:00 PM Night', bn: 'রাত ৮:০০ (নাইট)' }
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

  // Formatted HTML message - Clear English for nationwide clarity (Patna/Bihar/All India) + authentic Bengali touch
  const messageText = `🎯 <b>Dear Lottery Sambad • Today's Draw Result</b>
📢 <i>লটারি সংবাদ আজকের লাইভ রেজাল্ট</i>
⏰ <b>Draw Slot:</b> ${slotInfo.en} • ${slotInfo.bn}
📅 <b>Date:</b> ${dateStr}

🏆 <b>1st Prize Winner • ১ম পুরস্কার (₹1 Crore / ১ কোটি টাকা):</b>
👉 <code>${firstPrizeFull}</code> 👈
${secondPrizes ? `\n🥈 <b>2nd Prize • ২য় পুরস্কার (₹9,000 / ₹৯,০০০):</b>\n<code>${secondPrizes}</code>\n` : ''}
🔍 <b>Check Ticket Online • ১ সেকেন্ডে টিকিট চেক করুন:</b>
👉 ${targetUrl}

📄 <b>Official Gazette PDF • সম্পূর্ণ রেজাল্ট শিট ডাউনলোড:</b>
👉 ${pdfUrl}

⚡ <i>Live Official Results from Nagaland & Sikkim State Lotteries</i>`;

  // One-tap direct WhatsApp Share link (pre-populates WhatsApp with clean WhatsApp markdown)
  const whatsappShareText = `🎯 *Dear Lottery Result Out!*
⏰ Slot: ${slotInfo.en} • ${slotInfo.bn}
📅 Date: ${dateStr}

🏆 *1st Prize Winner • ১ম পুরস্কার (₹1 Crore / ১ কোটি)*:
👉 *${firstPrizeFull}* 👈
${secondPrizes ? `\n🥈 *2nd Prize • ২য় পুরস্কার (₹9,000)*:\n${secondPrizes}\n` : ''}
🔍 *Check Ticket Online • ১ সেকেন্ডে টিকিট চেক*:
👉 ${targetUrl}

📄 *Official Gazette PDF • সম্পূর্ণ রেজাল্ট শিট*:
👉 ${pdfUrl}

⚡ Official Gazette Portal: https://dearresultlive.in`;

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
            text: '📲 Share to WhatsApp • শেয়ার করুন',
            url: whatsappShareUrl
          }
        ],
        [
          {
            text: '🌐 Visit dearresultlive.in',
            url: 'https://dearresultlive.in'
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
