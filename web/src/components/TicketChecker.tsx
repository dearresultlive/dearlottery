import React, { useState, useEffect, useRef } from 'react';
import { parseTicketInput, formatINR } from '../lib/lottery-utils';
import { useLanguage } from '../lib/i18n';
import confetti from 'canvas-confetti';
import { analyzeNumberHistory, type NumberHistoryAnalysis } from '../lib/history-analytics';

interface MatchResult {
  drawName: string;
  drawTime: string;
  drawDate: string;
  prizeRank: string;
  prizeAmount: number;
  ticketNumber: string;
  seriesMatched: boolean;
  requiredSeries?: string | null;
}

interface TicketCheckerProps {
  initialDraws?: any[];
  variant?: 'slim' | 'full';
}

export default function TicketChecker({ initialDraws = [], variant = 'slim' }: TicketCheckerProps) {
  const { lang, t } = useLanguage();
  const [ticketInput, setTicketInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [historyAnalysis, setHistoryAnalysis] = useState<NumberHistoryAnalysis | null>(null);
  const debounceRef = useRef<any>(null);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.65 }
      });
    } catch (e) {}
  };

  const performCheck = async (inputVal: string) => {
    const raw = inputVal.trim();
    const cleanNumOnly = raw.replace(/\D/g, '');
    if (cleanNumOnly.length < 4) {
      setHasSearched(false);
      setMatches([]);
      setHistoryAnalysis(null);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setMatches([]);

    // Sub-millisecond historical analytics calculation
    const history = analyzeNumberHistory(cleanNumOnly);
    setHistoryAnalysis(history);

    const { series, number } = parseTicketInput(raw);
    const clientMatches: MatchResult[] = [];

    const getRankName = (rank: '1st' | '2nd' | '3rd' | '4th' | '5th' | 'cons') => {
      if (lang === 'bn') {
        return rank === '1st' ? '১ম পুরস্কার' : rank === '2nd' ? '২য় পুরস্কার' : rank === '3rd' ? '৩য় পুরস্কার' : rank === '4th' ? '৪র্থ পুরস্কার' : rank === '5th' ? '৫ম পুরস্কার' : 'সান্ত্বনা পুরস্কার (সিরিজ আলাদা)';
      }
      if (lang === 'hi') {
        return rank === '1st' ? 'प्रथम पुरस्कार' : rank === '2nd' ? 'द्वितीय पुरस्कार' : rank === '3rd' ? 'तृतीय पुरस्कार' : rank === '4th' ? 'चतुर्थ पुरस्कार' : rank === '5th' ? '5वां पुरस्कार' : 'सांत्वना पुरस्कार (सीरीज अलग)';
      }
      return rank === '1st' ? '1st Prize' : rank === '2nd' ? '2nd Prize' : rank === '3rd' ? '3rd Prize' : rank === '4th' ? '4th Prize' : rank === '5th' ? '5th Prize' : 'Consolation Prize (Different Series)';
    };

    // Client-side instant match across initialDraws
    for (const d of initialDraws) {
      const p = d.parsed_data?.prizes || d.prizes;
      if (!p) continue;

      const drawDate = d.draw_date;
      const drawTime = d.draw_time;
      const drawName = d.draw_name;

      if (p.first_prize) {
        if (p.first_prize.number === number || (number.length === 4 && p.first_prize.number.endsWith(number))) {
          const seriesMatch = !series || series.toUpperCase() === p.first_prize.series.toUpperCase();
          clientMatches.push({
            drawName,
            drawTime,
            drawDate,
            prizeRank: seriesMatch ? getRankName('1st') : getRankName('cons'),
            prizeAmount: seriesMatch ? 10000000 : 1000,
            ticketNumber: `${p.first_prize.series} ${p.first_prize.number}`,
            seriesMatched: seriesMatch,
            requiredSeries: p.first_prize.series
          });
        }
      }

      if (p.second_prize) {
        for (const num of p.second_prize) {
          if (num === number || (number.length === 4 && num.endsWith(number))) {
            clientMatches.push({
              drawName,
              drawTime,
              drawDate,
              prizeRank: getRankName('2nd'),
              prizeAmount: 9000,
              ticketNumber: num,
              seriesMatched: true
            });
          }
        }
      }

      if (p.third_prize) {
        for (const num of p.third_prize) {
          if (num === number.slice(-4)) {
            clientMatches.push({
              drawName,
              drawTime,
              drawDate,
              prizeRank: getRankName('3rd'),
              prizeAmount: 450,
              ticketNumber: num,
              seriesMatched: true
            });
          }
        }
      }

      if (p.fourth_prize) {
        for (const num of p.fourth_prize) {
          if (num === number.slice(-4)) {
            clientMatches.push({
              drawName,
              drawTime,
              drawDate,
              prizeRank: getRankName('4th'),
              prizeAmount: 250,
              ticketNumber: num,
              seriesMatched: true
            });
          }
        }
      }

      if (p.fifth_prize) {
        for (const num of p.fifth_prize) {
          if (num === number.slice(-4)) {
            clientMatches.push({
              drawName,
              drawTime,
              drawDate,
              prizeRank: getRankName('5th'),
              prizeAmount: 120,
              ticketNumber: num,
              seriesMatched: true
            });
          }
        }
      }
    }

    if (clientMatches.length > 0) {
      setMatches(clientMatches);
      setIsSearching(false);
      triggerConfetti();
      return;
    }

    // Server API fallback if not in initialDraws
    try {
      const params = new URLSearchParams({ number });
      if (series) params.append('series', series);

      const res = await fetch(`/api/results/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.matched && data.prizes && data.prizes.length > 0) {
          const apiMatches: MatchResult[] = data.prizes.map((p: any) => ({
            drawName: p.draw_name,
            drawTime: p.draw_time,
            drawDate: p.draw_date,
            prizeRank: p.prize_rank,
            prizeAmount: p.prize_amount,
            ticketNumber: p.ticket_number,
            seriesMatched: p.series_matched,
            requiredSeries: p.required_series
          }));
          setMatches(apiMatches);
          triggerConfetti();
        }
      }
    } catch (e) {
      console.error('Ticket search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          handleInputChange(text);
          if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
            (navigator as any).vibrate(15);
          }
        }
      }
    } catch (e) {}
  };

  const handleInputChange = (val: string) => {
    const formatted = val.toUpperCase();
    setTicketInput(formatted);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const cleanNum = formatted.replace(/\D/g, '');
    if (cleanNum.length >= 4) {
      debounceRef.current = setTimeout(() => {
        performCheck(formatted);
      }, 350);
    } else {
      setHasSearched(false);
      setMatches([]);
      setHistoryAnalysis(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performCheck(ticketInput);
    if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      (navigator as any).vibrate(12);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
      {/* 1-Line Slim Search Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </div>
          <label htmlFor="ticket-search-input" className="sr-only">
            Enter Dear Lottery Ticket Number
          </label>
          <input
            id="ticket-search-input"
            name="ticket-search"
            aria-label="Enter ticket number to check"
            type="text"
            value={ticketInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              lang === 'bn'
                ? 'আপনার টিকিট নম্বর লিখুন (যেমন: 75331 বা শেষ ৪ সংখ্যা)...'
                : lang === 'hi'
                ? 'अपना टिकट नंबर दर्ज करें (जैसे: 75331 या अंतिम 4 अंक)...'
                : 'Enter ticket number (e.g. 75331 or last 4 digits)...'
            }
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900 rounded-xl pl-9 pr-14 py-2.5 sm:py-3 text-base font-mono font-bold tracking-wider placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-xs sm:placeholder:text-sm outline-none transition-all uppercase"
          />
          {ticketInput ? (
            <button
              type="button"
              onClick={() => {
                setTicketInput('');
                setHasSearched(false);
                setMatches([]);
                setHistoryAnalysis(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold p-1 text-xs"
              aria-label="Clear input"
            >
              ✕
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1 rounded-lg text-[10px] tracking-normal font-sans active:scale-95 transition-all flex items-center gap-1"
              title="Paste from clipboard"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Paste</span>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm px-5 py-2.5 sm:py-3 rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap disabled:opacity-50"
        >
          {isSearching ? (
            <span className="inline-block animate-spin">{lang === 'bn' ? 'মাপা হচ্ছে...' : lang === 'hi' ? 'जांच हो रही है...' : 'Checking...'}</span>
          ) : (
            <>
              <span>⚡</span>
              <span>{lang === 'bn' ? '১-সেকেন্ডে মেলান' : lang === 'hi' ? '1-सेकंड में चेक करें' : '1-Second Check'}</span>
            </>
          )}
        </button>
      </form>

      {/* Coverage Status Hint */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>
          {lang === 'bn' 
            ? '⚡ আজকের ৩টি ড্র ও গতরাতের ৮টা সহ সব প্রাইজ স্বয়ংক্রিয়ভাবে চেক হয়' 
            : lang === 'hi' 
            ? '⚡ आज के 3 ड्रॉ और कल रात 8 बजे सहित सभी प्राइज चेक होते हैं' 
            : "⚡ Checks across all prize tiers for Today and Last Night's 8PM draw"}
        </span>
      </div>

      {/* Instant Result Feedback Badge */}
      {hasSearched && (
        <div className="pt-1">
          {matches.length > 0 ? (
            <div className="space-y-2 animate-in fade-in duration-200">
              {matches.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl">🎉</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-700 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {lang === 'bn' ? `বিজয়ী (${m.prizeRank})` : lang === 'hi' ? `विजेता (${m.prizeRank})` : `Winner (${m.prizeRank})`}
                        </span>
                        <span className="text-xs text-slate-700 font-bold">
                          {m.drawDate ? `${m.drawDate.split('-').slice(1).reverse().join('/')} • ` : ''}{m.drawName} ({m.drawTime})
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                        {lang === 'bn' ? 'টিকিট নম্বর: ' : lang === 'hi' ? 'टिकट नंबर: ' : 'Ticket Number: '}
                        <span className="font-mono font-black text-blue-700 text-sm sm:text-base">{m.ticketNumber}</span>
                      </p>
                      {m.requiredSeries && !m.seriesMatched && (
                        <p className="text-[11px] text-amber-900 mt-0.5 font-medium">
                          {lang === 'bn'
                            ? `⚠️ Note: ১ম পুরস্কারের জন্য সিরিজ ${m.requiredSeries} প্রয়োজন। আপনার টিকিট ₹১,০০০ সান্ত্বনা পুরস্কার বিজয়ী!`
                            : lang === 'hi'
                            ? `⚠️ Note: 1st Prize के लिए सीरीज ${m.requiredSeries} आवश्यक है। आपका टिकट ₹1,000 सांत्वना पुरस्कार विजेता है!`
                            : `⚠️ Note: 1st Prize required series ${m.requiredSeries}. Your ticket won ₹1,000 Consolation Prize!`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-emerald-200 pt-2 sm:pt-0 flex sm:flex-col justify-between items-center sm:items-end">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {lang === 'bn' ? 'পুরস্কারের টাকা' : lang === 'hi' ? 'पुरस्कार राशि' : 'Prize Amount'}
                    </span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-emerald-800">
                      {formatINR(m.prizeAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-700 animate-in fade-in duration-150">
              {lang === 'bn' ? (
                <span><span className="font-mono font-bold text-slate-900">{ticketInput}</span> নম্বরে কোনো পুরস্কার মেলেনি। অন্য ড্র বা নম্বর চেক করে দেখুন।</span>
              ) : lang === 'hi' ? (
                <span><span className="font-mono font-bold text-slate-900">{ticketInput}</span> नंबर पर कोई पुरस्कार नहीं मिला। अन्य ड्रा या नंबर जांचें।</span>
              ) : (
                <span>No winning match found for ticket <span className="font-mono font-bold text-slate-900">{ticketInput}</span>. Try checking another draw.</span>
              )}
            </div>
          )}

          {/* Historical Record & Pattern Intelligence Card */}
          {historyAnalysis && (
            <div className="mt-3 bg-slate-50 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-2.5 text-left shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 flex-wrap gap-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                  <span>📜</span>
                  <span>
                    {lang === 'bn'
                      ? `ঐতিহাসিক রেকর্ড ও ফ্রিকোয়েন্সি (${historyAnalysis.cleanNumber})`
                      : lang === 'hi'
                      ? `ऐतिहासिक रिकॉर्ड और फ्रीक्वेंसी (${historyAnalysis.cleanNumber})`
                      : `Historical Record & Pattern Stats (${historyAnalysis.cleanNumber})`}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  🔥 {lang === 'bn' ? 'হট স্কোর' : lang === 'hi' ? 'हॉट स्कोर' : 'Hot Score'}: {historyAnalysis.hotScore}/100
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-snug font-medium">
                {lang === 'bn' ? historyAnalysis.summaryBn : lang === 'hi' ? historyAnalysis.summaryHi : historyAnalysis.summaryEn}
              </p>

              {/* Stats Badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    {lang === 'bn' ? 'শেষ ২-ডিজিট' : lang === 'hi' ? 'अंतिम 2-अंक' : 'Ending Rank'}
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-blue-700 block">
                    ..{historyAnalysis.last2Digits}
                  </span>
                  <span className="text-[9px] font-medium text-slate-500 block truncate">
                    #{historyAnalysis.last2Rank} / 100 ({historyAnalysis.last2Frequency} {lang === 'bn' ? 'বার' : 'hits'})
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    {lang === 'bn' ? 'মিডিল পেয়ার' : lang === 'hi' ? 'मिडिल पेयर' : 'Middle Rank'}
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-emerald-700 block">
                    {historyAnalysis.middlePair}xx
                  </span>
                  <span className="text-[9px] font-medium text-slate-500 block truncate">
                    #{historyAnalysis.middleRank} / 100 ({historyAnalysis.middleFrequency} {lang === 'bn' ? 'বার' : 'hits'})
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    {lang === 'bn' ? 'অতীত গেজেট জয়' : lang === 'hi' ? 'पिछली जीत' : 'Past Wins'}
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-amber-700 block">
                    {historyAnalysis.totalHistoricalHits}
                  </span>
                  <span className="text-[9px] font-medium text-slate-500 block truncate">
                    {historyAnalysis.lastSeenDate ? historyAnalysis.lastSeenDate.split('-').reverse().join('/') : (lang === 'bn' ? 'নতুন নম্বর' : 'New Combo')}
                  </span>
                </div>
              </div>

              {/* Past Exact Wins List */}
              {historyAnalysis.exactWins.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2 space-y-1">
                  <span className="text-[10px] font-black text-emerald-900 uppercase block">
                    🏆 {lang === 'bn' ? 'বিগত ড্র-তে হুবহু জয়:' : lang === 'hi' ? 'पिछले ड्रॉ में सटीक जीत:' : 'Past Exact Wins in Gazette Archive:'}
                  </span>
                  {historyAnalysis.exactWins.slice(0, 3).map((win, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-emerald-950 font-bold border-t border-emerald-200/60 pt-1 first:border-0 first:pt-0">
                      <span>📅 {win.drawDate.split('-').reverse().join('/')} ({win.drawTime})</span>
                      <span className="text-emerald-800">{win.prizeRank} • {formatINR(win.prizeAmount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Past 4-digit Wins List */}
              {historyAnalysis.exactWins.length === 0 && historyAnalysis.last4Wins.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1">
                  <span className="text-[10px] font-black text-blue-900 uppercase block">
                    🎯 {lang === 'bn' ? 'বিগত ড্র-তে শেষ ৪ সংখ্যার জয়:' : lang === 'hi' ? 'पिछले ड्रॉ में अंतिम 4 अंकों की जीत:' : 'Past 4-Digit Matches:'}
                  </span>
                  <div className="text-[11px] text-blue-950 font-medium">
                    {lang === 'bn' 
                      ? `শেষ ৪ ডিজিট '${historyAnalysis.cleanNumber.slice(-4)}' এর আগে ${historyAnalysis.last4Wins.length} বার প্রাইজ পেয়েছে (সর্বশেষ ${historyAnalysis.last4Wins[0].drawDate.split('-').reverse().join('/')} তারিখে ${historyAnalysis.last4Wins[0].prizeRank})।`
                      : lang === 'hi'
                      ? `अंतिम 4 अंक '${historyAnalysis.cleanNumber.slice(-4)}' पहले ${historyAnalysis.last4Wins.length} बार पुरस्कार जीत चुका है (हाल ही में ${historyAnalysis.last4Wins[0].drawDate.split('-').reverse().join('/')})।`
                      : `Last 4 digits '${historyAnalysis.cleanNumber.slice(-4)}' won in ${historyAnalysis.last4Wins.length} previous draws (last seen ${historyAnalysis.last4Wins[0].drawDate.split('-').reverse().join('/')}).`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
