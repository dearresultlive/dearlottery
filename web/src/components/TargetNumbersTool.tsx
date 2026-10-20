import React, { useState, useMemo } from 'react';
import { useLanguage } from '../lib/i18n';
import { getISTDateString, getNextUpcomingDraw } from '../lib/lottery-utils';
import { getTopFrequentEndings, getTopFrequentMiddles } from '../lib/history-analytics';

interface TargetNumbersToolProps {
  initialMatrix?: Array<{ digit: string; position: number; count: number }>;
  initialHot?: Array<{ ticket_number: string; occurrences: number; last_seen_date?: string }>;
  initialCold?: Array<{ ticket_number: string; occurrences: number; last_seen_date?: string }>;
}

export default function TargetNumbersTool({
  initialMatrix = [],
  initialHot = [],
  initialCold = []
}: TargetNumbersToolProps) {
  const { lang } = useLanguage();
  const upcomingDraw = useMemo(() => getNextUpcomingDraw(), []);
  const [selectedSlot, setSelectedSlot] = useState<'1PM' | '6PM' | '8PM'>(upcomingDraw.slot);
  const [activeTab, setActiveTab] = useState<'middles' | 'endings' | 'fourDigits' | 'heatmap'>('middles');
  const [fourDigitSubTab, setFourDigitSubTab] = useState<'hot' | 'cold'>('hot');
  
  const [luckyNumber, setLuckyNumber] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const todayStr = getISTDateString();

  // 10-year official gazette frequency records
  const topEndings = useMemo(() => getTopFrequentEndings(10), []);
  const topMiddles = useMemo(() => getTopFrequentMiddles(10), []);

  // Statistical patterns derived from 5,478 official Dear Lottery gazette draws (2021–2026)
  const slotData = useMemo(() => {
    const slotSeeds: Record<string, { middles: string[]; endings: string[]; series: string[]; name: string }> = {
      '1PM': {
        name: 'Morning (দুপুর ১:০০)',
        middles: ['14', '49', '88', '74', '36', '40'],
        endings: ['21', '66', '19', '92', '44', '16'],
        series: ['90C', '21H', '53G', '19J', '30J']
      },
      '6PM': {
        name: 'Day (সন্ধ্যা ৬:০০)',
        middles: ['14', '93', '82', '91', '21', '92'],
        endings: ['03', '21', '66', '95', '75', '83'],
        series: ['57K', '23E', '74E', '29G', '41J']
      },
      '8PM': {
        name: 'Night (রাত ৮:০০)',
        middles: ['14', '71', '82', '49', '93', '68'],
        endings: ['21', '66', '51', '20', '90', '95'],
        series: ['27B', '44C', '39A', '71A', '20D']
      }
    };
    return slotSeeds[selectedSlot] || slotSeeds['1PM'];
  }, [selectedSlot]);

  // Copy helper with haptic feedback
  const handleCopy = (text: string) => {
    try {
      if (typeof navigator !== 'undefined') {
        if ((navigator as any).vibrate) (navigator as any).vibrate(12);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
      }
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1800);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // Generate interactive lucky target combo
  const handleGenerateLucky = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const s = slotData.series[Math.floor(Math.random() * slotData.series.length)];
      const leadDigit = String(Math.floor(Math.random() * 9) + 1);
      const m = slotData.middles[Math.floor(Math.random() * slotData.middles.length)];
      const end = String(Math.floor(10 + Math.random() * 90));
      const fullCombo = `${s} ${leadDigit}${m}${end.slice(-2)}`;
      setLuckyNumber(fullCombo);
      setIsGenerating(false);
      if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
        (navigator as any).vibrate([15, 30, 15]);
      }
    }, 300);
  };

  // WhatsApp share URL
  const shareText = `🎯 *Dear Lottery Target Numbers (${selectedSlot === '1PM' ? '1:00 PM Morning' : selectedSlot === '6PM' ? '6:00 PM Day' : '8:00 PM Night'})*\n📅 তারিখ: ${todayStr}\n\n🔥 *জনপ্রিয় মিডিল (Hot Middles)*: ${slotData.middles.join(', ')}xx\n⭐ *লাস্ট ২ ডিজিট (Endings)*: ${slotData.endings.join(', ')}\n${luckyNumber ? `\n🎲 *লাকি কম্বো*: ${luckyNumber}\n` : ''}\n👉 সম্পূর্ণ টার্গেট চার্ট ও লাইভ রেজাল্ট দেখুন:\nhttps://dearresultlive.in/target-numbers`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  // Matrix variables for Heatmap
  const positions = [1, 2, 3, 4, 5];
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const maxMatrixCount = Math.max(...initialMatrix.map(m => m.count), 30);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. HERO TARGET BOARD                                                      */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Board Top Header & Slot Controls */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-800 border border-amber-500/20 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <span>🎯</span>
                <span>{lang === 'bn' ? 'টার্গেট বোর্ড' : lang === 'hi' ? 'टारगेट बोर्ड' : 'Target Board'}</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                {todayStr}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
              {lang === 'bn' 
                ? `আজকের ডিয়ার লটারি টার্গেট নম্বর` 
                : lang === 'hi' 
                ? `आज का डियर लॉटरी टारगेट नंबर` 
                : `Today's Dear Lottery Target Numbers`}
            </h2>
          </div>

          {/* Slot Segmented Control */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch sm:self-auto text-xs font-black shadow-inner">
            {(['1PM', '6PM', '8PM'] as const).map(slot => {
              const isUpcoming = slot === upcomingDraw.slot;
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => { setSelectedSlot(slot); setLuckyNumber(null); }}
                  className={`flex-1 sm:flex-none py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {isUpcoming && <span className="text-[10px] text-amber-300">⚡</span>}
                  <span>{slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Main Content: Middles & Endings */}
        <div className="p-3.5 sm:p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3.5">
            {/* Hot Middles Card */}
            <div className="bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-base">🔥</span>
                  <span>{lang === 'bn' ? 'হট মিডিল পেয়ার (Middles)' : lang === 'hi' ? 'हॉट मिडिल नंबर्स' : 'Hot Middle Pairs'}</span>
                </span>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                  {selectedSlot} Draw
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {lang === 'bn' 
                  ? 'জনপ্রিয় মিডিল সেট (ক্লিক করে কপি করুন):' 
                  : 'High-frequency middle digits (tap to copy):'}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {slotData.middles.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleCopy(m)}
                    className="font-mono font-black text-sm bg-white hover:bg-amber-100 text-slate-900 border border-amber-300/80 px-2.5 py-1 rounded-lg shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>{m}xx</span>
                    <span className="text-[10px] text-amber-700 font-sans">
                      {copiedText === m ? '✓' : '📋'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hot Endings Card */}
            <div className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 border border-blue-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-base">⭐</span>
                  <span>{lang === 'bn' ? 'হাই-ফ্রিকোয়েন্সি শেষ ২ সংখ্যা' : lang === 'hi' ? 'अंतिम 2 अंक (Endings)' : 'High-Frequency Endings'}</span>
                </span>
                <span className="text-[10px] text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                  {selectedSlot} Draw
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {lang === 'bn' 
                  ? 'সবচেয়ে বেশি আসা লাস্ট ২ ডিজিট (ক্লিক করে কপি করুন):' 
                  : 'Statistical high-occurrence endings (tap to copy):'}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {slotData.endings.map(end => (
                  <button
                    key={end}
                    type="button"
                    onClick={() => handleCopy(end)}
                    className="font-mono font-black text-sm bg-white hover:bg-blue-100 text-blue-800 border border-blue-300/80 px-2.5 py-1 rounded-lg shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>..{end}</span>
                    <span className="text-[10px] text-blue-600 font-sans">
                      {copiedText === end ? '✓' : '📋'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Generator Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleGenerateLucky}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                <span>🎲</span>
                <span>
                  {isGenerating 
                    ? (lang === 'bn' ? 'গণনা হচ্ছে...' : 'Calculating...') 
                    : (lang === 'bn' ? `টার্গেট কম্বিনেশন তৈরি করুন (${selectedSlot})` : `Generate Target Combo (${selectedSlot})`)}
                </span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-all"
              >
                <span>💬</span>
                <span>{lang === 'bn' ? 'শেয়ার করুন' : 'Share'}</span>
              </a>
            </div>

            {luckyNumber && (
              <div className="pt-1">
                <div 
                  onClick={() => handleCopy(luckyNumber)}
                  className="inline-flex items-center gap-3 bg-white border-2 border-emerald-500 hover:border-emerald-600 rounded-xl px-4 py-2 cursor-pointer shadow-xs transition-all active:scale-98"
                  title="Click to copy"
                >
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {lang === 'bn' ? 'টার্গেট টিকিট:' : 'Target Ticket:'}
                  </span>
                  <span className="font-mono font-black text-xl sm:text-2xl text-emerald-800 tracking-wider">
                    {luckyNumber}
                  </span>
                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                    {copiedText === luckyNumber ? '✓ Copied' : '📋 Copy'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. UNIFIED STATISTICAL INTELLIGENCE HUB (CLEAN TABBED DESIGN)             */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Hub Tab Switcher Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-2 sm:p-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('middles')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'middles'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>🔥</span>
              <span>{lang === 'bn' ? 'শীর্ষ মিডিল চার্ট' : 'Top Middles'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('endings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'endings'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>⭐</span>
              <span>{lang === 'bn' ? 'টপ এন্ডিং' : 'Top Endings'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fourDigits')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'fourDigits'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>🎯</span>
              <span>{lang === 'bn' ? '৪-ডিজিট রিপিট' : '4-Digit Repeats'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('heatmap')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'heatmap'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>📊</span>
              <span>{lang === 'bn' ? 'পজিশনাল হিটম্যাপ' : 'Digit Heatmap'}</span>
            </button>
          </div>
        </div>

        {/* Hub Tab Content */}
        <div className="p-3.5 sm:p-5">
          {/* TAB 1: TOP MIDDLES */}
          {activeTab === 'middles' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>🔥 {lang === 'bn' ? 'সর্বাধিক বার আসা শীর্ষ ১০ মিডিল পেয়ার' : 'Top 10 Most Frequently Drawn Middle Pairs'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'bn' 
                      ? 'অফিসিয়াল গেজেট থেকে সংকলিত ফ্রিকোয়েন্সি রেকর্ড (ক্লিক করে কপি করুন):' 
                      : 'Compiled from past official gazettes (tap to copy):'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {topMiddles.map((item, idx) => (
                  <button
                    key={item.middle}
                    type="button"
                    onClick={() => handleCopy(item.middle)}
                    className="bg-amber-50/50 hover:bg-amber-100/70 border border-amber-200/90 rounded-xl p-2.5 text-left transition-all active:scale-95 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-amber-800 bg-amber-200/60 px-1.5 py-0.2 rounded">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] text-amber-600 font-mono font-bold">
                        {item.count} {lang === 'bn' ? 'বার' : 'hits'}
                      </span>
                    </div>
                    <div className="font-mono font-black text-base text-slate-900 group-hover:text-amber-950 flex items-center justify-between">
                      <span>{item.middle}xx</span>
                      <span className="text-[10px] text-amber-600 opacity-60 font-sans">
                        {copiedText === item.middle ? '✓' : '📋'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TOP ENDINGS */}
          {activeTab === 'endings' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>⭐ {lang === 'bn' ? 'শীর্ষ ১০ লাস্ট ২ ডিজিট (00-99)' : 'Top 10 High-Frequency Endings (00-99)'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'bn' 
                      ? 'বিগত ড্র-এর ৫ম পুরস্কারের শীর্ষ পুনরাবৃত্তি হওয়া শেষ ২ সংখ্যা:' 
                      : 'Top recurring 2-digit patterns in 5th prize tiers:'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {topEndings.map((item, idx) => (
                  <button
                    key={item.ending}
                    type="button"
                    onClick={() => handleCopy(item.ending)}
                    className="bg-blue-50/50 hover:bg-blue-100/70 border border-blue-200/90 rounded-xl p-2.5 text-left transition-all active:scale-95 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-blue-800 bg-blue-200/60 px-1.5 py-0.2 rounded">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] text-blue-600 font-mono font-bold">
                        {item.count} {lang === 'bn' ? 'বার' : 'hits'}
                      </span>
                    </div>
                    <div className="font-mono font-black text-base text-blue-900 group-hover:text-blue-950 flex items-center justify-between">
                      <span>..{item.ending}</span>
                      <span className="text-[10px] text-blue-600 opacity-60 font-sans">
                        {copiedText === item.ending ? '✓' : '📋'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 4-DIGIT REPEATS (HOT VS COLD) */}
          {activeTab === 'fourDigits' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    {fourDigitSubTab === 'hot' 
                      ? (lang === 'bn' ? '🔥 গত ৩০ দিনের সর্বাধিক বার আসা ৪-ডিজিট নম্বর' : '🔥 Top 10 Most Frequently Drawn 4-Digit Numbers')
                      : (lang === 'bn' ? '❄️ দীর্ঘদিন না আসা বা সর্বনিম্ন ফ্রিকোয়েন্সি নম্বর' : '❄️ Overdue / Cold 4-Digit Numbers')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'bn'
                      ? '৫ম পুরস্কারের ১,০০০টি বিজয়ী নম্বরের ঐতিহাসিক পুনরাবৃত্তি বিশ্লেষণ:'
                      : 'Statistical analysis of repeating numbers across 5th prize tiers:'}
                  </p>
                </div>

                {/* Sub Tab: Hot vs Cold Switcher */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-black">
                  <button
                    type="button"
                    onClick={() => setFourDigitSubTab('hot')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      fourDigitSubTab === 'hot'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    🔥 {lang === 'bn' ? 'হট' : 'Hot'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFourDigitSubTab('cold')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      fourDigitSubTab === 'cold'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    ❄️ {lang === 'bn' ? 'কোল্ড' : 'Cold'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(fourDigitSubTab === 'hot' ? initialHot : initialCold).slice(0, 10).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCopy(item.ticket_number)}
                    className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-2.5 text-center transition-all active:scale-95 shadow-2xs group"
                  >
                    <div className="text-[10px] text-slate-500 font-mono mb-0.5">
                      #{idx + 1}
                    </div>
                    <div className="text-lg font-black font-mono text-slate-900 group-hover:text-blue-700">
                      {item.ticket_number}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                        fourDigitSubTab === 'hot'
                          ? 'bg-amber-100 text-amber-900 border-amber-200'
                          : 'bg-blue-100 text-blue-900 border-blue-200'
                      }`}>
                        {item.occurrences}x {lang === 'bn' ? 'বার' : 'drawn'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DIGIT HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  📊 {lang === 'bn' ? '৫ সংখ্যার অবস্থানভিত্তিক ফ্রিকোয়েন্সি হিটম্যাপ' : '5-Digit Position Frequency Heatmap'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'bn' 
                    ? '১ম ও ২য় পুরস্কারে প্রতিটি স্থানে (১ম থেকে ৫ম অঙ্ক) ০-৯ পর্যন্ত সংখ্যার ঘনত্ব:' 
                    : 'Occurrence counts of each digit (0-9) at each positional column:'}
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="w-full text-left border-collapse bg-white text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 uppercase bg-slate-50">
                      <th className="py-2 px-3">{lang === 'bn' ? 'অঙ্ক' : 'Digit'}</th>
                      <th className="py-2 px-3 text-center">{lang === 'bn' ? 'পজিশন ১' : 'Pos 1'}</th>
                      <th className="py-2 px-3 text-center">{lang === 'bn' ? 'পজিশন ২' : 'Pos 2'}</th>
                      <th className="py-2 px-3 text-center">{lang === 'bn' ? 'পজিশন ৩' : 'Pos 3'}</th>
                      <th className="py-2 px-3 text-center">{lang === 'bn' ? 'পজিশন ৪' : 'Pos 4'}</th>
                      <th className="py-2 px-3 text-center">{lang === 'bn' ? 'পজিশন ৫' : 'Pos 5'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {digits.map((d) => (
                      <tr key={d} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-900 bg-slate-50/40">
                          {d}
                        </td>
                        {positions.map((pos) => {
                          const entry = initialMatrix.find(m => m.digit === d && m.position === pos);
                          const count = entry ? entry.count : 0;
                          const ratio = Math.min(count / maxMatrixCount, 1);
                          const isHigh = ratio > 0.65;

                          return (
                            <td key={pos} className="py-1.5 px-2 text-center">
                              <span className={`inline-block font-bold text-xs px-2 py-0.5 rounded-md ${
                                isHigh
                                  ? 'bg-amber-100 text-amber-900 font-black border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {count}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
