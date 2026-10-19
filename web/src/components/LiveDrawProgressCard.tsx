import React, { useState, useEffect } from 'react';

interface LiveDrawProgressCardProps {
  slot: '1PM' | '6PM' | '8PM';
  slotTime: string;
  drawName?: string;
  lang: 'en' | 'bn' | 'hi';
}

export default function LiveDrawProgressCard({
  slot,
  slotTime,
  drawName = 'DEAR LOTTERY',
  lang = 'en'
}: LiveDrawProgressCardProps) {
  // Realistic shuffling digits for the visual tumbler simulation
  const [shufflingDigits, setShufflingDigits] = useState<string[]>(['?', '?', '?', '?', '?']);
  const [shufflingSeries, setShufflingSeries] = useState<string>('??');
  const [statusStepIndex, setStatusStepIndex] = useState<number>(0);

  const seriesPool = ['42A', '58B', '72C', '84D', '91E', '36G', '67H', '89J', '95K', '79L'];
  const digitsPool = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Status ticker messages (Trilingual, Authentic & 100% Legal Safe-Harbor)
  const statusSteps = [
    {
      en: '🏛️ Directorate Draw Room Machine Activated (Kohima)',
      bn: '🏛️ নাগাল্যান্ড ডিরেক্টরেট ড্র রুম মেকানিকাল মেশিন চালু হয়েছে',
      hi: '🏛️ नागालैंड निदेशालय ड्रा रूम मैकेनिकल मशीन सक्रिय है'
    },
    {
      en: '🎰 ₹1 Crore 1st Prize Motorized Tumbler Rotating...',
      bn: '🎰 ১ম পুরস্কার ₹১ কোটি মোটরচালিত বল ড্রাম ঘুরছে...',
      hi: '🎰 ₹1 करोड़ प्रथम पुरस्कार मोटराइज्ड टंबलर घूम रहा है...'
    },
    {
      en: '⚖️ Government Judges & Directorate Officers Witnessing Draw...',
      bn: '⚖️ সরকারি বিচারক ও ডিরেক্টরেট অফিসারদের উপস্থিতিতে ড্র অনুষ্ঠিত হচ্ছে...',
      hi: '⚖️ सरकारी न्यायाधीशों एवं अधिकारियों की उपस्थिति में ड्रा जारी...'
    },
    {
      en: '📄 Official Gazette Winning Sheet Judges Signing...',
      bn: '📄 সরকারি গেজেট শিটে বিচারকদের স্বাক্ষর সম্পন্ন হচ্ছে...',
      hi: '📄 आधिकारिक गजट शीट पर न्यायाधीशों के हस्ताक्षर किए जा रहे हैं...'
    },
    {
      en: '⚡ Fast-Release Edge Sync Active (Auto-reveal in seconds)',
      bn: '⚡ ফাস্ট-রিলিজ লাইভ সিঙ্ক সক্রিয় (কয়েক সেকেন্ডে স্বয়ংক্রিয় প্রকাশ)',
      hi: '⚡ फास्ट-रिलीज लाइव सिंक सक्रिय (कुछ ही सेकंड में स्वतः परिणाम)'
    }
  ];

  // Rapid digit rolling ticker (60ms interval, super lightweight pure state, compositor friendly)
  useEffect(() => {
    const digitInterval = setInterval(() => {
      setShufflingDigits([
        digitsPool[Math.floor(Math.random() * 10)],
        digitsPool[Math.floor(Math.random() * 10)],
        digitsPool[Math.floor(Math.random() * 10)],
        digitsPool[Math.floor(Math.random() * 10)],
        digitsPool[Math.floor(Math.random() * 10)]
      ]);
      setShufflingSeries(seriesPool[Math.floor(Math.random() * seriesPool.length)]);
    }, 90);

    // Rotate status step every 3.5 seconds
    const statusInterval = setInterval(() => {
      setStatusStepIndex(prev => (prev + 1) % statusSteps.length);
    }, 3500);

    return () => {
      clearInterval(digitInterval);
      clearInterval(statusInterval);
    };
  }, []);

  const currentStep = statusSteps[statusStepIndex] || statusSteps[0];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-6 text-white shadow-xl shadow-amber-500/10">
      
      {/* Background Ambient Glow & Mechanical Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        
        {/* Top Header: Directorate Live Feed Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-red-400 bg-red-950/80 border border-red-500/40 px-2.5 py-0.5 rounded-full">
              {lang === 'bn' ? '🔴 ড্র চলছে • LIVE DRAW' : lang === 'hi' ? '🔴 ड्रा प्रगति पर है • LIVE DRAW' : '🔴 LIVE DRAW IN PROGRESS'}
            </span>
          </div>

          <div className="text-[11px] font-bold text-amber-300/90 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{slotTime} {drawName}</span>
          </div>
        </div>

        {/* Centerpiece: Real-World Lottery Tumbler Simulation */}
        <div className="py-2 text-center space-y-3">
          
          <div className="text-xs sm:text-sm font-black text-amber-200 tracking-wide">
            {lang === 'bn' 
              ? '১ম পুরস্কার ₹১ কোটি বল ড্রাম ঘুরছে (ফলাফল তৈরি হচ্ছে)' 
              : lang === 'hi'
              ? 'प्रथम पुरस्कार ₹1 करोड़ बॉल टंबलर घूम रहा है (नंबर तैयार हो रहे हैं)'
              : '1st Prize ₹1 Crore Ball Tumbler In Motion (Extracting Winning Digits)'}
          </div>

          {/* Mechanical Shuffling Digit Reels */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 pt-1">
            
            {/* Series Reel */}
            <div className="flex flex-col items-center">
              <div className="w-12 sm:w-16 h-14 sm:h-16 bg-gradient-to-b from-amber-600 via-amber-500 to-amber-700 border-2 border-amber-300 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 transform transition-transform">
                <span className="font-mono font-black text-base sm:text-xl text-slate-950 tracking-wider">
                  {shufflingSeries}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-300/80 uppercase tracking-widest mt-1">
                SERIES
              </span>
            </div>

            <span className="text-amber-400 font-black text-xl sm:text-2xl self-center pb-4 select-none">
              •
            </span>

            {/* 5 Number Reels */}
            {shufflingDigits.map((digit, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-10 sm:w-13 h-14 sm:h-16 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-2 border-amber-400/60 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden group">
                  {/* Subtle Glass glare overlay */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 pointer-events-none rounded-t-lg" />
                  <span className="font-mono font-black text-xl sm:text-2xl text-amber-300 animate-pulse">
                    {digit}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1">
                  D{idx + 1}
                </span>
              </div>
            ))}

          </div>

          {/* Visual Mechanical Rotating Lottery Tumbler Graphic */}
          <div className="flex items-center justify-center gap-2 pt-1 text-slate-400 text-xs">
            <svg 
              className="w-5 h-5 text-amber-400 animate-spin" 
              style={{ animationDuration: '3s' }} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
            <span className="text-xs font-semibold text-slate-300">
              {lang === 'bn' 
                ? 'নাগাল্যান্ড রাজ্য লটারি অফিশিয়াল ড্র চেম্বার' 
                : lang === 'hi' 
                ? 'नागालैंड राज्य लॉटरी आधिकारिक ड्रा चैंबर' 
                : 'Nagaland State Lotteries Official Draw Chamber'}
            </span>
          </div>

        </div>

        {/* Dynamic Live Status Stage Tracker Bar */}
        <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
            <p className="text-xs sm:text-sm font-bold text-amber-100 truncate">
              {currentStep[lang] || currentStep.en}
            </p>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-md flex-shrink-0">
            AUTO-SYNC
          </span>
        </div>

        {/* Bottom Note & Legal Safe-Harbor Context */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-400 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {lang === 'bn' 
              ? 'জিরো-রিফ্রেশ: পেজ রিলোড দেওয়ার প্রয়োজন নেই। রেজাল্ট স্বয়ংক্রিয় ভেসে উঠবে।' 
              : lang === 'hi'
              ? 'जीरो-रिफ्रेश: पेज रीलोड करने की जरूरत नहीं। परिणाम स्वतः दिखाई देंगे।'
              : 'Zero Refresh: No need to reload. Results will auto-reveal instantly.'}
          </span>
          <span className="text-slate-500 text-[10px] italic text-center sm:text-right">
            Official public domain draw tracker • Nagaland State Lotteries
          </span>
        </div>

      </div>

    </div>
  );
}
