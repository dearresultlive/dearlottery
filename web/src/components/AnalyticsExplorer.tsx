import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../lib/i18n';
import {
  analyzeNumberHistory,
  getTopRecurringNumbers,
  getTopFrequentEndings,
  getTopFrequentMiddles,
  fetchClient5YearArchive,
  getCalculatedDigitFrequencyMatrix,
  getPositionalDigitSummaries,
  generateSmartPick5Y,
  type NumberHistoryAnalysis,
  type SmartPickRecommendation,
  type TimeHorizon,
  type SlotFilter
} from '../lib/history-analytics';
import HistoricalIntelligenceCard from './HistoricalIntelligenceCard';

interface AnalyticsExplorerProps {
  initialNumber?: string;
  todayDraws?: Array<{
    draw_time: string;
    draw_name: string;
    first_prize?: { number: string; series?: string };
  }>;
}

type AnalyticsTab = 'heatmap' | 'search' | 'smartPick' | 'repeaters' | 'pairs';

export default function AnalyticsExplorer({
  initialNumber = '',
  todayDraws = []
}: AnalyticsExplorerProps) {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialNumber ? 'search' : 'heatmap');
  const [searchInput, setSearchInput] = useState<string>(initialNumber);
  const [activeNumber, setActiveNumber] = useState<string>(initialNumber || '78866');
  
  // Advanced Multi-Dimensional Filters: Time Horizon + Slot Filter
  const [rankingsHorizon, setRankingsHorizon] = useState<TimeHorizon>('3Y');
  const [selectedSlot, setSelectedSlot] = useState<SlotFilter>('ALL');
  const [isArchiveLoaded, setIsArchiveLoaded] = useState<boolean>(false);

  // Smart pick generator states
  const [smartPick, setSmartPick] = useState<SmartPickRecommendation | null>(null);
  const [isGeneratingPick, setIsGeneratingPick] = useState<boolean>(false);
  const [pickCopied, setPickCopied] = useState<boolean>(false);
  const [copiedGeneral, setCopiedGeneral] = useState<string | null>(null);

  // Load full 5-Year Archive on client mount asynchronously (zero Cloudflare Worker CPU overhead)
  useEffect(() => {
    fetchClient5YearArchive().then(() => {
      setIsArchiveLoaded(true);
    });
  }, []);

  // Read URL query parameter on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const num = params.get('number');
      const slotParam = params.get('slot') as SlotFilter;
      if (['1PM', '6PM', '8PM'].includes(slotParam)) {
        setSelectedSlot(slotParam);
      }
      if (num && num.length >= 4) {
        setSearchInput(num);
        setActiveNumber(num);
        setActiveTab('search');
      } else if (!initialNumber && todayDraws.length > 0) {
        const firstNum = todayDraws.find(d => d.first_prize?.number)?.first_prize?.number;
        if (firstNum) {
          setSearchInput(firstNum);
          setActiveNumber(firstNum);
        }
      }
    }
  }, [initialNumber, todayDraws]);

  // Compute active number analysis
  const currentAnalysis = useMemo<NumberHistoryAnalysis | null>(() => {
    if (!activeNumber || activeNumber.length < 4) return null;
    return analyzeNumberHistory(activeNumber);
  }, [activeNumber, isArchiveLoaded]);

  // Positional Digit Matrix (Digits 0-9 across 5 positions, filtered by horizon AND slot)
  const digitMatrix = useMemo(() => {
    return getCalculatedDigitFrequencyMatrix(rankingsHorizon, selectedSlot);
  }, [rankingsHorizon, selectedSlot, isArchiveLoaded]);

  const positionalSummaries = useMemo(() => {
    return getPositionalDigitSummaries(digitMatrix);
  }, [digitMatrix]);

  const maxMatrixCount = useMemo(() => {
    return Math.max(...digitMatrix.map(m => m.count), 1);
  }, [digitMatrix]);

  const topDigitPerPosition = useMemo(() => {
    const map: Record<number, string> = {};
    positionalSummaries.forEach(s => {
      map[s.position] = s.hotDigit;
    });
    return map;
  }, [positionalSummaries]);

  // Compute top recurring numbers (filtered by horizon AND slot)
  const topRecurring = useMemo(() => {
    return getTopRecurringNumbers(rankingsHorizon, 12, selectedSlot);
  }, [rankingsHorizon, selectedSlot, isArchiveLoaded]);

  // Compute top endings
  const topEndings = useMemo(() => {
    return getTopFrequentEndings(10, rankingsHorizon, selectedSlot);
  }, [rankingsHorizon, selectedSlot, isArchiveLoaded]);

  // Compute top middles
  const topMiddles = useMemo(() => {
    return getTopFrequentMiddles(10, rankingsHorizon, selectedSlot);
  }, [rankingsHorizon, selectedSlot, isArchiveLoaded]);

  // Generate initial smart pick
  useEffect(() => {
    if (isArchiveLoaded || !smartPick) {
      setSmartPick(generateSmartPick5Y(rankingsHorizon, selectedSlot));
    }
  }, [rankingsHorizon, selectedSlot, isArchiveLoaded]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.replace(/\D/g, '');
    if (clean.length >= 4) {
      setActiveNumber(clean);
      setActiveTab('search');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('number', clean);
        window.history.replaceState({}, '', url.toString());
      }
    }
  };

  const selectNumber = (num: string) => {
    const clean = String(num).replace(/\D/g, '');
    setSearchInput(clean);
    setActiveNumber(clean);
    setActiveTab('search');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('number', clean);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleGenerateSmartPick = () => {
    setIsGeneratingPick(true);
    setTimeout(() => {
      const pick = generateSmartPick5Y(rankingsHorizon, selectedSlot);
      setSmartPick(pick);
      setIsGeneratingPick(false);
      if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
        (navigator as any).vibrate([15, 30, 15]);
      }
    }, 200);
  };

  const handleCopySmartPick = () => {
    if (!smartPick) return;
    try {
      if (typeof navigator !== 'undefined') {
        if ((navigator as any).vibrate) (navigator as any).vibrate(15);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(smartPick.fullTicket);
        }
      }
      setPickCopied(true);
      setTimeout(() => setPickCopied(false), 1800);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyText = (text: string) => {
    try {
      if (typeof navigator !== 'undefined') {
        if ((navigator as any).vibrate) (navigator as any).vibrate(12);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text);
        }
      }
      setCopiedGeneral(text);
      setTimeout(() => setCopiedGeneral(null), 1800);
    } catch (e) {
      console.error(e);
    }
  };

  const positions = [1, 2, 3, 4, 5];
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Smart pick WhatsApp text
  const smartPickWhatsappUrl = useMemo(() => {
    if (!smartPick) return '';
    const shareText = `🎯 *Dear Lottery Smart Pick (${rankingsHorizon} • ${selectedSlot === 'ALL' ? 'All Draws' : selectedSlot})*\n🎟️ টিকিট নম্বর: *${smartPick.fullTicket}*\n🔥 Hot Score: ${smartPick.confidenceScore}/100\n📊 সূত্র: ${lang === 'bn' ? smartPick.logicBn : smartPick.logicEn}\n\n👉 ৫ বছরের লাইভ ডিজিট অ্যানালিটিক্স দেখুন:\nhttps://dearresultlive.in/analytics`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  }, [smartPick, rankingsHorizon, selectedSlot, lang]);

  // Contextual helper info about active filters
  const filterDescription = useMemo(() => {
    const slotNames: Record<SlotFilter, { bn: string; en: string; hi: string }> = {
      ALL: { bn: 'সব ড্র (১PM, ৬PM ও ৮PM)', en: 'All 3 Daily Draws (1PM, 6PM, 8PM)', hi: 'सभी 3 दैनिक ड्रॉ' },
      '1PM': { bn: 'দুপুর ১:০০টা ড্র (সিকিম স্টেট লটারি)', en: '1:00 PM Draw (Sikkim State Lottery)', hi: 'दोपहर 1:00 बजे ड्रॉ (सिक्किम)' },
      '6PM': { bn: 'সন্ধ্যা ৬:০০টা ড্র (নাগাল্যান্ড স্টেট লটারি)', en: '6:00 PM Draw (Nagaland State Lottery)', hi: 'शाम 6:00 बजे ड्रॉ (नागालैंड)' },
      '8PM': { bn: 'রাত ৮:০০টা ড্র (নাগাল্যান্ড স্টেট লটারি)', en: '8:00 PM Draw (Nagaland State Lottery)', hi: 'रात 8:00 बजे ड्रॉ (नागालैंड)' }
    };
    const horizonNames: Record<TimeHorizon, { bn: string; en: string; hi: string }> = {
      '30D': { bn: 'বিগত ৩০ দিনের সাম্প্রতিক ট্রেন্ড', en: 'Past 30 Days Recent Trend', hi: 'पिछले 30 दिनों का ट्रेंड' },
      '1Y': { bn: '১ বছরের রেকর্ড', en: '1-Year Historical Record', hi: '1 वर्ष का रिकॉर्ड' },
      '3Y': { bn: '৩ বছরের প্রমাণিত ডেটাবেজ', en: '3-Year Proven Database', hi: '3 वर्ष का डेटा' },
      '5Y': { bn: '৫ বছরের সম্পূর্ণ বিগ-ডেটা আর্কাইভ', en: '5-Year Complete Big Data Archive', hi: '5 वर्ष का संपूर्ण बिग-डेटा' }
    };
    return {
      slot: slotNames[selectedSlot][lang as 'bn' | 'hi' | 'en'] || slotNames[selectedSlot].en,
      horizon: horizonNames[rankingsHorizon][lang as 'bn' | 'hi' | 'en'] || horizonNames[rankingsHorizon].en
    };
  }, [selectedSlot, rankingsHorizon, lang]);

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Trust & Speed Status Bar */}
      <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2 flex items-center justify-between text-[11px] shadow-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isArchiveLoaded ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isArchiveLoaded ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="font-bold">
            {isArchiveLoaded
              ? (lang === 'bn' ? '✓ ৫,৪৭৮টি সরকারি ড্র-এর বিগ-ডেটা লাইভ প্রসেসড' : lang === 'hi' ? '✓ 5,478 ड्रॉ का बिग-डेटा लाइव प्रोसेस्ड' : '✓ 5,478 Official Draws Processed')
              : (lang === 'bn' ? '⏳ ৫ বছরের বিগ-ডেটা আর্কাইভ লোড হচ্ছে...' : '⏳ Loading 5-Year Big Data Archive...')}
          </span>
        </div>
        <span className="font-mono font-black text-emerald-400 hidden sm:inline-block">
          ⚡ 0ms Sub-Millisecond Speed
        </span>
      </div>

      {/* 2. Top Fluid Mobile Segmented Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-black">
        <button
          type="button"
          onClick={() => setActiveTab('heatmap')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-2xs ${
            activeTab === 'heatmap'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🔢</span>
          <span>
            {lang === 'bn' ? 'ডিজিট হিটম্যাপ' : lang === 'hi' ? 'डिजिट हीटमैप' : 'Digit Heatmap'}
          </span>
          <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
            HOT
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('smartPick')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-2xs ${
            activeTab === 'smartPick'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🎲</span>
          <span>
            {lang === 'bn' ? 'স্মার্ট টিকিট' : lang === 'hi' ? 'स्मार्ट टिकट' : 'Smart Pick'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-2xs ${
            activeTab === 'search'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🔍</span>
          <span>
            {lang === 'bn' ? 'নম্বর সার্চ ও অতীত' : lang === 'hi' ? 'नंबर सर्च व इतिहास' : 'Search Number'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('repeaters')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-2xs ${
            activeTab === 'repeaters'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🔥</span>
          <span>
            {lang === 'bn' ? 'শীর্ষ রিপিট নম্বর' : lang === 'hi' ? 'टॉप रिपीट नंबर' : 'Top Repeaters'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pairs')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-2xs ${
            activeTab === 'pairs'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>⚡</span>
          <span>
            {lang === 'bn' ? 'মিডিল ও এন্ডিং' : lang === 'hi' ? 'मिडिल व एंडिंग' : 'Middles & Endings'}
          </span>
        </button>
      </div>

      {/* 3. Advanced Dual Filter Bar (Slot Filter + Time Horizon Filter) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5 text-left">
        {/* Row A: Slot Filter (1PM vs 6PM vs 8PM vs ALL) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1">
            <span>⏰</span>
            <span>{lang === 'bn' ? 'ড্র-এর সময় ফিল্টার:' : lang === 'hi' ? 'ड्रॉ समय फ़िल्टर:' : 'Draw Time Slot:'}</span>
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs font-black">
            {(
              [
                { id: 'ALL', labelBn: 'সব ড্র (All)', labelEn: 'All Draws', labelHi: 'सभी ड्रॉ' },
                { id: '1PM', labelBn: '১:০০টা (1PM)', labelEn: '1:00 PM', labelHi: '1:00 PM' },
                { id: '6PM', labelBn: '৬:০০টা (6PM)', labelEn: '6:00 PM', labelHi: '6:00 PM' },
                { id: '8PM', labelBn: '৮:০০টা (8PM)', labelEn: '8:00 PM', labelHi: '8:00 PM' }
              ] as const
            ).map(slot => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(slot.id)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                  selectedSlot === slot.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {slot.id === 'ALL' ? '🕒 ' : slot.id === '1PM' ? '☀️ ' : slot.id === '6PM' ? '🌆 ' : '🌙 '}
                {lang === 'bn' ? slot.labelBn : lang === 'hi' ? slot.labelHi : slot.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Row B: Time Horizon Switcher (30D vs 1Y vs 3Y vs 5Y) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1">
            <span>📅</span>
            <span>{lang === 'bn' ? 'সময়কাল বিশ্লেষণ:' : lang === 'hi' ? 'समय अवधि फ़िल्टर:' : 'Time Horizon:'}</span>
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs font-black">
            {(
              [
                { id: '30D', labelBn: '৩০ দিন (30D)', labelEn: '30 Days', labelHi: '30 दिन' },
                { id: '1Y', labelBn: '১ বছর (1Y)', labelEn: '1 Year', labelHi: '1 वर्ष' },
                { id: '3Y', labelBn: '৩ বছর (3Y)', labelEn: '3 Years', labelHi: '3 वर्ष' },
                { id: '5Y', labelBn: '৫ বছর (5Y)', labelEn: '5 Years', labelHi: '5 वर्ष' }
              ] as const
            ).map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => setRankingsHorizon(h.id)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                  rankingsHorizon === h.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {lang === 'bn' ? h.labelBn : lang === 'hi' ? h.labelHi : h.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filter Helper Feedback */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] text-blue-900">
          <span className="font-bold flex items-center gap-1.5 truncate">
            <span>💡</span>
            <span>
              {filterDescription.slot} • {filterDescription.horizon}
            </span>
          </span>
          <span className="bg-blue-200/60 font-bold px-2 py-0.2 rounded text-[10px] hidden sm:inline-block">
            {selectedSlot === '1PM' ? 'সিকিম' : selectedSlot === 'ALL' ? 'সিকিম + নাগাল্যান্ড' : 'নাগাল্যান্ড'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DIGIT HEATMAP & POSITIONAL FREQUENCY                               */}
      {/* ========================================================================= */}
      {activeTab === 'heatmap' && (
        <div className="space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3 text-left">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span>🔢</span>
                <span>
                  {lang === 'bn'
                    ? `৫ সংখ্যার অবস্থানভিত্তিক ডিজিট ফ্রিকোয়েন্সি (${selectedSlot} • ${rankingsHorizon})`
                    : lang === 'hi'
                    ? `5-अंक स्थिति आधारित डिजिट फ्रीक्वेंसी (${selectedSlot} • ${rankingsHorizon})`
                    : `5-Digit Positional Frequency Heatmap (${selectedSlot} • ${rankingsHorizon})`}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'bn'
                  ? '১ম, ২য়, ৩য়, ৪র্থ ও ৫ম ঘরে ০-৯ কোন সংখ্যা কতবার এসেছে তার নির্ভুল বিগ-ডেটা চার্ট'
                  : 'Exact occurrence count of each digit (0 to 9) across 1st to 5th positions.'}
              </p>
            </div>

            {/* Hot & Cold Summary Cards (Pos 1 to 5) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1">
                <span>🔥</span>
                <span>{lang === 'bn' ? 'এক নজরে পজিশনভিত্তিক হট ও কোল্ড ডিজিট:' : 'Hot & Cold Digits by Position:'}</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {positionalSummaries.map(summary => (
                  <div
                    key={summary.position}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center shadow-2xs"
                  >
                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                      {lang === 'bn' ? summary.positionLabelBn : lang === 'hi' ? summary.positionLabelHi : summary.positionLabelEn}
                    </span>

                    <div className="flex items-center justify-around gap-1 pt-0.5">
                      {/* Hot Digit */}
                      <div className="bg-amber-100/80 border border-amber-300 rounded-lg px-2 py-1 flex-1">
                        <span className="text-[9px] font-black text-amber-900 block leading-tight">🔥 HOT</span>
                        <span className="font-mono font-black text-base text-amber-950 block">{summary.hotDigit}</span>
                        <span className="text-[8px] font-bold text-amber-800 block">{summary.hotCount}x</span>
                      </div>

                      {/* Cold Digit */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 flex-1">
                        <span className="text-[9px] font-black text-blue-800 block leading-tight">❄️ COLD</span>
                        <span className="font-mono font-black text-base text-blue-950 block">{summary.coldDigit}</span>
                        <span className="text-[8px] font-bold text-slate-500 block">{summary.coldCount}x</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full 0-9 Positional Matrix Table */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                  <span>📊</span>
                  <span>{lang === 'bn' ? `পজিশনাল হিটম্যাপ চার্ট (${selectedSlot} • ${rankingsHorizon})` : `Positional Matrix (${selectedSlot} • ${rankingsHorizon})`}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {lang === 'bn' ? '🔥 = সর্বোচ্চ ফ্রিকোয়েন্সি' : '🔥 = Highest Frequency'}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs bg-white">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700 uppercase bg-slate-50/90 text-[11px]">
                      <th className="py-2.5 px-3 font-black">{lang === 'bn' ? 'ডিজিট' : 'Digit'}</th>
                      <th className="py-2.5 px-2.5 text-center font-black">{lang === 'bn' ? '১ম ঘর (1st)' : 'Pos 1'}</th>
                      <th className="py-2.5 px-2.5 text-center font-black">{lang === 'bn' ? '২য় ঘর (2nd)' : 'Pos 2'}</th>
                      <th className="py-2.5 px-2.5 text-center font-black">{lang === 'bn' ? '৩য় ঘর (3rd)' : 'Pos 3'}</th>
                      <th className="py-2.5 px-2.5 text-center font-black">{lang === 'bn' ? '৪র্থ ঘর (4th)' : 'Pos 4'}</th>
                      <th className="py-2.5 px-2.5 text-center font-black">{lang === 'bn' ? '৫ম ঘর (5th)' : 'Pos 5'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {digits.map(d => (
                      <tr key={d} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-black text-slate-900 bg-slate-50/60 text-sm">
                          {d}
                        </td>
                        {positions.map(pos => {
                          const entry = digitMatrix.find(m => m.digit === d && m.position === pos);
                          const count = entry ? entry.count : 0;
                          const isTop = topDigitPerPosition[pos] === d;
                          const ratio = count / maxMatrixCount;
                          const isHigh = ratio > 0.85 || isTop;

                          return (
                            <td key={pos} className="py-1.5 px-2 text-center">
                              <span className={`inline-flex items-center justify-center gap-1 font-bold text-xs px-2 py-0.5 rounded-lg transition-all ${
                                isTop
                                  ? 'bg-amber-400 text-amber-950 font-black border border-amber-500 shadow-2xs scale-105'
                                  : isHigh
                                  ? 'bg-amber-100 text-amber-900 font-bold border border-amber-200'
                                  : 'bg-slate-100/90 text-slate-700'
                              }`}>
                                {isTop && <span className="text-[10px]">🔥</span>}
                                <span>{count}</span>
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

            {/* Bottom CTA to Smart Pick Generator */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('smartPick')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <span>🎲</span>
                <span>
                  {lang === 'bn'
                    ? `এই ফ্রিকোয়েন্সির ওপর ভিত্তি করে ${selectedSlot !== 'ALL' ? selectedSlot + ' ' : ''}স্মার্ট টিকিট তৈরি করুন ➔`
                    : `Generate Smart Pick Based on These Top Digits ➔`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SMART PICK GENERATOR                                              */}
      {/* ========================================================================= */}
      {activeTab === 'smartPick' && (
        <div className="space-y-3.5">
          <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 text-center">
            <div className="text-left border-b border-white/10 pb-3">
              <span className="inline-flex items-center gap-1.5 bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <span>🎲</span>
                <span>{selectedSlot} • {rankingsHorizon} Big Data Recommendation</span>
              </span>
              <h2 className="text-sm sm:text-lg font-black text-white mt-1">
                {lang === 'bn'
                  ? `ডিয়ার লটারি ${selectedSlot !== 'ALL' ? selectedSlot + ' ' : ''}স্মার্ট টিকিট সাজেশন`
                  : `Dear Lottery ${selectedSlot !== 'ALL' ? selectedSlot + ' ' : ''}Smart Combination`}
              </h2>
            </div>

            {/* Smart Pick Showcase */}
            {smartPick && (
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-4 sm:p-6 space-y-3">
                <span className="text-[11px] uppercase tracking-widest text-slate-300 font-bold">
                  {lang === 'bn' ? 'প্রস্তাবিত লাকি টিকিট' : 'Recommended Smart Combination'}
                </span>

                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black text-amber-300 tracking-wider drop-shadow-md">
                    {smartPick.fullTicket}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-black px-3 py-0.5 rounded-full">
                    🔥 Hot Score: {smartPick.confidenceScore}/100
                  </span>
                  <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs font-bold px-3 py-0.5 rounded-full">
                    🏛️ {selectedSlot} • {rankingsHorizon} Backed
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 max-w-lg mx-auto pt-1 font-medium leading-relaxed">
                  {lang === 'bn' ? smartPick.logicBn : lang === 'hi' ? smartPick.logicHi : smartPick.logicEn}
                </p>

                {/* 3 Action Buttons */}
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleGenerateSmartPick}
                    disabled={isGeneratingPick}
                    className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <span>🎲</span>
                    <span>
                      {isGeneratingPick
                        ? (lang === 'bn' ? 'তৈরি হচ্ছে...' : 'Generating...')
                        : (lang === 'bn' ? 'নতুন কম্বিনেশন তৈরি করুন' : 'Generate Another')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySmartPick}
                    className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all active:scale-95 border border-white/30 cursor-pointer"
                  >
                    <span>{pickCopied ? '✓' : '📋'}</span>
                    <span>
                      {pickCopied
                        ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!')
                        : (lang === 'bn' ? 'কপি করুন' : 'Copy Ticket')}
                    </span>
                  </button>

                  <a
                    href={smartPickWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95"
                  >
                    <span>💬</span>
                    <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => selectNumber(smartPick.ticketNumber)}
                    className="inline-flex items-center gap-1.5 bg-blue-600/60 hover:bg-blue-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all active:scale-95 border border-blue-400/30 cursor-pointer"
                  >
                    <span>🔍</span>
                    <span>{lang === 'bn' ? 'ইতিহাস দেখুন' : 'Inspect History'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NUMBER SEARCH & 5-YEAR WINNING INTELLIGENCE                        */}
      {/* ========================================================================= */}
      {activeTab === 'search' && (
        <div className="space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3">
            <div className="text-left">
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span>🔍</span>
                <span>
                  {lang === 'bn'
                    ? 'যেকোনো লটারি নম্বরের অতীত রেকর্ড ও প্রাইজ সার্চ'
                    : lang === 'hi'
                    ? 'किसी भी लॉटरी नंबर का इतिहास और एनालिटिक्स खोजें'
                    : 'Search Winning History & Multi-Year Analytics for Any Ticket'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'bn'
                  ? '৪ বা ৫ সংখ্যার টিকিট নম্বর লিখে ৩০ দিন, ১ বছর, ৩ বছর ও ৫ বছরের পুনরাবৃত্তি ও অতীত জয়ের তারিখ দেখুন'
                  : 'Enter any 4 or 5-digit number to inspect multi-year hits, past winning dates, and repeating patterns.'}
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                placeholder={
                  lang === 'bn'
                    ? 'যেমন: 78866 বা শেষ ৪ সংখ্যা...'
                    : lang === 'hi'
                    ? 'जैसे: 78866 या अंतिम 4 अंक...'
                    : 'e.g. 78866 or last 4 digits...'
                }
                className="flex-1 bg-slate-50 border border-slate-300 focus:border-blue-700 focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-base font-mono font-black tracking-wider outline-none transition-all uppercase"
              />
              <button
                type="submit"
                className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                {lang === 'bn' ? 'অ্যানালাইজ করুন' : lang === 'hi' ? 'विश्लेषण करें' : 'Analyze'}
              </button>
            </form>

            {/* Quick Click Today's 1st Prize Numbers */}
            {todayDraws.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                <span className="text-slate-500 font-bold text-[11px]">
                  {lang === 'bn' ? 'আজকের ১ম প্রাইজ:' : lang === 'hi' ? 'आज के 1st प्राइज:' : "Today's 1st Prizes:"}
                </span>
                {todayDraws.map((d, idx) => {
                  const num = d.first_prize?.number;
                  if (!num) return null;
                  const isSelected = activeNumber === num;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectNumber(num)}
                      className={`font-mono text-xs px-2.5 py-1 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-700 text-white border-blue-700 font-black shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 font-bold'
                      }`}
                    >
                      {num} <span className="text-[10px] opacity-75 font-sans">({d.draw_time})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historical Intelligence Card */}
          {currentAnalysis && (
            <HistoricalIntelligenceCard
              history={currentAnalysis}
              variant="full"
              titlePrefix={lang === 'bn' ? 'বিশ্লেষিত' : lang === 'hi' ? 'विश्लेषित' : 'Analyzed'}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TOP REPEATING NUMBERS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'repeaters' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3 text-left">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
              <span>🔥</span>
              <span>
                {lang === 'bn'
                  ? `শীর্ষ পুনরাবৃত্ত বিজয়ী নম্বরসমূহ (${selectedSlot} • ${rankingsHorizon})`
                  : lang === 'hi'
                  ? `शीर्ष दोहराए जाने वाले विजेता नंबर (${selectedSlot} • ${rankingsHorizon})`
                  : `Top Repeating Numbers (${selectedSlot} • ${rankingsHorizon})`}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {lang === 'bn'
                ? `${filterDescription.slot}-এ ${filterDescription.horizon}-এ একাধিকবার জেতা সরকারি নম্বর (ক্লিক করে বিস্তারিত দেখুন)`
                : `Official gazette repeat winners in ${filterDescription.slot} over ${filterDescription.horizon} (tap to inspect)`}
            </p>
          </div>

          {/* Repeating Numbers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {topRecurring.length > 0 ? (
              topRecurring.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectNumber(item.number)}
                  className="bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl p-2.5 text-left transition-all group active:scale-95 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm sm:text-base text-blue-700 group-hover:text-blue-900">
                      {item.number}
                    </span>
                    <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-1.5 py-0.5 rounded">
                      {item.count} {lang === 'bn' ? 'বার' : 'hits'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>📅 {item.lastDate.split('-').reverse().join('/')}</span>
                    <span className="font-bold text-slate-700">{item.lastTime}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">
                {lang === 'bn'
                  ? 'এই ফিল্টারে একাধিকবার জেতা কোনো নম্বর পাওয়া যায়নি — ফিল্টার পরিবর্তন করে দেখুন।'
                  : 'No repeating numbers found for this specific filter — try expanding the time horizon.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TOP MIDDLE & ENDING PAIRS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'pairs' && (
        <div className="space-y-3.5">
          <div className="grid sm:grid-cols-2 gap-3">
            {/* Top 10 Ending 2-Digits */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>{lang === 'bn' ? 'শীর্ষ শেষ ২-ডিজিট (Endings)' : 'Top Ending 2-Digits'} ({selectedSlot} • {rankingsHorizon})</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">00-99</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                {topEndings.map((e, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCopyText(e.ending)}
                    className="bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-lg p-2 text-center transition-all active:scale-95 cursor-pointer shadow-2xs group"
                  >
                    <span className="font-mono font-black text-xs sm:text-sm text-blue-800 block group-hover:text-blue-950">
                      ..{e.ending}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 block">
                      {e.count} {lang === 'bn' ? 'বার' : 'hits'}
                    </span>
                    <span className="text-[8px] text-blue-600 block opacity-70">
                      {copiedGeneral === e.ending ? '✓' : 'কপি'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Top 10 Middle Pairs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>{lang === 'bn' ? 'শীর্ষ মিডিল পেয়ার (Middles)' : 'Top Middle Pairs'} ({selectedSlot} • {rankingsHorizon})</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">00-99</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                {topMiddles.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCopyText(m.middle)}
                    className="bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 rounded-lg p-2 text-center transition-all active:scale-95 cursor-pointer shadow-2xs group"
                  >
                    <span className="font-mono font-black text-xs sm:text-sm text-emerald-800 block group-hover:text-emerald-950">
                      {m.middle}xx
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 block">
                      {m.count} {lang === 'bn' ? 'বার' : 'hits'}
                    </span>
                    <span className="text-[8px] text-emerald-600 block opacity-70">
                      {copiedGeneral === m.middle ? '✓' : 'কপি'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}