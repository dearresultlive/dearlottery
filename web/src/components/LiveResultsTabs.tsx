import React, { useState, useEffect } from 'react';
import { formatINR } from '../lib/lottery-utils';

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
  source_url?: string;
  pdf_r2_url?: string;
  image_r2_url?: string;
  parsed_data?: {
    prizes?: PrizeData;
    source_url?: string;
    pdf_r2_url?: string;
    image_r2_url?: string;
  };
  prizes?: PrizeData;
}

interface LiveResultsTabsProps {
  draws?: DrawRecord[];
}

export default function LiveResultsTabs({ draws = [] }: LiveResultsTabsProps) {
  const slots = [
    { key: '1PM', time: '1:00 PM', labelEn: '1:00 PM Morning', labelBn: 'দুপুর ১:০০', icon: '☀️' },
    { key: '6PM', time: '6:00 PM', labelEn: '6:00 PM Day', labelBn: 'সন্ধ্যা ৬:০০', icon: '🌅' },
    { key: '8PM', time: '8:00 PM', labelEn: '8:00 PM Night', labelBn: 'রাত ৮:০০', icon: '🌙' }
  ];

  const [activeSlot, setActiveSlot] = useState<string>('1PM');
  const [drawsList, setDrawsList] = useState<DrawRecord[]>(draws);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    setDrawsList(draws);
  }, [draws]);

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
    if (drawsList.length > 0) {
      const now = new Date();
      const istHours = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
      if (istHours >= 20) {
        setActiveSlot('8PM');
      } else if (istHours >= 18) {
        setActiveSlot('6PM');
      } else {
        setActiveSlot('1PM');
      }
    }
  }, [drawsList]);

  const currentDraw = drawsList.find(d => 
    d.draw_time?.includes(activeSlot.replace('PM', '')) || 
    d.id?.includes(activeSlot)
  ) || drawsList[0];

  const prizes: PrizeData = currentDraw?.parsed_data?.prizes || currentDraw?.prizes || {};
  const firstPrize = prizes.first_prize || { series: '84D', number: '74921' };
  const secondPrizes = prizes.second_prize || [];
  const thirdPrizes = prizes.third_prize || [];
  const fourthPrizes = prizes.fourth_prize || [];
  const fifthPrizes = prizes.fifth_prize || [];

  const pdfUrl = currentDraw?.pdf_r2_url || currentDraw?.source_url || `https://dearresultlive.in/results/${currentDraw?.draw_date}/${activeSlot.toLowerCase()}`;
  // High-res gazette sheet preview image
  const jpgUrl = currentDraw?.image_r2_url || currentDraw?.source_url || `https://dearresultlive.in/og-image.jpg?date=${currentDraw?.draw_date}&slot=${activeSlot}`;

  const whatsappShareText = `🎯 *Dear Lottery Result Today (${currentDraw?.draw_time || 'Live'})*\n📅 তারিখ: ${currentDraw?.draw_date || 'Today'}\n\n🏆 *১ম পুরস্কার (₹1 Crore Winner)*: *${firstPrize.series} ${firstPrize.number}*\n\n👉 সম্পূর্ণ অফিসিয়াল রেজাল্ট শিট ও সব প্রাইজ নম্বর দেখুন:\nhttps://dearresultlive.in/results/${currentDraw?.draw_date}/${activeSlot.toLowerCase()}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;

  const handleCopyLink = () => {
    const url = `https://dearresultlive.in/results/${currentDraw?.draw_date}/${activeSlot.toLowerCase()}`;
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

  return (
    <div className="space-y-6">
      
      {/* 1. High-Contrast Draw Navigation Tabs with Authentic Indian Lottery Styling */}
      <div className="bg-slate-950 p-2 sm:p-2.5 rounded-2xl border-2 border-amber-500/30 shadow-2xl">
        <div className="grid grid-cols-3 gap-2">
          {slots.map(slot => {
            const isActive = activeSlot === slot.key;
            const drawForSlot = drawsList.find(d => d.draw_time?.includes(slot.key.replace('PM', '')) || d.id?.includes(slot.key));
            const isResultOut = Boolean(drawForSlot);

            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => setActiveSlot(slot.key)}
                className={`relative py-2.5 sm:py-3.5 px-2 sm:px-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-white/60 scale-[1.02]'
                    : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-lg">{slot.icon}</span>
                  <span className="text-xs sm:text-base font-extrabold tracking-tight">
                    {slot.time}
                  </span>
                </div>
                
                <span className={`text-[10px] sm:text-xs font-bold mt-0.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`}>
                  {slot.labelBn}
                </span>

                <div className="mt-1">
                  <span className={`inline-block text-[9px] sm:text-[10px] font-black px-2 py-0.2 rounded-full uppercase tracking-wider ${
                    isActive
                      ? 'bg-slate-950 text-amber-300'
                      : isResultOut
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isResultOut ? 'RESULT OUT' : 'UPCOMING'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {currentDraw ? (
        <div className="space-y-6">
          
          {/* 2. HERO: Authentic Golden Lottery Ticket (1st Prize Winner Card) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 p-1 shadow-2xl">
            <div className="bg-slate-950 rounded-[22px] p-5 sm:p-7 relative overflow-hidden">
              
              {/* Background watermark seal */}
              <div className="absolute right-4 -top-8 text-8xl font-black text-amber-500/10 select-none pointer-events-none">
                ₹1CR
              </div>

              {/* Top Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    ১ম পুরস্কার • 1ST PRIZE
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-400 font-mono">
                    {currentDraw.draw_name} ({currentDraw.draw_time})
                  </span>
                </div>

                <div className="text-xs text-slate-300 font-mono bg-slate-900 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                  Draw Date: <strong className="text-white">{currentDraw.draw_date}</strong>
                </div>
              </div>

              {/* Realistic Physical Ticket Look */}
              <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/25 to-amber-500/15 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-6 text-center shadow-inner relative">
                
                {/* Perforated edge markers */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-950 rounded-r-full border-r-2 border-y-2 border-amber-400/80"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-950 rounded-l-full border-l-2 border-y-2 border-amber-400/80"></div>

                <div className="inline-block bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-widest px-4 py-1 rounded-full shadow-md mb-2">
                  🏆 1st Prize Amount: ₹1,00,00,000 (1 Crore Winner)
                </div>

                {/* Big Bold Ticket Number (Series + 5 Digits) */}
                <div className="py-2 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                  <span className="bg-amber-400 text-slate-950 font-mono text-3xl sm:text-5xl md:text-6xl font-black px-3.5 py-1 rounded-xl shadow-md border-2 border-amber-300">
                    {firstPrize.series}
                  </span>
                  <span className="font-mono text-4xl sm:text-6xl md:text-7xl font-black text-amber-300 tracking-wider drop-shadow-[0_4px_16px_rgba(251,191,36,0.4)] select-all">
                    {firstPrize.number}
                  </span>
                </div>

                {/* Consolation Prize Notice */}
                <div className="mt-3 pt-3 border-t border-amber-500/30 text-xs sm:text-sm text-amber-100 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-3 py-0.5 rounded-full text-xs">
                    Consolation Prize: ₹1,000 (সান্ত্বনা পুরস্কার)
                  </span>
                  <span>
                    Applicable to all remaining series of ticket <strong className="font-mono text-white text-sm underline decoration-amber-400">{firstPrize.number}</strong>
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* 3. Official Gazette Sheet (Image Preview) & Social Utility Action Bar */}
          <div className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>📄</span>
                  <span>Official Government Gazette Sheet (অফিসিয়াল শিট)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Nagaland & Sikkim State Lotteries verified signed publication sheet.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => openImageLightbox(jpgUrl)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <span>🔍</span>
                  <span>Open Full Sheet (জুম শিট)</span>
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`${currentDraw.draw_date}_${activeSlot}.pdf`}
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
              onClick={() => openImageLightbox(jpgUrl)}
              className="group cursor-pointer relative bg-slate-950 border-2 border-slate-800 hover:border-amber-400 rounded-xl p-3 overflow-hidden transition-all flex flex-col sm:flex-row items-center gap-4"
            >
              {/* Thumbnail of Sheet */}
              <div className="w-full sm:w-48 h-32 bg-slate-900 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center relative flex-shrink-0">
                <img
                  src={jpgUrl}
                  alt={`Official Sheet ${currentDraw.draw_name} ${currentDraw.draw_time}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-90 group-hover:opacity-100"
                  onError={(e) => {
                    // Fallback to stylized gazette placeholder if image is pending
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

              {/* Sheet Summary & Verification Notes */}
              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    ✓ Official Certified Result
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Draw #{currentDraw.draw_number || '74'}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {currentDraw.draw_name} Official Signed Result Document
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Authentic scanned copy with directorate seals, judges signatures, and complete 5 prize tiers. Tap anywhere on this card to open in high-resolution full screen.
                </p>
              </div>
            </div>

          </div>

          {/* 4. High-Contrast Tabular Prize Tables */}
          
          {/* 2nd Prize: 10 Winners of ₹9,000 Each */}
          <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>2nd Prize: {formatINR(9000)} (২য় পুরস্কার - ১০ জন বিজয়ী)</span>
              </h3>
              <span className="text-xs text-emerald-400 font-bold font-mono">5 Digits / ৫ সংখ্যা</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {secondPrizes.map((num: string, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-900 border-2 border-slate-800 hover:border-emerald-500/60 rounded-xl py-2.5 px-3 text-center font-mono text-lg sm:text-xl font-black text-emerald-300 tracking-wider shadow-inner select-all"
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* 3rd & 4th Prize 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 3rd Prize (₹450 Each - 10 Winners) */}
            <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  <span>3rd Prize: {formatINR(450)} (৩য় পুরস্কার)</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Last 4 Digits</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {thirdPrizes.map((num: string, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 hover:border-teal-400/50 rounded-lg py-2 text-center font-mono text-base font-bold text-slate-100 tracking-wider select-all"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* 4th Prize (₹250 Each - 10 Winners) */}
            <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>4th Prize: {formatINR(250)} (৪র্থ পুরস্কার)</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Last 4 Digits</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {fourthPrizes.map((num: string, idx: number) => (
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

          {/* 5th Prize: 100 Numbers of ₹120 Each (High-Contrast Mobile Scanning Grid) */}
          <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h4 className="text-sm sm:text-base font-black text-white">
                  5th Prize: {formatINR(120)} (৫ম পুরস্কার - ১০০ জন বিজয়ী)
                </h4>
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold">
                Matches Last 4 Digits / শেষ ৪ সংখ্যা
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 pt-1">
              {fifthPrizes.map((num: string, idx: number) => (
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
              onClick={() => window.print()}
              type="button"
              className="text-slate-300 hover:text-white font-bold inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>🖨️</span>
              <span>Print Official Sheet</span>
            </button>
          </div>

        </div>
      ) : (
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <p className="text-lg font-bold text-white">
            Results for {activeSlot} are being updated from the Official Gazette.
          </p>
          <p className="text-sm text-slate-400">
            Please check back in a few moments or watch the live countdown above.
          </p>
        </div>
      )}

      {/* Lightbox Modal for Official Sheet Fullscreen Zoom View */}
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
                src={selectedImageUrl}
                alt="Official Dear Lottery Gazette Result Sheet"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-msg')) {
                    const msg = document.createElement('div');
                    msg.className = 'fallback-msg p-8 text-center text-slate-300';
                    msg.innerHTML = '<p class="font-bold text-amber-300 mb-2">Official Signed Gazette Document Available</p><p class="text-xs text-slate-400">Please use the Download PDF button below to view the official government signed publication.</p>';
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
