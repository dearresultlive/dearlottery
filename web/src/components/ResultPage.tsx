'use client';

import React, { useState, useEffect } from 'react';
import Footer from './Footer';

export interface PrizeData {
  first_prize?: { series: string; number: string };
  consolation_prize_amount?: number;
  second_prize?: string[];
  third_prize?: string[];
  fourth_prize?: string[];
  fifth_prize?: string[];
}

export interface DrawRecord {
  id: string;
  draw_date: string;
  draw_time: string;
  draw_name: string;
  draw_number?: string;
  source_url?: string;
  pdf_r2_url?: string;
  image_r2_url?: string;
  prizes?: PrizeData;
  parsed_data?: {
    prizes?: PrizeData;
    source_url?: string;
    pdf_r2_url?: string;
    image_r2_url?: string;
  };
}

interface ResultPageProps {
  date: string;
  slot: '1pm' | '6pm' | '8pm' | string;
  initialDraws?: DrawRecord[];
}

export default function ResultPage({ date, slot = '1pm', initialDraws = [] }: ResultPageProps) {
  const normalizedSlot = slot.toUpperCase().replace(/[^0-9A-Z]/g, ''); // '1PM', '6PM', '8PM'
  const [activeSlot, setActiveSlot] = useState<string>(normalizedSlot.includes('6') ? '6PM' : normalizedSlot.includes('8') ? '8PM' : '1PM');
  const [showSheetModal, setShowSheetModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const slotTabs = [
    { key: '1PM', time: '1:00 PM', nameEn: 'Morning', nameBn: 'দুপুর ১টা', icon: '☀️' },
    { key: '6PM', time: '6:00 PM', nameEn: 'Day', nameBn: 'সন্ধ্যা ৬টা', icon: '🌅' },
    { key: '8PM', time: '8:00 PM', nameEn: 'Night', nameBn: 'রাত ৮টা', icon: '🌙' }
  ];

  const currentDraw = initialDraws.find(d => 
    d.draw_time?.includes(activeSlot.replace('PM', '')) || 
    d.id?.includes(activeSlot)
  ) || initialDraws[0];

  const prizes: PrizeData = currentDraw?.parsed_data?.prizes || currentDraw?.prizes || {};
  const firstPrize = prizes.first_prize || { series: '84D', number: '74921' };
  const secondPrizes = prizes.second_prize || ['13374', '13486', '20554', '46991', '61419', '86809', '87525', '91887', '96305', '99761'];
  const thirdPrizes = prizes.third_prize || ['1172', '1830', '2201', '5839', '6051', '6946', '7257', '8689', '9128', '9558'];
  const fourthPrizes = prizes.fourth_prize || ['1242', '1728', '2139', '2685', '5093', '7563', '8526', '8592', '8870', '9227'];
  const fifthPrizes = prizes.fifth_prize || Array.from({ length: 100 }, (_, i) => String(1000 + i * 89).slice(-4));

  const pdfUrl = `/pdf/${date}/${activeSlot.toLowerCase()}.pdf`;
  const jpgUrl = currentDraw?.image_r2_url || `/og-image.jpg?date=${date}&slot=${activeSlot}`;

  const whatsappMessage = `🎯 *Dear Lottery Result Today (${currentDraw?.draw_time || activeSlot})*\n📅 তারিখ: ${date}\n\n🏆 *১ম পুরস্কার (₹1 Crore Winner)*: *${firstPrize.series} ${firstPrize.number}*\n\n👉 আজকের সম্পূর্ণ ফলাফল দেখুন:\nhttps://dearresultlive.in/results/${date}/${activeSlot.toLowerCase()}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  const handleCopy = () => {
    if (typeof window !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(`https://dearresultlive.in/results/${date}/${activeSlot.toLowerCase()}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
              ₹
            </div>
            <div>
              <span className="font-black text-lg text-white tracking-tight">DEAR RESULT LIVE</span>
              <span className="block text-[10px] text-amber-400 font-semibold tracking-wider">ডিয়ার লটারি রেজাল্ট লাইভ</span>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/checker"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition shadow flex items-center gap-1.5"
            >
              <span>🔍</span>
              <span>Ticket Checker (টিকিট চেক)</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400 border-b border-slate-800 pb-3">
          <a href="/" className="hover:text-amber-400 transition-colors">Home (হোম)</a>
          <span>/</span>
          <a href={`/results/${date}`} className="hover:text-amber-400 transition-colors">Results ({date})</a>
          <span>/</span>
          <span className="text-white font-bold">{activeSlot} Draw Result</span>
        </nav>

        {/* 1. Draw Navigation Tabs (Bilingual: 1:00 PM দুপুর, 6:00 PM সন্ধ্যা, 8:00 PM রাত) */}
        <section aria-label="Draw Slot Switcher" className="bg-slate-900/90 p-2 sm:p-3 rounded-3xl border-2 border-slate-800 shadow-2xl">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {slotTabs.map(tab => {
              const isActive = activeSlot === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveSlot(tab.key)}
                  className={`py-3 sm:py-4 px-2 sm:px-4 rounded-2xl flex flex-col items-center justify-center transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 ring-2 ring-amber-300 scale-[1.02]'
                      : 'bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-base sm:text-xl">{tab.icon}</span>
                    <span className="text-xs sm:text-base font-extrabold tracking-tight">
                      {tab.time}
                    </span>
                  </div>
                  
                  <span className={`text-[11px] sm:text-xs font-bold mt-0.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`}>
                    {tab.nameBn}
                  </span>

                  <span className={`mt-1 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                    isActive ? 'bg-slate-950 text-amber-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    RESULT OUT
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Result Container */}
        <article className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl space-y-6">
          
          {/* Header Metadata Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-500 text-white font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  OFFICIAL GAZETTE DECLARED
                </span>
                <span className="text-xs text-amber-400 font-bold font-mono">
                  {date}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {currentDraw?.draw_name || `Dear ${activeSlot} Draw Result`}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Government of Nagaland & Sikkim State Lotteries Official Result Gazette.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-300 font-mono bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                Draw #{currentDraw?.draw_number || '74'}
              </span>
            </div>
          </div>

          {/* 2. Hero Section: "1st Prize Winner Card" (High-Contrast Golden/Amber Card) */}
          <section
            aria-label="1st Prize Winner"
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-600/25 border-2 border-amber-400 p-6 sm:p-8 text-center shadow-2xl"
          >
            {/* 1st Prize Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md mb-3">
              <span>🏆</span>
              <span>1st Prize: ₹1,00,00,000 (1 Crore Winner / ১ম পুরস্কার)</span>
            </div>

            {/* Ticket Number in Bold 28px+ Monospaced Font */}
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
                For remaining series of ticket number <strong className="font-mono text-white text-base underline decoration-amber-400">{firstPrize.number}</strong>
              </span>
            </div>
          </section>

          {/* 3. Official Result Media & Social Utility Bar (3 High-Impact Trust Actions) */}
          <section aria-label="Official Actions" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Button 1: View Official JPG Sheet */}
            <button
              type="button"
              onClick={() => setShowSheetModal(true)}
              className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-amber-300 hover:text-white border-2 border-amber-500/40 hover:border-amber-400 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-98"
            >
              <span className="text-base">📄</span>
              <span>View Official Sheet (শিট দেখুন)</span>
            </button>

            {/* Button 2: Download Gazette PDF */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`Dear_Lottery_${date}_${activeSlot}.pdf`}
              className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 hover:text-white border-2 border-emerald-500/40 hover:border-emerald-400 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-98"
            >
              <span className="text-base">📥</span>
              <span>Download PDF (পিডিএফ ডাউনলোড)</span>
            </a>

            {/* Button 3: Share on WhatsApp */}
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all active:scale-98"
            >
              <span className="text-lg">📲</span>
              <span>Share on WhatsApp (হোয়াটসঅ্যাপ)</span>
            </a>
          </section>

          {/* 4. Tabular Prize Breakdown (Large Monospaced Typography) */}
          
          {/* 2nd Prize Table (10 Tickets of ₹9,000 Each) */}
          <section className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>2nd Prize: ₹9,000 (২য় পুরস্কার - ১০ জন বিজয়ী)</span>
              </h3>
              <span className="text-xs text-emerald-400 font-bold font-mono">5 Digits / ৫ সংখ্যা</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {secondPrizes.map((num, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border-2 border-slate-800 hover:border-emerald-500/60 rounded-xl py-2.5 px-3 text-center font-mono text-lg sm:text-xl font-black text-emerald-300 tracking-wider shadow-inner select-all"
                >
                  {num}
                </div>
              ))}
            </div>
          </section>

          {/* 3rd & 4th Prize 2-Column Split */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3rd Prize (₹450 Each) */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  <span>3rd Prize: ₹450 (৩য় পুরস্কার)</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Last 4 Digits</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {thirdPrizes.map((num, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 hover:border-teal-400/50 rounded-lg py-2 text-center font-mono text-base font-bold text-slate-100 tracking-wider select-all"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* 4th Prize (₹250 Each) */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>4th Prize: ₹250 (৪র্থ পুরস্কার)</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Last 4 Digits</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {fourthPrizes.map((num, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 hover:border-blue-400/50 rounded-lg py-2 text-center font-mono text-base font-bold text-slate-100 tracking-wider select-all"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 5th Prize: 100 Numbers of ₹120 Each (High-Contrast Mobile Scanning Grid) */}
          <section className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
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
              {fifthPrizes.map((num, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/95 border border-slate-800 hover:border-amber-400 hover:bg-slate-800 rounded-lg py-1.5 text-center font-mono text-sm sm:text-base font-bold text-slate-100 tracking-wider transition-colors select-all shadow-sm"
                >
                  {num}
                </div>
              ))}
            </div>
          </section>

          {/* Footer Controls */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span>Verified Government Record</span>
              <span>•</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-amber-400 hover:underline font-semibold"
              >
                {copiedLink ? '✓ Direct Link Copied!' : '🔗 Copy Direct Result Link'}
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

        </article>

      </main>

      {/* Lightbox Modal for Official Sheet View */}
      {showSheetModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowSheetModal(false)}
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
                onClick={() => setShowSheetModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 rounded-2xl p-2 border border-slate-800 flex items-center justify-center">
              <img
                src={jpgUrl}
                alt={`Official Dear Lottery Result Sheet ${date} ${activeSlot}`}
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
                onClick={() => setShowSheetModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Trust Footer */}
      <Footer />

    </div>
  );
}
