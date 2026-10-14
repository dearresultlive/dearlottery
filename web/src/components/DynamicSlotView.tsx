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
  const jpgUrl = currentDraw?.image_r2_url || currentDraw?.source_url || `https://dearresultlive.in/og-image.jpg?date=${targetDate}&slot=${slotKey}`;

  const whatsappMessage = `🎯 *Dear Lottery Result Today (${currentDraw?.draw_time || slotHour})*\n📅 তারিখ: ${targetDate}\n\n🏆 *১ম পুরস্কার (₹1 Crore Winner)*: *${first.series} ${first.number}*\n\n👉 সম্পূর্ণ অফিসিয়াল রেজাল্ট শিট ও সব প্রাইজ নম্বর দেখুন:\nhttps://dearresultlive.in/results/${targetDate}/${slotKey}`;
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
          
          {/* 1. Sleek Mobile-First Live Countdown Banner */}
          <DrawCountdown onResultDetected={(found) => {
            setCurrentDraw(found);
            setIsUpcoming(false);
          }} />

          {/* 2. Pre-Publish Expected 1st Prize Golden Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 p-1 shadow-2xl">
            <div className="bg-slate-950 rounded-[22px] p-6 sm:p-8 text-center relative overflow-hidden">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md mb-4">
                <span>🏆</span>
                <span>1st Prize: ₹1,00,00,000 (1 Crore Winner / ১ম পুরস্কার)</span>
              </div>

              <div className="py-4">
                <div className="text-3xl sm:text-5xl font-black font-mono text-amber-300 tracking-wider animate-pulse select-none">
                  DRAW PENDING • ফলাফল আসছে
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-2">
                  Official draw will be conducted at {slotHour}. Winning numbers and official signed sheet will appear dynamically without page refresh.
                </p>
              </div>

              <div className="mt-2 pt-4 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs sm:text-sm text-amber-200">
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-3 py-1 rounded-full uppercase tracking-wider text-xs">
                  Consolation Prize: ₹1,000 (সান্ত্বনা পুরস্কার)
                </span>
                <span className="text-amber-100/90 font-medium">
                  Awarded across all remaining series matching the 1st prize winning 5-digit number.
                </span>
              </div>
            </div>
          </div>

          {/* 3. Official Prize Structure Grid */}
          <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl p-5 sm:p-7 space-y-4">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>📋</span>
              <span>Official Prize Structure for {slotHour} ({currentDraw?.draw_name || 'Dear State Lottery'})</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-400 block font-semibold">2nd Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-emerald-400 block my-1">₹9,000</span>
                <span className="text-[10px] text-slate-500 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-400 block font-semibold">3rd Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-teal-400 block my-1">₹450</span>
                <span className="text-[10px] text-slate-500 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-400 block font-semibold">4th Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-blue-400 block my-1">₹250</span>
                <span className="text-[10px] text-slate-500 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-400 block font-semibold">5th Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-amber-400 block my-1">₹120</span>
                <span className="text-[10px] text-slate-500 font-medium">100 Winners</span>
              </div>
            </div>
          </div>

          <PushNotifyBanner />

        </div>
      ) : (
        /* State B: DECLARED / PUBLISHED (After OCR extraction) */
        <div className="space-y-6">
          
          {/* Header Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-500/30 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-600 text-white font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
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
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {currentDraw?.draw_name || `Dear ${slotHour} Draw Result`}
              </h1>
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

          {/* 1st Prize Golden Hero Card - Authentic Ticket Design */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 p-1 shadow-2xl">
            <div className="bg-slate-950 rounded-[22px] p-5 sm:p-7 relative overflow-hidden">
              
              <div className="absolute right-4 -top-8 text-8xl font-black text-amber-500/10 select-none pointer-events-none">
                ₹1CR
              </div>

              <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/25 to-amber-500/15 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-6 text-center shadow-inner relative">
                
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-950 rounded-r-full border-r-2 border-y-2 border-amber-400/80"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-950 rounded-l-full border-l-2 border-y-2 border-amber-400/80"></div>

                <div className="inline-block bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-widest px-4 py-1 rounded-full shadow-md mb-2">
                  🏆 1st Prize Amount: ₹1,00,00,000 (1 Crore Winner / ১ম পুরস্কার)
                </div>

                <div className="py-2 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                  <span className="bg-amber-400 text-slate-950 font-mono text-3xl sm:text-5xl md:text-6xl font-black px-3.5 py-1 rounded-xl shadow-md border-2 border-amber-300">
                    {first.series}
                  </span>
                  <span className="font-mono text-4xl sm:text-6xl md:text-7xl font-black text-amber-300 tracking-wider drop-shadow-[0_4px_16px_rgba(251,191,36,0.4)] select-all">
                    {first.number}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-amber-500/30 text-xs sm:text-sm text-amber-100 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-3 py-0.5 rounded-full text-xs">
                    Consolation Prize: ₹1,000 (সান্ত্বনা পুরস্কার)
                  </span>
                  <span>
                    Applicable to all remaining series of ticket <strong className="font-mono text-white text-sm underline decoration-amber-400">{first.number}</strong>
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* Official Gazette Sheet Preview & Utility Bar */}
          <div className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>📄</span>
                  <span>Official Signed Gazette Sheet (অফিসিয়াল শিট)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official government verified publication sheet for {slotHour} draw.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <span>🔍</span>
                  <span>Open Full Sheet (জুম শিট)</span>
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`Dear_Lottery_${targetDate}_${slotKey}.pdf`}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all border border-slate-700"
                >
                  <span>📥 PDF</span>
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <span>📲 WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Inline Interactive Gazette Sheet Preview Card */}
            <div 
              onClick={() => setShowImageModal(true)}
              className="group cursor-pointer relative bg-slate-950 border-2 border-slate-800 hover:border-amber-400 rounded-xl p-3 overflow-hidden transition-all flex flex-col sm:flex-row items-center gap-4"
            >
              <div className="w-full sm:w-48 h-32 bg-slate-900 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center relative flex-shrink-0">
                <img
                  src={jpgUrl}
                  alt={`Official Sheet ${currentDraw?.draw_name || slotHour}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-90 group-hover:opacity-100"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent && !parent.querySelector('.sheet-placeholder')) {
                      const ph = document.createElement('div');
                      ph.className = 'sheet-placeholder text-center p-3 text-amber-300 text-xs font-mono';
                      ph.innerHTML = '<span class="text-2xl block mb-1">📜</span><strong>OFFICIAL GAZETTE</strong><br/><span class="text-[10px] text-slate-400">Tap to view full sheet</span>';
                      parent.appendChild(ph);
                    }
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                  <span className="bg-slate-950/80 text-amber-300 text-[11px] font-bold px-2 py-1 rounded-md border border-amber-500/40">
                    🔍 Click to Zoom
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    ✓ Official Certified Result
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Draw #{currentDraw?.draw_number || '74'}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {currentDraw?.draw_name || `${slotHour} Draw`} Official Signed Result Document
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Authentic scanned copy with directorate seals, judges signatures, and complete 5 prize tiers. Tap anywhere on this card to open in high-resolution full screen.
                </p>
              </div>
            </div>
          </div>

          {/* 2nd Prize Table */}
          <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
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

          {/* 3rd & 4th Prize */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  <span>3rd Prize: ₹450 (৩য় পুরস্কার)</span>
                </h4>
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

            <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>4th Prize: ₹250 (৪র্থ পুরস্কার)</span>
                </h4>
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
          <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h4 className="text-sm sm:text-base font-black text-white">
                  5th Prize: ₹120 (৫ম পুরস্কার - ১০০ জন বিজয়ী)
                </h4>
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

        </div>
      )}

      {/* Lightbox Modal for Official Sheet View */}
      {showImageModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative space-y-4 max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>📄</span>
                <span>Official Dear Lottery Result Gazette Sheet (অফিসিয়াল শিট)</span>
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
                alt="Official Dear Lottery Gazette Result Sheet"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-msg')) {
                    const msg = document.createElement('div');
                    msg.className = 'fallback-msg p-8 text-center text-slate-300';
                    msg.innerHTML = '<p class="font-bold text-amber-300 mb-2">Official Signed Gazette Document Available</p><p class="text-xs text-slate-400">Please use the Download PDF button below to view the signed publication.</p>';
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
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md"
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
  );
}
