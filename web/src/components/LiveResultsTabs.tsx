import React, { useState, useEffect } from 'react';
import {
  formatINR,
  getISTNow,
  getISTDateString,
  getSlotStatus,
  getSlotCountdown
} from '../lib/lottery-utils';
import { useLanguage } from '../lib/i18n';

interface PrizeData {
  first_prize?: { series: string; number: string };
  consolation_prize_amount?: number;
  second_prize?: string[];
  third_prize?: string[];
  fourth_prize?: string[];
  fifth_prize?: string[];
}

interface DrawRecord {
  id: string;
  draw_date: string;
  draw_time: string;
  draw_name: string;
  draw_number?: string;
  status?: string;
  source_url?: string;
  pdf_r2_url?: string;
  image_r2_url?: string;
  parsed_data?: {
    status?: string;
    prizes?: PrizeData;
    source_url?: string;
    pdf_r2_url?: string;
    image_r2_url?: string;
  };
  prizes?: PrizeData;
}

interface LiveResultsTabsProps {
  draws?: DrawRecord[];
  yesterdayDraws?: DrawRecord[];
  todayDateStr?: string;
}

export default function LiveResultsTabs({
  draws = [],
  yesterdayDraws = [],
  todayDateStr
}: LiveResultsTabsProps) {
  const slots = [
    { key: '1PM' as const, time: '1:00 PM', labelEn: 'Morning', labelBn: 'দুপুর ১:০০', labelHi: 'दोपहर 1:00', icon: '☀️' },
    { key: '6PM' as const, time: '6:00 PM', labelEn: 'Day', labelBn: 'সন্ধ্যা ৬:০০', labelHi: 'शाम 6:00', icon: '🌅' },
    { key: '8PM' as const, time: '8:00 PM', labelEn: 'Night', labelBn: 'রাত ৮:০০', labelHi: 'रात 8:00', icon: '🌙' }
  ];

  const todayStr = todayDateStr || getISTDateString();
  const { lang, t } = useLanguage();
  const [activeSlot, setActiveSlot] = useState<'1PM' | '6PM' | '8PM'>('1PM');
  const [drawsList, setDrawsList] = useState<DrawRecord[]>(draws);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [showTextTables, setShowTextTables] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [slotCountdown, setSlotCountdown] = useState(getSlotCountdown('1PM'));

  useEffect(() => {
    setDrawsList(draws);
  }, [draws]);

  // Update countdown every second for active upcoming slot
  useEffect(() => {
    const update = () => setSlotCountdown(getSlotCountdown(activeSlot));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [activeSlot]);

  // Listen for auto-polling zero-refresh event from DrawCountdown
  useEffect(() => {
    const handleNewResult = (e: any) => {
      if (e.detail) {
        const newDraw = e.detail;
        setDrawsList(prev => {
          const index = prev.findIndex(d => d.id === newDraw.id);
          if (index >= 0) {
            const nextList = [...prev];
            nextList[index] = newDraw;
            return nextList;
          }
          return [newDraw, ...prev];
        });

        if (newDraw.draw_time?.includes('6') || newDraw.id?.includes('6PM')) {
          setActiveSlot('6PM');
        } else if (newDraw.draw_time?.includes('8') || newDraw.id?.includes('8PM')) {
          setActiveSlot('8PM');
        } else {
          setActiveSlot('1PM');
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('dearlottery:new_result', handleNewResult);
      return () => window.removeEventListener('dearlottery:new_result', handleNewResult);
    }
  }, []);

  // Auto-select latest published slot on mount based on current IST hour
  useEffect(() => {
    const istNow = getISTNow();
    const hour = istNow.getHours();
    if (hour >= 20) {
      setActiveSlot('8PM');
    } else if (hour >= 18) {
      setActiveSlot('6PM');
    } else {
      setActiveSlot('1PM');
    }
  }, []);

  // Active draw for TODAY (must match date and have declared prizes)
  const currentDrawForToday = drawsList.find(d => 
    (d.draw_time?.includes(activeSlot.replace('PM', '')) || d.id?.includes(activeSlot)) &&
    d.draw_date === todayStr
  );

  const todayPrizes: PrizeData = currentDrawForToday?.parsed_data?.prizes || currentDrawForToday?.prizes || {};
  const todayHasPrizes = Boolean(
    todayPrizes.first_prize?.number &&
    currentDrawForToday?.status !== 'UPCOMING' &&
    currentDrawForToday?.status !== 'DRAWING'
  );

  const activeStatus = getSlotStatus(todayStr, activeSlot, todayHasPrizes);

  // Fallback: Yesterday's draw for this slot
  const yesterdayDraw = (yesterdayDraws || []).find(d => 
    d.draw_time?.includes(activeSlot.replace('PM', '')) || d.id?.includes(activeSlot)
  ) || (yesterdayDraws || [])[0] || drawsList.find(d => d.draw_date < todayStr);

  const yesterdayFirstPrize = yesterdayDraw?.parsed_data?.prizes?.first_prize || yesterdayDraw?.prizes?.first_prize;

  const yesterdayDateStr = yesterdayDraw?.draw_date || (() => {
    const y = new Date(getISTNow());
    y.setDate(y.getDate() - 1);
    return getISTDateString(y);
  })();

  // If results are out today, use today's declared data
  const currentDraw = currentDrawForToday || drawsList[0] || yesterdayDraw;
  const declaredPrizes: PrizeData = todayHasPrizes ? (currentDraw?.parsed_data?.prizes || currentDraw?.prizes || {}) : {};
  const firstPrize = declaredPrizes.first_prize || { series: '', number: '' };
  const secondPrizes = declaredPrizes.second_prize || [];
  const thirdPrizes = declaredPrizes.third_prize || [];
  const fourthPrizes = declaredPrizes.fourth_prize || [];
  const fifthPrizes = declaredPrizes.fifth_prize || [];

  const pdfUrl = `/pdf/${todayStr}/${activeSlot.toLowerCase()}.pdf`;
  const sheetSvgUrl = `/api/gazette-sheet.svg?date=${todayStr}&slot=${activeSlot.toLowerCase()}`;
  const activeSheetUrl = todayHasPrizes
    ? (currentDrawForToday?.image_r2_url || `/results/${todayStr}/${activeSlot.toLowerCase()}.jpg`)
    : sheetSvgUrl;

  const whatsappShareText = `🎯 *Dear Lottery Result Today (${currentDraw?.draw_time || activeSlot})*\n📅 তারিখ: ${todayStr}\n\n🏆 *১ম পুরস্কার (₹1 Crore Winner)*: *${firstPrize.series} ${firstPrize.number}*\n\n👉 সম্পূর্ণ অফিসিয়াল রেজাল্ট শিট ও সব প্রাইজ নম্বর দেখুন:\nhttps://dearresultlive.in/results/${todayStr}/${activeSlot.toLowerCase()}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;

  const openImageLightbox = (url: string) => {
    setSelectedImageUrl(url);
    setZoomScale(1);
    setShowImageModal(true);
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.3, 1));
  const handleResetZoom = () => setZoomScale(1);

  const currentSlotInfo = slots.find(s => s.key === activeSlot) || slots[0];

  return (
    <div className="space-y-3.5 sm:space-y-4 max-w-[557px] mx-auto">
      
      {/* 1. Lottery Sambad Style Big Slot Buttons */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {slots.map(slot => {
          const isActive = activeSlot === slot.key;
          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => setActiveSlot(slot.key)}
              className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-[#138808] text-white font-black shadow-md ring-2 ring-[#138808]/40 scale-[1.01]'
                  : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800'
              }`}
            >
              <span className="text-base sm:text-lg font-black tracking-tight">
                {slot.time}
              </span>
              <span className={`text-[10px] sm:text-xs font-bold mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                {lang === 'bn' ? slot.labelBn : lang === 'hi' ? slot.labelHi : slot.labelEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Lottery Sambad Winning Result Card (.rcard) */}
      {activeStatus === 'RESULT_OUT' ? (
        <div
          onClick={() => openImageLightbox(activeSheetUrl)}
          className={`cursor-pointer relative overflow-hidden rounded-2xl border p-4 sm:p-5 text-center transition-all hover:shadow-md ${
            activeSlot === '1PM'
              ? 'bg-[#e9f5db] border-emerald-300'
              : activeSlot === '6PM'
              ? 'bg-[#e3eefb] border-blue-300'
              : 'bg-[#fbe8e8] border-red-300'
          }`}
        >
          {/* Vertical Side Band */}
          <div
            className={`absolute top-0 right-0 bottom-0 w-8 sm:w-10 flex items-center justify-center overflow-hidden ${
              activeSlot === '1PM'
                ? 'bg-[#16a34a] text-[#ffdd00]'
                : activeSlot === '6PM'
                ? 'bg-[#f5c518] text-[#dc2626]'
                : 'bg-[#dc2626] text-[#ffdd00]'
            }`}
          >
            <span className="font-black text-xs sm:text-sm tracking-wider uppercase -rotate-90 whitespace-nowrap">
              DEAR {activeSlot.replace('PM', ' PM')}
            </span>
          </div>

          <div className="pr-8 sm:pr-10">
            {/* Top Date Header */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="bg-[#e93323] text-white font-extrabold text-xs px-2.5 py-0.5 rounded-md shadow-2xs">
                {todayStr.split('-').reverse().join('/')}
              </span>
              <span className="text-xs text-slate-600 font-bold">
                {currentDraw.draw_name} • #{currentDraw.draw_number || '74'}
              </span>
            </div>

            {/* Massive 1st Prize Number */}
            <div className="py-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-0.5">
                {lang === 'bn' ? '১ম পুরস্কার • 1st Prize ₹1 Crore Winner' : lang === 'hi' ? 'प्रथम पुरस्कार • 1st Prize ₹1 Crore Winner' : '1st Prize • ₹1 Crore Winner'}
              </span>
              <div className={`font-mono font-black text-4xl sm:text-6xl tracking-widest ${
                activeSlot === '1PM' ? 'text-[#2c65c5]' : activeSlot === '6PM' ? 'text-[#dc2626]' : 'text-[#32733b]'
              }`}>
                {firstPrize.series} {firstPrize.number}
              </div>
            </div>

            {/* Consolation info */}
            <div className="text-[11px] font-bold text-slate-500">
              {lang === 'bn'
                ? `সান্ত্বনা পুরস্কার: ₹১,০০০ • ${firstPrize.number} অন্য সব সিরিজ`
                : lang === 'hi'
                ? `सांत्वना पुरस्कार: ₹1,000 • ${firstPrize.number} अन्य सभी सीरीज`
                : `Consolation Prize: ₹1,000 • ${firstPrize.number} Remaining Series`}
            </div>

            {/* Tap Hint */}
            <div className="mt-2 text-xs font-black text-blue-700 hover:underline inline-flex items-center gap-1">
              <span>
                {lang === 'bn'
                  ? '🔍 অফিসিয়াল গেজেট শিট বড় করে দেখতে ট্যাপ করুন'
                  : lang === 'hi'
                  ? '🔍 ऑफिशियल गजट शीट बड़ा करके देखने के लिए टैप करें'
                  : '🔍 Tap to zoom official gazette sheet'}
              </span>
            </div>
          </div>
        </div>
      ) : activeStatus === 'DRAWING' ? (
        <div className="bg-white border-2 border-red-300 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <div className="inline-flex items-center gap-2 bg-red-100 border border-red-300 text-red-800 px-3 py-1 rounded-full text-xs font-black animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            {lang === 'bn' ? 'ড্র চলছে • DRAW IN PROGRESS' : lang === 'hi' ? 'ड्रा प्रगति पर है • DRAW IN PROGRESS' : 'DRAW IN PROGRESS'}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">
            {lang === 'bn' ? `${currentSlotInfo.time} রেজাল্ট শিট আপলোড হচ্ছে` : lang === 'hi' ? `${currentSlotInfo.time} रिजल्ट शीट अपलोड हो रही है` : `${currentSlotInfo.time} Result Sheet Uploading`}
          </h3>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? 'সরকারি ডিরেক্টরেট শিট স্ক্যান সম্পন্ন হচ্ছে। কয়েক সেকেন্ডের মধ্যে নম্বর প্রদর্শিত হবে।'
              : lang === 'hi'
              ? 'सरकारी निदेशालय शीट स्कैन हो रही है। कुछ ही पलों में नंबर दिखाई देंगे।'
              : 'Official Directorate result sheet scanning in progress. Winning numbers will appear momentarily.'}
          </p>
        </div>
      ) : (
        /* UPCOMING PENDING CARD */
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-slate-200 text-slate-800 text-xs font-black px-3 py-1 rounded-full">
            <span>⏰</span>
            <span>{lang === 'bn' ? `আসন্ন ড্র • UPCOMING DRAW (${currentSlotInfo.time})` : lang === 'hi' ? `आगामी ड्रा • UPCOMING DRAW (${currentSlotInfo.time})` : `UPCOMING DRAW (${currentSlotInfo.time})`}</span>
          </div>
          <div className="font-mono text-3xl font-black text-slate-900">
            {String(slotCountdown.hours).padStart(2, '0')}h : {String(slotCountdown.minutes).padStart(2, '0')}m : {String(slotCountdown.seconds).padStart(2, '0')}s
          </div>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? `আজকের ${currentSlotInfo.time} ড্র সম্পন্ন হওয়ার পর অফিশিয়াল গেজেট রেজাল্ট প্রকাশিত হবে।`
              : lang === 'hi'
              ? `आज के ${currentSlotInfo.time} ड्रा पूरा होने के बाद आधिकारिक गजट रिजल्ट घोषित होगा।`
              : `Official gazette result will be declared immediately following today's ${currentSlotInfo.time} draw.`}
          </p>
          {yesterdayFirstPrize?.number && (
            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs bg-white px-3 py-2 rounded-xl">
              <span className="font-medium text-slate-600">
                {lang === 'bn' ? 'গতকালকের বিজয়ী নম্বর:' : lang === 'hi' ? 'कल का विजयी नंबर:' : "Yesterday's Winning No:"}
              </span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {yesterdayFirstPrize.series} {yesterdayFirstPrize.number}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Control Row (PDF Download + Slot Selector + Date Selector) */}
      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm font-bold">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={`Dear_Lottery_${todayStr}_${activeSlot}.pdf`}
          className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl py-2 px-3 flex items-center justify-center gap-1 font-black uppercase shadow-2xs"
        >
          <span>📥 PDF</span>
        </a>

        <div className="relative">
          <select
            value={activeSlot}
            onChange={(e) => setActiveSlot(e.target.value as any)}
            className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl py-2 px-2.5 font-bold appearance-none text-center cursor-pointer shadow-2xs"
          >
            <option value="1PM">1:00 PM</option>
            <option value="6PM">6:00 PM</option>
            <option value="8PM">8:00 PM</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
        </div>

        <div className="relative">
          <select
            value={todayStr}
            onChange={(e) => {
              window.location.href = `/results/${e.target.value}/${activeSlot.toLowerCase()}`;
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl py-2 px-2.5 font-bold appearance-none text-center cursor-pointer shadow-2xs"
          >
            <option value={todayStr}>{todayStr.split('-').reverse().join('.')}</option>
            <option value={yesterdayDateStr}>{yesterdayDateStr.split('-').reverse().join('.')}</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
        </div>
      </div>

      {/* 4. Direct Scanned Gazette Paper Preview (Only when Result is Declared) */}
      {activeStatus === 'RESULT_OUT' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-sm text-center space-y-2">
          <div className="flex items-center justify-between px-1.5 pb-1 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-left">
              <span className="text-sm">📜</span>
              <span className="text-xs font-black text-slate-900">
                {lang === 'bn' ? `অফিসিয়াল গেজেট শিট (${currentSlotInfo.time})` : lang === 'hi' ? `ऑफिशियल गजट शीट (${currentSlotInfo.time})` : `Official Gazette Sheet (${currentSlotInfo.time})`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openImageLightbox(activeSheetUrl)}
              className="text-xs font-black text-blue-700 hover:underline flex items-center gap-1"
            >
              <span>{lang === 'bn' ? '🔍 ফুল স্ক্রিন জুম' : lang === 'hi' ? '🔍 फुल स्क्रीन ज़ूम' : '🔍 Full Screen Zoom'}</span>
            </button>
          </div>

          <div
            onClick={() => openImageLightbox(activeSheetUrl)}
            className="cursor-zoom-in relative rounded-xl overflow-hidden border border-slate-200 bg-[#fcfbf7] group shadow-inner"
          >
            <img
              src={activeSheetUrl}
              alt={`Official Gazette Result Sheet ${currentDraw.draw_name} ${currentSlotInfo.time}`}
              className="w-full h-auto object-contain transition-transform group-hover:scale-[1.01]"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLImageElement).src = sheetSvgUrl;
              }}
            />
            <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-colors flex items-center justify-center pointer-events-none">
              <span className="bg-white/95 text-slate-900 text-xs font-black px-3 py-1.5 rounded-full shadow border border-slate-200 opacity-90 group-hover:opacity-100">
                {lang === 'bn' ? '🔍 ট্যাপ করে ফুল স্ক্রিনে বড় করুন' : lang === 'hi' ? '🔍 टैप करके फुल स्क्रीन में बड़ा करें' : '🔍 Tap to view full screen zoom'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. WhatsApp Share Button & 6. Clean Structured Text Prize Tables (Declared Results Only) */}
      {activeStatus === 'RESULT_OUT' && (
        <>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25d366] hover:bg-[#20bd5a] text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <span>💬</span>
            <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে রেজাল্ট শেয়ার করুন (Share on WhatsApp)' : lang === 'hi' ? 'व्हाट्सएप पर रिजल्ट शेयर करें (Share on WhatsApp)' : 'Share Result on WhatsApp'}</span>
          </a>

          <div className="space-y-3 pt-1">
            {/* Toggle Bar */}
            <button
              type="button"
              onClick={() => setShowTextTables(prev => !prev)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 flex items-center justify-between text-xs font-black text-slate-800 transition-colors"
            >
              <span>{lang === 'bn' ? '📋 ২য় থেকে ৫ম পুরস্কারের বিস্তারিত নম্বর তালিকা' : lang === 'hi' ? '📋 2nd से 5th पुरस्कार की पूरी सूची' : '📋 2nd to 5th Prize Full Winning Numbers List'}</span>
              <span>{showTextTables ? (lang === 'bn' ? '▲ বন্ধ করুন' : lang === 'hi' ? '▲ बंद करें' : '▲ Hide') : (lang === 'bn' ? '▼ দেখুন' : lang === 'hi' ? '▼ देखें' : '▼ View')}</span>
            </button>

            {showTextTables && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* 2nd Prize */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      <span>{lang === 'bn' ? '২য় পুরস্কার: ₹১০,০০০ (১০ জন বিজয়ী)' : lang === 'hi' ? 'द्वितीय पुरस्कार: ₹10,000 (10 विजेता)' : '2nd Prize: ₹10,000 (10 Winners)'}</span>
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-mono font-bold">5 Digits</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {secondPrizes.map((num: string, idx: number) => (
                      <div
                        key={idx}
                        className="bg-emerald-50/70 border border-emerald-200 rounded-lg py-2 text-center font-mono text-base font-black text-emerald-950 select-all"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3rd & 4th Prize */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <h5 className="text-xs font-black text-slate-900">{lang === 'bn' ? '৩য় পুরস্কার: ₹৫০০' : lang === 'hi' ? 'तृतीय पुरस्कार: ₹500' : '3rd Prize: ₹500'}</h5>
                      <span className="text-[10px] text-slate-500 font-mono">Last 4 Digits</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {thirdPrizes.map((num: string, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded py-1.5 text-center font-mono text-xs font-bold text-slate-900 select-all">
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <h5 className="text-xs font-black text-slate-900">{lang === 'bn' ? '৪র্থ পুরস্কার: ₹২৫০' : lang === 'hi' ? 'चतुर्थ पुरस्कार: ₹250' : '4th Prize: ₹250'}</h5>
                      <span className="text-[10px] text-slate-500 font-mono">Last 4 Digits</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {fourthPrizes.map((num: string, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded py-1.5 text-center font-mono text-xs font-bold text-slate-900 select-all">
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5th Prize */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>{lang === 'bn' ? '৫ম পুরস্কার: ₹১২০ (১০০ জন বিজয়ী)' : lang === 'hi' ? '5वां पुरस्कार: ₹120 (100 विजेता)' : '5th Prize: ₹120 (100 Winners)'}</span>
                    </h4>
                    <span className="text-[11px] text-blue-700 font-mono font-bold">Last 4 Digits</span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {fifthPrizes.map((num: string, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded py-1.5 text-center font-mono text-xs font-bold text-slate-900 select-all transition-colors"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 7. Lightbox Zoom Modal (Like Lottery Sambad imodal) */}
      {showImageModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowImageModal(false)}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between max-w-3xl w-full mx-auto pb-2 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
              <span>📄</span>
              <span>{currentDraw.draw_name} • {currentSlotInfo.time}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-base flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Interactive Zoom Frame */}
          <div
            className="flex-1 overflow-auto max-w-3xl w-full mx-auto bg-slate-900/60 rounded-2xl p-2 border border-white/10 flex items-center justify-center relative touch-manipulation"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedImageUrl}
              alt="Official Dear Lottery Gazette Sheet"
              onError={(e) => {
                (e.target as HTMLImageElement).src = sheetSvgUrl;
              }}
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.18s ease'
              }}
              className="max-w-full h-auto object-contain rounded shadow-2xl"
            />
          </div>

          {/* Bottom Zoom Controls (+ / - / % / PDF) */}
          <div
            className="max-w-3xl w-full mx-auto pt-3 flex items-center justify-center gap-3 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="inline-flex items-center bg-slate-800/90 border border-white/20 rounded-full h-10 px-3 gap-2 shadow-lg">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomScale <= 1}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-black text-base disabled:opacity-40"
              >
                −
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 font-mono font-bold text-xs"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomScale >= 3}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-black text-base disabled:opacity-40"
              >
                +
              </button>
            </div>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`Dear_Lottery_${todayStr}_${activeSlot}.pdf`}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5"
            >
              <span>📥 PDF</span>
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
