import React, { useState, useEffect, useRef } from 'react';
import { getNextUpcomingDraw, getISTNow } from '../lib/lottery-utils';

interface DrawCountdownProps {
  onResultDetected?: (draw: any) => void;
  compact?: boolean;
}

export default function DrawCountdown({ onResultDetected, compact = false }: DrawCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [nextDraw, setNextDraw] = useState(getNextUpcomingDraw());
  const [istTimeStr, setIstTimeStr] = useState<string>('');
  
  // Auto-polling state (Zero-Refresh Experience)
  const [isPollingActive, setIsPollingActive] = useState<boolean>(false);
  const [pollCountdown, setPollCountdown] = useState<number>(10);
  const [pollAttempt, setPollAttempt] = useState<number>(0);
  const [newResultData, setNewResultData] = useState<any>(null);
  const pollTimerRef = useRef<any>(null);
  const secondTickRef = useRef<any>(null);

  // Poll function to check /api/results/latest
  const checkLatestResults = async () => {
    try {
      setPollAttempt(prev => prev + 1);
      const res = await fetch(`/api/results/latest?slot=${nextDraw.slot}&t=${Date.now()}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        const draws = data.draws || [];
        
        // Check if matching slot result is declared
        const found = draws.find((d: any) => 
          d.draw_time?.includes(nextDraw.slot.replace('PM', '')) ||
          d.id?.includes(nextDraw.slot)
        );

        if (found) {
          const prizes = found.parsed_data?.prizes || found.prizes;
          const first = prizes?.first_prize;
          if (first && first.number) {
            setNewResultData(found);
            setIsPollingActive(false);

            // Broadcast globally so LiveResultsTabs can update without reload
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('dearlottery:new_result', { detail: found }));
            }

            if (onResultDetected) {
              onResultDetected(found);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Auto-poll check attempt failed, retrying in 10s...', e);
    }
  };

  useEffect(() => {
    function updateTimer() {
      const istNow = getISTNow();
      setIstTimeStr(istNow.toLocaleTimeString('en-IN', { hour12: true }));

      const currentUpcoming = getNextUpcomingDraw();
      setNextDraw(currentUpcoming);

      const diff = currentUpcoming.targetTimestamp - istNow.getTime();

      // Polling Trigger Rule: 2 minutes before draw time (diff <= 120,000ms) 
      // or up to 15 minutes after scheduled time until result is captured
      const isWithin2MinWindow = diff <= 120 * 1000 && diff >= -15 * 60 * 1000;
      
      if (isWithin2MinWindow && !newResultData) {
        setIsPollingActive(true);
      }

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [newResultData]);

  // Handle 10-second auto-polling loop when active
  useEffect(() => {
    if (isPollingActive && !newResultData) {
      checkLatestResults();

      pollTimerRef.current = setInterval(() => {
        checkLatestResults();
        setPollCountdown(10);
      }, 10000);

      secondTickRef.current = setInterval(() => {
        setPollCountdown(prev => (prev > 1 ? prev - 1 : 10));
      }, 1000);

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (secondTickRef.current) clearInterval(secondTickRef.current);
      };
    }
  }, [isPollingActive, nextDraw.slot, newResultData]);

  if (!timeLeft) {
    return (
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3 text-white text-center text-xs animate-pulse">
        <p className="text-slate-400 font-medium">Loading official draw schedule (IST)...</p>
      </div>
    );
  }

  const isLive = timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  // Ultra-Compact Mobile-First Live Bar (Takes ~48px-56px height, saves 300px of screen space!)
  return (
    <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 text-white shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        
        {/* Left: Live Status & Next Draw Info */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
              LIVE IST
            </span>
          </div>

          <div className="text-xs sm:text-sm font-extrabold text-white">
            <span>Next: </span>
            <span className="text-amber-300 font-black">{nextDraw.timeLabel}</span>
            <span className="hidden md:inline text-slate-400 font-normal text-xs ml-1.5">
              ({nextDraw.name})
            </span>
          </div>

          <span className="text-[10px] text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-mono hidden sm:inline">
            {istTimeStr}
          </span>
        </div>

        {/* Right: Dynamic Reverse Countdown / Result Out Badge */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {newResultData ? (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-3 py-1 rounded-xl text-xs font-black">
              <span>🎉 রেজাল্ট প্রকাশ হয়েছে:</span>
              <span className="font-mono text-amber-300 text-sm">
                {newResultData.parsed_data?.prizes?.first_prize?.series} {newResultData.parsed_data?.prizes?.first_prize?.number}
              </span>
            </div>
          ) : isLive ? (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-1 rounded-xl text-xs font-black animate-pulse">
              <span>🚀 ড্র চলছে (Auto-Checking in {pollCountdown}s)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-950/90 border border-amber-500/30 px-3 py-1 rounded-xl shadow-inner">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                বাকি / Left:
              </span>
              
              {/* Hours */}
              {timeLeft.hours > 0 && (
                <>
                  <span className="font-mono font-black text-amber-400 text-sm sm:text-base">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">h</span>
                  <span className="text-slate-600 font-bold">:</span>
                </>
              )}

              {/* Minutes */}
              <span className="font-mono font-black text-amber-400 text-sm sm:text-base">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">m</span>
              <span className="text-slate-600 font-bold">:</span>

              {/* Seconds */}
              <span className="font-mono font-black text-emerald-400 text-sm sm:text-base">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">s</span>

              {/* Auto-Polling Indicator */}
              {isPollingActive && (
                <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                  ⚡ Auto-sync
                </span>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
