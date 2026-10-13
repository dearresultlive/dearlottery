import React, { useState } from 'react';

interface DigitStat {
  digit: string;
  position: number;
  count: number;
}

interface HotNumber {
  ticket_number: string;
  occurrences: number;
  last_seen_date: string;
}

interface AnalyticsModuleProps {
  initialMatrix?: DigitStat[];
  initialHot?: HotNumber[];
  initialCold?: HotNumber[];
}

export default function AnalyticsModule({
  initialMatrix = [],
  initialHot = [],
  initialCold = []
}: AnalyticsModuleProps) {
  const [activeTab, setActiveTab] = useState<'hot' | 'cold' | 'matrix'>('hot');

  // Compute max count for heatmap scaling
  const maxCount = Math.max(...initialMatrix.map(m => m.count), 1);

  // Group matrix by position (1 to 5)
  const positions = [1, 2, 3, 4, 5];
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
      {/* Disclaimer Banner */}
      <div className="mb-6 bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-200">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <p>
          <strong class="text-amber-400 font-bold uppercase tracking-wider">Statistical Advisory:</strong> Historical data analysis for informational purposes only; does not predict future outcomes. Each lottery draw is an independent random event.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <span className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2">
            📈 Statistical Intelligence Engine
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Past 30 Days Hot & Cold Numbers
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Data-backed statistical frequency of repeating 4-digit numbers and positional digit patterns over the last 30 days.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('hot')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'hot'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔥 Hot Numbers
          </button>
          <button
            onClick={() => setActiveTab('cold')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'cold'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ❄️ Cold Numbers
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'matrix'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Digit Heatmap
          </button>
        </div>
      </div>

      {/* Tab 1: Hot Numbers */}
      {activeTab === 'hot' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">🔥 Top 10 Most Frequently Drawn 4-Digit Numbers</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These 4-digit numbers have appeared most frequently across 5th prize tiers in the past 90 days.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {initialHot.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 text-center hover:border-amber-400 transition-all group shadow-lg"
              >
                <div className="text-xs text-slate-500 font-mono mb-1">Rank #{idx + 1}</div>
                <div className="text-2xl font-black font-mono text-amber-400 group-hover:scale-105 transition-transform">
                  {item.ticket_number}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.occurrences}x drawn
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Seen: {item.last_seen_date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Cold Numbers */}
      {activeTab === 'cold' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">❄️ Overdue & Cold 4-Digit Numbers</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Numbers that have not been drawn for the longest period or have the lowest statistical frequency.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {initialCold.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 text-center hover:border-cyan-400 transition-all group shadow-lg"
              >
                <div className="text-xs text-slate-500 font-mono mb-1">Cold #{idx + 1}</div>
                <div className="text-2xl font-black font-mono text-cyan-300 group-hover:scale-105 transition-transform">
                  {item.ticket_number}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="bg-cyan-500/20 text-cyan-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    Only {item.occurrences}x
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Last: {item.last_seen_date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Digit Heatmap */}
      {activeTab === 'matrix' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">📊 5-Digit Position Frequency Heatmap</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Occurrence counts of each individual digit (0-9) at each positional column of 1st and 2nd winning numbers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 font-mono uppercase">
                  <th className="py-2.5 px-3">Digit</th>
                  <th className="py-2.5 px-3">Pos 1 (Ten-Thousand)</th>
                  <th className="py-2.5 px-3">Pos 2 (Thousand)</th>
                  <th className="py-2.5 px-3">Pos 3 (Hundred)</th>
                  <th className="py-2.5 px-3">Pos 4 (Tens)</th>
                  <th className="py-2.5 px-3">Pos 5 (Units)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-sm">
                {digits.map((d) => (
                  <tr key={d} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white bg-slate-950/60">
                      Digit {d}
                    </td>
                    {positions.map((pos) => {
                      const entry = initialMatrix.find(m => m.digit === d && m.position === pos);
                      const count = entry ? entry.count : 0;
                      const intensity = Math.min(Math.round((count / maxCount) * 100), 100);

                      return (
                        <td key={pos} className="py-2 px-3">
                          <div
                            className="rounded-lg px-2.5 py-1 text-center font-bold text-xs"
                            style={{
                              backgroundColor: `rgba(16, 185, 129, ${Math.max(0.12, intensity / 100)})`,
                              color: intensity > 60 ? '#ffffff' : '#a7f3d0'
                            }}
                          >
                            {count}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEO Explanatory Guide */}
      <div className="mt-8 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
        <h4 className="font-bold text-slate-200 text-sm">Understanding Dear Lottery Frequency Analytics</h4>
        <p>
          Each official draw of Nagaland and Sikkim State Lotteries utilizes mechanical random selection machines approved by government auditing bodies. While every combination theoretically carries an identical mathematical probability of being selected, empirical frequency analysis allows players to identify emerging streaks, repetition clusters, and digit variance across daily 1:00 PM, 6:00 PM, and 8:00 PM draws.
        </p>
      </div>
    </div>
  );
}
