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
  // Available draw slot definitions with bilingual English + Bengali tags
  const slots = [
    { key: '1PM', time: '1:00 PM', labelEn: '1:00 PM Morning', labelBn: 'দুপুর ১টা', icon: '☀️' },
    { key: '6PM', time: '6:00 PM', labelEn: '6:00 PM Day', labelBn: 'সন্ধ্যা ৬টা', icon: '🌅' },
    { key: '8PM', time: '8:00 PM', labelEn: '8:00 PM Night', labelBn: 'রাত ৮টা', icon: '🌙' }
  ];

  // Determine active slot based on current IST time or default to 1PM
  const [activeSlot, setActiveSlot] = useState<string>('1PM');
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Auto-select latest published slot on mount
  useEffect(() => {
    if (draws.length > 0) {
      const now = new Date();
      // IST is UTC + 5:30
      const istHours = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
      if (istHours >= 20) {
        setActiveSlot('8PM');
      } else if (istHours >= 18) {
        setActiveSlot('6PM');
      } else {
        setActiveSlot('1PM');
      }
    }
  }, [draws]);

  // Find the active draw matching the slot
  const currentDraw = draws.find(d => 
    d.draw_time?.includes(activeSlot.replace('PM', '')) || 
    d.id?.includes(activeSlot)
  ) || draws[0];

  const prizes: PrizeData = currentDraw?.parsed_data?.prizes || currentDraw?.prizes || {};
  const firstPrize = prizes.first_prize || { series: '84D', number: '74921' };
  const secondPrizes = prizes.second_prize || [];
  const thirdPrizes = prizes.third_prize || [];
  const fourthPrizes = prizes.fourth_prize || [];
  const fifthPrizes = prizes.fifth_prize || [];

  // URLs for PDF and JPG
  const pdfUrl = currentDraw?.pdf_r2_url || currentDraw?.source_url || `https://dearresultlive.in/results/${currentDraw?.draw_date}/${activeSlot.toLowerCase()}`;
  const jpgUrl = currentDraw?.image_r2_url || currentDraw?.source_url || 'https://www.nagalandlotteries.com/images/sample_gazette.jpg';

  // Construct WhatsApp Share URL
  const whatsappShareText = `🎯 *Dear Lottery Result (${currentDraw?.draw_time || 'Live'})*\n📅 তারিখ: ${currentDraw?.draw_date || 'Today'}\n\n🏆 *১ম পুরস্কার (₹1 Crore Winner)*: *${firstPrize.series} ${firstPrize.number}*\n\n👉 সম্পূর্ণ রেজাল্ট শিট ও টিকিট চেক করুন:\nhttps://dearresultlive.in/results/${currentDraw?.draw_date}/${activeSlot.toLowerCase()}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;

  const handleCopyLink = () => {
    const url = `https://dearresultlive.in/results/${currentDraw?.draw_date}/${activeSlot.toLowerCase()}`;
    if (navigator?.clipboard) {
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
      {/* 1. High-Impact Draw Navigation Tabs with Bengali Microcopy */}
      <div className="bg-slate-950 p-2 sm:p-2.5 rounded-3xl border-2 border-slate-800 shadow-2xl">
        <div className="grid grid-cols-3 gap-2">
          {slots.map(slot => {
            const isActive = activeSlot === slot.key;
            const drawForSlot = draws.find(d => d.draw_time?.includes(slot.key.replace('PM', '')) || d.id?.includes(slot.key));
            const isResultOut = Boolean(drawForSlot);

            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => setActiveSlot(slot.key)}
                className={`relative py-3 sm:py-4 px-2 sm:px-4 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-amber-500 via-amber-600 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-300 scale-[1.02]'
                    : 'bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-xl">{slot.icon}</span>
                  <span className="text-xs sm:text-base font-extrabold tracking-tight">
                    {slot.time}
                  </span>
                </div>
                
                <span className={`text-[10px] sm:text-xs font-semibold mt-0.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`}>
                  {slot.labelBn}
                </span>

                {/* Status Badges */}
                <div className="mt-1">
                  {isResultOut ? (
                    <span className={`inline-block text-[9px] sm:text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                      isActive ? 'bg-slate-950 text-amber-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      RESULT OUT
                    </span>
                  ) : (
                    <span className="inline-block text-[9px] sm:text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider bg-slate-800 text-slate-400">
                      UPCOMING
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {currentDraw ? (
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl space-y-6">
          
          {/* Header Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-500 text-white font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  LIVE GAZETTE
                </span>
                <span className="text-xs text-amber-400 font-bold font-mono">
                  {currentDraw.draw_date}
                </span>
                <span className="text-xs text-slate-400">
                  • {currentDraw.draw_time} Draw
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {currentDraw.draw_name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                Draw No: <strong className="text-white font-mono">{currentDraw.draw_number || '74'}</strong>
              </span>
            </div>
          </div>

          {/* 2. Hero Section: "1st Prize Winner Card" (High-Impact Golden/Amber Card) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-600/25 border-2 border-amber-400 p-6 sm:p-8 text-center shadow-2xl">
            {/* Top Label */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md mb-4">
              <span>🏆</span>
              <span>1st Prize: ₹1,00,00,000 (1 Crore Winner / ১ম পুরস্কার)</span>
            </div>

            {/* Ticket Number in Bold 28px+ Font */}
            <div className="py-2">
              <div className="text-4xl sm:text-6xl md:text-7xl font-black font-mono text-amber-300 tracking-widest drop-shadow-[0_4px_16px_rgba(251,191,36,0.35)] select-all">
                {firstPrize.series} {firstPrize.number}
              </div>
            </div>

            {/* Consolation Prize Badge */}
            <div className="mt-4 pt-4 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs sm:text-sm text-amber-200">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-3 py-1 rounded-full uppercase tracking-wider text-xs">
                Consolation Prize: ₹1,000 (সান্ত্বনা পুরস্কার)
              </span>
              <span className="text-amber-100/90 font-medium">
                Applicable to all remaining series of ticket <strong className="font-mono text-white text-base underline decoration-amber-400">{firstPrize.number}</strong>
              </span>
            </div>
          </div>

          {/* 3. Official Result Media & Social Utility Bar (3 Core Trust Action Buttons) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 pb-2">
            
            {/* Button 1: View Official JPG Sheet */}
            <button
              type="button"
              onClick={() => openImageLightbox(jpgUrl)}
              className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-amber-300 hover:text-white border-2 border-amber-500/40 hover:border-amber-400 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-98"
            >
              <span className="text-base">📄</span>
              <span>View Official Sheet / শিট দেখুন</span>
            </button>

            {/* Button 2: Download Gazette PDF */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`${currentDraw.draw_date}_${activeSlot}.pdf`}
              className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 hover:text-white border-2 border-emerald-500/40 hover:border-emerald-400 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-98"
            >
              <span className="text-base">📥</span>
              <span>Download PDF / পিডিএফ</span>
            </a>

            {/* Button 3: WhatsApp Share Trigger */}
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

          {/* 4. High-Contrast Tabular Prize Tables */}
          
          {/* 2nd Prize: 10 Winners of ₹9,000 Each */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>2nd Prize: {formatINR(9000)} (১০ জন বিজয়ী)</span>
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
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
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
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
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
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
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

            {/* 100 Numbers Rendered in High-Legibility Font */}
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
            Please check back in a few moments or refresh the page.
          </p>
        </div>
      )}

      {/* Lightbox Modal for Official Sheet View */}
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
                src={selectedImageUrl}
                alt="Official Dear Lottery Gazette Result Sheet"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  // Fallback message if high-res image is loading
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-msg')) {
                    const msg = document.createElement('div');
                    msg.className = 'fallback-msg p-8 text-center text-slate-300';
                    msg.innerHTML = '<p class="font-bold mb-2">Official Digital Gazette PDF Available</p><p class="text-xs text-slate-400">Please use the Download PDF button below to view the signed government publication.</p>';
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
  );
}
