import React, { useState, useEffect, useRef } from 'react';
import { parseTicketInput, formatINR } from '../lib/lottery-utils';
import { useLanguage } from '../lib/i18n';
import confetti from 'canvas-confetti';

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
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setMatches([]);

    const { series, number } = parseTicketInput(raw);
    const clientMatches: MatchResult[] = [];

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
            prizeRank: seriesMatch ? '১ম পুরস্কার' : 'সান্ত্বনা পুরস্কার (সিরিজ আলাদা)',
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
              prizeRank: '২য় পুরস্কার',
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
              prizeRank: '৩য় পুরস্কার',
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
              prizeRank: '৪র্থ পুরস্কার',
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
              prizeRank: '৫ম পুরস্কার',
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
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performCheck(ticketInput);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
      {/* 1-Line Slim Search Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </div>
          <input
            type="text"
            value={ticketInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="আপনার টিকিট নম্বর লিখুন (যেমন: 75331 বা শেষ ৪ সংখ্যা)..."
            className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900 rounded-xl pl-9 pr-9 py-2.5 sm:py-3 text-sm sm:text-base font-mono font-bold tracking-wider placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal outline-none transition-all uppercase"
          />
          {ticketInput && (
            <button
              type="button"
              onClick={() => {
                setTicketInput('');
                setHasSearched(false);
                setMatches([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold p-1 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm px-5 py-2.5 sm:py-3 rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap disabled:opacity-50"
        >
          {isSearching ? (
            <span className="inline-block animate-spin">মাপা হচ্ছে...</span>
          ) : (
            <>
              <span>⚡</span>
              <span>১-সেকেন্ডে মেলান</span>
            </>
          )}
        </button>
      </form>

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
                          বিজয়ী ({m.prizeRank})
                        </span>
                        <span className="text-xs text-slate-600 font-bold">
                          {m.drawName} ({m.drawTime})
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                        টিকিট নম্বর: <span className="font-mono font-black text-blue-700 text-sm sm:text-base">{m.ticketNumber}</span>
                      </p>
                      {m.requiredSeries && !m.seriesMatched && (
                        <p className="text-[11px] text-amber-900 mt-0.5 font-medium">
                          ⚠️ Note: ১ম পুরস্কারের জন্য সিরিজ {m.requiredSeries} প্রয়োজন। আপনার টিকিট ₹১,০০০ সান্ত্বনা পুরস্কার বিজয়ী!
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-emerald-200 pt-2 sm:pt-0 flex sm:flex-col justify-between items-center sm:items-end">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      পুরস্কারের টাকা
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
              <span className="font-mono font-bold text-slate-900">{ticketInput}</span> নম্বরে কোনো পুরস্কার মেলেনি। অন্য ড্র বা নম্বর চেক করে দেখুন।
            </div>
          )}
        </div>
      )}
    </div>
  );
}
