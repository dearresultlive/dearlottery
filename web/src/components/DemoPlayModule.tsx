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

export interface LuckyTicket {
  id: string;
  series: string;
  number: string;
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

// Realistic Physical Paper Ticket Component
function RealPaperTicket({
  ticket,
  evalRes,
  onDelete,
  onCopy,
  isCopied,
  lang
}: {
  ticket: LuckyTicket;
  evalRes: any;
  onDelete: (id: string) => void;
  onCopy: (id: string, text: string) => void;
  isCopied: boolean;
  lang: string;
}) {
  const schemeName = getSchemeName(ticket.date, ticket.slot);
  const formattedDate = ticket.date.split('-').reverse().join('/');

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

  const netTicketPnl = evalRes.isWin ? evalRes.prizeAmount - 6 : -6;

  return (
    <div className={`relative ${theme.bg} rounded-xl border-2 ${theme.border} shadow-md overflow-hidden font-sans select-none transition-transform hover:scale-[1.01]`}>
      
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

          {/* Stamped Number on Stub */}
          <div className="my-auto py-1">
            <span className="text-[10px] sm:text-xs font-mono font-black text-slate-900 block leading-tight">
              {ticket.series}
            </span>
            <span className="text-xs sm:text-sm font-mono font-black text-slate-950 tracking-wider block">
              {ticket.number}
            </span>
            <span className="text-[8px] font-bold text-red-600 block mt-0.5">MRP ₹6.00</span>
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
                onClick={() => onCopy(ticket.id, `${ticket.series} ${ticket.number}`)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
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
                className="w-5 h-5 rounded-full bg-black/5 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] text-slate-500 transition-colors"
                title="Remove ticket"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 2. 1st Prize Ribbon Banner */}
          <div className={`${theme.ribbon} text-white px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center justify-between shadow-2xs my-1`}>
            <span>★ 1st PRIZE ₹ 1 CRORE ★</span>
            <span className="text-[8px] opacity-90 hidden sm:inline">(INCL. SUPER PRIZE)</span>
            <span className="font-mono text-[9px]">MRP ₹6/-</span>
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

          {/* 4. Footer Barcode & Microtext */}
          <div className="flex items-end justify-between border-t border-black/10 pt-1 mt-1 text-[8px] text-slate-500">
            <span className="truncate max-w-[140px] sm:max-w-[200px] font-mono tracking-tighter">
              DIRECTORATE OF NAGALAND STATE LOTTERIES
            </span>
            <TicketBarcode code={`${ticket.series} ${ticket.number}`} />
          </div>

          {/* 5. Live Rubber Stamp Overlay & Profit Indicator */}
          <div className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-end gap-1">
            {evalRes.isWin ? (
              <div className="rotate-[-5deg] border-2 border-dashed border-emerald-600 bg-emerald-500/20 text-emerald-950 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm font-black text-xs sm:text-sm tracking-wide uppercase backdrop-blur-[0.5px] animate-bounce text-right">
                <div>🎉 {evalRes.prizeTitle}</div>
                <div className="text-[10px] text-emerald-800 font-mono mt-0.5 font-bold">
                  +{formatINR(netTicketPnl)} {lang === 'bn' ? 'লাভ' : 'Profit'}
                </div>
              </div>
            ) : evalRes.status === 'DRAWING' ? (
              <div className="rotate-[-2deg] border-2 border-dashed border-red-500 bg-red-500/15 text-red-700 px-2.5 py-1 rounded-md font-black text-[10px] sm:text-xs tracking-wider uppercase animate-pulse">
                🔴 {lang === 'bn' ? 'ড্র চলছে...' : 'DRAW IN PROGRESS'}
              </div>
            ) : evalRes.status === 'UPCOMING' ? (
              <div className="rotate-[3deg] border-2 border-dashed border-blue-500 bg-blue-500/10 text-blue-700 px-2.5 py-0.5 rounded-md font-bold text-[9px] sm:text-[11px] tracking-wider uppercase">
                ⏳ DRAW AT {ticket.slot}
              </div>
            ) : (
              <div className="rotate-[4deg] border border-slate-300 bg-slate-100/90 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase text-right">
                <div>✕ NO PRIZE</div>
                <div className="text-[8px] text-slate-400 font-mono">-₹6.00</div>
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

  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [manualSeries, setManualSeries] = useState('72B');
  const [manualNumber, setManualNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tickets stored in localStorage
  const [myTickets, setMyTickets] = useState<LuckyTicket[]>([]);

  // Hot number combinations generated from heat map & repeating draws
  const [hotCards, setHotCards] = useState<HotNumberCard[]>([]);

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
          if (Array.isArray(parsed)) setMyTickets(parsed);
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

  // Match evaluation for a ticket against official draw prizes
  const evaluateTicket = (ticket: LuckyTicket) => {
    const draw = findDrawForTicket(ticket);
    const prizes: PrizeRecord = draw?.parsed_data?.prizes || draw?.prizes || {};
    const hasPrizes = Boolean(prizes.first_prize?.number && draw?.status !== 'UPCOMING' && draw?.status !== 'DRAWING');
    const status = getSlotStatus(ticket.date, ticket.slot, hasPrizes);

    if (status !== 'RESULT_OUT' || !hasPrizes) {
      return {
        status,
        isWin: false,
        prizeTitle: status === 'DRAWING' 
          ? (lang === 'bn' ? 'ড্র চলছে...' : 'Drawing in progress...') 
          : (lang === 'bn' ? `${ticket.slot} ড্র অপেক্ষমাণ` : `Awaiting ${ticket.slot} Draw`),
        prizeAmount: 0
      };
    }

    const tNum = ticket.number.trim();
    const tSeries = ticket.series.trim().toUpperCase();

    // 1st Prize check (₹1 Crore)
    if (prizes.first_prize) {
      const fNum = prizes.first_prize.number.trim();
      const fSeries = (prizes.first_prize.series || '').trim().toUpperCase();
      if (tNum === fNum) {
        if (!tSeries || !fSeries || tSeries === fSeries) {
          return {
            status: 'RESULT_OUT',
            isWin: true,
            prizeTitle: lang === 'bn' ? '১ম পুরস্কার (১ কোটি)!' : '1st Prize (₹1 Crore)!',
            prizeAmount: 10000000
          };
        } else {
          return {
            status: 'RESULT_OUT',
            isWin: true,
            prizeTitle: lang === 'bn' ? 'সান্ত্বনা পুরস্কার (₹১,০০০)' : 'Consolation (₹1,000)',
            prizeAmount: 1000
          };
        }
      }
    }

    // 2nd Prize check (₹9,000)
    if (prizes.second_prize && prizes.second_prize.some(n => n.trim() === tNum)) {
      return {
        status: 'RESULT_OUT',
        isWin: true,
        prizeTitle: lang === 'bn' ? '২য় পুরস্কার (₹৯,০০০)' : '2nd Prize (₹9,000)',
        prizeAmount: 9000
      };
    }

    // 3rd Prize check (₹450)
    const last4 = tNum.slice(-4);
    if (prizes.third_prize && prizes.third_prize.some(n => n.trim() === last4)) {
      return {
        status: 'RESULT_OUT',
        isWin: true,
        prizeTitle: lang === 'bn' ? '৩য় পুরস্কার (₹৪৫০)' : '3rd Prize (₹450)',
        prizeAmount: 450
      };
    }

    // 4th Prize check (₹250)
    if (prizes.fourth_prize && prizes.fourth_prize.some(n => n.trim() === last4)) {
      return {
        status: 'RESULT_OUT',
        isWin: true,
        prizeTitle: lang === 'bn' ? '৪র্থ পুরস্কার (₹২৫০)' : '4th Prize (₹250)',
        prizeAmount: 250
      };
    }

    // 5th Prize check (₹120)
    if (prizes.fifth_prize && prizes.fifth_prize.some(n => n.trim() === last4)) {
      return {
        status: 'RESULT_OUT',
        isWin: true,
        prizeTitle: lang === 'bn' ? '৫ম পুরস্কার (₹১২০)' : '5th Prize (₹120)',
        prizeAmount: 120
      };
    }

    return {
      status: 'RESULT_OUT',
      isWin: false,
      prizeTitle: lang === 'bn' ? 'মেলেনি' : 'No Match',
      prizeAmount: 0
    };
  };

  // Add ticket function for selected game
  const addTicket = (series: string, number: string) => {
    setErrorMsg(null);
    const cleanNum = number.replace(/\D/g, '');

    if (cleanNum.length !== 5) {
      setErrorMsg(lang === 'bn' ? 'দয়া করে সঠিক ৫ ডিজিট দিন।' : 'Please enter 5 digits.');
      return;
    }

    const cleanSeries = series.trim().toUpperCase() || '72B';

    // Duplicate check within selected game
    const exists = myTickets.some(t => t.date === selectedDate && t.slot === selectedSlot && t.number === cleanNum);
    if (exists) {
      setErrorMsg(lang === 'bn' ? 'এই টিকিটটি ইতিমধ্যে এই খেলায় রয়েছে।' : 'Ticket already added for this game.');
      return;
    }

    const newTicket: LuckyTicket = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      series: cleanSeries,
      number: cleanNum,
      slot: selectedSlot,
      date: selectedDate,
      createdAt: Date.now()
    };

    const nextTickets = [newTicket, ...myTickets];
    saveTickets(nextTickets);
    setManualNumber('');

    const evalRes = evaluateTicket(newTicket);
    if (evalRes.isWin) {
      try {
        confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  // Quick Random Lucky Ticket generator
  const handleQuickTicket = () => {
    const seriesOptions = ['72B', '64D', '81G', '92H', '55A', '58C', '73E', '86J', '84D', '69A', '77C'];
    const middleSeeds = ['48', '62', '79', '35', '52', '29', '43', '80', '15', '24'];
    const endingSeeds = ['55', '74', '22', '57', '63', '36', '14', '82', '99', '06'];

    const s = seriesOptions[Math.floor(Math.random() * seriesOptions.length)];
    const m = middleSeeds[Math.floor(Math.random() * middleSeeds.length)];
    const end = endingSeeds[Math.floor(Math.random() * endingSeeds.length)];
    const lead = String(Math.floor(Math.random() * 9) + 1);
    const num = `${lead}${m}${end.slice(-2)}`;

    addTicket(s, num);
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
    const list: HotNumberCard[] = [];
    const seriesOptions = ['72B', '64D', '81G', '92H', '55A', '58C', '73E'];

    // 1. Multi-Win Recurring Numbers (Numbers that repeatedly won 1st/2nd prize)
    try {
      const topRecurring = getTopRecurringNumbers('3Y', 6);
      for (let i = 0; i < topRecurring.length; i++) {
        const item = topRecurring[i];
        if (item.number && item.number.length === 5) {
          list.push({
            series: seriesOptions[i % seriesOptions.length],
            number: item.number,
            tag: `${item.count}x Repeat Winner`,
            tagBn: `${item.count} বার বিজয়ী`,
            reason: `Won ${item.lastRank} in official draw`,
            reasonBn: `অফিশিয়াল খেলায় ${item.count} বার পুরস্কার জয়ী`
          });
        }
      }
    } catch (e) {}

    // 2. Heat Map Middles + Top Endings
    try {
      const topMiddles = getTopFrequentMiddles(6, '3Y');
      const topEndings = getTopFrequentEndings(6, '3Y');

      for (let i = 0; i < 4; i++) {
        const midObj = topMiddles[i] || { middle: '48' };
        const endObj = topEndings[i] || { ending: '55' };
        const lead = String(Math.floor(Math.random() * 9) + 1);
        const combo = `${lead}${midObj.middle}${endObj.ending}`;

        if (!list.some(l => l.number === combo)) {
          list.push({
            series: seriesOptions[(i + 3) % seriesOptions.length],
            number: combo,
            tag: `Heat Map Mid ${midObj.middle}`,
            tagBn: `হিট ম্যাপ মিডিল ${midObj.middle}`,
            reason: `Top Middle ${midObj.middle} + Ending ${endObj.ending}`,
            reasonBn: `টপ মিডিল ${midObj.middle} ও এন্ডিং ${endObj.ending}`
          });
        }
      }
    } catch (e) {}

    // Fallbacks if data is empty
    const fallbacks: HotNumberCard[] = [
      { series: '72B', number: '48755', tag: 'Hot Middle Pattern', tagBn: 'হট মিডিল ৪৮ ও এন্ডিং ৫৫', reason: 'High frequency in 5th prize', reasonBn: '৫ম পুরস্কারে সর্বাধিক আসা' },
      { series: '64D', number: '09674', tag: '2nd Prize Winner', tagBn: '২য় প্রাইজ বিজয়ী', reason: 'Won ₹9,000 in recent day draw', reasonBn: 'সাম্প্রতিক ড্র-তে ৯,০০০ টাকা জয়ী' },
      { series: '81G', number: '65322', tag: 'High-Hit Combo', tagBn: 'হাই-হিট কম্বিনেশন', reason: 'Top-rated repeating middle 53', reasonBn: 'টপ রেটেড মিডিল ৫৩' },
      { series: '92H', number: '84257', tag: 'Top Ranked Number', tagBn: 'টপ রেঙ্কড নম্বর', reason: 'High accuracy hit pattern', reasonBn: 'ধারাবাহিক হিট রেট প্যাটার্ন' }
    ];

    for (const fb of fallbacks) {
      if (list.length >= 6) break;
      if (!list.some(l => l.number === fb.number)) list.push(fb);
    }

    setHotCards(list.slice(0, 6));
  };

  // Initial generation
  useEffect(() => {
    generateHotNumbers();
  }, [selectedSlot]);

  // Filter tickets for currently selected game (Date + Slot)
  const activeGameTickets = myTickets.filter(t => t.date === selectedDate && t.slot === selectedSlot);

  // Overall Global Profit & Loss & Accuracy calculation
  const evaluatedTickets = useMemo(() => {
    return myTickets.map(t => ({
      ticket: t,
      evalRes: evaluateTicket(t)
    })).filter(item => item.evalRes.status === 'RESULT_OUT');
  }, [myTickets, initialDraws]);

  const totalEvaluated = evaluatedTickets.length;
  const totalWins = evaluatedTickets.filter(item => item.evalRes.isWin).length;
  const accuracyPercent = totalEvaluated > 0 ? Math.round((totalWins / totalEvaluated) * 100) : 0;
  const totalCost = totalEvaluated * 6; // ₹6 per ticket
  const totalReturns = evaluatedTickets.reduce((acc, item) => acc + item.evalRes.prizeAmount, 0);
  const netPnl = totalReturns - totalCost;

  // Selected game status
  const isSelectedGamePassed = (
    selectedDate < todayStr ||
    (selectedDate === todayStr && (
      (selectedSlot === '1PM' && is1pmPassed) ||
      (selectedSlot === '6PM' && is6pmPassed) ||
      (selectedSlot === '8PM' && is8pmPassed)
    ))
  );

  return (
    <div className="space-y-4 max-w-xl mx-auto text-slate-800">
      
      {/* 1. Header (Simple & Clean) */}
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
            <span>🎟️</span>
            <span>
              {lang === 'bn' ? 'ডিয়ার লটারি লাকি টিকিট' : lang === 'hi' ? 'डियर लॉटरी लकी टिकट' : 'Dear Lottery Lucky Ticket'}
            </span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            {lang === 'bn' 
              ? 'বাস্তব পেপার টিকিট সিমুলেশন, হিট ম্যাপ ও লাইভ লাভ-ক্ষতির হিসাব' 
              : 'Real paper ticket simulator, heat map & live profit/loss tracking'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-xs font-bold text-amber-400 bg-white/10 px-2 py-0.5 rounded">
            {selectedDate.split('-').reverse().join('/')}
          </span>
        </div>
      </div>

      {/* 2. Global Performance & Accuracy Bar (Profit / Loss & Hit Rate) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase truncate">
            {lang === 'bn' ? 'মোট টিকিট' : 'Tickets'}
          </span>
          <span className="font-mono text-sm sm:text-base font-black text-slate-900">
            {totalEvaluated}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase truncate">
            {lang === 'bn' ? 'ম্যাচ / জয়' : 'Hits'}
          </span>
          <span className="font-mono text-sm sm:text-base font-black text-emerald-600">
            {totalWins}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase truncate">
            {lang === 'bn' ? 'অ্যাকুরেসি' : 'Accuracy'}
          </span>
          <span className="font-mono text-sm sm:text-base font-black text-blue-700">
            {accuracyPercent}%
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase truncate">
            {lang === 'bn' ? 'লাভ/ক্ষতি (P/L)' : 'Net P/L'}
          </span>
          <span className={`font-mono text-xs sm:text-sm font-black truncate block ${netPnl >= 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
            {netPnl >= 0 ? `+${formatINR(netPnl)}` : `-${formatINR(Math.abs(netPnl))}`}
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

      {/* 4. Ticket Generator Controls (For active game) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <span>🎟️</span>
            <span>
              {lang === 'bn' 
                ? `নতুন লাকি টিকিট নিন (${selectedDate === todayStr ? 'আজ' : 'গতকাল'} • ${selectedSlot})` 
                : `Print Lucky Ticket (${selectedSlot})`}
            </span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">MRP ₹6.00</span>
        </div>

        {/* 1-Click Quick Ticket Button */}
        <button
          type="button"
          onClick={handleQuickTicket}
          className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <span className="text-base sm:text-lg">🎲</span>
          <span>{lang === 'bn' ? 'কুইক লাকি টিকিট প্রিন্ট করুন (১-ক্লিক)' : 'Print Quick Lucky Ticket (1-Click)'}</span>
        </button>

        {/* Manual 5-Digit Number Entry */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            addTicket(manualSeries, manualNumber);
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
            className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
          >
            {lang === 'bn' ? '+ প্রিন্ট' : '+ Print'}
          </button>
        </form>

        {errorMsg && (
          <div className="text-[11px] text-red-600 font-bold bg-red-50 border border-red-200 rounded-lg p-1.5 text-center">
            ⚠️ {errorMsg}
          </div>
        )}

      </div>

      {/* 5. Paper Tickets Display (Saved for selected game) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <span>🎟️</span>
            <span>
              {lang === 'bn' 
                ? `আপনার টিকিট (${selectedDate === todayStr ? 'আজ' : 'গতকাল'} • ${selectedSlot})` 
                : `Your Tickets (${selectedSlot})`}
            </span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {activeGameTickets.length}
            </span>
          </h2>

          {activeGameTickets.length > 0 && (
            <button
              type="button"
              onClick={handleClearSlot}
              className="text-[11px] font-bold text-red-600 hover:underline"
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
                ? 'প্রতিটি নতুন খেলায় নতুন টিকিট প্রিন্ট করতে উপরের বাটন বা নিচের হট নম্বর থেকে যোগ করুন!'
                : 'Every new game requires new tickets. Print a Lucky Ticket above or pick from Hot Numbers below!'}
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
            className="text-[10px] sm:text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0"
            title="Refresh hot numbers"
          >
            <span>🔄</span>
            <span>{lang === 'bn' ? 'নতুন নম্বর' : 'Refresh'}</span>
          </button>
        </div>

        {/* Hot Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {hotCards.map((item, idx) => (
            <div 
              key={idx} 
              className="bg-slate-50 hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 rounded-xl p-2.5 flex items-center justify-between gap-2 transition-all group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-black bg-amber-200/90 text-amber-950 px-1.5 py-0.2 rounded">
                    {item.series}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black text-slate-950 tracking-wider">
                    {item.number}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                  <span className="font-bold text-amber-700 shrink-0">
                    {lang === 'bn' ? item.tagBn : item.tag}
                  </span>
                  <span>•</span>
                  <span className="truncate">{lang === 'bn' ? item.reasonBn : item.reason}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => handleCopyTicket(`hot-${idx}`, `${item.series} ${item.number}`)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs shadow-2xs transition-all"
                  title="Copy number"
                >
                  {copiedTicketId === `hot-${idx}` ? '✓' : '📋'}
                </button>

                {/* Add to Ticket Button */}
                <button
                  type="button"
                  onClick={() => addTicket(item.series, item.number)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1"
                  title="Add this ticket"
                >
                  <span>+</span>
                  <span>{lang === 'bn' ? 'টিকিট নিন' : 'Add Ticket'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. WhatsApp Share & Reset */}
      {myTickets.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `🎫 *Dear Lottery Lucky Tickets (${selectedSlot})*\n${myTickets
                .filter(t => t.date === selectedDate && t.slot === selectedSlot)
                .map(t => `• ${t.series} ${t.number}`)
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
