import React, { useState, useEffect } from 'react';
import { getNextUpcomingDraw, getISTNow } from '../lib/lottery-utils';

export default function DrawCountdown() {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [nextDraw, setNextDraw] = useState(getNextUpcomingDraw());
  const [istTimeStr, setIstTimeStr] = useState<string>('');

  useEffect(() => {
    function updateTimer() {
      const istNow = getISTNow();
      setIstTimeStr(istNow.toLocaleTimeString('en-IN', { hour12: true }));

      const currentUpcoming = getNextUpcomingDraw();
      setNextDraw(currentUpcoming);

      const diff = currentUpcoming.targetTimestamp - istNow.getTime();

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
  }, []);

  if (!timeLeft) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white text-center shadow-xl animate-pulse">
        <p className="text-slate-400">Calculating next draw in Indian Standard Time...</p>
      </div>
    );
  }

  const isLive = timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden">
      {/* Background glowing ambient light */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs uppercase tracking-widest font-bold text-emerald-400">
              Live Edge Scheduler (IST)
            </span>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
              {istTimeStr} IST
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Next Draw: <span className="text-amber-400">{nextDraw.name}</span> ({nextDraw.timeLabel})
          </h3>
          <p className="text-sm text-slate-300 mt-1">
            Draws published automatically at 1:00 PM, 6:00 PM & 8:00 PM daily.
          </p>
        </div>

        {/* Countdown Digits */}
        {isLive ? (
          <div className="bg-emerald-600/30 border border-emerald-500 text-emerald-300 px-6 py-3 rounded-xl font-bold animate-pulse text-center">
            🚀 RESULT DRAW IN PROGRESS! REFRESHING EDGE CACHE...
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 min-w-[64px] text-center shadow-inner">
                <span className="font-mono text-2xl md:text-3xl font-black text-emerald-400">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">Hours</span>
            </div>

            <span className="text-2xl font-bold text-slate-500 mb-4">:</span>

            <div className="flex flex-col items-center">
              <div className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 min-w-[64px] text-center shadow-inner">
                <span className="font-mono text-2xl md:text-3xl font-black text-emerald-400">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">Mins</span>
            </div>

            <span className="text-2xl font-bold text-slate-500 mb-4">:</span>

            <div className="flex flex-col items-center">
              <div className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 min-w-[64px] text-center shadow-inner">
                <span className="font-mono text-2xl md:text-3xl font-black text-amber-400">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">Secs</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
