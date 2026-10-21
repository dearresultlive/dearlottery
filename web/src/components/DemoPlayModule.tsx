import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../lib/i18n';
import { 
  getISTDateString, 
  getISTNow, 
  formatINR, 
  parseTicketInput, 
  getSlotStatus, 
  getNextUpcomingDraw 
} from '../lib/lottery-utils';
import {
  getTopRecurringNumbers,
  getTopFrequentMiddles,
  getTopFrequentEndings,
  fetchClient5YearArchive
} from '../lib/history-analytics';
import { fetchDrawsByDate } from '../lib/api';
import confetti from 'canvas-confetti';

interface PrizeRecord {
  first_prize?: { series: string; number: string };
  consolation_prize_amount?: number;
  second_prize?: string[];
  third_prize?: string[];
  fourth_prize?: string[];
  fifth_prize?: string[];
}

export interface TicketEvalResult {
  status: 'RESULT_OUT' | 'UPCOMING' | 'DRAWING';
  isWin: boolean;
  prizeTitle: string;
  prizeAmount: number;
}

export interface PurchaseFeedback {
  ticket: LuckyTicket;
  evalRes: TicketEvalResult;
  isIncrement: boolean;
  semAdded: number;
  totalSem: number;
  ticketCost: number;
  netPnl: number;
  timestamp: number;
}

export interface LuckyTicket {
  id: string;
  series: string;
  number: string;
  sem: number; // 5, 10, 15, 25, 50, 100
  slot: '1PM' | '6PM' | '8PM';
  date: string; // YYYY-MM-DD
  createdAt: number;
}

interface DemoPlayModuleProps {
  initialDraws?: any[];
}

interface HotNumberCard {
  series: string;
  number: string;
  tag: string;
  tagBn: string;
  reason: string;
  reasonBn: string;
}

// Authentic Dear scheme names mapped by day of the week & slot
function getSchemeName(dateStr: string, slot: '1PM' | '6PM' | '8PM'): string {
  try {
    const parts = dateStr.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = dayNames[dateObj.getDay()] || 'Sunday';

    const schemes: Record<string, Record<'1PM' | '6PM' | '8PM', string>> = {
      Sunday: { '1PM': 'DEAR YAMUNA MORNING', '6PM': 'DEAR SEA DAY', '8PM': 'DEAR TOUCAN NIGHT' },
      Monday: { '1PM': 'DEAR DWARKA MORNING', '6PM': 'DEAR DESERT DAY', '8PM': 'DEAR FINCH NIGHT' },
      Tuesday: { '1PM': 'DEAR GODAVARI MORNING', '6PM': 'DEAR WAVE DAY', '8PM': 'DEAR GOOSE NIGHT' },
      Wednesday: { '1PM': 'DEAR TEESTA MORNING', '6PM': 'DEAR HILL DAY', '8PM': 'DEAR PELICAN NIGHT' },
      Thursday: { '1PM': 'DEAR PADMA MORNING', '6PM': 'DEAR LAKE DAY', '8PM': 'DEAR SANDPIPER NIGHT' },
      Friday: { '1PM': 'DEAR HOOGHLY MORNING', '6PM': 'DEAR MOUNTAIN DAY', '8PM': 'DEAR SEAGULL NIGHT' },
      Saturday: { '1PM': 'DEAR KOSI MORNING', '6PM': 'DEAR RIVER DAY', '8PM': 'DEAR STORK NIGHT' }
    };

    return schemes[day]?.[slot] || `DEAR ${slot} LOTTERY`;
  } catch (e) {
    return `DEAR ${slot} LOTTERY`;
  }
}

// Barcode Visual Component
function TicketBarcode({ code }: { code: string }) {
  const bars = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2];
  return (
    <div className="flex flex-col items-center select-none opacity-85">
      <div className="flex items-center gap-[1.5px] h-5 sm:h-6">
        {bars.map((w, i) => (
          <div
            key={i}
            className="bg-slate-900 h-full"
            style={{ width: `${w * 1.2}px` }}
          />
        ))}
      </div>
      <span className="text-[7px] font-mono font-bold tracking-widest text-slate-700 mt-0.5">
        * {code} *
      </span>
    </div>
  );
}

// Realistic Physical Paper Ticket Component with DIRECT IN-TICKET SEM STEPPER
function RealPaperTicket({
  ticket,
  evalRes,
  onDelete,
  onCopy,
  onAddSem,
  isCopied,
  lang
}: {
  ticket: LuckyTicket;
  evalRes: TicketEvalResult;
  onDelete: (id: string) => void;
  onCopy: (id: string, text: string) => void;
  onAddSem: (id: string, delta: number) => void;
  isCopied: boolean;
  lang: string;
}) {
  const schemeName = getSchemeName(ticket.date, ticket.slot);
  const formattedDate = ticket.date.split('-').reverse().join('/');
  const sem = ticket.sem || 5;
  const ticketCost = sem * 7;

  // Authentic slot theme colorways matching real paper lotteries
  const theme = ticket.slot === '1PM' 
    ? {
        bg: 'bg-[#fffef0]',
        border: 'border-amber-400',
        ribbon: 'bg-red-600',
        seriesBadge: 'bg-amber-100 text-amber-950 border-amber-300',
        accentText: 'text-amber-900',
        stubBg: 'bg-amber-500/10'
      }
    : ticket.slot === '6PM'
    ? {
        bg: 'bg-[#f0f9ff]',
        border: 'border-blue-400',
        ribbon: 'bg-blue-700',
        seriesBadge: 'bg-blue-100 text-blue-950 border-blue-300',
        accentText: 'text-blue-900',
        stubBg: 'bg-blue-500/10'
      }
    : {
        bg: 'bg-[#faf5ff]',
        border: 'border-purple-400',
        ribbon: 'bg-purple-800',
        seriesBadge: 'bg-purple-100 text-purple-950 border-purple-300',
        accentText: 'text-purple-900',
        stubBg: 'bg-purple-500/10'
      };

  const netTicketPnl = evalRes.isWin ? evalRes.prizeAmount - ticketCost : -ticketCost;

  return (
    <div 
      className={`relative ${theme.bg} rounded-xl border-2 ${theme.border} ${
        sem > 5 
          ? 'shadow-[3px_3px_0px_#94a3b8,6px_6px_0px_#cbd5e1]' 
          : 'shadow-md'
      } overflow-hidden font-sans select-none transition-all hover:scale-[1.002]`}
    >
      
      {/* Semicircle perforation notch cutouts on top and bottom divider */}
      <div className="absolute left-[64px] sm:left-[78px] -top-2.5 w-5 h-5 rounded-full bg-slate-100 border-b-2 border-slate-300 z-20 pointer-events-none"></div>
      <div className="absolute left-[64px] sm:left-[78px] -bottom-2.5 w-5 h-5 rounded-full bg-slate-100 border-t-2 border-slate-300 z-20 pointer-events-none"></div>

      <div className="flex items-stretch min-h-[148px] sm:min-h-[160px]">
        
        {/* LEFT COUNTERFOIL STUB (Perforated) */}
        <div className={`w-[64px] sm:w-[78px] shrink-0 border-r-2 border-dashed border-slate-300 ${theme.stubBg} flex flex-col justify-between items-center py-2 px-1 text-center relative z-10`}>
          <div className="space-y-0.5">
            <span className="text-[8px] font-black tracking-tighter text-slate-600 block uppercase">NAGALAND</span>
            <span className="text-[7px] font-bold text-slate-500 block">STATE LOTTERIES</span>
          </div>

          {/* Stamped Number & Sem Badge on Stub */}
          <div className="my-auto py-1">
            <span className="text-[10px] sm:text-xs font-mono font-black text-slate-900 block leading-tight">
              {ticket.series}
            </span>
            <span className="text-xs sm:text-sm font-mono font-black text-slate-950 tracking-wider block">
              {ticket.number}
            </span>
            <span className="bg-amber-400 text-slate-950 font-black text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded shadow-2xs block my-0.5">
              {sem} SEM
            </span>
            <span className="text-[8px] font-bold text-red-600 block">
              ₹{ticketCost}.00
            </span>
          </div>

          <div className="opacity-60 leading-none">
            <span className="font-mono text-[7px] tracking-tighter text-slate-700 block">|||||||||||</span>
            <span className="text-[6px] font-mono text-slate-500 block">STUB</span>
          </div>
        </div>

        {/* RIGHT MAIN TICKET SLIP */}
        <div className="flex-1 flex flex-col justify-between p-2 sm:p-3 min-w-0 relative">
          
          {/* 1. Header with Government Title & Controls */}
          <div className="flex items-start justify-between gap-1 border-b border-black/10 pb-1.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm leading-none">🏛️</span>
                <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-slate-900 truncate">
                  NAGALAND STATE LOTTERIES
                </span>
                <span className="bg-amber-500 text-white font-black text-[8px] px-1.5 py-0.2 rounded shrink-0">
                  {sem} SEM
                </span>
              </div>
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-600 mt-0.5">
                <span className="text-red-700 font-black">{schemeName}</span>
                <span>•</span>
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* Quick Actions (Copy & Delete) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onCopy(ticket.id, `${ticket.series} ${ticket.number} (${sem} Sem)`)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-black/5 hover:bg-black/10 text-slate-700'
                }`}
                title="Copy number"
              >
                {isCopied ? '✓' : '📋'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(ticket.id)}
                className="w-5 h-5 rounded-full bg-black/5 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] text-slate-500 transition-colors cursor-pointer"
                title="Remove ticket"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 2. 1st Prize Ribbon Banner with Sem Indicator */}
          <div className={`${theme.ribbon} text-white px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center justify-between shadow-2xs my-1`}>
            <span>★ 1st PRIZE ₹ 1 CRORE ★</span>
            <span className="bg-white/20 text-white px-1.5 py-0.2 rounded text-[8px] font-mono">
              {sem} SEM BOOKLET (₹{ticketCost})
            </span>
          </div>

          {/* 3. Central Ticket Number Display */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
            {/* Series */}
            <div className="flex flex-col items-center">
              <span className="text-[7px] sm:text-[8px] font-bold uppercase text-slate-500">SERIES</span>
              <span className={`${theme.seriesBadge} border font-mono font-black text-sm sm:text-base px-2 py-0.5 rounded shadow-2xs`}>
                {ticket.series}
              </span>
            </div>

            {/* 5-Digit Number Boxes */}
            <div className="flex flex-col items-center">
              <span className="text-[7px] sm:text-[8px] font-bold uppercase text-slate-500">TICKET NUMBER</span>
              <div className="flex items-center gap-1 sm:gap-1.5">
                {ticket.number.split('').map((digit, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-8 sm:w-8 sm:h-10 bg-white border border-slate-300 rounded shadow-2xs flex items-center justify-center font-mono font-black text-lg sm:text-2xl text-slate-950"
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Micro Profit & Loss Info Strip on Ticket Body */}
          <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-bold px-2 py-0.5 bg-black/[0.04] rounded border border-black/5 mt-0.5">
            <span className="text-slate-600 font-mono">
              {lang === 'bn' ? `খরচ: ₹${ticketCost} (${sem} সেম)` : `Cost: ₹${ticketCost} (${sem} Sem)`}
            </span>
            <span>
              {evalRes.isWin ? (
                <span className="text-emerald-700 font-black">
                  {lang === 'bn' 
                    ? `প্রাইজ: ₹${formatINR(evalRes.prizeAmount)} • নিট লাভ: +₹${formatINR(netTicketPnl)}` 
                    : `Prize: ₹${formatINR(evalRes.prizeAmount)} • Net: +₹${formatINR(netTicketPnl)}`}
                </span>
              ) : evalRes.status === 'RESULT_OUT' ? (
                <span className="text-rose-700 font-bold">
                  {lang === 'bn' ? `নিট ক্ষতি: -₹${ticketCost}` : `Net Loss: -₹${ticketCost}`}
                </span>
              ) : (
                <span className="text-blue-700 font-bold">
                  {lang === 'bn' ? `ড্র-এর পর লাভ/ক্ষতি হিসাব হবে` : `P/L calculated after draw`}
                </span>
              )}
            </span>
          </div>

          {/* 4. IN-TICKET SEM STEPPER & CONTROLS (Eliminates separate controller box!) */}
          <div className="flex items-center justify-between gap-1.5 pt-1.5 mt-1 border-t border-black/10 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black text-slate-600 uppercase">SEM:</span>
              
              {/* Stepper Minus */}
              <button
                type="button"
                onClick={() => onAddSem(ticket.id, -5)}
                disabled={sem <= 5}
                className={`w-6 h-6 rounded-md font-black text-xs flex items-center justify-center transition-all ${
                  sem <= 5
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs active:scale-95 cursor-pointer'
                }`}
                title={lang === 'bn' ? '৫ সেম কমান' : 'Reduce 5 Sem (-₹35)'}
              >
                −
              </button>

              {/* Sem Badge */}
              <div className="bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded text-[10px] sm:text-xs font-mono font-black text-amber-950 flex items-center gap-1 shadow-2xs">
                <span>{sem} SEM</span>
                <span className="text-[9px] text-amber-800 font-normal">(₹{ticketCost})</span>
              </div>

              {/* Stepper Plus */}
              <button
                type="button"
                onClick={() => onAddSem(ticket.id, 5)}
                className="w-6 h-6 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center shadow-2xs active:scale-95 cursor-pointer"
                title={lang === 'bn' ? '৫ সেম বাড়ান' : 'Add +5 Sem (+₹35)'}
              >
                +
              </button>

              {/* Quick +10 / +25 chip shortcuts */}
              <button
                type="button"
                onClick={() => onAddSem(ticket.id, 10)}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs active:scale-95 cursor-pointer"
                title="Add +10 Sem (+₹70)"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => onAddSem(ticket.id, 25)}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs active:scale-95 cursor-pointer"
                title="Add +25 Sem (+₹175)"
              >
                +25
              </button>
            </div>

            {/* Micro Barcode */}
            <div className="hidden xs:block">
              <TicketBarcode code={`${ticket.series} ${ticket.number}`} />
            </div>
          </div>

          {/* 5. Live Rubber Stamp Overlay */}
          <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-end gap-1">
            {evalRes.isWin ? (
              <div className="rotate-[-5deg] border-2 border-dashed border-emerald-600 bg-emerald-500/25 text-emerald-950 px-2 sm:px-3 py-1 rounded-lg shadow-sm font-black text-xs sm:text-sm tracking-wide uppercase backdrop-blur-[0.5px] animate-bounce text-right">
                <div className="flex items-center justify-end gap-1">
                  <span>🎉</span>
                  <span>{evalRes.prizeTitle}</span>
                </div>
                <div className="text-[10px] text-emerald-900 font-mono font-bold mt-0.5">
                  Win: ₹{formatINR(evalRes.prizeAmount)}
                </div>
                <div className="text-[10px] sm:text-xs text-emerald-950 font-mono font-black border-t border-emerald-700/20 pt-0.5 mt-0.5">
                  Net: +₹{formatINR(netTicketPnl)}
                </div>
              </div>
            ) : evalRes.status === 'DRAWING' ? (
              <div className="rotate-[-2deg] border-2 border-dashed border-red-500 bg-red-500/15 text-red-700 px-2 py-0.5 rounded-md font-black text-[10px] sm:text-xs tracking-wider uppercase animate-pulse">
                🔴 {lang === 'bn' ? 'ড্র চলছে...' : 'DRAWING'}
              </div>
            ) : evalRes.status === 'UPCOMING' ? (
              <div className="rotate-[3deg] border-2 border-dashed border-blue-500 bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded-md font-bold text-[9px] sm:text-[10px] tracking-wider uppercase text-right">
                <div>⏳ DRAW AT {ticket.slot}</div>
                <div className="text-[8px] text-blue-900 font-mono">₹{ticketCost} ({sem} SEM)</div>
              </div>
            ) : (
              <div className="rotate-[4deg] border border-slate-300 bg-slate-100/90 text-slate-600 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase text-right shadow-2xs">
                <div>✕ NO PRIZE</div>
                <div className="text-[8px] text-rose-700 font-mono font-bold">-₹{ticketCost}</div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

export default function DemoPlayModule({ initialDraws = [] }: DemoPlayModuleProps) {
  const { lang } = useLanguage();
  
  // Date calculations
  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);
  const yesterdayStr = useMemo(() => {
    const d = new Date(istNow);
    d.setDate(d.getDate() - 1);
    return getISTDateString(d);
  }, [istNow]);

  // Next upcoming draw
  const nextUpcoming = useMemo(() => getNextUpcomingDraw(), []);

  // Active Game Navigation (Date + Slot)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<'1PM' | '6PM' | '8PM'>(nextUpcoming.slot);

  // Tab State: 'tickets' (My Tickets) vs 'hot' (Hot Numbers & Middles)
  const [activeTab, setActiveTab] = useState<'tickets' | 'hot'>('tickets');

  // Toggle for Global/All-Time P&L statistics drawer
  const [showGlobalStats, setShowGlobalStats] = useState(false);

  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [manualSeries, setManualSeries] = useState('72B');
  const [manualNumber, setManualNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [purchaseFeedback, setPurchaseFeedback] = useState<PurchaseFeedback | null>(null);

  // Tickets stored in localStorage
  const [myTickets, setMyTickets] = useState<LuckyTicket[]>([]);

  // Dynamically loaded draw results (starts with initialDraws, fetches past dates on demand)
  const [loadedDraws, setLoadedDraws] = useState<any[]>(initialDraws);

  // Sync loadedDraws if initialDraws prop updates
  useEffect(() => {
    if (initialDraws && initialDraws.length > 0) {
      setLoadedDraws(prev => {
        const merged = [...prev];
        for (const d of initialDraws) {
          if (!merged.some(m => m.id === d.id)) {
            merged.push(d);
          }
        }
        return merged;
      });
    }
  }, [initialDraws]);

  // Dynamically fetch historical draw if selectedDate is not yet in loadedDraws
  useEffect(() => {
    if (selectedDate) {
      const hasDraws = loadedDraws.some(d => d.draw_date === selectedDate);
      if (!hasDraws) {
        fetchDrawsByDate(selectedDate).then(pastDraws => {
          if (pastDraws && pastDraws.length > 0) {
            setLoadedDraws(prev => {
              const merged = [...prev];
              for (const d of pastDraws) {
                if (!merged.some(m => m.id === d.id)) {
                  merged.push(d);
                }
              }
              return merged;
            });
          }
        }).catch(() => {});
      }
    }
  }, [selectedDate]);

  // List of all dates where the user actually has printed tickets (with spending & count summary)
  const pastDatesWithTickets = useMemo(() => {
    const map = new Map<string, { count: number; sem: number }>();
    for (const t of myTickets) {
      if (t.date) {
        const cur = map.get(t.date) || { count: 0, sem: 0 };
        map.set(t.date, {
          count: cur.count + 1,
          sem: cur.sem + (t.sem || 5)
        });
      }
    }

    const list: Array<{ date: string; totalTickets: number; totalSem: number; totalCost: number }> = [];
    for (const [date, val] of map.entries()) {
      list.push({
        date,
        totalTickets: val.count,
        totalSem: val.sem,
        totalCost: val.sem * 7
      });
    }

    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [myTickets]);

  // Hot number combinations & Top Middles generated from heat map
  const [hotCards, setHotCards] = useState<HotNumberCard[]>([]);
  const [popularMiddles, setPopularMiddles] = useState<string[]>(['48', '72', '35', '80', '29', '52', '64', '15', '24', '79']);
  const [isRefreshingHot, setIsRefreshingHot] = useState<boolean>(false);

  // Time passed checks for today
  const currentTotalMin = istNow.getHours() * 60 + istNow.getMinutes();
  const is1pmPassed = currentTotalMin >= 795;
  const is6pmPassed = currentTotalMin >= 1095;
  const is8pmPassed = currentTotalMin >= 1215;

  // Load tickets from localStorage on mount (supporting both new and legacy keys)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLucky = localStorage.getItem('dearlottery_lucky_tickets');
        const savedDemo = localStorage.getItem('dearlottery_demo_tickets');
        const raw = savedLucky || savedDemo;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Safety Auto-Cleanup: Keep tickets within last 60 days to keep phone 100% lightweight & lag-free
            const cutoffDate = new Date(istNow);
            cutoffDate.setDate(cutoffDate.getDate() - 60);
            const cutoffStr = getISTDateString(cutoffDate);

            const normalized = parsed
              .filter((t: any) => t && t.date && t.date >= cutoffStr)
              .map(t => ({
                ...t,
                sem: Math.max(t.sem || 5, 5)
              }));
            setMyTickets(normalized);
          }
        }
      } catch (e) {}

      // Prefill from URL query params
      const params = new URLSearchParams(window.location.search);
      const qNum = params.get('num');
      const qSlot = params.get('slot') as '1PM' | '6PM' | '8PM';
      if (qSlot && ['1PM', '6PM', '8PM'].includes(qSlot)) {
        setSelectedSlot(qSlot);
      }
      if (qNum) {
        const parsed = parseTicketInput(qNum);
        if (parsed.number) setManualNumber(parsed.number);
        if (parsed.series) setManualSeries(parsed.series);
      }

      // Preload 5-year archive in background for heat map calculations
      fetchClient5YearArchive().then(() => {
        try {
          const topMids = getTopFrequentMiddles(10, '3Y');
          if (topMids && topMids.length > 0) {
            setPopularMiddles(topMids.map(m => m.middle));
          }
        } catch (e) {}
        generateHotNumbers();
      });
    }
  }, []);

  // Save tickets to localStorage
  const saveTickets = (tickets: LuckyTicket[]) => {
    setMyTickets(tickets);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dearlottery_lucky_tickets', JSON.stringify(tickets));
      localStorage.setItem('dearlottery_demo_tickets', JSON.stringify(tickets));
    }
  };

  // Find draw record matching the ticket's date & slot (Searches dynamic loadedDraws)
  const findDrawForTicket = (ticket: LuckyTicket) => {
    const slotNumber = ticket.slot.replace('PM', '');
    return loadedDraws.find(d => 
      d.draw_date === ticket.date &&
      (d.draw_time?.includes(slotNumber) || d.id?.includes(ticket.slot))
    ) || null;
  };

  // Match evaluation for a ticket against official draw prizes (Multiplied by Sem count!)
  const evaluateTicket = (ticket: LuckyTicket): TicketEvalResult => {
    const draw = findDrawForTicket(ticket);
    const prizes: PrizeRecord = draw?.parsed_data?.prizes || draw?.prizes || {};
    const hasPrizes = Boolean(prizes.first_prize?.number && draw?.status !== 'UPCOMING' && draw?.status !== 'DRAWING');
    const status = getSlotStatus(ticket.date, ticket.slot, hasPrizes);
    const sem = ticket.sem || 5;

    if (status !== 'RESULT_OUT' || !hasPrizes) {
      return {
        status,
        isWin: false,
        prizeTitle: status === 'DRAWING' 
          ? (lang === 'bn' ? 'ড্র চলছে...' : 'Drawing in progress...') 
          : (lang === 'bn' ? `${ticket.slot} ড্র অপেক্ষমাণ (${sem} সেম)` : `Awaiting ${ticket.slot} (${sem} Sem)`),
        prizeAmount: 0
      };
    }

    const tNum = ticket.number.trim();
    const tSeries = ticket.series.trim().toUpperCase();

    // 1st Prize check (Base ₹1 Crore × Sem)
    if (prizes.first_prize) {
      const fNum = prizes.first_prize.number.trim();
      const fSeries = (prizes.first_prize.series || '').trim().toUpperCase();
      if (tNum === fNum) {
        if (!tSeries || !fSeries || tSeries === fSeries) {
          const basePrize = 10000000;
          return {
            status: 'RESULT_OUT',
            isWin: true,
            prizeTitle: lang === 'bn' ? `১ম পুরস্কার (${sem} সেম)!` : `1st Prize (${sem} Sem)!`,
            prizeAmount: basePrize * sem
          };
        } else {
          const basePrize = 1000;
          return {
            status: 'RESULT_OUT',
            isWin: true,
            prizeTitle: lang === 'bn' ? `সান্ত্বনা পুরস্কার (${sem} সেম)` : `Consolation (${sem} Sem)`,
            prizeAmount: basePrize * sem
          };
        }
      }
    }

    // 2nd Prize check (Base ₹9,000 × Sem)
    if (prizes.second_prize && prizes.second_prize.some(n => n.trim() === tNum)) {
      const basePrize = 9000;
      return {
        status: 'RESULT_OUT',
        isWin: true,
        prizeTitle: lang === 'bn' ? `২য় প্রাইজ (${sem} সেম)` : `2nd Prize (${sem} Sem)`,
        prizeAmount: basePrize * sem
      };
    }

    // 3rd Prize check (Base ₹450 × Sem)
    const last4 = tNum.slice(-4);
    if (prizes.third_prize && prizes.third_prize.some(n => n.trim() === last4)) {
      const basePrize = 450;
      return {
        status: 'RESULT_OUT',
        isWin: true,
        prizeTitle: lang === 'bn' ? `৩য় প্রাইজ (${sem} সেম)` : `3rd Prize (${sem} Sem)`,
        prizeAmount: basePrize * sem
      };
    }

    // 4th Prize check (Base ₹250 × Sem)
    if (prizes.fourth_prize && prizes.fourth_prize.some(n => n.trim() === last4)) {
      const basePrize = 250;
      return {
        status: 'RESULT_OUT',
        isWin: true,
        prizeTitle: lang === 'bn' ? `৪র্থ প্রাইজ (${sem} সেম)` : `4th Prize (${sem} Sem)`,
        prizeAmount: basePrize * sem
      };
    }

    // 5th Prize check (Base ₹120 × Sem, e.g. 5 Sem = ₹600!)
    if (prizes.fifth_prize && prizes.fifth_prize.some(n => n.trim() === last4)) {
      const basePrize = 120;
      return {
        status: 'RESULT_OUT',
        isWin: true,
        prizeTitle: lang === 'bn' ? `৫ম প্রাইজ (${sem} সেম)` : `5th Prize (${sem} Sem)`,
        prizeAmount: basePrize * sem
      };
    }

    return {
      status: 'RESULT_OUT',
      isWin: false,
      prizeTitle: lang === 'bn' ? 'মেলেনি' : 'No Match',
      prizeAmount: 0
    };
  };

  // Add ticket function for selected game with Sem count (Limit increased to 12 booklets!)
  const addTicket = (series: string, number: string, semCount: number = 5) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const cleanNum = number.replace(/\D/g, '');

    if (cleanNum.length !== 5) {
      setErrorMsg(lang === 'bn' ? 'দয়া করে সঠিক ৫ ডিজিট দিন।' : 'Please enter 5 digits.');
      return;
    }

    const cleanSeries = series.trim().toUpperCase() || '72B';

    // Incremental purchase: Check if ticket already exists in selected game
    const existingIndex = myTickets.findIndex(
      t => t.date === selectedDate && t.slot === selectedSlot && t.number === cleanNum
    );

    let targetTicket: LuckyTicket;
    let isIncrement = false;

    if (existingIndex >= 0) {
      isIncrement = true;
      const existing = myTickets[existingIndex];
      const updatedSem = (existing.sem || 5) + semCount;
      const updatedTicket: LuckyTicket = {
        ...existing,
        sem: updatedSem
      };

      const nextTickets = [...myTickets];
      nextTickets[existingIndex] = updatedTicket;
      saveTickets(nextTickets);
      targetTicket = updatedTicket;

      setSuccessMsg(
        lang === 'bn'
          ? `+${semCount} সেম বৃদ্ধি! ${existing.series} ${existing.number} মোট: ${updatedSem} সেম (খরচ: ₹${updatedSem * 7})`
          : `Added +${semCount} Sem! ${existing.series} ${existing.number} Total: ${updatedSem} Sem (Cost: ₹${updatedSem * 7})`
      );
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      // Quota limit: Maximum 12 distinct booklets allowed per draw game
      const currentSlotCount = myTickets.filter(
        t => t.date === selectedDate && t.slot === selectedSlot
      ).length;

      if (currentSlotCount >= 12) {
        setErrorMsg(
          lang === 'bn'
            ? '⚠️ এই ড্র-এর জন্য সর্বোচ্চ ১২টি বুকলেটের কোটা পূর্ণ! যেকোনো টিকিটে সেম (+৫ সেম) বৃদ্ধি করুন অথবা কোনো টিকিট মুছুন।'
            : '⚠️ Quota full! Maximum 12 booklets allowed per draw. Add more Sem (+5 Sem) on your tickets or delete one to add a new number.'
        );
        return;
      }

      const newTicket: LuckyTicket = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        series: cleanSeries,
        number: cleanNum,
        sem: semCount,
        slot: selectedSlot,
        date: selectedDate,
        createdAt: Date.now()
      };

      const nextTickets = [newTicket, ...myTickets];
      saveTickets(nextTickets);
      targetTicket = newTicket;

      setSuccessMsg(
        lang === 'bn'
          ? `টিকিট যোগ হয়েছে: ${cleanSeries} ${cleanNum} (${semCount} সেম • ₹${semCount * 7})`
          : `Ticket added: ${cleanSeries} ${cleanNum} (${semCount} Sem • ₹${semCount * 7})`
      );
      setTimeout(() => setSuccessMsg(null), 3500);
    }

    setManualNumber('');

    const evalRes = evaluateTicket(targetTicket);
    const totalSem = targetTicket.sem || 5;
    const ticketCost = totalSem * 7;
    const netPnl = evalRes.status === 'RESULT_OUT'
      ? (evalRes.isWin ? evalRes.prizeAmount - ticketCost : -ticketCost)
      : -ticketCost;

    setPurchaseFeedback({
      ticket: targetTicket,
      evalRes,
      isIncrement,
      semAdded: semCount,
      totalSem,
      ticketCost,
      netPnl,
      timestamp: Date.now()
    });

    if (evalRes.isWin) {
      try {
        confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  // Add or reduce Sem for a specific ticket directly (In-ticket stepper handler)
  const handleAddSemToTicket = (ticketId: string, delta: number = 5) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    let updatedTarget: LuckyTicket | null = null;
    const nextTickets = myTickets.map(t => {
      if (t.id === ticketId) {
        const currentSem = t.sem || 5;
        const newSem = Math.max(5, currentSem + delta);
        updatedTarget = { ...t, sem: newSem };
        return updatedTarget;
      }
      return t;
    });
    saveTickets(nextTickets);

    if (updatedTarget) {
      const target = updatedTarget as LuckyTicket;
      const evalRes = evaluateTicket(target);
      const totalSem = target.sem || 5;
      const ticketCost = totalSem * 7;
      const netPnl = evalRes.status === 'RESULT_OUT'
        ? (evalRes.isWin ? evalRes.prizeAmount - ticketCost : -ticketCost)
        : -ticketCost;

      setPurchaseFeedback({
        ticket: target,
        evalRes,
        isIncrement: true,
        semAdded: delta,
        totalSem,
        ticketCost,
        netPnl,
        timestamp: Date.now()
      });

      if (evalRes.isWin && delta > 0) {
        try {
          confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
        } catch (e) {}
      }
    }
  };

  // Quick Random Lucky Ticket generator (Adds 5 Sem retail standard)
  const handleQuickTicket = () => {
    const currentSlotCount = myTickets.filter(
      t => t.date === selectedDate && t.slot === selectedSlot
    ).length;

    if (currentSlotCount >= 12) {
      setErrorMsg(
        lang === 'bn'
          ? '⚠️ এই ড্র-এর জন্য সর্বোচ্চ ১২টি বুকলেট পূর্ণ! টিকিটের সেম বাড়ান অথবা একটি মুছুন।'
          : '⚠️ Quota full! Maximum 12 booklets reached. Add Sem below or delete a ticket.'
      );
      return;
    }

    const seriesOptions = ['72B', '64D', '81G', '92H', '55A', '58C', '73E', '86J', '84D', '69A', '77C'];
    const middleSeeds = ['48', '62', '79', '35', '52', '29', '43', '80', '15', '24'];
    const endingSeeds = ['55', '74', '22', '57', '63', '36', '14', '82', '99', '06'];

    const s = seriesOptions[Math.floor(Math.random() * seriesOptions.length)];
    const m = middleSeeds[Math.floor(Math.random() * middleSeeds.length)];
    const end = endingSeeds[Math.floor(Math.random() * endingSeeds.length)];
    const lead = String(Math.floor(Math.random() * 9) + 1);
    const num = `${lead}${m}${end.slice(-2)}`;

    addTicket(s, num, 5);
  };

  // 1-Click Ticket with Selected Middle (The #1 Indian lottery player feature!)
  const handlePickMiddleTicket = (middle: string) => {
    const seriesOptions = ['72B', '64D', '81G', '92H', '55A', '58C', '73E', '86J', '84D', '69A', '77C'];
    const endingSeeds = ['55', '74', '22', '57', '63', '36', '14', '82', '99', '06'];
    const s = seriesOptions[Math.floor(Math.random() * seriesOptions.length)];
    const end = endingSeeds[Math.floor(Math.random() * endingSeeds.length)];
    const lead = String(Math.floor(Math.random() * 9) + 1);
    const num = `${lead}${middle}${end.slice(-2)}`;

    addTicket(s, num, 5);
  };

  // Copy helper
  const handleCopyTicket = (ticketId: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedTicketId(ticketId);
      setTimeout(() => setCopiedTicketId(null), 2000);
    } catch (e) {}
  };

  // Delete ticket
  const handleDeleteTicket = (id: string) => {
    saveTickets(myTickets.filter(t => t.id !== id));
  };

  // Clear slot tickets
  const handleClearSlot = () => {
    saveTickets(myTickets.filter(t => !(t.date === selectedDate && t.slot === selectedSlot)));
  };

  // Clear all tickets
  const handleClearAll = () => {
    if (confirm(lang === 'bn' ? 'আপনি কি সব টিকিট মুছে ফেলতে চান?' : 'Are you sure you want to clear all tickets?')) {
      saveTickets([]);
    }
  };

  // Generate Hot Numbers from Heat Map and Historical Archives
  const generateHotNumbers = () => {
    setIsRefreshingHot(true);
    const seriesOptions = ['72B', '64D', '81G', '92H', '55A', '58C', '73E', '86J', '84D', '69A', '77C', '95L', '62B'];
    const list: HotNumberCard[] = [];

    // 1. Pick 3 distinct multi-win recurring numbers from pool of top 25 historical winners
    try {
      const topRecurring = getTopRecurringNumbers('3Y', 25);
      if (topRecurring && topRecurring.length > 0) {
        const shuffled = [...topRecurring].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        for (const item of selected) {
          if (item.number && item.number.length === 5) {
            const randSeries = seriesOptions[Math.floor(Math.random() * seriesOptions.length)];
            list.push({
              series: randSeries,
              number: item.number,
              tag: `${item.count}x Repeat Winner`,
              tagBn: `${item.count} বার বিজয়ী`,
              reason: `Won ${item.lastRank} in official draw`,
              reasonBn: `অফিশিয়াল খেলায় ${item.count} বার জয়ী`
            });
          }
        }
      }
    } catch (e) {}

    // 2. Generate 3 distinct heat map combinations from top 15 middles & top 15 endings
    try {
      const topMiddles = getTopFrequentMiddles(15, '3Y');
      const topEndings = getTopFrequentEndings(15, '3Y');

      let attempts = 0;
      while (list.length < 6 && attempts < 20) {
        attempts++;
        const midIdx = Math.floor(Math.random() * Math.min(topMiddles.length || 10, 10));
        const endIdx = Math.floor(Math.random() * Math.min(topEndings.length || 10, 10));
        const midObj = topMiddles[midIdx] || { middle: '48' };
        const endObj = topEndings[endIdx] || { ending: '55' };

        const lead = String(Math.floor(Math.random() * 9) + 1);
        const combo = `${lead}${midObj.middle}${endObj.ending}`;
        const randSeries = seriesOptions[Math.floor(Math.random() * seriesOptions.length)];

        if (!list.some(l => l.number === combo)) {
          list.push({
            series: randSeries,
            number: combo,
            tag: `Heat Map Mid ${midObj.middle}`,
            tagBn: `হিট ম্যাপ মিডিল ${midObj.middle}`,
            reason: `Top Middle ${midObj.middle} + Ending ${endObj.ending}`,
            reasonBn: `টপ মিডিল ${midObj.middle} ও এন্ডিং ${endObj.ending}`
          });
        }
      }
    } catch (e) {}

    // Fallbacks if data is empty or < 6
    const fallbacks: HotNumberCard[] = [
      { series: '72B', number: '48755', tag: 'Hot Middle Pattern', tagBn: 'হট মিডিল ৪৮ ও এন্ডিং ৫৫', reason: 'High frequency in 5th prize', reasonBn: '৫ম পুরস্কারে সর্বাধিক আসা' },
      { series: '64D', number: '09674', tag: '2nd Prize Winner', tagBn: '২য় প্রাইজ বিজয়ী', reason: 'Won ₹9,000 in recent day draw', reasonBn: 'সাম্প্রতিক ড্র-তে ৯,০০০ টাকা জয়ী' },
      { series: '81G', number: '65322', tag: 'High-Hit Combo', tagBn: 'হাই-হিট কম্বিনেশন', reason: 'Top-rated repeating middle 53', reasonBn: 'টপ রেটেড মিডিল ৫৩' },
      { series: '92H', number: '84257', tag: 'Top Ranked Number', tagBn: 'টপ রেঙ্কড নম্বর', reason: 'High accuracy hit pattern', reasonBn: 'ধারাবাহিক হিট রেট প্যাটার্ন' },
      { series: '55A', number: '13963', tag: '2nd Prize Winner', tagBn: '২য় পুরস্কার বিজয়ী', reason: 'Recent winning combination', reasonBn: 'সাম্প্রতিক ড্র-তে বিজয়ী নম্বর' },
      { series: '70B', number: '50936', tag: 'Hot Ending Pattern', tagBn: 'হট এন্ডিং ৩৬ প্যাটার্ন', reason: 'Repeated in 4th/5th tier', reasonBn: '৪র্থ ও ৫ম স্তরে একাধিকবার আসা' }
    ];

    while (list.length < 6) {
      const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      if (!list.some(l => l.number === fb.number)) {
        list.push(fb);
      }
    }

    const shuffledFinal = list.sort(() => 0.5 - Math.random()).slice(0, 6);
    setHotCards(shuffledFinal);

    setTimeout(() => {
      setIsRefreshingHot(false);
    }, 300);
  };

  // Initial generation
  useEffect(() => {
    generateHotNumbers();
  }, [selectedSlot]);

  // Filter tickets for currently selected game (Date + Slot)
  const activeGameTickets = myTickets.filter(t => t.date === selectedDate && t.slot === selectedSlot);

  // Active game specific P/L calculations
  const gameStats = useMemo(() => {
    const totalSem = activeGameTickets.reduce((acc, t) => acc + (t.sem || 5), 0);
    const totalCost = totalSem * 7;
    const evals = activeGameTickets.map(t => ({ ticket: t, evalRes: evaluateTicket(t) }));
    const settled = evals.filter(item => item.evalRes.status === 'RESULT_OUT');
    const wins = settled.filter(item => item.evalRes.isWin);
    const totalReturns = wins.reduce((acc, item) => acc + item.evalRes.prizeAmount, 0);
    const netPnl = totalReturns - totalCost;
    const isPending = settled.length === 0;

    return {
      totalSem,
      totalCost,
      totalReturns,
      netPnl,
      winsCount: wins.length,
      settledCount: settled.length,
      isPending
    };
  }, [activeGameTickets, loadedDraws]);

  // Overall Global Profit & Loss & Accuracy calculation
  const globalStats = useMemo(() => {
    const totalSemAll = myTickets.reduce((acc, t) => acc + (t.sem || 5), 0);
    const totalCostAll = totalSemAll * 7;

    const allEvals = myTickets.map(t => ({
      ticket: t,
      evalRes: evaluateTicket(t)
    }));

    const settledAll = allEvals.filter(item => item.evalRes.status === 'RESULT_OUT');
    const totalWins = settledAll.filter(item => item.evalRes.isWin).length;
    const totalReturns = settledAll.reduce((acc, item) => acc + item.evalRes.prizeAmount, 0);
    const accuracyPercent = settledAll.length > 0 ? Math.round((totalWins / settledAll.length) * 100) : 0;
    const overallNetPnl = totalReturns - totalCostAll;

    return {
      totalSemAll,
      totalCostAll,
      settledCount: settledAll.length,
      pendingCount: myTickets.length - settledAll.length,
      totalWins,
      totalReturns,
      accuracyPercent,
      overallNetPnl
    };
  }, [myTickets, loadedDraws]);

  return (
    <div className="space-y-3.5 max-w-xl mx-auto text-slate-800">
      
      {/* 1. Header (Compact & Modern) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-3 sm:p-3.5 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
            <span>🎟️</span>
            <span>
              {lang === 'bn' ? 'ডিয়ার লটারি লাকি টিকিট' : lang === 'hi' ? 'डियर लॉटरी लकी टिकट' : 'Dear Lottery Lucky Ticket'}
            </span>
            <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded shadow-2xs font-mono">
              5 SEM
            </span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
            {lang === 'bn' 
              ? '৫ সেম পেপার বুকলেট সিমুলেশন ও রিয়াল প্রফিট-লস' 
              : '5 Sem paper booklet simulator with real profit & loss'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-[11px] font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded">
            {selectedDate.split('-').reverse().join('/')}
          </span>
        </div>
      </div>

      {/* 2. TABBED SEGMENTED NAVIGATION (Clean & Mobile-Friendly!) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl border border-slate-300/80">
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'tickets'
              ? 'bg-white text-blue-900 shadow-xs ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <span>🎟️</span>
          <span>{lang === 'bn' ? 'আমার টিকিট' : 'My Tickets'}</span>
          {activeGameTickets.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'tickets' ? 'bg-blue-100 text-blue-900' : 'bg-slate-300 text-slate-800'
            }`}>
              {activeGameTickets.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hot')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'hot'
              ? 'bg-white text-amber-950 shadow-xs ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <span>🔥</span>
          <span>{lang === 'bn' ? 'হট নম্বর ও মিডিল' : 'Hot Picks & Middles'}</span>
          <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
            6
          </span>
        </button>
      </div>

      {/* TAB 1: MY TICKETS & SIMULATOR */}
      {activeTab === 'tickets' && (
        <div className="space-y-3 animate-fadeIn">
          
          {/* Game Date & Slot Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2">
            
            {/* Game Date & Smart History Dropdown Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 px-0.5">
              <div className="flex items-center justify-between sm:justify-start gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <span>📅</span>
                  <span>{lang === 'bn' ? 'তারিখ:' : lang === 'hi' ? 'तारीख:' : 'Date:'}</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setSelectedDate(todayStr); setErrorMsg(null); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedDate === todayStr
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lang === 'bn' ? 'আজ' : lang === 'hi' ? 'आज' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedDate(yesterdayStr); setErrorMsg(null); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedDate === yesterdayStr
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lang === 'bn' ? 'গতকাল' : lang === 'hi' ? 'कल' : 'Yesterday'}
                  </button>
                </div>
              </div>

              {/* Smart History Dropdown (Past Dates with Tickets) & Calendar Picker */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 sm:flex-none min-w-[170px]">
                  <select
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setErrorMsg(null);
                    }}
                    className={`w-full text-xs font-bold py-1 pl-2.5 pr-6 rounded-lg border appearance-none cursor-pointer transition-all ${
                      selectedDate !== todayStr && selectedDate !== yesterdayStr
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-black ring-1 ring-amber-400 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                    title={lang === 'bn' ? 'অতীত তারিখের টিকিট ও খরচ দেখুন' : 'View past printed tickets & spending'}
                  >
                    <option value={todayStr}>
                      📅 {todayStr.split('-').reverse().join('/')} ({lang === 'bn' ? 'আজ' : 'Today'})
                      {myTickets.filter(t => t.date === todayStr).length > 0 ? ` • ${myTickets.filter(t => t.date === todayStr).length} ${lang === 'bn' ? 'টিকিট' : 'tickets'}` : ''}
                    </option>
                    <option value={yesterdayStr}>
                      📅 {yesterdayStr.split('-').reverse().join('/')} ({lang === 'bn' ? 'গতকাল' : 'Yesterday'})
                      {myTickets.filter(t => t.date === yesterdayStr).length > 0 ? ` • ${myTickets.filter(t => t.date === yesterdayStr).length} ${lang === 'bn' ? 'টিকিট' : 'tickets'}` : ''}
                    </option>
                    
                    {/* All past dates where tickets are recorded */}
                    {pastDatesWithTickets
                      .filter(d => d.date !== todayStr && d.date !== yesterdayStr)
                      .map(d => (
                        <option key={d.date} value={d.date}>
                          🎟️ {d.date.split('-').reverse().join('/')} — {d.totalTickets} {lang === 'bn' ? 'টিকিট' : 'tickets'} (₹{d.totalCost})
                        </option>
                      ))}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] text-slate-500">
                    ▼
                  </span>
                </div>

                {/* Direct Native HTML5 Date Picker for picking any historical date */}
                <input
                  type="date"
                  value={selectedDate}
                  max={todayStr}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setErrorMsg(null);
                    }
                  }}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1 px-1.5 text-slate-700 cursor-pointer hover:bg-slate-100 shrink-0"
                  title={lang === 'bn' ? 'ক্যালেন্ডার থেকে তারিখ বাছুন' : 'Pick date from calendar'}
                />
              </div>
            </div>

            {/* 3 Slot Tabs (1:00 PM | 6:00 PM | 8:00 PM) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {(['1PM', '6PM', '8PM'] as const).map(slot => {
                const isSelected = selectedSlot === slot;
                const slotTicketsCount = myTickets.filter(t => t.date === selectedDate && t.slot === slot).length;
                const isNext = selectedDate === todayStr && nextUpcoming.slot === slot;
                const isPassed = (
                  selectedDate < todayStr ||
                  (selectedDate === todayStr && (
                    (slot === '1PM' && is1pmPassed) ||
                    (slot === '6PM' && is6pmPassed) ||
                    (slot === '8PM' && is8pmPassed)
                  ))
                );

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => { setSelectedSlot(slot); setErrorMsg(null); }}
                    className={`py-1.5 sm:py-2 px-1 rounded-xl text-center font-black transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-600'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-black flex items-center justify-center gap-1">
                      <span>{slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM'}</span>
                      {slotTicketsCount > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {slotTicketsCount}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] mt-0.5">
                      {isNext ? (
                        <span className={isSelected ? 'text-emerald-300 font-bold' : 'text-emerald-600 font-bold'}>
                          ⚡ {lang === 'bn' ? 'পরবর্তী' : 'Next'}
                        </span>
                      ) : isPassed ? (
                        <span className={isSelected ? 'text-blue-200' : 'text-slate-400'}>
                          {lang === 'bn' ? 'ফলাফল প্রকাশিত' : 'Result Out'}
                        </span>
                      ) : (
                        <span className={isSelected ? 'text-blue-200' : 'text-slate-400'}>
                          {lang === 'bn' ? 'আসন্ন' : 'Upcoming'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Quick Generator Box with 1-Tap Middle Chips */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
            
            {/* Top Bar: Quota counter & Retail Standard */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700 flex items-center gap-1">
                <span>🎲</span>
                <span>{lang === 'bn' ? 'লাকি টিকিট জেনারেটর:' : 'Lucky Ticket Generator:'}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-md border ${
                  activeGameTickets.length >= 12
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {activeGameTickets.length}/12 {lang === 'bn' ? 'বুকলেট' : 'Booklets'}
                </span>
                <span className="bg-amber-500 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded-md">
                  5 SEM • ₹35
                </span>
              </div>
            </div>

            {/* Big Quick Lucky Ticket Button */}
            <button
              type="button"
              onClick={handleQuickTicket}
              disabled={activeGameTickets.length >= 12}
              className={`w-full font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
                activeGameTickets.length >= 12
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white active:scale-[0.99] cursor-pointer'
              }`}
            >
              <span className="text-base sm:text-lg">{activeGameTickets.length >= 12 ? '🔒' : '🎲'}</span>
              <span>
                {activeGameTickets.length >= 12
                  ? (lang === 'bn' ? '১২/১২ বুকলেট পূর্ণ (নিচে সেম বৃদ্ধি করুন)' : '12/12 Booklets Full (Add Sem below)')
                  : (lang === 'bn' ? 'কুইক লাকি টিকিট নিন (৫ সেম • ₹৩৫)' : 'Print Quick Lucky Ticket (5 Sem • ₹35)')}
              </span>
            </button>

            {/* 1-Tap "Popular Middles" Chip Bar (Bengal retail lottery culture) */}
            <div className="pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-bold text-slate-600 flex items-center gap-1">
                  <span>🎯</span>
                  <span>{lang === 'bn' ? 'জনপ্রিয় মিডিল থেকে টিকিট নিন:' : '1-Tap Middle Quick Pick:'}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {lang === 'bn' ? 'ট্যাপ করলে সরাসরি ৫ সেম তৈরি হবে' : 'Tap to generate 5 Sem'}
                </span>
              </div>

              {/* Horizontal Scrollable Middle Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {popularMiddles.map((mid) => (
                  <button
                    key={mid}
                    type="button"
                    onClick={() => handlePickMiddleTicket(mid)}
                    disabled={activeGameTickets.length >= 12}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200 text-amber-950 transition-all flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Generate ticket with middle ${mid}`}
                  >
                    <span className="text-amber-600 text-[10px]">#</span>
                    <span>{mid} {lang === 'bn' ? 'মিডিল' : lang === 'hi' ? 'मिडिल' : 'Middle'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual 5-Digit Number Entry */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                addTicket(manualSeries, manualNumber, 5);
              }} 
              className="flex items-center gap-1.5 pt-1 border-t border-slate-100"
            >
              <input
                type="text"
                placeholder="72B"
                maxLength={4}
                value={manualSeries}
                onChange={e => setManualSeries(e.target.value.toUpperCase())}
                className="w-16 text-center font-mono font-black text-xs sm:text-sm uppercase bg-slate-50 border border-slate-300 rounded-xl px-1.5 py-2 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none shrink-0"
                title="Series"
              />
              <input
                type="text"
                placeholder={lang === 'bn' ? '৫ ডিজিট নম্বর দিন (যেমন: 48755)' : 'Enter 5-digit number'}
                maxLength={5}
                value={manualNumber}
                onChange={e => setManualNumber(e.target.value.replace(/\D/g, ''))}
                className="flex-1 min-w-0 font-mono font-black text-xs sm:text-sm tracking-wider bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none text-center"
                title="5-digit number"
              />
              <button
                type="submit"
                disabled={activeGameTickets.length >= 12}
                className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                {lang === 'bn' ? '+ প্রিন্ট' : '+ Print'}
              </button>
            </form>

            {/* Instant Purchase & Live Profit/Loss Feedback Toast */}
            {purchaseFeedback && (
              <div 
                className={`rounded-xl p-2.5 border shadow-xs transition-all animate-fadeIn relative ${
                  purchaseFeedback.evalRes.status === 'RESULT_OUT' && purchaseFeedback.evalRes.isWin
                    ? 'bg-gradient-to-r from-emerald-800 to-emerald-900 text-white border-emerald-400 ring-2 ring-emerald-500/40'
                    : purchaseFeedback.evalRes.status === 'RESULT_OUT' && !purchaseFeedback.evalRes.isWin
                    ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700'
                    : 'bg-gradient-to-r from-blue-950 to-indigo-950 text-white border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-xl shrink-0 mt-0.5">
                      {purchaseFeedback.evalRes.status === 'RESULT_OUT' && purchaseFeedback.evalRes.isWin ? '🎉' : purchaseFeedback.evalRes.status === 'RESULT_OUT' ? '🎟️' : '⏳'}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-white">
                          {purchaseFeedback.isIncrement
                            ? (purchaseFeedback.semAdded > 0
                                ? (lang === 'bn' ? `+${purchaseFeedback.semAdded} সেম বৃদ্ধি সফল!` : `+${purchaseFeedback.semAdded} Sem Added!`)
                                : (lang === 'bn' ? `${Math.abs(purchaseFeedback.semAdded)} সেম কমানো হয়েছে` : `${Math.abs(purchaseFeedback.semAdded)} Sem Reduced`))
                            : (lang === 'bn' ? 'টিকিট প্রিন্ট সম্পন্ন!' : 'Ticket Printed!')}
                        </span>
                        <span className="bg-white/20 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded text-white">
                          {purchaseFeedback.ticket.series} {purchaseFeedback.ticket.number}
                        </span>
                        <span className="bg-amber-400 text-amber-950 font-black text-[9px] px-1.5 py-0.2 rounded">
                          {purchaseFeedback.totalSem} Sem (₹{purchaseFeedback.ticketCost})
                        </span>
                      </div>

                      {purchaseFeedback.evalRes.status === 'RESULT_OUT' ? (
                        purchaseFeedback.evalRes.isWin ? (
                          <div className="text-xs font-black text-amber-300 font-mono flex items-center gap-1.5">
                            <span>🏆 {purchaseFeedback.evalRes.prizeTitle} (+₹{formatINR(purchaseFeedback.evalRes.prizeAmount)})</span>
                            <span>•</span>
                            <span className="text-emerald-200">Net: +₹{formatINR(purchaseFeedback.netPnl)}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                            <span>{lang === 'bn' ? 'এই ড্র-তে মেলেনি।' : 'No prize in this draw.'}</span>
                            <span className="text-rose-300 font-bold font-mono">Net: -₹{purchaseFeedback.ticketCost}</span>
                          </div>
                        )
                      ) : (
                        <div className="text-[10px] text-blue-200">
                          {lang === 'bn'
                            ? `বিনিয়োগ: ₹${purchaseFeedback.ticketCost} • ${purchaseFeedback.ticket.slot} ড্র সম্পন্ন হলে প্রফিট/লস লাইভ আপডেট হবে।`
                            : `Invested: ₹${purchaseFeedback.ticketCost} • P/L will calculate after ${purchaseFeedback.ticket.slot} draw.`}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPurchaseFeedback(null)}
                    className="text-white/60 hover:text-white p-1 rounded text-xs cursor-pointer"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {successMsg && !purchaseFeedback && (
              <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 rounded-lg p-2 text-center flex items-center justify-center gap-1.5 animate-fadeIn">
                <span>🎉</span>
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="text-[11px] text-red-600 font-bold bg-red-50 border border-red-200 rounded-lg p-1.5 text-center">
                ⚠️ {errorMsg}
              </div>
            )}

          </div>

          {/* 3. UNIFIED ACTIVE GAME FINANCIAL SUMMARY CARD */}
          {activeGameTickets.length > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
                <span className="font-bold flex items-center gap-1 text-slate-200">
                  <span>📊</span>
                  <span>
                    {lang === 'bn' 
                      ? `${selectedDate === todayStr ? 'আজকের' : selectedDate === yesterdayStr ? 'গতকালকের' : selectedDate.split('-').reverse().join('/') + ' তারিখের'} ${selectedSlot} ড্র লাভ/ক্ষতি (P/L):` 
                      : lang === 'hi'
                      ? `${selectedDate === todayStr ? 'आज का' : selectedDate === yesterdayStr ? 'कल का' : selectedDate.split('-').reverse().join('/')} ${selectedSlot} ड्रॉ लाभ/हानि (P/L):`
                      : `${selectedDate === todayStr ? 'Today' : selectedDate === yesterdayStr ? 'Yesterday' : selectedDate.split('-').reverse().join('/')} ${selectedSlot} Draw Financial Summary (P/L):`}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-slate-400 bg-white/10 px-2 py-0.5 rounded">
                  {activeGameTickets.length} {lang === 'bn' ? 'টিকিট' : 'Tickets'} • {gameStats.totalSem} Sem
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 border border-white/10">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">
                    {lang === 'bn' ? 'মোট খরচ' : 'Spent'}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-slate-200">
                    ₹{gameStats.totalCost}
                  </span>
                </div>

                <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 border border-white/10">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">
                    {lang === 'bn' ? 'মোট জয়' : 'Won'}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-amber-400">
                    ₹{formatINR(gameStats.totalReturns)}
                  </span>
                </div>

                <div className={`rounded-lg p-1.5 sm:p-2 border ${
                  gameStats.isPending 
                    ? 'bg-blue-950/40 border-blue-800 text-blue-300' 
                    : gameStats.netPnl >= 0 
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 ring-1 ring-emerald-500/50' 
                    : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                }`}>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">
                    {gameStats.isPending 
                      ? (lang === 'bn' ? 'স্ট্যাটাস' : 'Status') 
                      : (lang === 'bn' ? 'নিট লাভ/ক্ষতি' : 'Net P/L')}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black truncate block">
                    {gameStats.isPending 
                      ? (lang === 'bn' ? 'ড্র অপেক্ষায়' : 'Awaiting') 
                      : gameStats.netPnl >= 0 
                      ? `+₹${formatINR(gameStats.netPnl)}` 
                      : `-₹${formatINR(Math.abs(gameStats.netPnl))}`}
                  </span>
                </div>
              </div>

              {/* Expandable Lifetime Stats Link */}
              <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">
                  {gameStats.isPending
                    ? (lang === 'bn' ? 'ড্র-এর ফলাফল প্রকাশ হলে প্রফিট হিসাব হবে' : lang === 'hi' ? 'ड्रॉ रिजल्ट के बाद लाभ तय होगा' : 'P/L settles after official draw')
                    : gameStats.netPnl > 0
                    ? (lang === 'bn' ? `🎉 লাভ: +₹${formatINR(gameStats.netPnl)}` : lang === 'hi' ? `🎉 लाभ: +₹${formatINR(gameStats.netPnl)}` : `🎉 Profit: +₹${formatINR(gameStats.netPnl)}`)
                    : (lang === 'bn' ? `ক্ষতি: -₹${formatINR(Math.abs(gameStats.netPnl))}` : lang === 'hi' ? `हानि: -₹${formatINR(Math.abs(gameStats.netPnl))}` : `Loss: -₹${formatINR(Math.abs(gameStats.netPnl))}`)}
                </span>

                <button
                  type="button"
                  onClick={() => setShowGlobalStats(!showGlobalStats)}
                  className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                >
                  {showGlobalStats ? (lang === 'bn' ? '▲ লাইফটাইম হিসেব লুকান' : lang === 'hi' ? '▲ लाइफटाइम हिसाब छिपाएं' : '▲ Hide All-Time') : (lang === 'bn' ? '▼ লাইফটাইম হিসেব দেখুন' : lang === 'hi' ? '▼ लाइफटाइम हिसाब देखें' : '▼ View All-Time Stats')}
                </button>
              </div>

              {/* Collapsible Lifetime Statistics Drawer */}
              {showGlobalStats && (
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 space-y-1.5 animate-fadeIn">
                  <div className="text-[10px] font-bold text-amber-300">
                    {lang === 'bn' ? '📊 সর্বমোট লাইফটাইম পরিসংখ্যান (সব দিন মিলিয়ে):' : lang === 'hi' ? '📊 कुल लाइफटाइम आंकड़े:' : '📊 Lifetime Overall Statistics (All-Time):'}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                    <div className="bg-black/20 p-1.5 rounded">
                      <span className="text-[8px] text-slate-400 block">{lang === 'bn' ? 'মোট টিকিট' : lang === 'hi' ? 'कुल टिकट' : 'Total Tickets'}</span>
                      <span className="font-mono font-bold text-slate-200">{myTickets.length} ({globalStats.totalSemAll} Sem)</span>
                    </div>
                    <div className="bg-black/20 p-1.5 rounded">
                      <span className="text-[8px] text-slate-400 block">{lang === 'bn' ? 'মোট খরচ' : lang === 'hi' ? 'कुल लागत' : 'Total Cost'}</span>
                      <span className="font-mono font-bold text-slate-200">₹{globalStats.totalCostAll}</span>
                    </div>
                    <div className="bg-black/20 p-1.5 rounded">
                      <span className="text-[8px] text-slate-400 block">{lang === 'bn' ? 'মোট জয়' : lang === 'hi' ? 'कुल जीत' : 'Total Won'}</span>
                      <span className="font-mono font-bold text-emerald-400">₹{formatINR(globalStats.totalReturns)}</span>
                    </div>
                    <div className="bg-black/20 p-1.5 rounded">
                      <span className="text-[8px] text-slate-400 block">{lang === 'bn' ? 'লাইফটাইম P/L' : lang === 'hi' ? 'लाइफटाइम P/L' : 'Lifetime P/L'}</span>
                      <span className={`font-mono font-bold ${globalStats.overallNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {globalStats.overallNetPnl >= 0 ? `+₹${formatINR(globalStats.overallNetPnl)}` : `-₹${formatINR(Math.abs(globalStats.overallNetPnl))}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* 4. PAPER TICKETS LIST (Each with its own in-ticket Sem Stepper!) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>🎟️</span>
                <span>
                  {lang === 'bn' 
                    ? `আপনার টিকিট (${selectedDate === todayStr ? 'আজ' : selectedDate === yesterdayStr ? 'গতকাল' : selectedDate.split('-').reverse().join('/')} • ${selectedSlot})` 
                    : lang === 'hi'
                    ? `आपके टिकट (${selectedDate === todayStr ? 'आज' : selectedDate === yesterdayStr ? 'कल' : selectedDate.split('-').reverse().join('/')} • ${selectedSlot})`
                    : `Your Tickets (${selectedDate === todayStr ? 'Today' : selectedDate === yesterdayStr ? 'Yesterday' : selectedDate.split('-').reverse().join('/')} • ${selectedSlot})`}
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full font-mono font-bold bg-slate-200 text-slate-800">
                  {activeGameTickets.length}
                </span>
              </h2>

              {activeGameTickets.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSlot}
                  className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                >
                  {lang === 'bn' ? 'এই ড্র ক্লিয়ার করুন' : 'Clear game'}
                </button>
              )}
            </div>

            {activeGameTickets.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-1.5">
                <span className="text-3xl block">🎟️</span>
                <p className="text-xs font-bold text-slate-600">
                  {lang === 'bn'
                    ? `এই ${selectedSlot} ড্র-এর জন্য কোনো টিকিট নেই।`
                    : `No tickets printed for ${selectedSlot} yet.`}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn'
                    ? 'উপরে "কুইক লাকি টিকিট" বা মিডিল বোতামে ক্লিক করে টিকিট প্রিন্ট করুন!'
                    : 'Click "Print Quick Lucky Ticket" or tap a Middle chip above!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGameTickets.map(ticket => (
                  <RealPaperTicket
                    key={ticket.id}
                    ticket={ticket}
                    evalRes={evaluateTicket(ticket)}
                    onDelete={handleDeleteTicket}
                    onCopy={handleCopyTicket}
                    onAddSem={handleAddSemToTicket}
                    isCopied={copiedTicketId === ticket.id}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: HOT NUMBERS & HEAT MAP PICKS */}
      {activeTab === 'hot' && (
        <div className="space-y-3 animate-fadeIn">
          
          <div className="bg-white border border-amber-300 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>🔥</span>
                  <span>
                    {lang === 'bn' 
                      ? 'হট নম্বর ও হিট ম্যাপ জেনারেটর' 
                      : lang === 'hi' 
                      ? 'हॉट नंबर एवं हीट मैप जनरेटर' 
                      : 'Hot Numbers & Heat Map Generator'}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {lang === 'bn'
                    ? 'অতীত ড্র-তে বহুবার আসা নম্বর ও টপ হিট মিডিল/এন্ডিং প্যাটার্ন'
                    : 'Multiple-time repeating winners & top heat map middle/ending combinations'}
                </p>
              </div>

              <button
                type="button"
                onClick={generateHotNumbers}
                disabled={isRefreshingHot}
                className="text-[10px] sm:text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:scale-95 border border-amber-300 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                title="Refresh hot numbers"
              >
                <span className={isRefreshingHot ? 'animate-spin inline-block' : 'inline-block'}>🔄</span>
                <span>
                  {isRefreshingHot 
                    ? (lang === 'bn' ? 'তৈরি হচ্ছে...' : 'Generating...') 
                    : (lang === 'bn' ? 'নতুন নম্বর' : 'Refresh')}
                </span>
              </button>
            </div>

            {/* Popular Middle Chips inside Hot Tab */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 space-y-1.5">
              <span className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                <span>🎯</span>
                <span>{lang === 'bn' ? 'টপ ফ্রিকোয়েন্ট মিডিল নির্বাচন করুন:' : 'Top Frequent Middles:'}</span>
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {popularMiddles.map((mid) => (
                  <button
                    key={mid}
                    type="button"
                    onClick={() => {
                      handlePickMiddleTicket(mid);
                      setActiveTab('tickets');
                    }}
                    className="shrink-0 px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-white hover:bg-amber-100 active:scale-95 border border-amber-300 text-amber-950 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span>{mid} {lang === 'bn' ? 'মিডিল' : lang === 'hi' ? 'मिडिल' : 'Middle'}</span>
                    <span className="text-[9px] text-amber-700 font-sans">
                      {lang === 'bn' ? '+৫ সেম' : lang === 'hi' ? '+५ सेम' : '+5 Sem'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hot Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {hotCards.map((item, idx) => {
                const existingInGame = activeGameTickets.find(t => t.number === item.number);
                const currentSem = existingInGame?.sem || 0;
                const targetSem = currentSem > 0 ? currentSem : 5;

                // Check if this number won in the currently selected game
                const previewEval = evaluateTicket({
                  id: `preview-${idx}`,
                  series: item.series,
                  number: item.number,
                  sem: targetSem,
                  slot: selectedSlot,
                  date: selectedDate,
                  createdAt: 0
                });
                const isWinner = previewEval.status === 'RESULT_OUT' && previewEval.isWin;
                const previewCost = targetSem * 7;
                const previewNetProfit = previewEval.prizeAmount - previewCost;

                return (
                  <div 
                    key={idx} 
                    className={`border rounded-xl p-2.5 flex items-center justify-between gap-2 transition-all group ${
                      isWinner
                        ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-400 shadow-2xs'
                        : currentSem > 0 
                        ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-300' 
                        : 'bg-slate-50 hover:bg-amber-50/40 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black bg-amber-200/90 text-amber-950 px-1.5 py-0.2 rounded">
                          {item.series}
                        </span>
                        <span className="font-mono text-sm sm:text-base font-black text-slate-950 tracking-wider">
                          {item.number}
                        </span>
                        {currentSem > 0 && (
                          <span className="bg-slate-800 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0 shadow-2xs">
                            🎟️ {currentSem} Sem
                          </span>
                        )}
                        {isWinner && (
                          <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0 shadow-2xs animate-pulse">
                            🎉 WIN: +₹{formatINR(previewNetProfit)}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                        <span className="font-bold text-amber-700 shrink-0">
                          {lang === 'bn' ? item.tagBn : item.tag}
                        </span>
                        <span>•</span>
                        <span className="truncate">{lang === 'bn' ? item.reasonBn : item.reason}</span>
                      </div>

                      {isWinner && (
                        <div className="text-[9px] font-bold text-emerald-800 mt-0.5">
                          {previewEval.prizeTitle} (+₹{formatINR(previewEval.prizeAmount)})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyTicket(`hot-${idx}`, `${item.series} ${item.number}`)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs shadow-2xs transition-all cursor-pointer"
                        title="Copy number"
                      >
                        {copiedTicketId === `hot-${idx}` ? '✓' : '📋'}
                      </button>

                      {/* Add 5 Sem Button */}
                      <button
                        type="button"
                        onClick={() => {
                          addTicket(item.series, item.number, 5);
                          setActiveTab('tickets');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-black text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer ${
                          isWinner
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-400'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title={lang === 'bn' ? '৫ সেম টিকিট নিন' : 'Add 5 Sem ticket'}
                      >
                        <span>+</span>
                        <span>5 Sem</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* 5. WhatsApp Share & Reset */}
      {myTickets.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `🎫 *Dear Lottery Lucky Tickets (${selectedSlot})*\n${myTickets
                .filter(t => t.date === selectedDate && t.slot === selectedSlot)
                .map(t => `• ${t.series} ${t.number} (${t.sem || 5} Sem)`)
                .join('\n')}\n\n👉 Test your lucky tickets: https://dearresultlive.in/lucky-ticket`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all text-center"
          >
            <span>💬</span>
            <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে শেয়ার করুন' : 'Share on WhatsApp'}</span>
          </a>

          <button
            type="button"
            onClick={handleClearAll}
            className="text-slate-500 hover:text-red-700 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'সব ক্লিয়ার' : 'Clear All'}
          </button>
        </div>
      )}

    </div>
  );
}
