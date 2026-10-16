import { useState, useEffect } from 'react';

export type SupportedLang = 'en' | 'bn' | 'hi';

export const translations = {
  nav_today: {
    en: "Today's Result",
    bn: 'আজকের রেজাল্ট',
    hi: 'आज का रिजल्ट'
  },
  nav_old: {
    en: 'Old Results',
    bn: 'পুরনো রেজাল্ট',
    hi: 'पुराने रिजल्ट'
  },
  nav_checker: {
    en: 'Check Ticket',
    bn: 'টিকিট মেলান',
    hi: 'टिकट चेक'
  },
  nav_analytics: {
    en: 'Hot Numbers',
    bn: 'হট নম্বর',
    hi: 'हॉट नंबर्स'
  },
  brand_tagline: {
    en: 'Lottery Sambad • Live Result Portal',
    bn: 'লটারি সংবাদ • আজকের তাজা রেজাল্ট',
    hi: 'लॉटरी संबाद • आज का ताजा रिजल्ट'
  },
  slot_1pm: {
    en: '1:00 PM Morning',
    bn: 'দুপুর ১:০০',
    hi: 'दोपहर 1:00'
  },
  slot_6pm: {
    en: '6:00 PM Day',
    bn: 'সন্ধ্যা ৬:০০',
    hi: 'शाम 6:00'
  },
  slot_8pm: {
    en: '8:00 PM Night',
    bn: 'রাত ৮:০০',
    hi: 'रात 8:00'
  },
  status_result_out: {
    en: 'RESULT OUT',
    bn: 'রেজাল্ট প্রকাশিত',
    hi: 'रिजल्ट जारी'
  },
  status_publishing: {
    en: 'PUBLISHING...',
    bn: 'শিট আপলোড হচ্ছে...',
    hi: 'शीट अपलोड हो रही है...'
  },
  status_upcoming: {
    en: 'UPCOMING',
    bn: 'আসন্ন ড্র',
    hi: 'आगामी ड्रा'
  },
  first_prize_title: {
    en: '1st Prize: ₹1,00,00,000 (1 Crore Winner)',
    bn: '১ম পুরস্কার: ₹১,০০,০০,০০০ (১ কোটি)',
    hi: 'प्रथम पुरस्कार: ₹1,00,00,000 (1 करोड़)'
  },
  second_prize_title: {
    en: '2nd Prize: ₹10,000 (10 Winners)',
    bn: '২য় পুরস্কার: ₹১০,০০০ (১০ জন বিজয়ী)',
    hi: 'द्वितीय पुरस्कार: ₹10,000 (10 विजेता)'
  },
  third_prize_title: {
    en: '3rd Prize: ₹500 (10 Winners)',
    bn: '৩য় পুরস্কার: ₹৫০০ (১০ জন বিজয়ী)',
    hi: 'तृतीय पुरस्कार: ₹500 (10 विजेता)'
  },
  fourth_prize_title: {
    en: '4th Prize: ₹250 (10 Winners)',
    bn: '৪র্থ পুরস্কার: ₹২৫০ (১০ জন বিজয়ী)',
    hi: 'चतुर्थ पुरस्कार: ₹250 (10 विजेता)'
  },
  fifth_prize_title: {
    en: '5th Prize: ₹120 (100 Winners)',
    bn: '৫ম পুরস্কার: ₹১২০ (১০০ জন বিজয়ী)',
    hi: '5वां पुरस्कार: ₹120 (100 विजेता)'
  },
  consolation_title: {
    en: 'Consolation Prize: ₹1,000',
    bn: 'সান্ত্বনা পুরস্কার: ₹১,০০০',
    hi: 'सांत्वना पुरस्कार: ₹1,000'
  },
  consolation_desc: {
    en: 'Awarded to all remaining series matching the 5 digits of the 1st prize winning ticket.',
    bn: '১ম পুরস্কারের ৫ সংখ্যার সাথে মেলা অন্যান্য সমস্ত সিরিজের টিকিট ₹১,০০০ টাকা সান্ত্বনা পুরস্কার পাবে।',
    hi: 'प्रथम पुरस्कार के 5 अंकों से मिलने वाले अन्य सभी सीरीज के टिकट को ₹1,000 सांत्वना पुरस्कार मिलेगा।'
  },
  gazette_sheet_title: {
    en: 'Official Gazette Result Sheet',
    bn: 'অফিসিয়াল গেজেট রেজাল্ট শিট',
    hi: 'ऑफिशियल गजट रिजल्ट शीट'
  },
  gazette_sheet_sub: {
    en: 'Nagaland & Sikkim State Lotteries verified signed publication sheet.',
    bn: 'নাগাল্যান্ড ও সিকিম রাজ্য লটারি স্বাক্ষরিত ফলাফল শিট',
    hi: 'नागालैंड और सिक्किम स्टेट लॉटरी अधिकृत सत्यापित परिणाम शीट'
  },
  btn_open_sheet: {
    en: '🔍 Full Screen Zoom',
    bn: '🔍 ফুল স্ক্রিন জুম',
    hi: '🔍 फुल स्क्रीन ज़ूम'
  },
  btn_download_pdf: {
    en: '📥 Download PDF',
    bn: '📥 পিডিএফ ডাউনলোড',
    hi: '📥 पीडीएफ डाउनलोड'
  },
  btn_share_whatsapp: {
    en: 'Share Result on WhatsApp',
    bn: 'হোয়াটসঅ্যাপে রেজাল্ট শেয়ার করুন',
    hi: 'व्हाट्सएप पर रिजल्ट शेयर करें'
  },
  btn_print: {
    en: 'Print Sheet',
    bn: 'প্রিন্ট শিট',
    hi: 'प्रिंट शीट'
  },
  ticket_check_hero: {
    en: 'Check Your Ticket Number Online',
    bn: 'আপনার লটারি টিকিট নম্বর মেলান',
    hi: 'अपना लॉटरी टिकट नंबर चेक करें'
  },
  ticket_check_sub: {
    en: 'Enter last 4 digits (e.g. 4829) or full ticket number (e.g. 95E 75331).',
    bn: 'শেষ ৪টি সংখ্যা (যেমন: 4829) অথবা পুরো টিকিট নম্বর (যেমন: 95E 75331) লিখুন।',
    hi: 'अंतिम 4 अंक (जैसे: 4829) या पूरा टिकट नंबर (जैसे: 95E 75331) दर्ज करें।'
  },
  ticket_input_ph: {
    en: 'Enter ticket number (e.g. 75331 or last 4 digits)...',
    bn: 'আপনার টিকিট নম্বর লিখুন (যেমন: 75331 বা শেষ ৪ সংখ্যা)...',
    hi: 'अपना टिकट नंबर दर्ज करें (जैसे: 75331 या अंतिम 4 अंक)...'
  },
  btn_check_ticket: {
    en: '⚡ 1-Second Check',
    bn: '⚡ ১-সেকেন্ডে মেলান',
    hi: '⚡ 1-सेकंड में चेक करें'
  },
  searching_txt: {
    en: 'Checking database...',
    bn: 'খোঁজা হচ্ছে...',
    hi: 'जांच हो रही है...'
  },
  claim_rules_title: {
    en: 'Prize Claiming Rules:',
    bn: 'পুরস্কার নেওয়ার নিয়মাবলী:',
    hi: 'पुरस्कार दावा करने के नियम:'
  },
  claim_rules_desc: {
    en: 'Prizes up to ₹10,000 can be collected in cash from any authorized lottery store. For prizes above ₹10,000 and 1st prize (₹1 Crore), intact ticket along with PAN & Aadhaar must be submitted to the Directorate.',
    bn: '১০,০০০ টাকা পর্যন্ত পুরস্কার যেকোনো অনুমোদিত লটারির দোকানে টিকিট দেখালেই নগদ পাওয়া যায়। ১০,০০০ টাকার উপরের ও ১ম পুরস্কারের (₹১ কোটি) জন্য অক্ষত মূল টিকিট, প্যান কার্ড ও আধার কার্ড সহ ডিরেক্টরেট অফিসে জমা দিতে হয়।',
    hi: '₹10,000 तक का पुरस्कार किसी भी अधिकृत लॉटरी विक्रेता से नकद प्राप्त किया जा सकता है। ₹10,000 से अधिक और प्रथम पुरस्कार (₹1 करोड़) के लिए मूल टिकट, पैन कार्ड और आधार कार्ड के साथ निदेशालय में जमा करना होगा।'
  },
  yesterday_looking: {
    en: "Looking for Yesterday's Result?",
    bn: 'গতকালকের রেজাল্ট খুঁজছেন?',
    hi: 'कल का रिजल्ट ढूंढ रहे हैं?'
  },
  yesterday_sub: {
    en: "Today's draw is scheduled. Here is yesterday's official winning result:",
    bn: 'আজকের ড্র এখনো বাকি। নিচে গতকালকের সরকারি রেজাল্ট দেওয়া হলো:',
    hi: 'आज का ड्रा अभी बाकी है। नीचे कल का आधिकारिक परिणाम दिया गया है:'
  },
  btn_yesterday_sheet: {
    en: "View Yesterday's Sheet & All Prizes",
    bn: 'গতকালকের সম্পূর্ণ শিট ও সব প্রাইজ নম্বর দেখুন',
    hi: 'कल की पूरी शीट और सभी प्राइज नंबर देखें'
  },
  btn_hide_sheet: {
    en: 'Hide Details',
    bn: 'লুকিয়ে রাখুন',
    hi: 'छुपाएं'
  },
  verified_certified: {
    en: '✓ Official Verified Result',
    bn: '✓ সরকারি অনুমোদিত রেজাল্ট',
    hi: '✓ आधिकारिक सत्यापित परिणाम'
  },
  congrats_won: {
    en: '🎉 Congratulations! You Won!',
    bn: '🎉 অভিনন্দন! আপনি পুরস্কার জিতেছেন',
    hi: '🎉 बधाई हो! आप जीत गए हैं!'
  },
  no_match_found: {
    en: '☘️ No Winning Match Found',
    bn: '☘️ কোনো পুরস্কার মেলেনি',
    hi: '☘️ कोई पुरस्कार मैच नहीं मिला'
  },
  better_luck: {
    en: 'Better luck in the next draw!',
    bn: 'পরবর্তী ড্র-এর জন্য শুভকামনা রইলো!',
    hi: 'अगले ड्रा के लिए शुभकामनाएं!'
  }
} as const;

export type TranslationKey = keyof typeof translations;

export function getLanguage(): SupportedLang {
  if (typeof window === 'undefined') return 'en'; // Default to English as requested
  try {
    const stored = localStorage.getItem('dearlottery_lang');
    if (stored === 'bn' || stored === 'hi' || stored === 'en') {
      return stored;
    }
  } catch (e) {}
  return 'en';
}

export function setLanguage(lang: SupportedLang) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('dearlottery_lang', lang);
  } catch (e) {}
  document.documentElement.setAttribute('data-lang', lang);
  window.dispatchEvent(new CustomEvent('dearlottery:lang_change', { detail: lang }));
}

export function useLanguage() {
  const [lang, setLangState] = useState<SupportedLang>('en'); // Default English

  useEffect(() => {
    const current = getLanguage();
    setLangState(current);

    const handleLangChange = (e: any) => {
      if (e.detail === 'bn' || e.detail === 'en' || e.detail === 'hi') {
        setLangState(e.detail);
      }
    };

    window.addEventListener('dearlottery:lang_change', handleLangChange);
    return () => window.removeEventListener('dearlottery:lang_change', handleLangChange);
  }, []);

  const changeLang = (newLang: SupportedLang) => {
    setLanguage(newLang);
    setLangState(newLang);
  };

  const t = (key: TranslationKey): string => {
    const item = translations[key];
    if (!item) return key;
    return item[lang] || item['en'] || item['bn'] || key;
  };

  return { lang, setLang: changeLang, t };
}
