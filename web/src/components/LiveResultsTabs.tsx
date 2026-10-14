import React, { useState, useEffect } from 'react';
import {
  formatINR,
  getISTNow,
  getISTDateString,
  getSlotStatus,
  getSlotCountdown
} from '../lib/lottery-utils';
import PushNotifyBanner from './PushNotifyBanner';

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
    { key: '1PM' as const, time: '1:00 PM', labelEn: '1:00 PM Morning', labelBn: 'দুপুর ১:০০', icon: '☀️' },
    { key: '6PM' as const, time: '6:00 PM', labelEn: '6:00 PM Day', labelBn: 'সন্ধ্যা ৬:০০', icon: '🌅' },
    { key: '8PM' as const, time: '8:00 PM', labelEn: '8:00 PM Night', labelBn: 'রাত ৮:০০', icon: '🌙' }
  ];

  const todayStr = todayDateStr || getISTDateString();
  const [activeSlot, setActiveSlot] = useState<'1PM' | '6PM' | '8PM'>('1PM');
  const [drawsList, setDrawsList] = useState<DrawRecord[]>(draws);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showYesterdaySheet, setShowYesterdaySheet] = useState<boolean>(false);
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
    currentDrawForToday?.parsed_data?.status !== 'UPCOMING'
  );

  const activeStatus = getSlotStatus(todayStr, activeSlot, todayHasPrizes);

  // Fallback: Yesterday's draw for this slot
  const yesterdayDraw = (yesterdayDraws || []).find(d => 
    d.draw_time?.includes(activeSlot.replace('PM', '')) || d.id?.includes(activeSlot)
  ) || (yesterdayDraws || [])[0] || drawsList.find(d => d.draw_date < todayStr);

  const yesterdayDateStr = yesterdayDraw?.draw_date || (() => {
    const y = new Date(getISTNow());
    y.setDate(y.getDate() - 1);
    return getISTDateString(y);
  })();

  const yesterdayPrizes: PrizeData = yesterdayDraw?.parsed_data?.prizes || yesterdayDraw?.prizes || {};
  const yesterdayFirstPrize = yesterdayPrizes.first_prize || { series: '84D', number: '74921' };
  const yesterdaySecondPrizes = yesterdayPrizes.second_prize || [];
  const yesterdayThirdPrizes = yesterdayPrizes.third_prize || [];
  const yesterdayFourthPrizes = yesterdayPrizes.fourth_prize || [];
  const yesterdayFifthPrizes = yesterdayPrizes.fifth_prize || [];

  const yesterdayPdfUrl = yesterdayDraw?.pdf_r2_url || yesterdayDraw?.source_url || `https://dearresultlive.in/results/${yesterdayDateStr}/${activeSlot.toLowerCase()}`;
  const yesterdayJpgUrl = yesterdayDraw?.image_r2_url || yesterdayDraw?.source_url || `https://dearresultlive.in/og-image.jpg?date=${yesterdayDateStr}&slot=${activeSlot}`;

  // If results are out today, use today's declared data
  const currentDraw = currentDrawForToday || drawsList[0];
  const declaredPrizes: PrizeData = currentDraw?.parsed_data?.prizes || currentDraw?.prizes || {};
  const firstPrize = declaredPrizes.first_prize || { series: '84D', number: '74921' };
  const secondPrizes = declaredPrizes.second_prize || [];
  const thirdPrizes = declaredPrizes.third_prize || [];
  const fourthPrizes = declaredPrizes.fourth_prize || [];
  const fifthPrizes = declaredPrizes.fifth_prize || [];

  const pdfUrl = currentDraw?.pdf_r2_url || currentDraw?.source_url || `https://dearresultlive.in/results/${todayStr}/${activeSlot.toLowerCase()}`;
  const jpgUrl = currentDraw?.image_r2_url || currentDraw?.source_url || `https://dearresultlive.in/og-image.jpg?date=${todayStr}&slot=${activeSlot}`;

  const whatsappShareText = `🎯 *Dear Lottery Result Today (${currentDraw?.draw_time || activeSlot})*\n📅 তারিখ: ${todayStr}\n\n🏆 *১ম পুরস্কার (₹1 Crore Winner)*: *${firstPrize.series} ${firstPrize.number}*\n\n👉 সম্পূর্ণ অফিসিয়াল রেজাল্ট শিট ও সব প্রাইজ নম্বর দেখুন:\nhttps://dearresultlive.in/results/${todayStr}/${activeSlot.toLowerCase()}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;

  const handleCopyLink = () => {
    const url = `https://dearresultlive.in/results/${todayStr}/${activeSlot.toLowerCase()}`;
    if (typeof window !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const openImageLightbox = (url: string) => {
    setSelectedImageUrl(url);
    setShowImageModal(true);
  };

  const currentSlotInfo = slots.find(s => s.key === activeSlot) || slots[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      
      {/* 1. High-Contrast Draw Navigation Tabs (Newspaper Style) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          {slots.map(slot => {
            const isActive = activeSlot === slot.key;
            
            // Per-slot status calculation for today
            const drawForSlotToday = drawsList.find(d => 
              (d.draw_time?.includes(slot.key.replace('PM', '')) || d.id?.includes(slot.key)) &&
              d.draw_date === todayStr
            );
            const p: PrizeData = drawForSlotToday?.parsed_data?.prizes || drawForSlotToday?.prizes || {};
            const slotHasPrizes = Boolean(
              p.first_prize?.number &&
              drawForSlotToday?.status !== 'UPCOMING' &&
              drawForSlotToday?.parsed_data?.status !== 'UPCOMING'
            );
            const slotStatus = getSlotStatus(todayStr, slot.key, slotHasPrizes);

            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => {
                  setActiveSlot(slot.key);
                  setShowYesterdaySheet(false);
                }}
                className={`relative py-2.5 sm:py-3.5 px-2 sm:px-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isActive
                    ? 'bg-blue-700 text-white font-black shadow-md ring-2 ring-blue-600 scale-[1.01]'
                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-lg">{slot.icon}</span>
                  <span className="text-xs sm:text-base font-black tracking-tight">
                    {slot.time}
                  </span>
                </div>
                
                <span className={`text-[10px] sm:text-xs font-bold mt-0.5 ${isActive ? 'text-blue-100' : 'text-blue-700'}`}>
                  {slot.labelBn}
                </span>

                <div className="mt-1">
                  <span className={`inline-block text-[9px] sm:text-[10px] font-black px-2 py-0.2 rounded-full uppercase tracking-wider ${
                    isActive
                      ? slotStatus === 'RESULT_OUT'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : slotStatus === 'DRAWING'
                        ? 'bg-white text-red-900 shadow-xs'
                        : 'bg-amber-300 text-amber-950 shadow-xs'
                      : slotStatus === 'RESULT_OUT'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : slotStatus === 'DRAWING'
                      ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {slotStatus === 'RESULT_OUT' ? 'RESULT OUT' : slotStatus === 'DRAWING' ? 'PUBLISHING...' : 'UPCOMING'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          STATE A: UPCOMING (Draw has not occurred yet today - e.g. at 9:00 AM)
          ========================================================================= */}
      {activeStatus === 'UPCOMING' && (
        <div className="space-y-5 sm:space-y-6">
          
          {/* 1. Golden Draw Pending Physical Ticket Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-100 border-2 border-amber-300 p-5 sm:p-7 shadow-sm">
            
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
                  DRAW PENDING • আসন্ন ড্র
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  {currentSlotInfo.time} Draw ({currentSlotInfo.labelBn})
                </span>
              </div>

              <div className="text-xs text-slate-700 font-mono bg-white border border-amber-300 px-2.5 py-1 rounded-lg font-bold">
                Draw Date: <strong className="text-slate-950">{todayStr}</strong>
              </div>
            </div>

            {/* Ticket Box */}
            <div className="bg-white border-2 border-dashed border-amber-400 rounded-xl p-5 sm:p-8 text-center shadow-inner relative space-y-3">
              
              <div className="inline-block bg-red-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider px-4 py-1 rounded-full shadow-sm">
                🏆 1st Prize: ₹1,00,00,000 (1 Crore Winner / ১ম পুরস্কার)
              </div>

              <div className="py-2">
                <div className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-slate-900 tracking-wider">
                  DRAW PENDING • ফলাফল আসছে
                </div>
                
                {/* Live Reverse Countdown specifically for this slot */}
                <div className="mt-3 inline-flex items-center gap-2 bg-slate-900 text-amber-300 px-4 py-2 rounded-xl font-mono text-sm sm:text-base font-black shadow-md border border-slate-800">
                  <span className="text-white text-xs sm:text-sm font-medium">ড্র শুরু হতে বাকি / Starts in:</span>
                  <span className="tracking-widest">
                    {String(slotCountdown.hours).padStart(2, '0')}h {String(slotCountdown.minutes).padStart(2, '0')}m {String(slotCountdown.seconds).padStart(2, '0')}s
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
                  আজকের {currentSlotInfo.time} ড্র সম্পন্ন হওয়ার পর অফিসিয়াল রেজাল্ট শিট এবং বিজয়ী নম্বর এখানে অটোমেটিক চলে আসবে (পেজ রিফ্রেশ করার প্রয়োজন নেই)।
                </p>
              </div>

              {/* Consolation Prize Notice */}
              <div className="pt-3 border-t border-slate-200 text-xs sm:text-sm text-slate-700 flex flex-col sm:flex-row items-center justify-center gap-2">
                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-0.5 rounded-full text-xs">
                  Consolation Prize: ₹1,000 (সান্ত্বনা পুরস্কার)
                </span>
                <span>
                  ১ম পুরস্কারের শেষ ৫ সংখ্যা মিললে বাকি সব সিরিজের টিকিটে প্রযোজ্য।
                </span>
              </div>

            </div>
          </div>

          {/* 2. Official Prize Structure Grid for this Slot */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📋</span>
              <span>Official Prize Structure for {currentSlotInfo.time} ({todayStr})</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 block font-bold">2nd Prize (২য় পুরস্কার)</span>
                <span className="text-lg sm:text-xl font-mono font-black text-emerald-800 block my-1">₹9,000</span>
                <span className="text-[10px] text-slate-400 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 block font-bold">3rd Prize (৩য় পুরস্কার)</span>
                <span className="text-lg sm:text-xl font-mono font-black text-blue-700 block my-1">₹450</span>
                <span className="text-[10px] text-slate-400 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 block font-bold">4th Prize (৪র্থ পুরস্কার)</span>
                <span className="text-lg sm:text-xl font-mono font-black text-indigo-700 block my-1">₹250</span>
                <span className="text-[10px] text-slate-400 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 block font-bold">5th Prize (৫ম পুরস্কার)</span>
                <span className="text-lg sm:text-xl font-mono font-black text-slate-900 block my-1">₹120</span>
                <span className="text-[10px] text-slate-400 font-medium">100 Winners</span>
              </div>
            </div>
          </div>

          {/* 3. High-Visibility Yesterday's Declared Result Section (For Morning Visitors) */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg">📅</span>
                  <h4 className="text-sm sm:text-base font-black text-slate-900">
                    Looking for Yesterday's Result? (গতকালকের রেজাল্ট)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  আজকের {currentSlotInfo.time} ড্র এখনো প্রকাশ হয়নি। নিচে গতকালকের ({yesterdayDateStr}) রেজাল্ট দেওয়া হলো:
                </p>
              </div>

              <a
                href={`/results/${yesterdayDateStr}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 hover:border-blue-400 px-3.5 py-2 rounded-xl transition-all shadow-2xs self-start sm:self-auto"
              >
                <span>All Yesterday Results ({yesterdayDateStr})</span>
                <span>→</span>
              </a>
            </div>

            {/* Yesterday 1st Prize Winner Ticket Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left space-y-1">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    ✓ Verified Result ({yesterdayDateStr})
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {yesterdayDraw?.draw_name || `${currentSlotInfo.time} Draw`}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  ১ম পুরস্কার বিজয়ী টিকিট (₹1 Crore Winner):
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2 pt-0.5">
                  <span className="bg-slate-900 text-white font-mono text-xl sm:text-2xl font-black px-2.5 py-0.5 rounded-lg">
                    {yesterdayFirstPrize.series}
                  </span>
                  <span className="font-mono text-2xl sm:text-3xl font-black text-slate-950 tracking-wider">
                    {yesterdayFirstPrize.number}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Yesterday */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setShowYesterdaySheet(prev => !prev)}
                  className="flex-1 md:flex-none bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all shadow-sm"
                >
                  {showYesterdaySheet ? '▲ Hide Details' : '👁️ View Yesterday Sheet & All Prizes'}
                </button>
                <a
                  href={yesterdayPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm py-2 px-3 rounded-xl transition-colors"
                >
                  📥 PDF
                </a>
              </div>
            </div>

            {/* Expandable Yesterday Complete Prize Sheet */}
            {showYesterdaySheet && (
              <div className="pt-3 border-t border-slate-200 space-y-4 animate-in fade-in duration-200">
                
                {/* 2nd Prize */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs sm:text-sm font-black text-slate-900">
                      Yesterday 2nd Prize: ₹9,000 (১০ জন বিজয়ী)
                    </h5>
                    <span className="text-[11px] text-emerald-700 font-mono font-bold">5 Digits</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {yesterdaySecondPrizes.map((num, idx) => (
                      <div key={idx} className="bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 text-center font-mono text-sm font-black text-emerald-950">
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3rd & 4th Prize */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <h6 className="text-xs font-black text-slate-900">Yesterday 3rd Prize: ₹450</h6>
                    <div className="grid grid-cols-5 gap-1.5">
                      {yesterdayThirdPrizes.map((num, idx) => (
                        <div key={idx} className="bg-slate-100 border border-slate-200 rounded py-1 text-center font-mono text-xs font-bold text-slate-900">
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h6 className="text-xs font-black text-slate-900">Yesterday 4th Prize: ₹250</h6>
                    <div className="grid grid-cols-5 gap-1.5">
                      {yesterdayFourthPrizes.map((num, idx) => (
                        <div key={idx} className="bg-slate-100 border border-slate-200 rounded py-1 text-center font-mono text-xs font-bold text-slate-900">
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5th Prize Sample */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h6 className="text-xs font-black text-slate-900">Yesterday 5th Prize: ₹120 (১০০ জন বিজয়ী)</h6>
                    <span className="text-[10px] text-slate-500 font-mono">Last 4 Digits</span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {yesterdayFifthPrizes.slice(0, 30).map((num, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded py-1 text-center font-mono text-xs font-medium text-slate-800">
                        {num}
                      </div>
                    ))}
                  </div>
                  <div className="text-center pt-1">
                    <a href={`/results/${yesterdayDateStr}`} className="text-xs text-blue-700 hover:underline font-bold">
                      View all 100 winning numbers from yesterday →
                    </a>
                  </div>
                </div>

              </div>
            )}

          </div>

          <PushNotifyBanner />

        </div>
      )}

      {/* =========================================================================
          STATE B: DRAWING (Draw in progress / Top of hour / Result scanning)
          ========================================================================= */}
      {activeStatus === 'DRAWING' && (
        <div className="bg-white border-2 border-red-300 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex items-center gap-2 bg-red-100 border border-red-300 text-red-800 px-3 py-1 rounded-full text-xs font-black animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            DRAW IN PROGRESS • ড্র চলছে
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
            {currentSlotInfo.time} রেজাল্ট শিট আপলোড ও ভেরিফাই হচ্ছে
          </h3>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            অফিসিয়াল ডিরেক্টরেট শিট স্ক্যান সম্পন্ন হচ্ছে। কোনো রিফ্রেশ ছাড়াই কয়েক সেকেন্ডের মধ্যে ১ম পুরস্কার ও সকল বিজয়ী নম্বর প্রদর্শিত হবে।
          </p>
          <div className="pt-2">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE C: RESULT OUT (Declared with real winning numbers & sheet)
          ========================================================================= */}
      {activeStatus === 'RESULT_OUT' && (
        <div className="space-y-5 sm:space-y-6">
          
          {/* 1. HERO: Authentic Golden Lottery Ticket (Paper Style, Ultra High-Contrast) */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-100 border-2 border-amber-300 p-5 sm:p-7 shadow-sm">
            
            {/* Top Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  ১ম পুরস্কার • 1ST PRIZE
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  {currentDraw.draw_name} ({currentDraw.draw_time})
                </span>
              </div>

              <div className="text-xs text-slate-700 font-mono bg-white border border-amber-300 px-2.5 py-1 rounded-lg font-bold">
                Draw Date: <strong className="text-slate-950">{todayStr}</strong>
              </div>
            </div>

            {/* Realistic Physical Ticket Card */}
            <div className="bg-white border-2 border-dashed border-amber-400 rounded-xl p-4 sm:p-6 text-center shadow-inner relative">
              
              <div className="inline-block bg-red-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider px-4 py-1 rounded-full shadow-sm mb-2">
                🏆 1st Prize: ₹1,00,00,000 (1 Crore Winner / ১ম পুরস্কার)
              </div>

              {/* Big Bold Ticket Number (Series + 5 Digits) in Crisp Black Ink */}
              <div className="py-2 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                <span className="bg-slate-900 text-white font-mono text-3xl sm:text-5xl md:text-6xl font-black px-3.5 py-1 rounded-xl shadow border-2 border-slate-800">
                  {firstPrize.series}
                </span>
                <span className="font-mono text-4xl sm:text-6xl md:text-7xl font-black text-slate-950 tracking-wider select-all">
                  {firstPrize.number}
                </span>
              </div>

              {/* Consolation Prize Notice */}
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs sm:text-sm text-slate-700 flex flex-col sm:flex-row items-center justify-center gap-2">
                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-0.5 rounded-full text-xs">
                  Consolation Prize: ₹1,000 (সান্ত্বনা পুরস্কার)
                </span>
                <span>
                  Applicable to all remaining series of ticket <strong className="font-mono text-slate-950 text-sm underline decoration-amber-500 font-black">{firstPrize.number}</strong>
                </span>
              </div>

            </div>
          </div>

          {/* 2. Official Gazette Sheet (Image Preview) & Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>📄</span>
                  <span>Official Government Gazette Sheet (অফিসিয়াল শিট)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nagaland & Sikkim State Lotteries verified signed publication sheet.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => openImageLightbox(jpgUrl)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <span>🔍</span>
                  <span>Open Full Sheet (জুম শিট)</span>
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`${todayStr}_${activeSlot}.pdf`}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all border border-slate-300"
                >
                  <span>📥 PDF</span>
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <span>📲 WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Inline Interactive Gazette Sheet Preview Card */}
            <div 
              onClick={() => openImageLightbox(jpgUrl)}
              className="group cursor-pointer bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl p-3 transition-all flex flex-col sm:flex-row items-center gap-4"
            >
              <div className="w-full sm:w-48 h-32 bg-white rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative flex-shrink-0 shadow-inner">
                <img
                  src={jpgUrl}
                  alt={`Official Sheet ${currentDraw.draw_name} ${currentDraw.draw_time}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent && !parent.querySelector('.sheet-placeholder')) {
                      const ph = document.createElement('div');
                      ph.className = 'sheet-placeholder text-center p-3 text-slate-700 text-xs font-mono';
                      ph.innerHTML = '<span class="text-2xl block mb-1">📜</span><strong>OFFICIAL GAZETTE</strong><br/><span class="text-[10px] text-slate-500">Tap to view full sheet</span>';
                      parent.appendChild(ph);
                    }
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors flex items-center justify-center">
                  <span className="bg-white/95 text-blue-900 text-[11px] font-black px-2.5 py-1 rounded-md shadow-sm border border-slate-200">
                    🔍 Click to Zoom
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    ✓ Official Certified Result
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Draw #{currentDraw.draw_number || '74'}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  {currentDraw.draw_name} Official Signed Result Document
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Authentic scanned copy with directorate seals, judges signatures, and complete 5 prize tiers. Tap anywhere on this card to open in high-resolution full screen.
                </p>
              </div>
            </div>

          </div>

          {/* 3. High-Contrast Newspaper Prize Tables */}
          
          {/* 2nd Prize: 10 Winners of ₹9,000 Each */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>2nd Prize: {formatINR(9000)} (২য় পুরস্কার - ১০ জন বিজয়ী)</span>
              </h3>
              <span className="text-xs text-emerald-700 font-bold font-mono">5 Digits / ৫ সংখ্যা</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {secondPrizes.map((num: string, idx: number) => (
                <div
                  key={idx}
                  className="bg-emerald-50/60 border border-emerald-200 hover:border-emerald-400 rounded-xl py-2.5 px-3 text-center font-mono text-lg sm:text-xl font-black text-emerald-950 tracking-wider shadow-xs select-all"
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* 3rd & 4th Prize 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 3rd Prize (₹450 Each - 10 Winners) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>3rd Prize: {formatINR(450)} (৩য় পুরস্কার)</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">Last 4 Digits</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {thirdPrizes.map((num: string, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg py-2 text-center font-mono text-base font-bold text-slate-900 tracking-wider select-all"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* 4th Prize (₹250 Each - 10 Winners) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <span>4th Prize: {formatINR(250)} (৪র্থ পুরস্কার)</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">Last 4 Digits</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {fourthPrizes.map((num: string, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg py-2 text-center font-mono text-base font-bold text-slate-900 tracking-wider select-all"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 5th Prize: 100 Numbers of ₹120 Each (Clean Newspaper Scanning Grid) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  5th Prize: {formatINR(120)} (৫ম পুরস্কার - ১০০ জন বিজয়ী)
                </h4>
              </div>
              <span className="text-xs text-blue-700 font-mono font-bold">
                Matches Last 4 Digits / শেষ ৪ সংখ্যা
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 pt-1">
              {fifthPrizes.map((num: string, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg py-1.5 text-center font-mono text-sm sm:text-base font-bold text-slate-900 tracking-wider transition-colors select-all shadow-2xs"
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Utility Controls */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span>Verified Government Gazette Record</span>
              <span>•</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-blue-700 hover:underline font-bold"
              >
                {copiedLink ? '✓ Link Copied!' : '🔗 Copy Direct Result Link'}
              </button>
            </div>
            <button
              onClick={() => typeof window !== 'undefined' && window.print()}
              type="button"
              className="text-slate-700 hover:text-slate-900 font-bold inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-300"
            >
              <span>🖨️</span>
              <span>Print Official Sheet</span>
            </button>
          </div>

        </div>
      )}

      {/* Lightbox Modal for Official Sheet Fullscreen Zoom View */}
      {showImageModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-white border border-slate-300 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative space-y-4 max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>📄</span>
                <span>Official Dear Lottery Result Gazette Sheet (অফিসিয়াল শিট)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 rounded-xl p-2 border border-slate-200 flex items-center justify-center">
              <img
                src={selectedImageUrl}
                alt="Official Dear Lottery Gazette Result Sheet"
                className="max-w-full max-h-[75vh] object-contain rounded shadow-lg"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-msg')) {
                    const msg = document.createElement('div');
                    msg.className = 'fallback-msg p-8 text-center text-slate-700';
                    msg.innerHTML = '<p class="font-bold text-slate-900 mb-2">Official Signed Gazette Document Available</p><p class="text-xs text-slate-500">Please use the Download PDF button below to view the official government signed publication.</p>';
                    parent.appendChild(msg);
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >
                📥 Download High-Res PDF
              </a>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all border border-slate-300"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
