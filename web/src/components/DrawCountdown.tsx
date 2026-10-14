import React, { useState, useEffect, useRef } from 'react';
import { getNextUpcomingDraw, getISTNow } from '../lib/lottery-utils';

interface DrawCountdownProps {
  onResultDetected?: (draw: any) => void;
}

export default function DrawCountdown({ onResultDetected }: DrawCountdownProps) {
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
      // Immediate first check
      checkLatestResults();

      // 1-second countdown for next poll UI indicator
      secondTickRef.current = setInterval(() => {
        setPollCountdown(prev => (prev <= 1 ? 10 : prev - 1));
      }, 1000);

      // 10-second polling cycle
      pollTimerRef.current = setInterval(() => {
        checkLatestResults();
      }, 10000);

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (secondTickRef.current) clearInterval(secondTickRef.current);
      };
    }
  }, [isPollingActive, nextDraw.slot, newResultData]);

  if (!timeLeft) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white text-center shadow-xl animate-pulse">
        <p className="text-slate-400 font-medium">Calculating next official draw time (IST)...</p>
      </div>
    );
  }

  const isLive = timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 text-white shadow-2xl relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        
        {/* Left Column: Title & Time Info */}
        <div className="text-center lg:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-1">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400">
              Official IST Live Edge Scheduler
            </span>
            <span className="text-xs text-slate-300 bg-slate-950/90 border border-slate-800 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {istTimeStr} IST
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Next Draw: <span className="text-amber-300">{nextDraw.name}</span> ({nextDraw.timeLabel})
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Nagaland & Sikkim State Lotteries • দৈনিক ১:০০ PM দুপুর, ৬:০০ PM সন্ধ্যা ও ৮:০০ PM রাত।
          </p>

          {/* Dynamic Auto-Polling Status Bar (Zero-Refresh) */}
          {isPollingActive && !newResultData && (
            <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>⚡ Auto-Polling Active / প্রতি ১০ সেকেন্ডে লাইভ চেক হচ্ছে (Check #{pollAttempt})</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Next poll in <strong className="text-white">{pollCountdown}s</strong>
              </span>
            </div>
          )}

          {/* Result Received Notification Badge */}
          {newResultData && (
            <div className="pt-1 flex items-center justify-center lg:justify-start gap-2">
              <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
                <span>🎉</span>
                <span>ফলাফল প্রকাশিত হয়েছে! 1st Prize: {newResultData.parsed_data?.prizes?.first_prize?.series} {newResultData.parsed_data?.prizes?.first_prize?.number}</span>
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Live Reverse Countdown Digits */}
        {newResultData ? (
          <div className="bg-slate-950/95 border-2 border-emerald-500 text-center p-4 rounded-2xl shadow-xl min-w-[280px]">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
              ✓ RESULT LIVE ON PORTAL
            </span>
            <div className="text-3xl font-mono font-black text-amber-300">
              {newResultData.parsed_data?.prizes?.first_prize?.series} {newResultData.parsed_data?.prizes?.first_prize?.number}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Zero page reload required • Result updated dynamically
            </span>
          </div>
        ) : isLive ? (
          <div className="bg-emerald-950/80 border-2 border-emerald-500 text-emerald-300 px-6 py-4 rounded-2xl font-black text-center shadow-2xl animate-pulse space-y-1">
            <div className="text-lg text-white">🚀 DRAW TIME REACHED!</div>
            <div className="text-xs text-emerald-300 font-mono">
              Auto-checking /api/results/latest every 10s... ({pollCountdown}s)
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/90 border-2 border-slate-800/90 p-3 sm:p-4 rounded-2xl shadow-inner">
            
            {/* Hours */}
            <div className="flex flex-col items-center">
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-[54px] sm:min-w-[64px] text-center shadow-inner">
                <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-bold">
                ঘণ্টা / Hrs
              </span>
            </div>

            <span className="text-xl sm:text-2xl font-black text-amber-400/60 pb-4">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-[54px] sm:min-w-[64px] text-center shadow-inner">
                <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-bold">
                মিনিট / Min
              </span>
            </div>

            <span className="text-xl sm:text-2xl font-black text-amber-400/60 pb-4">:</span>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-[54px] sm:min-w-[64px] text-center shadow-inner">
                <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-400">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-bold">
                সেকেন্ড / Sec
              </span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
