import React from 'react';

interface LotteryTicketVoucherProps {
  series?: string;
  number?: string;
  drawName: string;
  drawTime: string;
  drawDate: string;
  drawNumber?: string;
  prizeAmount?: string;
  consolationAmount?: string;
  status?: 'DECLARED' | 'PENDING';
  countdownText?: string;
  isYesterday?: boolean;
}

export default function LotteryTicketVoucher({
  series = '',
  number = '',
  drawName,
  drawTime,
  drawDate,
  drawNumber = '74',
  prizeAmount = '₹1,00,00,000 (1 Crore / ১ কোটি টাকা)',
  consolationAmount = '₹1,000',
  status = 'DECLARED',
  countdownText,
  isYesterday = false
}: LotteryTicketVoucherProps) {
  const isPending = status === 'PENDING' || !number || number.trim().length === 0;

  return (
    <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden select-none">
      
      {/* 1. Official Government Header Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between text-[11px] sm:text-xs font-black tracking-wider uppercase">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-sm sm:text-base">🏛️</span>
          <span>নাগাল্যান্ড ও সিকিম রাজ্য লটারি • অফিশিয়াল রেজাল্ট ভাউচার</span>
        </div>
        <div className="bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded shadow-xs">
          MRP ₹7
        </div>
      </div>

      {/* 2. Draw Metadata Strip */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-700 font-mono font-bold">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span className="font-black text-slate-950">{drawName}</span>
          <span className="text-blue-700 font-black">({drawTime})</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-600">
          <span>ড্র #{drawNumber}</span>
          <span>•</span>
          <span>তারিখ: <strong className="text-slate-950">{drawDate}</strong></span>
          {isYesterday && (
            <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.2 rounded font-sans font-bold">
              গতকালকের ফলাফল
            </span>
          )}
        </div>
      </div>

      {/* 3. Ticket Inner Body (Clean Monospace Layout) */}
      <div className="bg-slate-50/50 border border-slate-200 m-2 sm:m-3.5 rounded-xl p-4 sm:p-6 text-center relative overflow-hidden">
        
        {/* 1st Prize Winner Header Tag */}
        <div className="inline-flex items-center gap-1.5 bg-red-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider px-3.5 py-1 rounded-full shadow-xs mb-3">
          <span>🏆</span>
          <span>১ম পুরস্কার: {prizeAmount}</span>
        </div>

        {/* Numbers (Monospace High-Contrast Clear Layout) */}
        {!isPending ? (
          <div className="py-2 flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
            {/* Series Box */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 font-mono">
                সিরিজ (SERIES)
              </span>
              <span className="bg-slate-900 text-amber-300 font-mono text-3xl sm:text-5xl md:text-6xl font-black px-4 py-1 rounded-xl shadow-sm border border-slate-800">
                {series}
              </span>
            </div>

            {/* 5-Digit Winning Ticket Number */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 font-mono">
                টিকিট নম্বর (TICKET NO.)
              </span>
              <span className="font-mono text-4xl sm:text-6xl md:text-7xl font-black text-slate-950 tracking-widest select-all">
                {number}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4 sm:py-6 space-y-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ফলাফল আসছে • ড্র প্রক্রিয়াধীন
            </div>
            {countdownText && (
              <div className="inline-flex items-center gap-2 bg-slate-900 text-amber-300 px-4 py-2 rounded-xl font-mono text-xs sm:text-sm font-black shadow-sm border border-slate-800">
                <span>⏰ ড্র অনুষ্ঠিত হতে বাকি:</span>
                <span className="tracking-widest">{countdownText}</span>
              </div>
            )}
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed pt-1">
              আজকের {drawTime} ড্র সম্পন্ন হওয়ার পর অফিশিয়াল গেজেট শিট এবং সকল বিজয়ী নম্বর স্বয়ংক্রিয়ভাবে এখানে প্রদর্শিত হবে।
            </p>
          </div>
        )}

        {/* Consolation Prize Notice */}
        <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row items-center justify-center gap-2">
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
            সান্ত্বনা পুরস্কার: {consolationAmount}
          </span>
          <span className="text-slate-600">
            ১ম পুরস্কারের ৫ সংখ্যা মিললে অন্য সব সিরিজের টিকিট এই সান্ত্বনা পুরস্কার পাবে।
          </span>
        </div>

        {/* 4. Barcode & Security Strip */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          
          <div className="flex items-center gap-2">
            <svg className="h-5 w-28 sm:h-6 sm:w-36 text-slate-800" viewBox="0 0 100 24" fill="currentColor">
              <rect x="0" y="0" width="2.5" height="24"/>
              <rect x="4" y="0" width="1" height="24"/>
              <rect x="7" y="0" width="3" height="24"/>
              <rect x="12" y="0" width="1.5" height="24"/>
              <rect x="15" y="0" width="1" height="24"/>
              <rect x="18" y="0" width="3.5" height="24"/>
              <rect x="23" y="0" width="2" height="24"/>
              <rect x="27" y="0" width="1" height="24"/>
              <rect x="30" y="0" width="3" height="24"/>
              <rect x="35" y="0" width="1.5" height="24"/>
              <rect x="38" y="0" width="4" height="24"/>
              <rect x="44" y="0" width="1" height="24"/>
              <rect x="47" y="0" width="2.5" height="24"/>
              <rect x="51" y="0" width="2" height="24"/>
              <rect x="55" y="0" width="1" height="24"/>
              <rect x="58" y="0" width="3.5" height="24"/>
              <rect x="63" y="0" width="2" height="24"/>
              <rect x="67" y="0" width="3" height="24"/>
              <rect x="72" y="0" width="1" height="24"/>
              <rect x="75" y="0" width="3.5" height="24"/>
              <rect x="80" y="0" width="2" height="24"/>
              <rect x="84" y="0" width="1" height="24"/>
              <rect x="87" y="0" width="3" height="24"/>
              <rect x="92" y="0" width="1.5" height="24"/>
              <rect x="95" y="0" width="2" height="24"/>
              <rect x="98" y="0" width="2" height="24"/>
            </svg>
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-500 font-bold">
              DL-{drawDate.replace(/[^0-9]/g, '')}-{isPending ? 'PENDING' : `${series}-${number}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase text-emerald-800 bg-emerald-50 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            {isPending ? 'ড্র শিডিউল অনুযায়ী চালিত' : '✓ সরকারি গেজেট অনুমোদিত'}
          </div>

        </div>

      </div>

    </div>
  );
}
