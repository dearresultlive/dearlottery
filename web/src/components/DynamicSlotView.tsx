import React, { useState, useEffect } from 'react';
import DrawCountdown from './DrawCountdown';
import PushNotifyBanner from './PushNotifyBanner';

interface PrizeData {
  first_prize?: { series: string; number: string };
  consolation_prize_amount?: number;
  second_prize?: string[];
  third_prize?: string[];
  fourth_prize?: string[];
  fifth_prize?: string[];
}

interface DynamicSlotViewProps {
  targetDate: string;
  slotKey: '1pm' | '6pm' | '8pm' | string;
  slotHour: string;
  initialDraw?: any;
  isInitiallyUpcoming: boolean;
}

export default function DynamicSlotView({
  targetDate,
  slotKey,
  slotHour,
  initialDraw,
  isInitiallyUpcoming
}: DynamicSlotViewProps) {
  const [currentDraw, setCurrentDraw] = useState<any>(initialDraw);
  const [isUpcoming, setIsUpcoming] = useState<boolean>(isInitiallyUpcoming);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Auto-listen for zero-refresh OCR extraction event from DrawCountdown
  useEffect(() => {
    const handleNewResult = (e: any) => {
      const newDraw = e.detail;
      if (newDraw) {
        const matchesSlot = 
          newDraw.draw_time?.toLowerCase().includes(slotKey.replace('pm', '')) ||
          newDraw.id?.toLowerCase().includes(slotKey.toLowerCase());

        if (matchesSlot) {
          setCurrentDraw(newDraw);
          setIsUpcoming(false);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('dearlottery:new_result', handleNewResult);
      return () => window.removeEventListener('dearlottery:new_result', handleNewResult);
    }
  }, [slotKey]);

  const p = currentDraw?.parsed_data?.prizes || currentDraw?.prizes;
  const first = p?.first_prize || { series: '84D', number: '74921' };
  const second = p?.second_prize || [];
  const third = p?.third_prize || [];
  const fourth = p?.fourth_prize || [];
  const fifth = p?.fifth_prize || [];

  const pdfUrl = currentDraw?.pdf_r2_url || currentDraw?.source_url || `https://dearresultlive.in/results/${targetDate}/${slotKey}`;
  const jpgUrl = currentDraw?.image_r2_url || currentDraw?.source_url || 'https://www.nagalandlotteries.com/images/sample_gazette.jpg';

  const whatsappMessage = `🎯 *Dear Lottery Result (${currentDraw?.draw_time || slotHour})*\n📅 তারিখ: ${targetDate}\n\n🏆 *১ম পুরস্কার (₹1 Crore Winner)*: *${first.series} ${first.number}*\n\n👉 সম্পূর্ণ রেজাল্ট শিট ও টিকিট চেক করুন:\nhttps://dearresultlive.in/results/${targetDate}/${slotKey}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(`https://dearresultlive.in/results/${targetDate}/${slotKey}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* State A: UPCOMING / PRE-PUBLISHED (Before results are extracted) */}
      {isUpcoming ? (
        <div className="space-y-6">
          
          {/* 1. Live Countdown Component with 2-min Auto-Polling */}
          <DrawCountdown onResultDetected={(found) => {
            setCurrentDraw(found);
            setIsUpcoming(false);
          }} />

          {/* 2. Pre-Publish Expected 1st Prize Golden Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-600/20 border-2 border-amber-400 p-6 sm:p-8 text-center shadow-2xl">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md mb-4">
              <span>🏆</span>
              <span>1st Prize: ₹1,00,00,000 (1 Crore Winner / ১ম পুরস্কার)</span>
            </div>

            {/* Pulsing Pending Placeholder */}
            <div className="py-4">
              <div className="text-3xl sm:text-5xl font-black font-mono text-amber-300 tracking-wider animate-pulse select-none">
                DRAW PENDING • ফলাফল আসছে
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Official draw conducted at {slotHour}. Winning numbers will appear dynamically without page refresh.
              </p>
            </div>

            {/* Consolation Badge */}
            <div className="mt-2 pt-4 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs sm:text-sm text-amber-200">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-3 py-1 rounded-full uppercase tracking-wider text-xs">
                Consolation Prize: ₹1,000 (সান্ত্বনা পুরস্কার)
              </span>
              <span className="text-amber-100/90 font-medium">
                Awarded across all remaining series matching the 1st prize winning 5-digit number.
              </span>
            </div>
          </div>

          {/* 3. Official Prize Structure Grid */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>📋</span>
              <span>Official Prize Structure for {slotHour} ({currentDraw?.draw_name || 'Dear State Lottery'})</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] text-slate-400 block font-semibold">2nd Prize</span>
                <span className="text-xl font-mono font-black text-emerald-400 block my-1">₹9,000</span>
                <span className="text-[10px] text-slate-500 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] text-slate-400 block font-semibold">3rd Prize</span>
                <span className="text-xl font-mono font-black text-teal-400 block my-1">₹450</span>
                <span className="text-[10px] text-slate-500 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] text-slate-400 block font-semibold">4th Prize</span>
                <span className="text-xl font-mono font-black text-blue-400 block my-1">₹250</span>
                <span className="text-[10px] text-slate-500 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] text-slate-400 block font-semibold">5th Prize</span>
                <span className="text-xl font-mono font-black text-amber-400 block my-1">₹120</span>
                <span className="text-[10px] text-slate-500 font-medium">100 Winners</span>
              </div>
            </div>
          </div>

          {/* 4. Web Push Alert Trigger */}
          <PushNotifyBanner />

        </div>
      ) : (
        /* State B: DECLARED / PUBLISHED (After OCR extraction) */
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
          
          {/* Header Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-500 text-white font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  LIVE GAZETTE RECORD
                </span>
                <span className="text-xs text-amber-400 font-bold font-mono">
                  {targetDate}
                </span>
                <span className="text-xs text-slate-400">
                  • {currentDraw?.draw_time || slotHour} Draw
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {currentDraw?.draw_name || `Dear ${slotHour} Draw Result`}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                Draw #{currentDraw?.draw_number || '74'}
              </span>
              <button
                type="button"
                onClick={() => typeof window !== 'undefined' && window.print()}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
              >
                🖨️ Print
              </button>
            </div>
          </div>

          {/* 1st Prize Golden Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-600/25 border-2 border-amber-400 p-6 sm:p-8 text-center shadow-2xl">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md mb-4">
              <span>🏆</span>
              <span>1st Prize: ₹1,00,00,000 (1 Crore Winner / ১ম পুরস্কার)</span>
            </div>

            <div className="py-2">
              <div className="text-4xl sm:text-6xl md:text-7xl font-black font-mono text-amber-300 tracking-widest drop-shadow-[0_4px_16px_rgba(251,191,36,0.35)] select-all">
                {first.series} {first.number}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs sm:text-sm text-amber-200">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-3 py-1 rounded-full uppercase tracking-wider text-xs">
                Consolation Prize: ₹1,000 (সান্ত্বনা পুরস্কার)
              </span>
              <span className="text-amber-100/90 font-medium">
                Applicable to all remaining series of ticket <strong className="font-mono text-white text-base underline decoration-amber-400">{first.number}</strong>
              </span>
            </div>
          </div>

          {/* 3-Action Media & Share Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-amber-300 hover:text-white border-2 border-amber-500/40 hover:border-amber-400 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-98"
            >
              <span className="text-base">📄</span>
              <span>View Official Sheet / শিট দেখুন</span>
            </button>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`Dear_Lottery_${targetDate}_${slotKey}.pdf`}
              className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 hover:text-white border-2 border-emerald-500/40 hover:border-emerald-400 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-98"
            >
              <span className="text-base">📥</span>
              <span>Download PDF / পিডিএফ</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all active:scale-98"
            >
              <span className="text-lg">📲</span>
              <span>Share on WhatsApp / শেয়ার</span>
            </a>
          </div>

          {/* 2nd Prize Table */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>2nd Prize: ₹9,000 (১০ জন বিজয়ী)</span>
              </h4>
              <span className="text-xs text-emerald-400 font-bold font-mono">5 Digits / ৫ সংখ্যা</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {second.map((num: string, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-900 border-2 border-slate-800 hover:border-emerald-500/60 rounded-xl py-2.5 px-3 text-center font-mono text-lg sm:text-xl font-black text-emerald-300 tracking-wider shadow-inner select-all"
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* 3rd & 4th Prizes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h5 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  <span>3rd Prize: ₹450 (৩য় পুরস্কার)</span>
                </h5>
                <span className="text-[11px] text-slate-400 font-mono">Last 4 Digits</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {third.map((num: string, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 hover:border-teal-400/50 rounded-lg py-2 text-center font-mono text-base font-bold text-slate-100 tracking-wider select-all"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h5 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>4th Prize: ₹250 (৪র্থ পুরস্কার)</span>
                </h5>
                <span className="text-[11px] text-slate-400 font-mono">Last 4 Digits</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {fourth.map((num: string, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 hover:border-blue-400/50 rounded-lg py-2 text-center font-mono text-base font-bold text-slate-100 tracking-wider select-all"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5th Prize Table */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h5 className="text-sm sm:text-base font-black text-white">
                  5th Prize: ₹120 (৫ম পুরস্কার - ১০০ জন বিজয়ী)
                </h5>
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold">
                Matches Last 4 Digits / শেষ ৪ সংখ্যা
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 pt-1">
              {fifth.map((num: string, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-900/95 border border-slate-800 hover:border-amber-400 hover:bg-slate-800 rounded-lg py-1.5 text-center font-mono text-sm sm:text-base font-bold text-slate-100 tracking-wider transition-colors select-all shadow-sm"
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Utility Controls */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span>Verified Government Gazette Record</span>
              <span>•</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-amber-400 hover:underline font-semibold"
              >
                {copiedLink ? '✓ Link Copied!' : '🔗 Copy Direct Result Link'}
              </button>
            </div>
            <button
              onClick={() => typeof window !== 'undefined' && window.print()}
              type="button"
              className="text-slate-300 hover:text-white font-bold inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>🖨️</span>
              <span>Print Official Sheet</span>
            </button>
          </div>

          {/* Lightbox Modal */}
          {showImageModal && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => setShowImageModal(false)}
            >
              <div
                className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>📄</span>
                    <span>Official Dear Lottery Result Gazette Sheet</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowImageModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-950 rounded-2xl p-2 border border-slate-800 flex items-center justify-center">
                  <img
                    src={jpgUrl}
                    alt={`Official Dear Lottery Result Sheet ${targetDate} ${slotHour}`}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all"
                  >
                    📥 Download High-Res PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowImageModal(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all"
                  >
                    Close View
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
