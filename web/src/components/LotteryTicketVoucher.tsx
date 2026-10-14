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
  series = '84D',
  number = '74921',
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
  const isPending = status === 'PENDING';

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-400 shadow-md overflow-hidden select-none">
      
      {/* Perforated Coupon Notches on Left and Right (Physical Ticket Aesthetic) */}
      <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-100 rounded-full border-r-2 border-amber-400 z-10 hidden sm:block shadow-inner"></div>
      <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-100 rounded-full border-l-2 border-amber-400 z-10 hidden sm:block shadow-inner"></div>

      {/* 1. Official Government Header Bar */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between text-[11px] sm:text-xs font-black tracking-wider uppercase shadow-xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-sm sm:text-base">🏛️</span>
          <span>নাগাল্যান্ড ও সিকিম রাজ্য লটারি (NAGALAND & SIKKIM STATE LOTTERIES)</span>
        </div>
        <div className="bg-amber-300 text-slate-950 font-black text-[10px] sm:text-xs px-2 py-0.5 rounded shadow-xs">
          মূল্য মাত্র ₹৬ (MRP ₹6)
        </div>
      </div>

      {/* 2. Official Draw Metadata Strip */}
      <div className="bg-amber-100/90 border-b border-amber-300 px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-800 font-mono font-bold">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600"></span>
          <span className="font-black text-slate-950">{drawName}</span>
          <span className="text-slate-600">({drawTime})</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-600">
          <span>ড্র #{drawNumber}</span>
          <span>•</span>
          <span>তারিখ: <strong className="text-slate-950">{drawDate}</strong></span>
          {isYesterday && (
            <span className="bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.2 rounded font-sans font-bold">
              গতকালকের
            </span>
          )}
        </div>
      </div>

      {/* 3. Physical Ticket Inner Body (Paper Texture & Security Guilloche Pattern) */}
      <div className="bg-white border-2 border-dashed border-amber-400 m-2.5 sm:m-4 rounded-xl p-4 sm:p-6 text-center relative overflow-hidden shadow-inner">
        
        {/* Subtle Watermark Stamp behind numbers */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] rotate-[-12deg]">
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border-8 border-slate-900 flex flex-col items-center justify-center font-black text-center p-2">
            <span className="text-xl sm:text-2xl font-mono">GOVERNMENT</span>
            <span className="text-2xl sm:text-3xl font-mono">VERIFIED</span>
            <span className="text-lg sm:text-xl font-mono">★ 1 CRORE ★</span>
          </div>
        </div>

        {/* 1st Prize Winner Banner */}
        <div className="inline-flex items-center gap-1.5 bg-red-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider px-4 py-1 rounded-full shadow-sm mb-2">
          <span>🏆</span>
          <span>১ম পুরস্কার: {prizeAmount}</span>
        </div>

        {/* Ticket Numbers or Pending State */}
        {!isPending ? (
          <div className="py-2 sm:py-3 flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
            {/* Series Box */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5 font-mono">
                সিরিজ (SERIES)
              </span>
              <span className="bg-slate-900 text-white font-mono text-3xl sm:text-5xl md:text-6xl font-black px-4 py-1 rounded-xl shadow-md border-2 border-slate-800">
                {series}
              </span>
            </div>

            {/* 5-Digit Winning Ticket Number */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5 font-mono">
                টিকিট নম্বর (TICKET NO.)
              </span>
              <span className="font-mono text-4xl sm:text-6xl md:text-7xl font-black text-slate-950 tracking-wider select-all">
                {number}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-3 sm:py-4 space-y-2.5">
            <div className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-wider">
              ফলাফল আসছে • ড্র হতে বাকি
            </div>
            {countdownText && (
              <div className="inline-flex items-center gap-2 bg-slate-900 text-amber-300 px-4 py-2 rounded-xl font-mono text-xs sm:text-sm font-black shadow-md border border-slate-800">
                <span>⏰ ড্র শুরু হতে বাকি:</span>
                <span className="tracking-widest">{countdownText}</span>
              </div>
            )}
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed pt-1">
              আজকের {drawTime} ড্র সম্পন্ন হওয়ার পর অফিশিয়াল রেজাল্ট শিট এবং বিজয়ী নম্বর এখানে চলে আসবে (পেজ রিফ্রেশ করার প্রয়োজন নেই)।
            </p>
          </div>
        )}

        {/* Consolation Prize Notice */}
        <div className="mt-2 pt-2.5 border-t border-slate-200 text-xs sm:text-sm text-slate-700 flex flex-col sm:flex-row items-center justify-center gap-2">
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-0.5 rounded-full text-xs">
            সান্ত্বনা পুরস্কার: {consolationAmount} (Consolation Prize)
          </span>
          <span className="text-slate-600">
            ১ম পুরস্কারের ৫ সংখ্যা মিললে অন্য সব সিরিজের টিকিট এই সান্ত্বনা পুরস্কার পাবে।
          </span>
        </div>

        {/* 4. Barcode & Security Strip (Iconic Lottery Stub Look) */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          
          {/* Realistic SVG Barcode Graphic */}
          <div className="flex items-center gap-2">
            <svg className="h-6 w-32 sm:h-7 sm:w-40 text-slate-800" viewBox="0 0 100 24" fill="currentColor">
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
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-500 font-bold tracking-tight">
              DL-{drawDate.replace(/[^0-9]/g, '')}-{isPending ? 'PENDING' : `${series}-${number}`}
            </span>
          </div>

          {/* Security Verification Stamp */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase shadow-2xs ${
            isPending
              ? 'text-amber-800 bg-amber-50 border border-amber-300'
              : 'text-emerald-800 bg-emerald-50 border border-emerald-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-600'} animate-pulse`}></span>
            {isPending ? '⏳ ড্র প্রক্রিয়াধীন (Draw Pending)' : '✓ সরকারি ডিরেক্টরেট ভেরিফায়েড'}
          </div>

        </div>

      </div>

    </div>
  );
}
