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

  const maxCount = Math.max(...initialMatrix.map(m => m.count), 1);
  const positions = [1, 2, 3, 4, 5];
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-sm">
      {/* Statistical Advisory */}
      <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center gap-3 text-xs text-amber-900">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <p>
          <strong className="font-bold uppercase tracking-wider">Statistical Advisory:</strong> Historical data analysis for informational purposes only; does not predict future outcomes. Each lottery draw is an independent random event.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <span className="inline-block bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2">
            📈 Statistical Intelligence
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">
            Past 30 Days Hot & Cold Numbers
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Data-backed statistical frequency of repeating 4-digit numbers and positional digit patterns over the last 30 days.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('hot')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'hot'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔥 Hot Numbers
          </button>
          <button
            onClick={() => setActiveTab('cold')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'cold'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ❄️ Cold Numbers
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'matrix'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
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
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>🔥 Top 10 Most Frequently Drawn 4-Digit Numbers</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These 4-digit numbers have appeared most frequently across 5th prize tiers in recent draws.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {initialHot.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 hover:border-amber-400 rounded-xl p-4 text-center transition-all shadow-2xs"
              >
                <div className="text-xs text-slate-500 font-mono mb-1">Rank #{idx + 1}</div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {item.ticket_number}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
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
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>❄️ Overdue & Cold 4-Digit Numbers</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Numbers that have not been drawn for the longest period or have the lowest statistical frequency.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {initialCold.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center transition-all shadow-2xs"
              >
                <div className="text-xs text-slate-500 font-mono mb-1">Cold #{idx + 1}</div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {item.ticket_number}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
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
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📊 5-Digit Position Frequency Heatmap</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Occurrence counts of each individual digit (0-9) at each positional column of 1st and 2nd winning numbers.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-600 font-mono uppercase bg-slate-50">
                  <th className="py-2.5 px-3">Digit</th>
                  <th className="py-2.5 px-3">Pos 1</th>
                  <th className="py-2.5 px-3">Pos 2</th>
                  <th className="py-2.5 px-3">Pos 3</th>
                  <th className="py-2.5 px-3">Pos 4</th>
                  <th className="py-2.5 px-3">Pos 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-sm">
                {digits.map((d) => (
                  <tr key={d} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/50">
                      Digit {d}
                    </td>
                    {positions.map((pos) => {
                      const entry = initialMatrix.find(m => m.digit === d && m.position === pos);
                      const count = entry ? entry.count : 0;

                      return (
                        <td key={pos} className="py-2 px-3">
                          <div className="rounded-lg px-2.5 py-1 text-center font-bold text-xs bg-emerald-50 text-emerald-900 border border-emerald-200">
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

      {/* Footer Info */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
        <h4 className="font-bold text-slate-900 text-sm">Understanding Dear Lottery Frequency Analytics</h4>
        <p>
          Each official draw of Nagaland and Sikkim State Lotteries utilizes mechanical random selection machines approved by government auditing bodies. While every combination theoretically carries an identical mathematical probability of being selected, empirical frequency analysis allows players to identify emerging streaks, repetition clusters, and digit variance across daily 1:00 PM, 6:00 PM, and 8:00 PM draws.
        </p>
      </div>
    </div>
  );
}
