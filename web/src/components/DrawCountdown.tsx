import React, { useState, useEffect, useRef } from 'react';
import { getNextUpcomingDraw, getISTNow } from '../lib/lottery-utils';
import { useLanguage } from '../lib/i18n';

interface DrawCountdownProps {
  onResultDetected?: (draw: any) => void;
  compact?: boolean;
}

export default function DrawCountdown({ onResultDetected, compact = false }: DrawCountdownProps) {
  const { lang } = useLanguage();
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
    if (compact) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center text-xs text-slate-500 shadow-sm animate-pulse">
        <p className="font-medium">Loading official draw schedule (IST)...</p>
      </div>
    );
  }

  const isLive = timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
          {lang === 'bn' ? `পরবর্তী ড্র (${nextDraw.timeLabel}):` : lang === 'hi' ? `अगला ड्रा (${nextDraw.timeLabel}):` : `Next (${nextDraw.timeLabel}):`}
        </span>
        <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-900 px-2.5 py-1 rounded-lg font-mono text-xs font-black shadow-2xs">
          <span>⏰</span>
          <span>
            {timeLeft.hours > 0 ? `${String(timeLeft.hours).padStart(2, '0')}h : ` : ''}
            {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl px-3 py-1.5 sm:px-5 sm:py-2.5 shadow-xs">
      <div className="flex flex-row items-center justify-between gap-2">
        
        {/* Left: Live Status & Next Draw Info */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-600"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-1.5 sm:px-2 py-0.2 rounded-full">
              LIVE
            </span>
          </div>

          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
            <span className="hidden sm:inline">{lang === 'bn' ? 'পরবর্তী ড্র: ' : lang === 'hi' ? 'अगला ड्रा: ' : 'Next: '}</span>
            <span className="text-blue-700 font-black">{nextDraw.timeLabel}</span>
            <span className="hidden md:inline text-slate-500 font-medium text-xs ml-1.5">
              ({nextDraw.name})
            </span>
          </div>

          <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono hidden lg:inline">
            {istTimeStr} IST
          </span>
        </div>

        {/* Right: Dynamic Reverse Countdown / Result Out Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {newResultData ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1 rounded-xl text-xs font-black shadow-sm">
              <span>{lang === 'bn' ? '🎉 রেজাল্ট আউট:' : lang === 'hi' ? '🎉 रिजल्ट जारी:' : '🎉 Result Out:'}</span>
              <span className="font-mono text-slate-950 text-sm font-black">
                {newResultData.parsed_data?.prizes?.first_prize?.series} {newResultData.parsed_data?.prizes?.first_prize?.number}
              </span>
            </div>
          ) : isLive ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 px-3 py-1 rounded-xl text-xs font-black animate-pulse">
              <span>{lang === 'bn' ? `🚀 ড্র চলছে • ${pollCountdown}s এ অটো-আপডেট` : lang === 'hi' ? `🚀 ड्रा जारी • ${pollCountdown}s में ऑटो-अपडेट` : `🚀 Drawing Live • Auto-updating in ${pollCountdown}s`}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">
                {lang === 'bn' ? 'বাকি:' : 'Left:'}
              </span>
              
              {/* Hours */}
              {timeLeft.hours > 0 && (
                <>
                  <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">h</span>
                  <span className="text-slate-300 font-bold">:</span>
                </>
              )}

              {/* Minutes */}
              <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">m</span>
              <span className="text-slate-300 font-bold">:</span>

              {/* Seconds */}
              <span className="font-mono font-black text-blue-700 text-sm sm:text-base">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">s</span>

              {/* Auto-Polling Indicator */}
              {isPollingActive && (
                <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
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
