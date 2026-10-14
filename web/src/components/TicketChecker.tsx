import React, { useState } from 'react';
import { parseTicketInput, formatINR } from '../lib/lottery-utils';
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
}

export default function TicketChecker({ initialDraws = [] }: TicketCheckerProps) {
  const [ticketInput, setTicketInput] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string>('ALL');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Ignore
    }
  };

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketInput.trim() || ticketInput.replace(/\D/g, '').length < 4) {
      alert('Please enter at least 4 digits of your ticket number.');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setMatches([]);

    const { series, number } = parseTicketInput(ticketInput);
    const clientMatches: MatchResult[] = [];

    const activeDraws = initialDraws.filter(d => {
      if (selectedSlot === 'ALL') return true;
      return d.draw_time?.includes(selectedSlot) || d.id?.includes(selectedSlot);
    });

    for (const d of activeDraws) {
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
            prizeRank: seriesMatch ? '1st Prize' : 'Consolation Prize (Series mismatch)',
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
              prizeRank: '2nd Prize',
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
              prizeRank: '3rd Prize',
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
              prizeRank: '4th Prize',
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
              prizeRank: '5th Prize',
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

    try {
      const params = new URLSearchParams({ number });
      if (series) params.append('series', series);
      if (selectedSlot !== 'ALL') params.append('draw_id', selectedSlot);

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
      console.error('Edge ticket check failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const setSampleTicket = (sample: string) => {
    setTicketInput(sample);
    setTimeout(() => {
      const btn = document.getElementById('search-btn');
      if (btn) btn.click();
    }, 50);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-sm relative">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <span className="inline-block bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2">
            ⚡ Instant Ticket Checker
          </span>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900">
            Check Your Dear Lottery Ticket
          </h3>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Search by full ticket (<span className="text-blue-700 font-mono font-bold">84D 19283</span>) or last 4-5 digits (<span className="text-blue-700 font-mono font-bold">4829</span>).
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleCheck} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                placeholder="e.g. 84D 19283 or 4829"
                className="w-full bg-slate-50 border-2 border-slate-300 focus:border-blue-600 text-slate-900 rounded-xl px-4 py-3.5 text-lg font-mono tracking-widest placeholder:text-slate-400 outline-none transition-all uppercase shadow-inner"
              />
              {ticketInput && (
                <button
                  type="button"
                  onClick={() => setTicketInput('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              id="search-btn"
              type="submit"
              disabled={isSearching}
              className="bg-blue-700 hover:bg-blue-800 text-white font-black px-7 py-3.5 rounded-xl shadow-sm flex items-center justify-center gap-2 text-base transition-transform active:scale-95 disabled:opacity-50"
            >
              {isSearching ? (
                <span className="inline-block animate-spin">⏳ Checking...</span>
              ) : (
                <span>Check Ticket</span>
              )}
            </button>
          </div>

          {/* Draw Slot Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold">Filter Draw:</span>
              {(['ALL', '1:00 PM', '6:00 PM', '8:00 PM'] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-2.5 py-1 rounded-lg border font-bold transition-colors ${
                    selectedSlot === slot
                      ? 'bg-blue-700 border-blue-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            {/* Quick Demo Pre-fills */}
            <div className="flex items-center gap-1">
              <span>Try:</span>
              <button
                type="button"
                onClick={() => {
                  const firstP = initialDraws[0]?.parsed_data?.prizes?.first_prize;
                  if (firstP) setSampleTicket(`${firstP.series} ${firstP.number}`);
                  else setSampleTicket('84D 19283');
                }}
                className="text-blue-700 hover:underline font-mono font-bold"
              >
                1st Prize
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  const fifthP = initialDraws[0]?.parsed_data?.prizes?.fifth_prize;
                  if (fifthP && fifthP[0]) setSampleTicket(fifthP[0]);
                  else setSampleTicket('4829');
                }}
                className="text-emerald-700 hover:underline font-mono font-bold"
              >
                5th Prize
              </button>
            </div>
          </div>
        </form>

        {/* Search Results Display */}
        {hasSearched && (
          <div className="mt-6 transition-all">
            {matches.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 text-center shadow-xs">
                  <span className="text-3xl block mb-1">🎉</span>
                  <h4 className="text-xl font-black text-emerald-900 uppercase tracking-wide">
                    Congratulations! You Won!
                  </h4>
                  <p className="text-emerald-800 text-xs mt-1">
                    Your ticket matched <strong className="font-black text-slate-950">{matches.length} prize tier{matches.length > 1 ? 's' : ''}</strong>!
                  </p>
                </div>

                <div className="grid gap-2.5">
                  {matches.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-700 text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
                            {m.prizeRank}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {m.drawName} ({m.drawTime})
                          </span>
                        </div>
                        <p className="text-base font-mono font-bold text-slate-900 mt-1">
                          Winning Ticket: <span className="text-blue-700 font-black">{m.ticketNumber}</span>
                        </p>
                        {m.requiredSeries && !m.seriesMatched && (
                          <p className="text-xs text-amber-800 mt-0.5 font-medium">
                            ⚠️ Note: 1st Prize requires Series {m.requiredSeries}. All other series win ₹1,000 Consolation prize.
                          </p>
                        )}
                      </div>

                      <div className="sm:text-right">
                        <span className="text-xs text-slate-500 block">Prize Amount</span>
                        <span className="text-xl font-black text-emerald-800 font-mono">
                          {formatINR(m.prizeAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 text-center">
                  💡 <strong className="text-slate-900">How to claim:</strong> Prizes up to ₹10,000 can be claimed through registered lottery distributors. 1st prize must be submitted with original ticket and valid government ID to the Directorate of State Lotteries.
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                <span className="text-2xl block mb-1">☘️</span>
                <h4 className="text-base font-bold text-slate-900">No Winning Match Found</h4>
                <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                  Ticket <span className="text-blue-700 font-mono font-bold">{ticketInput}</span> did not match any winning number for the selected draw. Better luck next draw!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
