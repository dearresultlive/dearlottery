import React, { useState, useMemo } from 'react';
import { useLanguage } from '../lib/i18n';
import { formatINR } from '../lib/lottery-utils';
import type { NumberHistoryAnalysis } from '../lib/history-analytics';

interface HistoricalIntelligenceCardProps {
  history: NumberHistoryAnalysis;
  titlePrefix?: string;
  variant?: 'compact' | 'full';
}

export default function HistoricalIntelligenceCard({
  history,
  titlePrefix,
  variant = 'compact'
}: HistoricalIntelligenceCardProps) {
  const { lang } = useLanguage();
  const [historyHorizon, setHistoryHorizon] = useState<'30D' | '1Y' | '3Y' | '5Y'>('3Y');
  const [showAllPastWins, setShowAllPastWins] = useState<boolean>(false);
  const [showSimilarNumbers, setShowSimilarNumbers] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const isFull = variant === 'full';

  const currentStats = useMemo(() => {
    if (historyHorizon === '30D') return history.stats30D || history.stats1Y;
    if (historyHorizon === '1Y') return history.stats1Y;
    if (historyHorizon === '3Y') return history.stats3Y;
    return history.stats5Y;
  }, [history, historyHorizon]);

  const handleCopy = () => {
    try {
      if (typeof navigator !== 'undefined') {
        if ((navigator as any).vibrate) (navigator as any).vibrate(15);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(history.cleanNumber);
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error(e);
    }
  };

  const shareText = `📜 *Dear Lottery 5-Year History for #${history.cleanNumber}*\n🔥 Hot Score: ${history.hotScore}/100\n🏆 5Y Exact Wins: ${history.stats5Y.exactWinsCount} times\n🎯 Last 4 Matches: ${history.stats5Y.last4MatchesCount} times\n📊 Ending Rank: #${history.last2Rank} (..${history.last2Digits})\n\n👉 See full official records & live draws:\nhttps://dearresultlive.in/analytics?number=${history.cleanNumber}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-left shadow-2xs space-y-3">
      {/* 1. Header with Title and Hot Score */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-900">
          <span className="text-base">📜</span>
          <span>
            {titlePrefix ? `${titlePrefix} ` : ''}
            {lang === 'bn'
              ? `ঐতিহাসিক জয় ও ফ্রিকোয়েন্সি বিশ্লেষণ (${history.cleanNumber})`
              : lang === 'hi'
              ? `ऐतिहासिक जीत और फ्रीक्वेंसी विश्लेषण (${history.cleanNumber})`
              : `Historical Win & Frequency Intelligence (${history.cleanNumber})`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
            🔥 {lang === 'bn' ? 'হট স্কোর' : lang === 'hi' ? 'হॉट स्कोर' : 'Hot Score'}: {history.hotScore}/100
          </span>
        </div>
      </div>

      {/* 2. Interactive Time Horizon Switcher: Shown in Full variant */}
      {isFull ? (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
          <span className="text-[11px] font-bold text-slate-600 pl-1">
            {lang === 'bn' ? 'সময়কাল ফিল্টার:' : lang === 'hi' ? 'समय अवधि:' : 'Time Horizon:'}
          </span>
          <div className="flex items-center gap-1 text-xs font-black flex-wrap">
            {(['30D', '1Y', '3Y', '5Y'] as const).map(h => {
              const isActive = historyHorizon === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHistoryHorizon(h)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {h === '30D'
                    ? (lang === 'bn' ? '৩০ দিন' : lang === 'hi' ? '30 दिन' : '30D')
                    : h === '1Y' 
                    ? (lang === 'bn' ? '১ বছর' : lang === 'hi' ? '1 वर्ष' : '1 Year')
                    : h === '3Y'
                    ? (lang === 'bn' ? '৩ বছর' : lang === 'hi' ? '3 वर्ष' : '3 Years')
                    : (lang === 'bn' ? '৫ বছর' : lang === 'hi' ? '5 वर्ष' : '5 Years')}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 3. Localized Dynamic Summary */}
      <p className="text-xs text-slate-700 leading-snug font-medium">
        {lang === 'bn'
          ? history.summaryBn
          : lang === 'hi'
          ? history.summaryHi
          : history.summaryEn}
      </p>

      {/* 4. Three Dynamic Stat Badges Based on Horizon */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase block">
            {lang === 'bn' ? 'হুবহু জয়' : lang === 'hi' ? 'सटीक जीत' : 'Exact Wins'} {isFull ? `(${historyHorizon})` : ''}
          </span>
          <span className="font-mono font-black text-sm sm:text-base text-emerald-700 block">
            {currentStats.exactWinsCount} {lang === 'bn' ? 'বার' : 'times'}
          </span>
          <span className="text-[9px] font-medium text-slate-500 block truncate">
            {currentStats.exactWinsCount > 0 
              ? (lang === 'bn' ? '১ম/২য় প্রাইজ' : '1st/2nd Prize') 
              : (lang === 'bn' ? 'নতুন নম্বর' : 'No Past Win')}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase block">
            {lang === 'bn' ? 'অনুরূপ শেষ ৪-ডিজিট' : lang === 'hi' ? 'अंतिम 4-अंक मैच' : 'Last 4 Matches'} {isFull ? `(${historyHorizon})` : ''}
          </span>
          <span className="font-mono font-black text-sm sm:text-base text-blue-700 block">
            {currentStats.last4MatchesCount} {lang === 'bn' ? 'বার' : 'times'}
          </span>
          <span className="text-[9px] font-medium text-slate-500 block truncate">
            {lang === 'bn' ? 'সান্ত্বনা/৩য়' : 'Cons/3rd Prize'}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase block">
            {lang === 'bn' ? 'শেষ ২-ডিজিট র‍্যাংক' : lang === 'hi' ? 'अंतिम 2-अंक रैंक' : 'Ending Rank'}
          </span>
          <span className="font-mono font-black text-sm sm:text-base text-amber-700 block">
            ..{history.last2Digits}
          </span>
          <span className="text-[9px] font-medium text-slate-500 block truncate">
            #{history.last2Rank} ({history.last2Frequency})
          </span>
        </div>
      </div>

      {/* 5. Exact Past Winning Dates & Times (Top 3 in Compact, All in Full) */}
      {history.exactWins.length > 0 && (
        <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
              <span>🏆</span>
              <span>
                {lang === 'bn' 
                  ? `যে যে তারিখে ও সময়ে ${history.cleanNumber} জিতেছিল:` 
                  : lang === 'hi'
                  ? `जिस तारीख और समय पर ${history.cleanNumber} जीता था:`
                  : `Past Winning Dates & Times for ${history.cleanNumber}:`}
              </span>
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-md">
              {history.exactWins.length} {lang === 'bn' ? 'টি ঐতিহাসিক জয়' : 'past wins'}
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            {(isFull && showAllPastWins ? history.exactWins : history.exactWins.slice(0, 3)).map((win, idx) => (
              <div
                key={idx}
                className="bg-white border border-emerald-200 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 shadow-2xs"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-emerald-700 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                    {win.drawDate.split('-').reverse().join('/')}
                  </span>
                  <span className="font-bold text-slate-800">
                    ⏰ {win.drawTime}
                  </span>
                  <span className="text-slate-500 font-medium">
                    • {win.drawName}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <span className="font-mono font-black text-blue-700">
                    {win.ticketNumber}
                  </span>
                  <span className="bg-emerald-100 text-emerald-900 font-bold text-[10px] px-2 py-0.5 rounded">
                    {win.prizeRank} • {formatINR(win.prizeAmount)}
                  </span>
                </div>
              </div>
            ))}

            {isFull && history.exactWins.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllPastWins(prev => !prev)}
                className="w-full text-center text-[11px] font-bold text-emerald-800 hover:text-emerald-950 pt-1"
              >
                {showAllPastWins
                  ? (lang === 'bn' ? '▲ কম দেখুন' : '▲ Show Less')
                  : (lang === 'bn' ? `▼ আরও ${history.exactWins.length - 3}টি অতীত জয়ের তারিখ ও সময় দেখুন` : `▼ View ${history.exactWins.length - 3} more past win dates`)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. Similar Winning Numbers: Shown in Full Variant */}
      {isFull && history.similarNumbers.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span>🎯</span>
              <span>
                {lang === 'bn'
                  ? `অনুরূপ ৪-ডিজিট বিজয়ী নম্বরসমূহ (Similar Numbers)`
                  : lang === 'hi'
                  ? `समान 4-अंक विजेता नंबर (Similar Numbers)`
                  : `Similar Numbers in Past Official Gazettes`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowSimilarNumbers(prev => !prev)}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900"
            >
              {showSimilarNumbers ? (lang === 'bn' ? '▲ বন্ধ করুন' : '▲ Hide') : (lang === 'bn' ? '▼ দেখুন' : '▼ View')}
            </button>
          </div>

          {showSimilarNumbers && (
            <div className="grid sm:grid-cols-2 gap-1.5 pt-1 animate-in fade-in duration-150">
              {history.similarNumbers.map((sim, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg p-2 text-xs flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <span className="font-mono font-black text-blue-700 block">
                      {sim.ticketNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      📅 {sim.drawDate.split('-').reverse().join('/')} ({sim.drawTime})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded block">
                      {sim.prizeRank}
                    </span>
                    <span className="text-[9px] text-blue-600 block mt-0.5">
                      {lang === 'bn' ? sim.similarityTypeBn : sim.similarityType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Action Bar for Full Variant */}
      {isFull && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <a
            href={`/checker?number=${history.cleanNumber}`}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs py-2 px-3 rounded-xl transition-all active:scale-95 shadow-2xs text-center"
          >
            <span>🔍</span>
            <span>
              {lang === 'bn' ? 'আজকের ড্র-তে মিলিয়ে নিন' : lang === 'hi' ? 'आज के ड्रॉ में चेक करें' : "Check in Today's Draw"}
            </span>
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-3 rounded-xl transition-all active:scale-95 border border-slate-200 cursor-pointer"
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>
              {copied
                ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!')
                : (lang === 'bn' ? 'নম্বর কপি' : 'Copy Number')}
            </span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all active:scale-95 shadow-2xs"
          >
            <span>💬</span>
            <span>{lang === 'bn' ? 'শেয়ার' : 'Share'}</span>
          </a>
        </div>
      )}

      {/* 8. SEO-Friendly CTA Button for Compact Variant (Redirects to Full Hub) */}
      {!isFull && (
        <a
          href={`/analytics?number=${history.cleanNumber}`}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-95 text-center"
        >
          <span>📊</span>
          <span>
            {lang === 'bn'
              ? `৫ বছরের সম্পূর্ণ রেকর্ড, ১Y/৩Y/৫Y ট্রেন্ড ও অ্যানালিটিক্স দেখুন →`
              : lang === 'hi'
              ? `5 साल का पूरा रिकॉर्ड, 1Y/3Y/5Y ट्रेंड और एनालिटिक्स देखें →`
              : `Explore Full 5-Year History, Multi-Year Trends & Similar Numbers →`}
          </span>
        </a>
      )}

      {/* 8. Footer Status */}
      <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {lang === 'bn' 
            ? `📊 ৫,৪৭৫টি ড্র-এর অফিসিয়াল গেজেট ডেটাবেজ থেকে বিশ্লেষিত` 
            : lang === 'hi'
            ? `📊 5,475 ड्रॉ के आधिकारिक गजट डेटाबेस से विश्लेषित`
            : `📊 Analyzed across 5,475 official state gazette draws (2021-2026)`}
        </span>
        <span className="font-mono font-bold text-emerald-700">
          ⚡ 0ms Edge Speed
        </span>
      </div>
    </div>
  );
}
