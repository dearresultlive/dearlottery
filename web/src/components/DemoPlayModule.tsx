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
  sem: number; // 1, 5, 10, 25, 50, 100
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

const SEM_OPTIONS = [
  { count: 5, labelBn: '৫ সেম', labelHi: '५ सेम', labelEn: '5 Sem', price: 35, popular: true },
  { count: 10, labelBn: '১০ সেম', labelHi: '१० सेम', labelEn: '10 Sem', price: 70, popular: false },
  { count: 25, labelBn: '২৫ সেম', labelHi: '२५ सेम', labelEn: '25 Sem', price: 175, popular: false },
  { count: 50, labelBn: '৫০ সেম', labelHi: '५० सेम', labelEn: '50 Sem', price: 350, popular: false },
  { count: 100, labelBn: '১০০ সেম', labelHi: '१०० सेम', labelEn: '100 Sem', price: 700, popular: false }
];

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

// Real-world Barcode Visual Component
function TicketBarcode({ code }: { code: string }) {
  const bars = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2];
  return (
    <div className="flex flex-col items-center select-none opacity-85">
      <div className="flex items-center gap-[1.5px] h-6 sm:h-7">
        {bars.map((w, i) => (
          <div
            key={i}
            className="bg-slate-900 h-full"
            style={{ width: `${w * 1.4}px` }}
          />
        ))}
      </div>
      <span className="text-[8px] font-mono font-bold tracking-widest text-slate-700 mt-0.5">
        * {code} *
      </span>
    </div>
  );
}

// Realistic Physical Paper Ticket Component (With Stacked Booklet Effect for Sem)
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
  evalRes: any;
  onDelete: (id: string) => void;
  onCopy: (id: string, text: string) => void;
  onAddSem?: (id: string, delta: number) => void;
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
    <div className={`rounded-xl border-2 ${theme.border} ${
      sem > 1 
        ? 'shadow-[3px_3px_0px_#94a3b8,6px_6px_0px_#cbd5e1]' 
        : 'shadow-md'
    } overflow-hidden font-sans select-none transition-transform hover:scale-[1.01]`}>
      
      {/* AUTHENTIC PAPER TICKET SLIP CONTAINER */}
      <div className={`relative ${theme.bg} overflow-hidden`}>
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

            {/* Quick Actions (Sem Stepper, Copy & Delete) */}
            <div className="flex items-center gap-1 shrink-0">
              {onAddSem && (
                <div className="flex items-center bg-black/5 rounded-lg p-0.5 border border-black/10 gap-0.5">
                  {sem > 5 && (
                    <button
                      type="button"
                      onClick={() => onAddSem(ticket.id, -5)}
                      className="px-1.5 py-0.5 rounded text-[9px] font-black bg-white hover:bg-slate-200 text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
                      title="Reduce 5 Sem (-₹35)"
                    >
                      -5
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onAddSem(ticket.id, 5)}
                    className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
                    title="Add 5 more Sem (+₹35)"
                  >
                    <span>+5 Sem</span>
                  </button>
                </div>
              )}

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

          {/* 4. Footer Barcode & Microtext */}
          <div className="flex items-end justify-between border-t border-black/10 pt-1 mt-1 text-[8px] text-slate-500">
            <span className="truncate max-w-[140px] sm:max-w-[200px] font-mono tracking-tighter">
              DIRECTORATE OF NAGALAND STATE LOTTERIES
            </span>
            <TicketBarcode code={`${ticket.series} ${ticket.number}`} />
          </div>

          {/* 5. Live Rubber Stamp Overlay & Multiplied Profit Indicator */}
          <div className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-end gap-1">
            {evalRes.isWin ? (
              <div className="rotate-[-5deg] border-2 border-dashed border-emerald-600 bg-emerald-500/25 text-emerald-950 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg shadow-sm font-black text-xs sm:text-sm tracking-wide uppercase backdrop-blur-[0.5px] animate-bounce text-right">
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
              <div className="rotate-[-2deg] border-2 border-dashed border-red-500 bg-red-500/15 text-red-700 px-2.5 py-1 rounded-md font-black text-[10px] sm:text-xs tracking-wider uppercase animate-pulse">
                🔴 {lang === 'bn' ? 'ড্র চলছে...' : 'DRAW IN PROGRESS'}
              </div>
            ) : evalRes.status === 'UPCOMING' ? (
              <div className="rotate-[3deg] border-2 border-dashed border-blue-500 bg-blue-500/10 text-blue-700 px-2.5 py-0.5 rounded-md font-bold text-[9px] sm:text-[11px] tracking-wider uppercase text-right">
                <div>⏳ DRAW AT {ticket.slot}</div>
                <div className="text-[8px] text-blue-900 font-mono">COST: ₹{ticketCost} ({sem} SEM)</div>
              </div>
            ) : (
              <div className="rotate-[4deg] border border-slate-300 bg-slate-100/90 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase text-right shadow-2xs">
                <div>✕ NO PRIZE</div>
                <div className="text-[8px] text-rose-700 font-mono font-bold">NET: -₹{ticketCost}.00</div>
              </div>
            )}
          </div>

        </div>

      </div>

      </div>

      {/* SEPARATE HIGH-VISIBILITY SEM ACTION BAR */}
      {onAddSem && (
        <div className="bg-slate-900 border-t-2 border-slate-800 p-2 sm:p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-base sm:text-lg shrink-0">🏷️</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-amber-400">
                  {lang === 'bn' ? 'সেম পরিবর্তন:' : lang === 'hi' ? 'सेम बदलें:' : 'Adjust Sem:'}
                </span>
                <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-mono font-black text-xs shadow-2xs">
                  {sem} SEM
                </span>
                <span className="text-slate-300 font-mono text-xs font-bold">
                  ({lang === 'bn' ? 'খরচ' : lang === 'hi' ? 'लागत' : 'Cost'}: ₹{ticketCost})
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {lang === 'bn' 
                  ? 'প্রতি ৫ সেম = ₹৩৫ • সেম বাড়ালে সব প্রাইজ সমপরিমাণে বৃদ্ধি পাবে' 
                  : lang === 'hi'
                  ? 'प्रति ५ सेम = ₹३५ • सेम बढ़ाने पर प्राइज मनी बढ़ेगी'
                  : '₹35 per 5 Sem • Winning prize multiplies with Sem'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
            {sem > 5 && (
              <button
                type="button"
                onClick={() => onAddSem(ticket.id, -5)}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Reduce 5 Sem (-₹35)"
              >
                <span>{lang === 'bn' ? '−৫ সেম' : lang === 'hi' ? '−५ सेम' : '−5 Sem'}</span>
                <span className="text-[10px] opacity-80 font-mono">(-₹35)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onAddSem(ticket.id, 5)}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="Add 5 Sem (+₹35)"
            >
              <span>{lang === 'bn' ? '+৫ সেম' : lang === 'hi' ? '+५ सेम' : '+5 Sem'}</span>
              <span className="text-[10px] text-emerald-200 font-mono">(+₹35)</span>
            </button>

            <button
              type="button"
              onClick={() => onAddSem(ticket.id, 10)}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="Add 10 Sem (+₹70)"
            >
              <span>{lang === 'bn' ? '+১০ সেম' : lang === 'hi' ? '+১০ सेम' : '+10 Sem'}</span>
              <span className="text-[10px] text-blue-200 font-mono">(+₹70)</span>
            </button>

            <button
              type="button"
              onClick={() => onAddSem(ticket.id, 25)}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="Add 25 Sem (+₹175)"
            >
              <span>{lang === 'bn' ? '+২৫ সেম' : lang === 'hi' ? '+२५ सेम' : '+25 Sem'}</span>
              <span className="text-[10px] text-purple-200 font-mono">(+₹175)</span>
            </button>
          </div>
        </div>
      )}

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

  // Sem Selection (Default 5 Sem - Standard Retail Purchase!)
  const [selectedSem, setSelectedSem] = useState<number>(5);
  const [activeTicketIdForSem, setActiveTicketIdForSem] = useState<string | null>(null);

  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [manualSeries, setManualSeries] = useState('72B');
  const [manualNumber, setManualNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [purchaseFeedback, setPurchaseFeedback] = useState<PurchaseFeedback | null>(null);

  // Tickets stored in localStorage
  const [myTickets, setMyTickets] = useState<LuckyTicket[]>([]);

  // Hot number combinations generated from heat map & repeating draws
  const [hotCards, setHotCards] = useState<HotNumberCard[]>([]);
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
            // Ensure sem is minimum 5 for all tickets (as single tickets are not sold)
            const normalized = parsed.map(t => ({
              ...t,
              sem: Math.max(t.sem || 5, 5)
            }));
            setMyTickets(normalized);
          }
        }
      } catch (e) {}

      // Prefill from URL query params (e.g. from Target Numbers page)
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
        generateHotNumbers();
      });
    }
  }, []);

  // Save tickets to localStorage
  const saveTickets = (tickets: LuckyTicket[]) => {
    setMyTickets(tickets);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dearlottery_lucky_tickets', JSON.stringify(tickets));
      localStorage.setItem('dearlottery_demo_tickets', JSON.stringify(tickets)); // sync legacy
    }
  };

  // Find draw record matching the ticket's date & slot
  const findDrawForTicket = (ticket: LuckyTicket) => {
    const slotNumber = ticket.slot.replace('PM', '');
    return initialDraws.find(d => 
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

  // Add ticket function for selected game with Sem count
  // If ticket already exists in the same game, clicking again adds +5 Sem to the same number!
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
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      // Check quota limit: Maximum 5 distinct booklets allowed per draw game
      const currentSlotCount = myTickets.filter(
        t => t.date === selectedDate && t.slot === selectedSlot
      ).length;

      if (currentSlotCount >= 5) {
        setErrorMsg(
          lang === 'bn'
            ? '⚠️ এই ড্র-এর জন্য সর্বোচ্চ ৫টি বুকলেটের কোটা পূর্ণ! নিচের যেকোনো টিকিটে সেম (+৫ সেম) বৃদ্ধি করুন অথবা নতুন নম্বর নিতে কোনো টিকিট মুছুন।'
            : '⚠️ Quota full! Maximum 5 booklets allowed per draw. You can add more Sem (+5 Sem) to your existing tickets or delete one to pick a new number.'
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
      setTimeout(() => setSuccessMsg(null), 4000);
    }

    setManualNumber('');

    const evalRes = evaluateTicket(targetTicket);
    const totalSem = targetTicket.sem || 5;
    const ticketCost = totalSem * 7;
    const netPnl = evalRes.status === 'RESULT_OUT'
      ? (evalRes.isWin ? evalRes.prizeAmount - ticketCost : -ticketCost)
      : -ticketCost;

    setActiveTicketIdForSem(targetTicket.id);
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

  // Add or reduce Sem for a specific ticket directly
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
      setActiveTicketIdForSem(target.id);
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

  // Quick Random Lucky Ticket generator (Adds selectedSem count)
  const handleQuickTicket = () => {
    const currentSlotCount = myTickets.filter(
      t => t.date === selectedDate && t.slot === selectedSlot
    ).length;

    if (currentSlotCount >= 5) {
      setErrorMsg(
        lang === 'bn'
          ? '⚠️ এই ড্র-এর জন্য সর্বোচ্চ ৫টি বুকলেটের কোটা পূর্ণ! নিচের টিকিটে সেম (+৫ সেম) বৃদ্ধি করুন অথবা কোনো টিকিট মুছুন।'
          : '⚠️ Quota full! Maximum 5 booklets allowed per draw. Add more Sem (+5 Sem) below or delete a ticket.'
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

    addTicket(s, num, selectedSem);
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

  // Generate Hot Numbers from Heat Map and Historical Archives (Dynamically randomized on each Refresh)
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
  }, [activeGameTickets, initialDraws]);

  // Overall Global Profit & Loss & Accuracy calculation with Sem factoring
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
  }, [myTickets, initialDraws]);

  return (
    <div className="space-y-4 max-w-xl mx-auto text-slate-800">
      
      {/* 1. Header (Simple & Clean) */}
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
            <span>🎟️</span>
            <span>
              {lang === 'bn' ? 'ডিয়ার লটারি লাকি টিকিট (সেম বুকলেট)' : lang === 'hi' ? 'डियर लॉटरी लकी टिकट (सेम बुकलेट)' : 'Dear Lottery Lucky Ticket (Sem)'}
            </span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            {lang === 'bn' 
              ? '৫ সেম / ১০ সেম পেপার বুকলেট সিমুলেশন ও রিয়াল প্রফিট-লস ট্র্যাকিং' 
              : '5 Sem / 10 Sem paper ticket simulator with realistic profit & loss'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-xs font-bold text-amber-400 bg-white/10 px-2 py-0.5 rounded">
            {selectedDate.split('-').reverse().join('/')}
          </span>
        </div>
      </div>

      {/* 2. Global Performance & Accuracy Bar (Transparent Cost, Returns, and Net P/L) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase truncate">
            {lang === 'bn' ? 'মোট টিকিট' : 'Booklets'}
          </span>
          <span className="font-mono text-xs sm:text-base font-black text-slate-900 block truncate">
            {myTickets.length}
          </span>
          <span className="text-[8px] sm:text-[9px] text-slate-400 block font-mono">
            {globalStats.totalSemAll} Sem
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase truncate">
            {lang === 'bn' ? 'মোট খরচ' : 'Total Cost'}
          </span>
          <span className="font-mono text-xs sm:text-base font-black text-slate-900 block truncate">
            ₹{globalStats.totalCostAll}
          </span>
          <span className="text-[8px] sm:text-[9px] text-slate-400 block font-mono">
            ₹7/ticket
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase truncate">
            {lang === 'bn' ? 'মোট জয়' : 'Total Won'}
          </span>
          <span className="font-mono text-xs sm:text-base font-black text-emerald-600 block truncate">
            ₹{formatINR(globalStats.totalReturns)}
          </span>
          <span className="text-[8px] sm:text-[9px] text-emerald-700 block font-bold truncate">
            {globalStats.totalWins} জয় ({globalStats.accuracyPercent}%)
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase truncate">
            {lang === 'bn' ? 'নিট P/L' : 'Net P/L'}
          </span>
          <span className={`font-mono text-xs sm:text-base font-black truncate block ${
            myTickets.length === 0 
              ? 'text-slate-700' 
              : globalStats.overallNetPnl >= 0 
              ? 'text-emerald-700' 
              : 'text-rose-700'
          }`}>
            {myTickets.length === 0 
              ? '₹0' 
              : globalStats.overallNetPnl >= 0 
              ? `+₹${formatINR(globalStats.overallNetPnl)}` 
              : `-₹${formatINR(Math.abs(globalStats.overallNetPnl))}`}
          </span>
          <span className={`text-[8px] sm:text-[9px] block font-bold truncate ${
            myTickets.length === 0
              ? 'text-slate-400'
              : globalStats.overallNetPnl > 0 
              ? 'text-emerald-700' 
              : globalStats.overallNetPnl < 0 
              ? 'text-rose-600' 
              : 'text-slate-500'
          }`}>
            {myTickets.length === 0 
              ? (lang === 'bn' ? 'খালি' : 'Empty')
              : globalStats.overallNetPnl > 0 
              ? (lang === 'bn' ? '🎉 লাভ' : 'Profit') 
              : globalStats.overallNetPnl < 0 
              ? (lang === 'bn' ? 'ক্ষতি' : 'Loss') 
              : (lang === 'bn' ? 'ব্রেক-ইভেন' : 'Even')}
          </span>
        </div>
      </div>

      {/* 3. Game Date & Time Selector (History & New Games) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-2.5">
        
        {/* Date Switcher: Today vs Yesterday */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <span>📅</span>
            <span>{lang === 'bn' ? 'খেলার তারিখ:' : 'Game Date:'}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setSelectedDate(todayStr); setErrorMsg(null); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedDate === todayStr
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang === 'bn' ? 'আজকের ড্র' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => { setSelectedDate(yesterdayStr); setErrorMsg(null); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedDate === yesterdayStr
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang === 'bn' ? 'গতকালকের ড্র' : 'Yesterday'}
            </button>
          </div>
        </div>

        {/* 3 Slot Tabs (1:00 PM | 6:00 PM | 8:00 PM) with ticket counts */}
        <div className="grid grid-cols-3 gap-2">
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
                className={`py-2 px-1.5 rounded-xl text-center font-black transition-all relative ${
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

      {/* 4. Ticket Generator Controls with 1-Tap Sem Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        
        {/* SEM SELECTION STEPPER BUTTONS (CHOOSE SEM BEFORE PRINTING) */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 p-2.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base shrink-0">🏷️</span>
              <div>
                <span className="font-black text-amber-950 block text-[11px] sm:text-xs">
                  {lang === 'bn' 
                    ? 'সেম নির্বাচন করুন (Choose Sem):' 
                    : lang === 'hi' 
                    ? 'सेम चुनें (Choose Sem):' 
                    : 'Choose Ticket Sem:'}
                </span>
                <span className="text-[10px] text-amber-900/80 block truncate">
                  {lang === 'bn'
                    ? 'সর্বনিম্ন ৫ সেম (₹৩৫) • সেম বাড়ালে সব প্রাইজ আনুপাতিক হারে বৃদ্ধি পায়'
                    : lang === 'hi'
                    ? 'न्यूनतम ५ सेम (₹३५) • सेम बढ़ाने पर सभी प्राइज मनी बढ़ती है'
                    : 'Min 5 Sem (₹35) • Prize money multiplies with Sem'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`font-mono font-black text-[10px] px-2 py-0.5 rounded-md border shadow-2xs ${
                activeGameTickets.length >= 5
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-white text-slate-800 border-amber-300'
              }`}>
                {activeGameTickets.length}/5
              </span>
              <span className="bg-amber-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded-lg shrink-0 shadow-2xs">
                {selectedSem} SEM • ₹{selectedSem * 7}
              </span>
            </div>
          </div>

          {/* 1-Tap Separate Sem Stepper Buttons */}
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 pt-0.5">
            {SEM_OPTIONS.map(opt => {
              const isSel = selectedSem === opt.count;
              const lbl = lang === 'bn' ? opt.labelBn : lang === 'hi' ? opt.labelHi : opt.labelEn;
              return (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setSelectedSem(opt.count)}
                  className={`py-1.5 sm:py-2 px-1 rounded-xl text-center font-mono transition-all cursor-pointer border ${
                    isSel
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-400 scale-[1.02] font-black'
                      : 'bg-white hover:bg-amber-100/70 text-slate-800 border-amber-200 font-bold'
                  }`}
                >
                  <div className="text-[11px] sm:text-xs leading-tight">{lbl}</div>
                  <div className={`text-[9px] sm:text-[10px] mt-0.5 ${isSel ? 'text-amber-100 font-bold' : 'text-slate-500 font-semibold'}`}>
                    ₹{opt.price}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1-Click Quick Ticket Button (Uses selectedSem) */}
        <button
          type="button"
          onClick={handleQuickTicket}
          disabled={activeGameTickets.length >= 5}
          className={`w-full font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
            activeGameTickets.length >= 5
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white active:scale-[0.99] cursor-pointer'
          }`}
        >
          <span className="text-base sm:text-lg">{activeGameTickets.length >= 5 ? '🔒' : '🎲'}</span>
          <span>
            {activeGameTickets.length >= 5
              ? (lang === 'bn' ? '৫/৫ বুকলেট পূর্ণ (নিচে সেম বৃদ্ধি করুন)' : '5/5 Booklets Full (Add Sem below)')
              : (lang === 'bn' 
                  ? `কুইক লাকি টিকিট নিন (${selectedSem} সেম • ₹${selectedSem * 7})` 
                  : lang === 'hi'
                  ? `क्विक लकी टिकट लें (${selectedSem} सेम • ₹${selectedSem * 7})`
                  : `Print Quick Lucky Ticket (${selectedSem} Sem • ₹${selectedSem * 7})`)}
          </span>
        </button>

        {/* Manual 5-Digit Number Entry */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            addTicket(manualSeries, manualNumber, selectedSem);
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
            placeholder="Enter 5-digit number (e.g. 48755)"
            maxLength={5}
            value={manualNumber}
            onChange={e => setManualNumber(e.target.value.replace(/\D/g, ''))}
            className="flex-1 min-w-0 font-mono font-black text-xs sm:text-sm tracking-wider bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none text-center"
            title="5-digit number"
          />
          <button
            type="submit"
            className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            {lang === 'bn' 
              ? `+ প্রিন্ট (${selectedSem} সেম)` 
              : lang === 'hi' 
              ? `+ प्रिंट (${selectedSem} सेम)` 
              : `+ Print (${selectedSem} Sem)`}
          </button>
        </form>

        {/* Instant Purchase & Live Profit/Loss Feedback Card */}
        {purchaseFeedback && (
          <div 
            className={`rounded-xl p-3 border shadow-xs transition-all animate-fadeIn relative ${
              purchaseFeedback.evalRes.status === 'RESULT_OUT' && purchaseFeedback.evalRes.isWin
                ? 'bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white border-emerald-400 ring-2 ring-emerald-500/40'
                : purchaseFeedback.evalRes.status === 'RESULT_OUT' && !purchaseFeedback.evalRes.isWin
                ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700'
                : 'bg-gradient-to-r from-blue-950 to-indigo-950 text-white border-blue-700'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-2xl shrink-0 mt-0.5">
                  {purchaseFeedback.evalRes.status === 'RESULT_OUT' && purchaseFeedback.evalRes.isWin ? '🎉' : purchaseFeedback.evalRes.status === 'RESULT_OUT' ? '🎟️' : '⏳'}
                </span>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white">
                      {purchaseFeedback.isIncrement
                        ? (purchaseFeedback.semAdded > 0
                            ? (lang === 'bn' ? `+${purchaseFeedback.semAdded} সেম বৃদ্ধি সফল!` : lang === 'hi' ? `+${purchaseFeedback.semAdded} सेम वृद्धि सफल!` : `+${purchaseFeedback.semAdded} Sem Added!`)
                            : (lang === 'bn' ? `${Math.abs(purchaseFeedback.semAdded)} সেম কমানো হয়েছে (-₹${Math.abs(purchaseFeedback.semAdded) * 7})` : lang === 'hi' ? `${Math.abs(purchaseFeedback.semAdded)} सेम घटाया गया (-₹${Math.abs(purchaseFeedback.semAdded) * 7})` : `${Math.abs(purchaseFeedback.semAdded)} Sem Reduced (-₹${Math.abs(purchaseFeedback.semAdded) * 7})`))
                        : (lang === 'bn' ? 'টিকিট প্রিন্ট সম্পন্ন!' : lang === 'hi' ? 'टिकट प्रिंट संपन्न!' : 'Ticket Printed!')}
                    </span>
                    <span className="bg-white/20 font-mono text-[10px] sm:text-xs font-bold px-1.5 py-0.2 rounded text-white">
                      {purchaseFeedback.ticket.series} {purchaseFeedback.ticket.number}
                    </span>
                    <span className="bg-amber-400 text-amber-950 font-black text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded">
                      {purchaseFeedback.totalSem} Sem (₹{purchaseFeedback.ticketCost})
                    </span>
                  </div>

                  {purchaseFeedback.evalRes.status === 'RESULT_OUT' ? (
                    purchaseFeedback.evalRes.isWin ? (
                      <div className="space-y-1">
                        <div className="text-[11px] text-emerald-200 font-bold flex items-center gap-1">
                          <span>🏆</span>
                          <span>{lang === 'bn' ? `${purchaseFeedback.evalRes.prizeTitle} জয়ী (+₹${formatINR(purchaseFeedback.evalRes.prizeAmount)})` : `Won ${purchaseFeedback.evalRes.prizeTitle} (+₹${formatINR(purchaseFeedback.evalRes.prizeAmount)})`}</span>
                        </div>
                        <div className="text-xs sm:text-sm font-black text-amber-300 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>💰</span>
                          <span>
                            {lang === 'bn' 
                              ? `নিট লাভ: +₹${formatINR(purchaseFeedback.netPnl)}` 
                              : `Net Profit: +₹${formatINR(purchaseFeedback.netPnl)}`}
                          </span>
                          <span className="text-[10px] text-emerald-200 font-normal">
                            (প্রাইজ ₹{formatINR(purchaseFeedback.evalRes.prizeAmount)} - খরচ ₹{purchaseFeedback.ticketCost})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                        <span>{lang === 'bn' ? 'এই ড্র-তে কোনো প্রাইজ মেলেনি।' : 'No prize won in this draw.'}</span>
                        <span className="text-rose-300 font-bold font-mono">
                          {lang === 'bn' ? `নিট ক্ষতি: -₹${purchaseFeedback.ticketCost}` : `Net Loss: -₹${purchaseFeedback.ticketCost}`}
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="text-[11px] text-blue-200">
                      {lang === 'bn'
                        ? `বিনিয়োগ: ₹${purchaseFeedback.ticketCost} • ${purchaseFeedback.ticket.slot} ড্র সম্পন্ন হলে প্রফিট/লস লাইভ আপডেট হবে।`
                        : `Invested: ₹${purchaseFeedback.ticketCost} • P/L will settle live once ${purchaseFeedback.ticket.slot} draw results are out.`}
                    </div>
                  )}

                  {/* Quick Separate Sem Adjustment Stepper Buttons */}
                  <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-white/90 flex items-center gap-1">
                      <span>⚡</span>
                      <span>
                        {lang === 'bn' 
                          ? 'এই টিকিটের সেম পরিবর্তন করুন:' 
                          : lang === 'hi' 
                          ? 'इस टिकट का सेम बदलें:' 
                          : 'Adjust Sem for this ticket:'}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
                      {purchaseFeedback.totalSem > 5 && (
                        <button
                          type="button"
                          onClick={() => handleAddSemToTicket(purchaseFeedback.ticket.id, -5)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1"
                          title="Reduce 5 Sem (-₹35)"
                        >
                          <span>{lang === 'bn' ? '−৫ সেম' : lang === 'hi' ? '−५ सेम' : '−5 Sem'}</span>
                          <span className="text-[10px] opacity-80 font-mono">(-₹35)</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddSemToTicket(purchaseFeedback.ticket.id, 5)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1"
                        title="Add 5 Sem (+₹35)"
                      >
                        <span>{lang === 'bn' ? '+৫ সেম' : lang === 'hi' ? '+५ सेम' : '+5 Sem'}</span>
                        <span className="text-[10px] text-emerald-950 font-bold font-mono">(+₹35)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddSemToTicket(purchaseFeedback.ticket.id, 10)}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1"
                        title="Add 10 Sem (+₹70)"
                      >
                        <span>{lang === 'bn' ? '+১০ সেম' : lang === 'hi' ? '+১০ सेम' : '+10 Sem'}</span>
                        <span className="text-[10px] text-amber-950 font-bold font-mono">(+₹70)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddSemToTicket(purchaseFeedback.ticket.id, 25)}
                        className="px-2.5 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-xs font-black cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1"
                        title="Add 25 Sem (+₹175)"
                      >
                        <span>{lang === 'bn' ? '+২৫ সেম' : lang === 'hi' ? '+२५ सेम' : '+25 Sem'}</span>
                        <span className="text-[10px] text-purple-100 font-mono">(+₹175)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => setPurchaseFeedback(null)}
                className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10 transition-colors shrink-0 text-xs cursor-pointer"
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

      {/* 5. Paper Tickets Display (Saved for selected game with stacked Sem visual) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <span>🎟️</span>
            <span>
              {lang === 'bn' 
                ? `আপনার টিকিট (${selectedDate === todayStr ? 'আজ' : 'গতকাল'} • ${selectedSlot})` 
                : `Your Tickets (${selectedSlot})`}
            </span>
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold shadow-2xs ${
              activeGameTickets.length >= 5
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-200 text-slate-800'
            }`}>
              {activeGameTickets.length}/5
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

        {/* Active Game Financial P/L Bar */}
        {activeGameTickets.length > 0 && (
          <div className="bg-slate-900 text-white rounded-xl p-3 border border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
              <span className="font-bold flex items-center gap-1.5 text-slate-200">
                <span>📊</span>
                <span>
                  {lang === 'bn' 
                    ? `${selectedDate === todayStr ? 'আজকের' : 'গতকালকের'} ${selectedSlot} ড্র-এর মোট লাভ/ক্ষতি (P/L):` 
                    : `${selectedSlot} Game Financial Summary (P/L):`}
                </span>
              </span>
              <span className="font-mono text-[10px] text-slate-400 bg-white/10 px-2 py-0.5 rounded">
                {activeGameTickets.length} {lang === 'bn' ? 'টি টিকিট' : 'Tickets'} • {gameStats.totalSem} Sem
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">
                  {lang === 'bn' ? 'মোট খরচ' : 'Total Spent'}
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-200">
                  ₹{gameStats.totalCost}
                </span>
              </div>

              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">
                  {lang === 'bn' ? 'মোট জয়' : 'Total Won'}
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-amber-400">
                  ₹{formatINR(gameStats.totalReturns)}
                  {gameStats.winsCount > 0 && (
                    <span className="text-[9px] text-emerald-400 ml-1 font-sans">
                      ({gameStats.winsCount} জয়)
                    </span>
                  )}
                </span>
              </div>

              <div className={`rounded-lg p-2 border ${
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
                    ? (lang === 'bn' ? 'ড্র অপেক্ষায়' : 'Awaiting Draw')
                    : gameStats.netPnl >= 0 
                    ? `+₹${formatINR(gameStats.netPnl)}` 
                    : `-₹${formatINR(Math.abs(gameStats.netPnl))}`}
                </span>
              </div>
            </div>

            {/* Bottom Insight Line */}
            <div className="text-[10px] text-center font-bold pt-0.5">
              {gameStats.isPending ? (
                <span className="text-blue-300">
                  {lang === 'bn' 
                    ? `⏳ এই ড্র-তে মোট ₹${gameStats.totalCost} বিনিয়োগ হয়েছে। ড্র ফলাফল প্রকাশ হলে প্রফিট/লস এখানে দেখাবে।` 
                    : `⏳ ₹${gameStats.totalCost} invested in this draw. Profit/loss will calculate after draw.`}
                </span>
              ) : gameStats.netPnl > 0 ? (
                <span className="text-emerald-400 flex items-center justify-center gap-1">
                  <span>🎉</span>
                  <span>
                    {lang === 'bn' 
                      ? `দারুণ! এই ড্র-তে আপনার মোট নিট লাভ: +₹${formatINR(gameStats.netPnl)}` 
                      : `Great! Net profit in this draw: +₹${formatINR(gameStats.netPnl)}`}
                  </span>
                </span>
              ) : gameStats.netPnl === 0 ? (
                <span className="text-slate-400">
                  {lang === 'bn' ? 'খরচ ও প্রাপ্তি সমান সমান (ব্রেক-ইভেন)' : 'Break-even (₹0 P/L)'}
                </span>
              ) : (
                <span className="text-rose-400">
                  {lang === 'bn' 
                    ? `এই ড্র-তে নিট ক্ষতি: -₹${formatINR(Math.abs(gameStats.netPnl))} (খরচ: ₹${gameStats.totalCost}, প্রাপ্তি: ₹${formatINR(gameStats.totalReturns)})` 
                    : `Net loss in this draw: -₹${formatINR(Math.abs(gameStats.netPnl))} (Spent: ₹${gameStats.totalCost}, Won: ₹${formatINR(gameStats.totalReturns)})`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* SEPARATE SEM CONTROLLER PANEL ON THE PAGE */}
        {activeGameTickets.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400/80 rounded-2xl p-3 sm:p-3.5 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏷️</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>
                      {lang === 'bn' ? 'সেম কন্ট্রোলার (Sem Controller)' : lang === 'hi' ? 'सेम कंट्रोलर' : 'Quick Sem Controller'}
                    </span>
                    <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                      {activeGameTickets.length} {lang === 'bn' ? 'বুকলেট' : 'Booklets'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    {lang === 'bn' 
                      ? 'টিকিটের সেম সরাসরি বাড়াতে বা কমাতে নিচের বাটনগুলোতে ক্লিক করুন:' 
                      : lang === 'hi'
                      ? 'टिकट का सेम बढ़ाने या घटाने के लिए नीचे बटन पर क्लिक करें:'
                      : 'Easily increase or decrease Sem for your ticket with 1 tap:'}
                  </p>
                </div>
              </div>
              
              {/* If more than 1 ticket, ticket switcher dropdown */}
              {activeGameTickets.length > 1 && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white border border-amber-300 rounded-lg p-1 shrink-0">
                  <span className="text-slate-500 text-[10px] px-1">{lang === 'bn' ? 'টিকিট:' : lang === 'hi' ? 'टिकट:' : 'Ticket:'}</span>
                  <select 
                    value={activeTicketIdForSem || activeGameTickets[0].id}
                    onChange={(e) => setActiveTicketIdForSem(e.target.value)}
                    className="bg-transparent font-mono font-black text-slate-900 outline-none cursor-pointer text-xs"
                  >
                    {activeGameTickets.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.series} {t.number} ({t.sem || 5} Sem)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Big Quick Stepper Action Buttons */}
            {(() => {
              const targetTicket = activeGameTickets.find(t => t.id === (activeTicketIdForSem || activeGameTickets[0]?.id)) || activeGameTickets[0];
              if (!targetTicket) return null;
              const targetSem = targetTicket.sem || 5;
              const targetCost = targetSem * 7;

              return (
                <div className="bg-white rounded-xl p-2.5 border border-amber-300/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs sm:text-sm bg-slate-900 text-white px-2.5 py-1 rounded-lg shadow-2xs">
                      {targetTicket.series} {targetTicket.number}
                    </span>
                    <div className="text-xs">
                      <span className="font-bold text-slate-700">{lang === 'bn' ? 'বর্তমান সেম:' : lang === 'hi' ? 'वर्तमान सेम:' : 'Current Sem:'}</span>{' '}
                      <span className="font-mono font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        {targetSem} SEM
                      </span>{' '}
                      <span className="text-slate-500 font-mono text-[11px] font-bold">(₹{targetCost})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
                    {targetSem > 5 && (
                      <button
                        type="button"
                        onClick={() => handleAddSemToTicket(targetTicket.id, -5)}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Reduce 5 Sem (-₹35)"
                      >
                        <span>{lang === 'bn' ? '−৫ সেম' : lang === 'hi' ? '−५ सेम' : '−5 Sem'}</span>
                        <span className="text-[10px] opacity-80 font-mono">(-₹35)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAddSemToTicket(targetTicket.id, 5)}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Add 5 Sem (+₹35)"
                    >
                      <span>{lang === 'bn' ? '+৫ সেম' : lang === 'hi' ? '+५ सेम' : '+5 Sem'}</span>
                      <span className="text-[10px] text-emerald-200 font-mono">(+₹35)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddSemToTicket(targetTicket.id, 10)}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Add 10 Sem (+₹70)"
                    >
                      <span>{lang === 'bn' ? '+১০ সেম' : lang === 'hi' ? '+১০ सेम' : '+10 Sem'}</span>
                      <span className="text-[10px] text-blue-200 font-mono">(+₹70)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddSemToTicket(targetTicket.id, 25)}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Add 25 Sem (+₹175)"
                    >
                      <span>{lang === 'bn' ? '+২৫ সেম' : lang === 'hi' ? '+२५ सेम' : '+25 Sem'}</span>
                      <span className="text-[10px] text-purple-200 font-mono">(+₹175)</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

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
                ? 'প্রতিটি নতুন খেলায় নতুন ৫ সেম টিকিট নিতে উপরের বাটন বা নিচের হট নম্বর থেকে যোগ করুন!'
                : 'Every new game requires new tickets. Print a 5 Sem Lucky Ticket above or pick from Hot Numbers below!'}
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

      {/* 6. 🔥 Hot Numbers & Heat Map Generator Section (Below Tickets) */}
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
                      {previewEval.prizeTitle} (+₹{formatINR(previewEval.prizeAmount)}) • {lang === 'bn' ? `নিট লাভ: +₹${formatINR(previewNetProfit)}` : `Net: +₹${formatINR(previewNetProfit)}`}
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

                  {/* Add Sem Button */}
                  <button
                    type="button"
                    onClick={() => addTicket(item.series, item.number, selectedSem)}
                    className={`px-2.5 py-1.5 rounded-lg font-black text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer ${
                      isWinner
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-400'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                    title={
                      currentSem > 0 
                        ? (lang === 'bn' ? `${item.number} নম্বরে আরও +${selectedSem} সেম নিন (মোট: ${currentSem + selectedSem} সেম)` : `Add +${selectedSem} more Sem to ${item.number} (Total: ${currentSem + selectedSem} Sem)`)
                        : (lang === 'bn' ? `${selectedSem} সেম টিকিট নিন` : `Add ${selectedSem} Sem ticket`)
                    }
                  >
                    <span>+</span>
                    <span>{selectedSem} Sem</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. WhatsApp Share & Reset */}
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
            className="text-slate-500 hover:text-red-700 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 transition-colors"
          >
            {lang === 'bn' ? 'সব ক্লিয়ার' : 'Clear All'}
          </button>
        </div>
      )}

    </div>
  );
}
