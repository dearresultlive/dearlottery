import React, { useState, useEffect } from 'react';
import DrawCountdown from './DrawCountdown';
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
  const [showVoucher, setShowVoucher] = useState<boolean>(false);
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

  const directStaticUrl = `/results/${targetDate}/${slotKey}.jpg`;
  const pdfUrl = `/pdf/${targetDate}/${slotKey}.pdf`;
  const sheetSvgUrl = `/api/gazette-sheet.svg?date=${targetDate}&slot=${slotKey}`;
  const proxySheetUrl = `/api/sheet-image?date=${targetDate}&slot=${slotKey}`;
  const defaultSheetImg = currentDraw?.image_r2_url && !currentDraw.image_r2_url.includes('lottery.sambad.com') && !currentDraw.image_r2_url.includes('/api/sheet-image')
    ? currentDraw.image_r2_url
    : directStaticUrl;
  const [activeSheetImg, setActiveSheetImg] = useState<string>(defaultSheetImg);

  useEffect(() => {
    setActiveSheetImg(
      currentDraw?.image_r2_url && !currentDraw.image_r2_url.includes('lottery.sambad.com') && !currentDraw.image_r2_url.includes('/api/sheet-image')
        ? currentDraw.image_r2_url
        : directStaticUrl
    );
  }, [currentDraw, targetDate, slotKey, directStaticUrl]);

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

          {/* Pending Draw PDF Status & Official Notice Bar */}
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></span>
              <div>
                <p className="text-xs sm:text-sm font-black text-amber-950">
                  {lang === 'bn' 
                    ? `আজকের ${slotHour} অফিসিয়াল রেজাল্ট শিট ও পিডিএফ ড্র ঘোষণার সাথে সাথে চলে আসবে`
                    : `Today's ${slotHour} Official Gazette PDF will be available right after draw`}
                </p>
                <p className="text-[11px] text-amber-800">
                  {lang === 'bn' ? 'ড্র সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন অথবা সরকারি ড্র শিডিউল নোটিশ ডাউনলোড করুন' : 'Draw is scheduled. You can download the official schedule notice PDF.'}
                </p>
              </div>
            </div>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`Dear_Lottery_${targetDate}_${slotKey}_Notice.pdf`}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-100 border border-amber-400 text-amber-950 font-bold text-xs sm:text-sm px-4 py-2 rounded-xl transition-colors shadow-2xs whitespace-nowrap"
            >
              <span>📋</span>
              <span>{lang === 'bn' ? 'ড্র শিডিউল নোটিশ (PDF)' : 'Draw Notice (PDF)'}</span>
            </a>
          </div>

          {/* Prize Structure Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-4 shadow-sm">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📋</span>
              <span>Official Prize Structure for {slotHour} ({currentDraw?.draw_name || 'Dear State Lottery'})</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-500 block font-semibold">2nd Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-emerald-800 block my-1">₹10,000</span>
                <span className="text-[10px] text-slate-400 font-medium">10 Winners</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-500 block font-semibold">3rd Prize</span>
                <span className="text-lg sm:text-xl font-mono font-black text-blue-700 block my-1">₹500</span>
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

          {/* 1. Lottery Sambad Winning Result Hero Card */}
          <div
            onClick={() => setShowImageModal(true)}
            className={`cursor-pointer relative overflow-hidden rounded-2xl border p-4 sm:p-5 text-center transition-all hover:shadow-md ${
              slotKey.includes('1')
                ? 'bg-[#e9f5db] border-emerald-300'
                : slotKey.includes('6')
                ? 'bg-[#e3eefb] border-blue-300'
                : 'bg-[#fbe8e8] border-red-300'
            }`}
          >
            {/* Vertical Side Band */}
            <div
              className={`absolute top-0 right-0 bottom-0 w-8 sm:w-10 flex items-center justify-center overflow-hidden ${
                slotKey.includes('1')
                  ? 'bg-[#16a34a] text-[#ffdd00]'
                  : slotKey.includes('6')
                  ? 'bg-[#f5c518] text-[#dc2626]'
                  : 'bg-[#dc2626] text-[#ffdd00]'
              }`}
            >
              <span className="font-black text-xs sm:text-sm tracking-wider uppercase -rotate-90 whitespace-nowrap">
                DEAR {slotHour}
              </span>
            </div>

            <div className="pr-8 sm:pr-10">
              {/* Top Date Header */}
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-[#e93323] text-white font-extrabold text-xs px-2.5 py-0.5 rounded-md shadow-2xs">
                    {targetDate.split('-').reverse().join('/')}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {lang === 'bn' ? 'অফিসিয়াল ১ম পুরস্কার' : 'OFFICIAL 1ST PRIZE'}
                  </span>
                </div>
                <span className="text-xs text-slate-600 font-bold truncate">
                  {currentDraw?.draw_name || `${slotHour} Draw`} • #{currentDraw?.draw_number || '74'}
                </span>
              </div>

              {/* Massive 1st Prize Number */}
              <div className="py-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-0.5">
                  {lang === 'bn' ? '১ম পুরস্কার • 1st Prize ₹1 Crore Winner' : '1st Prize • ₹1 Crore Winner (১ কোটি টাকা)'}
                </span>
                <div className={`first-prize-num font-mono font-black text-4xl sm:text-6xl tracking-widest ${
                  slotKey.includes('1') ? 'text-[#2c65c5]' : slotKey.includes('6') ? 'text-[#dc2626]' : 'text-[#32733b]'
                }`}>
                  {first.series} {first.number}
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="bg-amber-300 text-amber-950 font-bold text-[11px] px-2.5 py-0.5 rounded shadow-2xs">
                    {lang === 'bn' ? 'সান্ত্বনা পুরস্কার: ₹১,০০০' : 'Consolation: ₹1,000'}
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {lang === 'bn' ? '(বাকি সব সিরিজে)' : '(Remaining Series)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Action Controls Toolbar (Zoom, PDF, JPG, WhatsApp) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl py-2 px-1 sm:px-2 flex items-center justify-center gap-1 font-black shadow-2xs text-center transition-all active:scale-95"
            >
              <span>🔍</span>
              <span className="truncate">{lang === 'bn' ? 'বড় শিট' : 'Zoom'}</span>
            </button>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`Dear_Lottery_${targetDate}_${slotKey}.pdf`}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl py-2 px-1 sm:px-2 flex items-center justify-center gap-1 font-black uppercase shadow-2xs text-center transition-colors"
            >
              <span>📥 PDF</span>
            </a>
            <a
              href={activeSheetImg}
              target="_blank"
              rel="noopener noreferrer"
              download={`Dear_Lottery_${targetDate}_${slotKey}.jpg`}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl py-2 px-1 sm:px-2 flex items-center justify-center gap-1 font-black uppercase shadow-2xs text-center transition-colors"
            >
              <span>🖼️ JPG</span>
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl py-2 px-1 sm:px-2 flex items-center justify-center gap-1 font-black uppercase shadow-2xs text-center transition-all active:scale-95"
            >
              <span>💬 Share</span>
            </a>
          </div>

          {/* 3. Direct Scanned / Official Gazette Result Sheet Image (TOTAL RESULT) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-4 shadow-sm text-center space-y-2.5">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-left">
                <span className="text-sm">📜</span>
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  {lang === 'bn' 
                    ? `অফিসিয়াল গেজেট রেজাল্ট শিট (${currentDraw?.draw_time || slotHour}) • সম্পূর্ণ ফলাফল` 
                    : `Official Gazette Result Sheet (${currentDraw?.draw_time || slotHour}) • Total Result`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="text-xs font-black text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>{lang === 'bn' ? '🔍 ফুল স্ক্রিন জুম' : '🔍 Full Screen Zoom'}</span>
              </button>
            </div>

            <div
              onClick={() => setShowImageModal(true)}
              style={{ minHeight: '380px' }}
              className="cursor-zoom-in relative rounded-xl overflow-hidden border border-slate-200 bg-[#fcfbf7] group shadow-inner aspect-[1/1.414] max-w-[480px] sm:max-w-[500px] mx-auto"
            >
              <img
                src={activeSheetImg}
                alt={`Official Gazette Result Sheet ${currentDraw?.draw_name || slotHour} ${targetDate}`}
                width={557}
                height={788}
                decoding="async"
                className="w-full h-full object-contain transition-transform group-hover:scale-[1.01]"
                loading="eager"
                onError={() => {
                  if (activeSheetImg !== proxySheetUrl) {
                    setActiveSheetImg(proxySheetUrl);
                  } else if (activeSheetImg !== sheetSvgUrl) {
                    setActiveSheetImg(sheetSvgUrl);
                  }
                }}
              />
              <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-colors flex items-center justify-center pointer-events-none">
                <span className="bg-white/95 text-slate-900 text-xs font-black px-3.5 py-1.5 rounded-full shadow border border-slate-200 opacity-90 group-hover:opacity-100">
                  {lang === 'bn' ? '🔍 ট্যাপ করে ফুল স্ক্রিনে বড় করুন' : '🔍 Tap to view full screen zoom'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Optional Ticket Voucher View Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowVoucher(!showVoucher)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              <span>🎟️</span>
              <span>{showVoucher ? (lang === 'bn' ? 'টিকিট ভাউচার লুকান' : 'Hide Ticket Voucher') : (lang === 'bn' ? 'টিকিট ভাউচার ভিউ দেখুন' : 'View Ticket Voucher')}</span>
            </button>
          </div>

          {showVoucher && (
            <div className="animate-in fade-in duration-200">
              <LotteryTicketVoucher
                status="DECLARED"
                series={first.series}
                number={first.number}
                drawName={currentDraw?.draw_name || `${slotHour} Draw`}
                drawTime={currentDraw?.draw_time || slotHour}
                drawDate={targetDate}
                drawNumber={currentDraw?.draw_number || '74'}
              />
            </div>
          )}

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
                aria-label="Close modal"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 rounded-xl p-2 border border-slate-200 flex justify-center items-start">
              <img
                src={activeSheetImg}
                alt="Official Dear Lottery Gazette Result Sheet"
                className="max-w-full max-h-[75vh] object-contain rounded shadow-lg mx-auto block"
                onError={() => {
                  if (activeSheetImg !== sheetSvgUrl) {
                    setActiveSheetImg(sheetSvgUrl);
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
