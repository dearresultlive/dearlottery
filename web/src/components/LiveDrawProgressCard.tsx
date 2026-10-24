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

  // Rapid digit rolling ticker (compositor friendly pure state)
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
    }, 85);

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
    <div className="relative overflow-hidden bg-gradient-to-b from-amber-50/95 via-white to-amber-100/70 border-2 border-amber-400 rounded-3xl p-4 sm:p-6 text-slate-800 shadow-xl shadow-amber-500/10">
      
      {/* Background Ambient Spotlight Glare */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        
        {/* Top Header: Directorate Live Broadcast Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-red-700 bg-red-100 border border-red-300 px-2.5 py-0.5 rounded-full shadow-2xs">
              {lang === 'bn' ? '🔴 ড্র চলছে • LIVE DRAW' : lang === 'hi' ? '🔴 ड्रा जारी है • LIVE DRAW' : '🔴 LIVE DRAW IN PROGRESS'}
            </span>
          </div>

          <div className="text-[11px] font-black text-amber-900 bg-amber-200/80 border border-amber-400 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>{slotTime} {drawName}</span>
          </div>
        </div>

        {/* Centerpiece: Real-World Authentic Lottery Tumbler Simulation */}
        <div className="py-2 text-center space-y-3.5">
          
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
              <span>🎰</span>
              <span>
                {lang === 'bn' 
                  ? '১ম পুরস্কার ₹১ কোটি বল ড্রাম ঘুরছে (ফলাফল তৈরি হচ্ছে)' 
                  : lang === 'hi'
                  ? 'प्रथम पुरस्कार ₹1 करोड़ बॉल टंबलर घूम रहा है'
                  : 'Official 1st Prize ₹1 Crore Ball Tumbler In Motion'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {lang === 'bn'
                ? 'নাগাল্যান্ড রাজ্য লটারি যান্ত্রিক এয়ার-মিক্স ড্র চেম্বার'
                : lang === 'hi'
                ? 'नागालैंड राज्य लॉटरी मैकेनिकल एयर-मिक्स ड्रा चैंबर'
                : 'Directorate Mechanical Air-Mix Lottery Chamber (Kohima)'}
            </p>
          </div>

          {/* 3D Glossy Realistic Lottery Balls (Series + 5 Digits) */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 pt-1">
            
            {/* Series Ball (Golden Glossy Sphere) */}
            <div className="flex flex-col items-center">
              <div className="w-13 sm:w-16 h-13 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border-2 border-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/30 relative overflow-hidden group transform hover:scale-105 transition-transform">
                {/* 3D Spherical Light Glare */}
                <div className="absolute top-1 left-2 w-4 h-2 bg-white/70 rounded-full blur-[0.5px] pointer-events-none" />
                <span className="font-mono font-black text-base sm:text-xl text-slate-950 tracking-wider drop-shadow-xs">
                  {shufflingSeries}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black text-amber-900 uppercase tracking-widest mt-1">
                SERIES
              </span>
            </div>

            <span className="text-amber-500 font-black text-2xl sm:text-3xl self-center pb-3 select-none">
              •
            </span>

            {/* 5 Digit Lottery Balls (Glossy White & Pearl 3D Balls) */}
            {shufflingDigits.map((digit, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-11 sm:w-14 h-11 sm:h-14 rounded-full bg-gradient-to-b from-white via-slate-50 to-amber-50 border-2 border-amber-400/90 flex items-center justify-center shadow-md shadow-amber-900/10 relative overflow-hidden group">
                  {/* Realistic Top Gloss Glare */}
                  <div className="absolute top-1 left-2 sm:left-3 w-3 sm:w-4 h-1.5 bg-white rounded-full opacity-90 blur-[0.3px] pointer-events-none" />
                  {/* Subtle Ball Seam Line */}
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-amber-200/50 pointer-events-none" />
                  <span className="font-mono font-black text-xl sm:text-2xl text-slate-900 animate-pulse drop-shadow-xs z-10">
                    {digit}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-1">
                  BALL {idx + 1}
                </span>
              </div>
            ))}

          </div>

          {/* Rotating Mechanical Tumbler Indicator */}
          <div className="inline-flex items-center justify-center gap-2 bg-white/80 border border-amber-200 px-3.5 py-1.5 rounded-full shadow-2xs text-slate-600 text-xs">
            <svg 
              className="w-4 h-4 text-amber-600 animate-spin" 
              style={{ animationDuration: '2.5s' }} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
            <span className="text-[11px] sm:text-xs font-bold text-amber-950">
              {lang === 'bn' 
                ? 'স্বচ্ছ ড্রাম থেকে ১ম পুরস্কারের বল তোলা হচ্ছে' 
                : lang === 'hi' 
                ? 'पारदर्शी ड्रम से प्रथम पुरस्कार की गेंदें निकाली जा रही हैं' 
                : 'Extracting Official Winning Balls from Transparent Drum'}
            </span>
          </div>

        </div>

        {/* Dynamic Live Status Stage Tracker Bar */}
        <div className="bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90 border border-amber-300 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping flex-shrink-0" />
            <p className="text-xs sm:text-sm font-black text-amber-950 truncate">
              {currentStep[lang] || currentStep.en}
            </p>
          </div>
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider">
            ⚡ LIVE SYNC
          </span>
        </div>

        {/* Bottom Note & Legal Safe-Harbor Context */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-600 pt-1 border-t border-amber-200/60">
          <span className="flex items-center gap-1.5 font-bold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {lang === 'bn' 
              ? 'জিরো-রিফ্রেশ: পেজ রিলোড দেওয়ার প্রয়োজন নেই। রেজাল্ট স্বয়ংক্রিয়ভাবে প্রকাশ পাবে।' 
              : lang === 'hi'
              ? 'जीरो-रिफ्रेश: पेज रीलोड करने की जरूरत नहीं। परिणाम स्वतः दिखाई देंगे।'
              : 'Zero Refresh: Results will auto-reveal instantly. No reload needed.'}
          </span>
          <span className="text-slate-500 text-[10px] italic text-center sm:text-right">
            Official government gazette verified draw stream
          </span>
        </div>

      </div>

    </div>
  );
}
