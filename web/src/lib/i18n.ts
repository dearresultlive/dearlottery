import { useState, useEffect } from 'react';

export type SupportedLang = 'bn' | 'en';

export const translations = {
  nav_today: {
    bn: 'আজকের ড্র',
    en: "Today's Results"
  },
  nav_old: {
    bn: 'পুরনো রেজাল্ট',
    en: 'Old Results'
  },
  nav_checker: {
    bn: 'টিকিট চেক',
    en: 'Check Ticket'
  },
  nav_analytics: {
    bn: 'হট নম্বর',
    en: 'Hot Numbers'
  },
  brand_tagline: {
    bn: 'লটারি সংবাদ • লাইভ রেজাল্ট পোর্টাল',
    en: 'Lottery Sambad • Official Results Portal'
  },
  slot_1pm: {
    bn: 'দুপুর ১:০০',
    en: '1:00 PM Morning'
  },
  slot_6pm: {
    bn: 'সন্ধ্যা ৬:০০',
    en: '6:00 PM Day'
  },
  slot_8pm: {
    bn: 'রাত ৮:০০',
    en: '8:00 PM Night'
  },
  status_result_out: {
    bn: 'রেজাল্ট আউট',
    en: 'RESULT OUT'
  },
  status_publishing: {
    bn: 'শিট আপলোড হচ্ছে...',
    en: 'PUBLISHING...'
  },
  status_upcoming: {
    bn: 'আসন্ন ড্র',
    en: 'UPCOMING'
  },
  first_prize_title: {
    bn: '১ম পুরস্কার: ₹১,০০,০০,০০০ (১ কোটি)',
    en: '1st Prize: ₹1,00,00,000 (1 Crore)'
  },
  second_prize_title: {
    bn: '২য় পুরস্কার: ₹১০,০০০ (১০ জন বিজয়ী)',
    en: '2nd Prize: ₹10,000 (10 Winners)'
  },
  third_prize_title: {
    bn: '৩য় পুরস্কার: ₹৫০০ (১০ জন বিজয়ী)',
    en: '3rd Prize: ₹500 (10 Winners)'
  },
  fourth_prize_title: {
    bn: '৪র্থ পুরস্কার: ₹২৫০ (১০ জন বিজয়ী)',
    en: '4th Prize: ₹250 (10 Winners)'
  },
  fifth_prize_title: {
    bn: '৫ম পুরস্কার: ₹১২০ (১০০ জন বিজয়ী)',
    en: '5th Prize: ₹120 (100 Winners)'
  },
  consolation_title: {
    bn: 'সান্ত্বনা পুরস্কার: ₹১,০০০',
    en: 'Consolation Prize: ₹1,00,0'
  },
  consolation_desc: {
    bn: '১ম পুরস্কারের ৫ সংখ্যার সাথে মেলা অন্যান্য সমস্ত সিরিজের টিকিট ₹১,০০০ টাকা সান্ত্বনা পুরস্কার পাবে।',
    en: 'Awarded to all other series matching the 5 digits of the 1st prize winning ticket.'
  },
  gazette_sheet_title: {
    bn: 'অফিসিয়াল সরকার অনুমোদিত গেজেট শিট',
    en: 'Official Government Gazette Sheet'
  },
  gazette_sheet_sub: {
    bn: 'নাগাল্যান্ড ও সিকিম স্টেট লটারি স্বাক্ষরিত ফলাফল শিট',
    en: 'Nagaland & Sikkim State Lotteries verified signed publication sheet.'
  },
  btn_open_sheet: {
    bn: '🔍 জুম শিট (বড় করে দেখুন)',
    en: '🔍 Zoom Gazette Sheet'
  },
  btn_download_pdf: {
    bn: '📥 পিডিএফ ডাউনলোড',
    en: '📥 Download PDF'
  },
  btn_share_whatsapp: {
    bn: '📲 হোয়াটসঅ্যাপে পাঠান',
    en: '📲 Share on WhatsApp'
  },
  btn_print: {
    bn: '🖨️ প্রিন্ট করুন',
    en: '🖨️ Print Sheet'
  },
  ticket_check_hero: {
    bn: 'আপনার লটারি টিকিট নম্বর মেলান',
    en: 'Check Your Dear Lottery Ticket'
  },
  ticket_check_sub: {
    bn: 'পুরো টিকিট নম্বর (যেমন: 84D 19283) অথবা শেষ ৪ সংখ্যা (যেমন: 4829) লিখুন।',
    en: 'Enter full ticket number (e.g. 84D 19283) or last 4-5 digits (e.g. 4829).'
  },
  ticket_input_ph: {
    bn: 'যেমন: 84D 19283 অথবা 4829',
    en: 'e.g. 84D 19283 or 4829'
  },
  btn_check_ticket: {
    bn: 'টিকিট চেক করুন',
    en: 'Check Ticket'
  },
  searching_txt: {
    bn: 'খোঁজা হচ্ছে...',
    en: 'Searching...'
  },
  claim_rules_title: {
    bn: 'পুরস্কার নেওয়ার নিয়মাবলী:',
    en: 'Prize Claiming Rules:'
  },
  claim_rules_desc: {
    bn: '১০,০০০ টাকা পর্যন্ত পুরস্কার যেকোনো অনুমোদিত লটারি দোকানে টিকিট দেখিয়ে সঙ্গে সঙ্গে পাওয়া যায়। ১০,০০০ টাকার উপরের ও ১ম পুরস্কারের (₹১ কোটি) জন্য অক্ষত মূল টিকিট, প্যান কার্ড ও আধার কার্ড সহ রাজ্য লটারি অফিসে জমা দিতে হয়।',
    en: 'Prizes up to ₹10,000 can be claimed through registered lottery distributors. 1st prize must be submitted with original ticket and valid government ID to the Directorate of State Lotteries.'
  },
  yesterday_looking: {
    bn: 'গতকালকের রেজাল্ট খুঁজছেন?',
    en: "Looking for Yesterday's Result?"
  },
  yesterday_sub: {
    bn: 'আজকের ড্র এখনো শুরু হয়নি। নিচে গতকালকের সরকারি রেজাল্ট দেওয়া হলো:',
    en: "Today's draw has not occurred yet. Here is yesterday's declared official result:"
  },
  btn_yesterday_sheet: {
    bn: 'গতকালকের সম্পূর্ণ শিট ও সব প্রাইজ নম্বর দেখুন',
    en: 'View Yesterday Gazette Sheet & All Prizes'
  },
  btn_hide_sheet: {
    bn: 'লুকিয়ে রাখুন',
    en: 'Hide Details'
  },
  verified_certified: {
    bn: '✓ সরকারি অনুমোদিত রেজাল্ট',
    en: '✓ Official Certified Result'
  },
  congrats_won: {
    bn: '🎉 অভিনন্দন! আপনি পুরস্কার জিতেছেন',
    en: '🎉 Congratulations! You Won!'
  },
  no_match_found: {
    bn: '☘️ কোনো পুরস্কার মেলেনি',
    en: '☘️ No Winning Match Found'
  },
  better_luck: {
    bn: 'পরবর্তী ড্র-এর জন্য শুভকামনা রইলো!',
    en: 'Better luck in the next draw!'
  }
} as const;

export type TranslationKey = keyof typeof translations;

export function getLanguage(): SupportedLang {
  if (typeof window === 'undefined') return 'bn'; // Default to Bengali for target audience
  const stored = localStorage.getItem('dearlottery_lang');
  return stored === 'en' ? 'en' : 'bn';
}

export function setLanguage(lang: SupportedLang) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dearlottery_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.setAttribute('data-lang', lang);
  window.dispatchEvent(new CustomEvent('dearlottery:lang_change', { detail: lang }));
}

export function useLanguage() {
  const [lang, setLangState] = useState<SupportedLang>('bn');

  useEffect(() => {
    const current = getLanguage();
    setLangState(current);

    const handleLangChange = (e: any) => {
      if (e.detail === 'bn' || e.detail === 'en') {
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
    return item[lang] || item['bn'];
  };

  return { lang, setLang: changeLang, t };
}
