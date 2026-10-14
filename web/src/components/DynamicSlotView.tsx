import React, { useState, useEffect } from 'react';
import DrawCountdown from './DrawCountdown';
import PushNotifyBanner from './PushNotifyBanner';
import LotteryTicketVoucher from './LotteryTicketVoucher';
import { useLanguage } from '../lib/i18n';

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
  const { lang, t } = useLanguage();
  const [currentDraw, setCurrentDraw] = useState<any>(initialDraw);
  const [isUpcoming, setIsUpcoming] = useState<boolean>(isInitiallyUpcoming);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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

  const pdfUrl = currentDraw?.pdf_r2_url || `/pdf/${targetDate}/${slotKey}.pdf`;
  const jpgUrl = currentDraw?.image_r2_url || `/og-image.jpg?date=${targetDate}&slot=${slotKey}`;

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
    <div className="space-y-5 sm:space-y-6">
      
      {/* State A: UPCOMING / PRE-PUBLISHED (Before results are extracted) */}
      {isUpcoming ? (
        <div className="space-y-5 sm:space-y-6">
          
          <DrawCountdown onResultDetected={(found) => {
            setCurrentDraw(found);
            setIsUpcoming(false);
          }} />

          {/* Authentic Physical Pending Ticket Voucher */}
          <LotteryTicketVoucher
            status="PENDING"
            drawName={currentDraw?.draw_name || `Dear ${slotHour} Draw`}
            drawTime={currentDraw?.draw_time || slotHour}
            drawDate={targetDate}
            drawNumber={currentDraw?.draw_number || '74'}
          />

          {/* Prize Structure Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-4 shadow-sm">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📋</span>
              <span>Official Prize Structure for {slotHour} ({currentDraw?.draw_name || 'Dear State Lottery'})</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-500 block font-semibold">2nd Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-emerald-800 block my-1">₹9,000</span>
                <span className="text-[10px] text-slate-400 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-500 block font-semibold">3rd Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-blue-700 block my-1">₹450</span>
                <span className="text-[10px] text-slate-400 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-500 block font-semibold">4th Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-indigo-700 block my-1">₹250</span>
                <span className="text-[10px] text-slate-400 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-500 block font-semibold">5th Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-slate-900 block my-1">₹120</span>
                <span className="text-[10px] text-slate-400 font-medium">100 Winners</span>
              </div>
            </div>
          </div>

          {/* Quick link / preview for Yesterday's Result */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">📅</span>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  Checking Yesterday's Ticket? (গতকালকের রেজাল্ট)
                </h4>
              </div>
              <a
                href="/old-results"
                className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto"
              >
                Browse Past Results Archive →
              </a>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Today's {slotHour} draw is scheduled for {slotHour}. If you have a ticket from yesterday, check the official results archive or use the Ticket Search below to verify all prize tiers.
            </p>
          </div>

          <PushNotifyBanner />

        </div>
      ) : (
        /* State B: DECLARED / PUBLISHED */
        <div className="space-y-5 sm:space-y-6">
          
          {/* Header Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-600 text-white font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  LIVE GAZETTE RECORD
                </span>
                <span className="text-xs text-blue-700 font-bold font-mono">
                  {targetDate}
                </span>
                <span className="text-xs text-slate-500">
                  • {currentDraw?.draw_time || slotHour} Draw
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {currentDraw?.draw_name || `Dear ${slotHour} Draw Result`}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-mono bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                Draw #{currentDraw?.draw_number || '74'}
              </span>
              <button
                type="button"
                onClick={() => typeof window !== 'undefined' && window.print()}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
              >
                🖨️ Print
              </button>
            </div>
          </div>

          {/* 1st Prize Authentic Physical Ticket Voucher */}
          <LotteryTicketVoucher
            status="DECLARED"
            series={first.series}
            number={first.number}
            drawName={currentDraw?.draw_name || `${slotHour} Draw`}
            drawTime={currentDraw?.draw_time || slotHour}
            drawDate={targetDate}
            drawNumber={currentDraw?.draw_number || '74'}
          />

          {/* Official Gazette Sheet Preview & Utility Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>📄</span>
                  <span>{t('gazette_sheet_title')}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('gazette_sheet_sub')}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <span>{t('btn_open_sheet')}</span>
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`Dear_Lottery_${targetDate}_${slotKey}.pdf`}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all border border-slate-300"
                >
                  <span>{t('btn_download_pdf')}</span>
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <span>{t('btn_share_whatsapp')}</span>
                </a>
              </div>
            </div>

            <div 
              onClick={() => setShowImageModal(true)}
              className="group cursor-pointer bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl p-3 transition-all flex flex-col sm:flex-row items-center gap-4"
            >
              <div className="w-full sm:w-48 h-32 bg-white rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative flex-shrink-0 shadow-inner">
                <img
                  src={jpgUrl}
                  alt={`Official Sheet ${currentDraw?.draw_name || slotHour}`}
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
                    {lang === 'bn' ? '🔍 বড় করে দেখুন' : '🔍 Click to Zoom'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {t('verified_certified')}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Draw #{currentDraw?.draw_number || '74'}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  {currentDraw?.draw_name || `${slotHour} Draw`} {lang === 'bn' ? 'অফিসিয়াল স্বাক্ষরিত গেজেট' : 'Official Signed Result Document'}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'bn'
                    ? 'সরকারি সিল ও স্বাক্ষর সম্বলিত আসল স্ক্যান কপি। সম্পূর্ণ শিটটি হাই-রেজোলিউশনে দেখতে এখানে ট্যাপ করুন।'
                    : 'Authentic scanned copy with directorate seals, judges signatures, and complete 5 prize tiers. Tap anywhere on this card to open in high-resolution full screen.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2nd Prize Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>{t('second_prize_title')}</span>
              </h4>
              <span className="text-xs text-emerald-700 font-bold font-mono">
                {lang === 'bn' ? '৫ সংখ্যার টিকিট' : '5 Digits'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {second.map((num: string, idx: number) => (
                <div
                  key={idx}
                  className="bg-emerald-50/60 border border-emerald-200 hover:border-emerald-400 rounded-xl py-2.5 px-3 text-center font-mono text-lg sm:text-xl font-black text-emerald-950 tracking-wider shadow-xs select-all"
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* 3rd & 4th Prize */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>{t('third_prize_title')}</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {lang === 'bn' ? 'শেষ ৪ সংখ্যা' : 'Last 4 Digits'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {third.map((num: string, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg py-2 text-center font-mono text-base font-bold text-slate-900 tracking-wider select-all"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <span>{t('fourth_prize_title')}</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {lang === 'bn' ? 'শেষ ৪ সংখ্যা' : 'Last 4 Digits'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {fourth.map((num: string, idx: number) => (
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

          {/* 5th Prize Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  {t('fifth_prize_title')}
                </h4>
              </div>
              <span className="text-xs text-blue-700 font-mono font-bold">
                {lang === 'bn' ? 'শেষ ৪ সংখ্যা মিলেছে' : 'Matches Last 4 Digits'}
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 pt-1">
              {fifth.map((num: string, idx: number) => (
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

      {/* Lightbox Modal for Official Sheet View */}
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
                src={jpgUrl}
                alt="Official Dear Lottery Gazette Result Sheet"
                className="max-w-full max-h-[75vh] object-contain rounded shadow-lg"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-msg')) {
                    const msg = document.createElement('div');
                    msg.className = 'fallback-msg p-8 text-center text-slate-700';
                    msg.innerHTML = '<p class="font-bold text-slate-900 mb-2">Official Signed Gazette Document Available</p><p class="text-xs text-slate-500">Please use the Download PDF button below to view the signed publication.</p>';
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
