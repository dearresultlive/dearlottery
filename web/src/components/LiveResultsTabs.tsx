import React, { useState } from 'react';
import { formatINR } from '../lib/lottery-utils';

interface LiveResultsTabsProps {
  draws: any[];
}

export default function LiveResultsTabs({ draws = [] }: LiveResultsTabsProps) {
  const [selectedSlot, setSelectedSlot] = useState<string>('ALL');

  const filteredDraws = draws.filter(d => {
    if (selectedSlot === 'ALL') return true;
    return d.draw_time?.includes(selectedSlot) || d.id?.includes(selectedSlot);
  });

  return (
    <div className="space-y-6">
      {/* Mobile-Friendly Slot Selector Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { label: 'All Draws (3)', value: 'ALL' },
            { label: '1:00 PM Morning', value: '1:00 PM' },
            { label: '6:00 PM Day', value: '6:00 PM' },
            { label: '8:00 PM Night', value: '8:00 PM' }
          ].map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedSlot(tab.value)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                selectedSlot === tab.value
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => window.print()}
          type="button"
          className="hidden sm:inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
        >
          <span>🖨️</span>
          <span>Print Gazette Sheet</span>
        </button>
      </div>

      {/* Rendered Result Cards */}
      <div className="grid grid-cols-1 gap-8">
        {filteredDraws.map((draw) => {
          const p = draw.parsed_data?.prizes || draw.prizes;
          const first = p?.first_prize || { series: '84D', number: '19283' };
          const second = p?.second_prize || [];
          const third = p?.third_prize || [];
          const fourth = p?.fourth_prize || [];
          const fifth = p?.fifth_prize || [];

          return (
            <div
              key={draw.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {draw.draw_time} OFFICIAL
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Date: {draw.draw_date}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    {draw.draw_name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {draw.source_url && (
                    <a
                      href={draw.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold px-3 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>📄</span>
                      <span>Official PDF</span>
                    </a>
                  )}
                </div>
              </div>

              {/* 1st Prize ₹1 Crore Hero Banner */}
              <div className="my-6 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-slate-950 border-2 border-amber-500/60 rounded-2xl p-6 text-center relative overflow-hidden shadow-xl">
                <span className="bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-3 shadow">
                  🏆 1st Prize: ₹1,00,00,000 (1 Crore)
                </span>
                
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl sm:text-5xl font-black font-mono text-amber-400 tracking-wider">
                    {first.series} {first.number}
                  </span>
                </div>

                <div className="mt-3 text-xs text-amber-200/80 max-w-md mx-auto">
                  <span className="font-bold">Consolation Prize: ₹1,000</span> for remaining serials & series of ticket number <span className="font-mono font-bold text-white">{first.number}</span>
                </div>
              </div>

              {/* 2nd Prize (10 tickets, ₹9,000 each) */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  2nd Prize: {formatINR(9000)} (10 Winners)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {second.map((num: string, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800/80 rounded-xl py-2 px-3 text-center font-mono font-bold text-emerald-400 text-base shadow-inner"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3rd & 4th Prizes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* 3rd Prize (₹450) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    3rd Prize: {formatINR(450)} (10 Winners)
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {third.map((num: string, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 text-center font-mono text-sm font-semibold text-slate-200"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4th Prize (₹250) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    4th Prize: {formatINR(250)} (10 Winners)
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {fourth.map((num: string, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 text-center font-mono text-sm font-semibold text-slate-200"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5th Prize: 100 Numbers (₹120 each) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    5th Prize: {formatINR(120)} (100 Winners)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Last 4 Digits</span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {fifth.map((num: string, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-md py-1 text-center font-mono text-xs font-medium text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
