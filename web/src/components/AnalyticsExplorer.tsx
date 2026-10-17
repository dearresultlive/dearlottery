import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../lib/i18n';
import {
  analyzeNumberHistory,
  getTopRecurringNumbers,
  getTopFrequentEndings,
  getTopFrequentMiddles,
  fetchClient5YearArchive,
  type NumberHistoryAnalysis
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

export default function AnalyticsExplorer({
  initialNumber = '',
  todayDraws = []
}: AnalyticsExplorerProps) {
  const { lang } = useLanguage();
  const [searchInput, setSearchInput] = useState<string>(initialNumber);
  const [activeNumber, setActiveNumber] = useState<string>(initialNumber || '78866');
  const [rankingsHorizon, setRankingsHorizon] = useState<'1Y' | '3Y' | '5Y'>('3Y');
  const [isArchiveLoaded, setIsArchiveLoaded] = useState<boolean>(false);

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
      if (num && num.length >= 4) {
        setSearchInput(num);
        setActiveNumber(num);
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

  // Compute top recurring numbers
  const topRecurring = useMemo(() => {
    return getTopRecurringNumbers(rankingsHorizon, 12);
  }, [rankingsHorizon, isArchiveLoaded]);

  // Compute top endings
  const topEndings = useMemo(() => {
    return getTopFrequentEndings(10, rankingsHorizon);
  }, [rankingsHorizon, isArchiveLoaded]);

  // Compute top middles
  const topMiddles = useMemo(() => {
    return getTopFrequentMiddles(10, rankingsHorizon);
  }, [rankingsHorizon, isArchiveLoaded]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.replace(/\D/g, '');
    if (clean.length >= 4) {
      setActiveNumber(clean);
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
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('number', clean);
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Interactive Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3">
        <div className="text-left">
          <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
            <span>🔍</span>
            <span>
              {lang === 'bn'
                ? 'যেকোনো লটারি নম্বরের ৫ বছরের ইতিহাস ও অ্যানালিটিক্স খুঁজুন'
                : lang === 'hi'
                ? 'किसी भी लॉटरी नंबर का 5 वर्ष का इतिहास और एनालिटिक्स खोजें'
                : 'Search 5-Year History & Analytics for Any Ticket Number'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'bn'
              ? '৪ বা ৫ সংখ্যার টিকিট নম্বর লিখে ১ বছর, ৩ বছর ও ৫ বছরের পুনরাবৃত্তি ও প্রাইজ দেখুন'
              : lang === 'hi'
              ? '4 या 5 अंकों का टिकट नंबर दर्ज करें और 1Y, 3Y, 5Y में जीत की आवृत्ति देखें'
              : 'Enter any 4 or 5-digit number to inspect its multi-year hits, winning dates, and repeating patterns.'}
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
            className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap"
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
                  className={`font-mono text-xs px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
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

      {/* 2. Full 5-Year Historical Intelligence Card for Active Number */}
      {currentAnalysis && (
        <HistoricalIntelligenceCard
          history={currentAnalysis}
          variant="full"
          titlePrefix={lang === 'bn' ? 'নির্বাচিত' : lang === 'hi' ? 'चयनित' : 'Selected'}
        />
      )}

      {/* 3. Top Repeating Winning Numbers Hub (1Y / 3Y / 5Y) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
              <span>🔥</span>
              <span>
                {lang === 'bn'
                  ? `শীর্ষ পুনরাবৃত্ত বিজয়ী নম্বরসমূহ (Top Repeating Numbers)`
                  : lang === 'hi'
                  ? `शीर्ष दोहराए जाने वाले विजेता नंबर (Top Repeating Numbers)`
                  : `Top Most Frequently Repeated Winning Numbers`}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              {lang === 'bn'
                ? `${rankingsHorizon === '1Y' ? 'গত ১ বছর' : rankingsHorizon === '3Y' ? 'গত ৩ বছর' : 'গত ৫ বছর'} ধরে সবচেয়ে বেশি বার জেতা নম্বরসমূহ`
                : `${rankingsHorizon === '1Y' ? 'Past 1 Year' : rankingsHorizon === '3Y' ? 'Past 3 Years' : 'Past 5 Years'} gazette repeating winners`}
            </p>
          </div>

          {/* Horizon Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-black">
            {(['1Y', '3Y', '5Y'] as const).map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setRankingsHorizon(h)}
                className={`px-3 py-1 rounded-lg transition-all active:scale-95 ${
                  rankingsHorizon === h
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {h === '1Y' ? (lang === 'bn' ? '১ বছর' : '1 Year') : h === '3Y' ? (lang === 'bn' ? '৩ বছর' : '3 Years') : (lang === 'bn' ? '৫ বছর' : '5 Years')}
              </button>
            ))}
          </div>
        </div>

        {/* Repeating Numbers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {topRecurring.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectNumber(item.number)}
              className="bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl p-2.5 text-left transition-all group active:scale-95 shadow-2xs"
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
          ))}
        </div>
      </div>

      {/* 4. Top Frequency Ending & Middle Pairs */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Top 10 Ending 2-Digits */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>🎯</span>
              <span>{lang === 'bn' ? 'শীর্ষ শেষ ২-ডিজিট (Endings)' : 'Top Ending 2-Digits'} ({rankingsHorizon})</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">00-99</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {topEndings.map((e, idx) => (
              <div
                key={idx}
                className="bg-blue-50/60 border border-blue-200 rounded-lg p-1.5 text-center"
              >
                <span className="font-mono font-black text-xs sm:text-sm text-blue-800 block">
                  ..{e.ending}
                </span>
                <span className="text-[9px] font-bold text-slate-500 block">
                  {e.count} {lang === 'bn' ? 'বার' : 'hits'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 Middle Pairs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>⚡</span>
              <span>{lang === 'bn' ? 'শীর্ষ মিডিল পেয়ার (Middles)' : 'Top Middle Pairs'} ({rankingsHorizon})</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">00-99</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {topMiddles.map((m, idx) => (
              <div
                key={idx}
                className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-1.5 text-center"
              >
                <span className="font-mono font-black text-xs sm:text-sm text-emerald-800 block">
                  {m.middle}xx
                </span>
                <span className="text-[9px] font-bold text-slate-500 block">
                  {m.count} {lang === 'bn' ? 'বার' : 'hits'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
