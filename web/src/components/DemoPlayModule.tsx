import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../lib/i18n';
import { getISTDateString, getISTNow, formatINR, parseTicketInput, getSlotStatus, getSlotCountdown } from '../lib/lottery-utils';
import confetti from 'canvas-confetti';

interface PrizeRecord {
  first_prize?: { series: string; number: string };
  consolation_prize_amount?: number;
  second_prize?: string[];
  third_prize?: string[];
  fourth_prize?: string[];
  fifth_prize?: string[];
}

export interface DemoTicket {
  id: string;
  series: string;
  number: string;
  slot: '1PM' | '6PM' | '8PM';
  date: string;
  createdAt: number;
}

interface DemoStats {
  totalSimulated: number;
  totalWins: number;
  simulatedSpend: number; // ₹6 per ticket
  simulatedReturns: number; // Sum of prize money won
}

interface DemoPlayModuleProps {
  initialDraws?: any[];
}

export default function DemoPlayModule({ initialDraws = [] }: DemoPlayModuleProps) {
  const { lang } = useLanguage();
  const todayStr = getISTDateString();

  // Active draw slot selection
  const [selectedSlot, setSelectedSlot] = useState<'1PM' | '6PM' | '8PM'>('1PM');
  const [manualSeries, setManualSeries] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tickets stored in localStorage
  const [myTickets, setMyTickets] = useState<DemoTicket[]>([]);
  const [stats, setStats] = useState<DemoStats>({
    totalSimulated: 0,
    totalWins: 0,
    simulatedSpend: 0,
    simulatedReturns: 0
  });

  // Hot middle/ending statistical seeds for quick pick
  const slotTrends = useMemo(() => {
    const seeds: Record<string, { middles: string[]; endings: string[]; seriesList: string[] }> = {
      '1PM': {
        middles: ['24', '48', '62', '79', '85', '91'],
        endings: ['15', '38', '47', '69', '82', '94'],
        seriesList: ['70B', '64D', '81G', '92H', '55A']
      },
      '6PM': {
        middles: ['18', '35', '52', '67', '74', '88'],
        endings: ['06', '23', '41', '58', '77', '95'],
        seriesList: ['58C', '73E', '86J', '90K', '62B']
      },
      '8PM': {
        middles: ['12', '29', '43', '61', '80', '96'],
        endings: ['14', '32', '55', '68', '83', '99'],
        seriesList: ['84D', '69A', '77C', '88H', '95L']
      }
    };
    return seeds[selectedSlot] || seeds['1PM'];
  }, [selectedSlot]);

  // Load saved demo tickets and stats from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dearlottery_demo_tickets');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setMyTickets(parsed);
        }

        const savedStats = localStorage.getItem('dearlottery_demo_stats');
        if (savedStats) {
          const parsed = JSON.parse(savedStats);
          if (parsed && typeof parsed.totalSimulated === 'number') {
            setStats(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to parse saved demo data', e);
      }

      // Read URL query parameter for prefilling from Target Numbers page
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
    }
  }, []);

  // Save tickets & stats to localStorage whenever changed
  const saveTickets = (tickets: DemoTicket[]) => {
    setMyTickets(tickets);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dearlottery_demo_tickets', JSON.stringify(tickets));
    }
  };

  const updateStats = (newStats: DemoStats) => {
    setStats(newStats);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dearlottery_demo_stats', JSON.stringify(newStats));
    }
  };

  // Find draw record matching the ticket's date & slot
  const findDrawForTicket = (ticket: DemoTicket) => {
    const slotNumber = ticket.slot.replace('PM', '');
    return initialDraws.find(d => 
      d.draw_date === ticket.date &&
      (d.draw_time?.includes(slotNumber) || d.id?.includes(ticket.slot))
    ) || null;
  };

  // Match evaluation for a ticket against official draw prizes
  const evaluateTicket = (ticket: DemoTicket) => {
    const draw = findDrawForTicket(ticket);
    const prizes: PrizeRecord = draw?.parsed_data?.prizes || draw?.prizes || {};
    const hasPrizes = Boolean(prizes.first_prize?.number && draw?.status !== 'UPCOMING' && draw?.status !== 'DRAWING');
    const status = getSlotStatus(ticket.date, ticket.slot, hasPrizes);

    if (status !== 'RESULT_OUT' || !hasPrizes) {
      return {
        status,
        isEvaluated: false,
        isWin: false,
        prizeTitle: status === 'DRAWING' 
          ? (lang === 'bn' ? 'ড্র চলছে...' : lang === 'hi' ? 'ड्रॉ चल रहा है...' : 'Drawing in progress...') 
          : (lang === 'bn' ? `আসন্ন ড্র (${ticket.slot})` : lang === 'hi' ? `आगामी ड्रा (${ticket.slot})` : `Awaiting ${ticket.slot} Draw`),
        prizeAmount: 0,
        matchDetails: ''
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
            isEvaluated: true,
            isWin: true,
            prizeTitle: lang === 'bn' ? '১ম পুরস্কার (১ কোটি টাকা)!' : lang === 'hi' ? 'पहला पुरस्कार (₹1 करोड़)!' : '1st Prize (₹1 Crore Winner)!',
            prizeAmount: 10000000,
            matchDetails: `Full 5-digit & Series match (${fSeries} ${fNum})`
          };
        } else {
          // Consolation Prize
          return {
            status: 'RESULT_OUT',
            isEvaluated: true,
            isWin: true,
            prizeTitle: lang === 'bn' ? 'সান্ত্বনা পুরস্কার (₹১,০০০)' : lang === 'hi' ? 'सांत्वना पुरस्कार (₹1,000)' : 'Consolation Prize (₹1,000)',
            prizeAmount: 1000,
            matchDetails: `5 digits matched ${fNum} with different series`
          };
        }
      }
    }

    // 2nd Prize check (₹9,000)
    if (prizes.second_prize && prizes.second_prize.some(n => n.trim() === tNum)) {
      return {
        status: 'RESULT_OUT',
        isEvaluated: true,
        isWin: true,
        prizeTitle: lang === 'bn' ? '২য় পুরস্কার (₹৯,০০০)' : lang === 'hi' ? 'दूसरा पुरस्कार (₹9,000)' : '2nd Prize (₹9,000)',
        prizeAmount: 9000,
        matchDetails: 'Full 5-digit match'
      };
    }

    // 3rd Prize check (₹450)
    const last4 = tNum.slice(-4);
    if (prizes.third_prize && prizes.third_prize.some(n => n.trim() === last4)) {
      return {
        status: 'RESULT_OUT',
        isEvaluated: true,
        isWin: true,
        prizeTitle: lang === 'bn' ? '৩য় পুরস্কার (₹৪৫০)' : lang === 'hi' ? 'तीसरा पुरस्कार (₹450)' : '3rd Prize (₹450)',
        prizeAmount: 450,
        matchDetails: `Last 4 digits matched: ${last4}`
      };
    }

    // 4th Prize check (₹250)
    if (prizes.fourth_prize && prizes.fourth_prize.some(n => n.trim() === last4)) {
      return {
        status: 'RESULT_OUT',
        isEvaluated: true,
        isWin: true,
        prizeTitle: lang === 'bn' ? '৪র্থ পুরস্কার (₹২৫০)' : lang === 'hi' ? 'चौथा पुरस्कार (₹250)' : '4th Prize (₹250)',
        prizeAmount: 250,
        matchDetails: `Last 4 digits matched: ${last4}`
      };
    }

    // 5th Prize check (₹120)
    if (prizes.fifth_prize && prizes.fifth_prize.some(n => n.trim() === last4)) {
      return {
        status: 'RESULT_OUT',
        isEvaluated: true,
        isWin: true,
        prizeTitle: lang === 'bn' ? '৫ম পুরস্কার (₹১২০)' : lang === 'hi' ? 'पांचवां पुरस्कार (₹120)' : '5th Prize (₹120)',
        prizeAmount: 120,
        matchDetails: `Last 4 digits matched: ${last4}`
      };
    }

    // Partial near miss: last 2 digits match first prize
    if (prizes.first_prize && tNum.slice(-2) === prizes.first_prize.number.trim().slice(-2)) {
      return {
        status: 'RESULT_OUT',
        isEvaluated: true,
        isWin: false,
        prizeTitle: lang === 'bn' ? 'খুব কাছাকাছি! শেষ ২ সংখ্যা মিলেছে' : lang === 'hi' ? 'बहुत करीब! अंतिम 2 अंक मिले' : 'Near Miss! Last 2 digits matched',
        prizeAmount: 0,
        matchDetails: `Last 2 digits (${tNum.slice(-2)}) matched 1st prize`
      };
    }

    return {
      status: 'RESULT_OUT',
      isEvaluated: true,
      isWin: false,
      prizeTitle: lang === 'bn' ? 'মেলেনি (পরবর্তী ড্র-তে চেষ্টা করুন)' : lang === 'hi' ? 'नहीं मिला (अगले ड्रॉ में प्रयास करें)' : 'No Match (Try Next Draw)',
      prizeAmount: 0,
      matchDetails: 'Better luck in next simulation'
    };
  };

  // Add ticket helper
  const addTicket = (series: string, number: string) => {
    setErrorMsg(null);
    const cleanNum = number.replace(/\D/g, '');

    if (cleanNum.length !== 5) {
      setErrorMsg(lang === 'bn' ? 'দয়া করে সঠিক ৫ ডিজিটের টিকিট নম্বর দিন।' : lang === 'hi' ? 'कृपया सही 5 अंकों का टिकट नंबर दर्ज करें।' : 'Please enter a valid 5-digit number.');
      return;
    }

    const cleanSeries = series.trim().toUpperCase() || '72B';

    // Prevent duplicate within the same slot and date
    const exists = myTickets.some(t => t.date === todayStr && t.slot === selectedSlot && t.number === cleanNum);
    if (exists) {
      setErrorMsg(lang === 'bn' ? 'এই টিকিটটি ইতিমধ্যে আপনার তালিকায় রয়েছে।' : lang === 'hi' ? 'यह टिकट पहले से आपकी सूची में है।' : 'This ticket is already in your pocket.');
      return;
    }

    // Limit to 6 active tickets per slot to prevent clutter
    const slotCount = myTickets.filter(t => t.date === todayStr && t.slot === selectedSlot).length;
    if (slotCount >= 6) {
      setErrorMsg(lang === 'bn' ? 'একটি ড্র-তে সর্বোচ্চ ৬টি ডেমো টিকিট নেওয়া যাবে।' : lang === 'hi' ? 'एक ड्रॉ में अधिकतम 6 डेमो टिकट लिए जा सकते हैं।' : 'Maximum 6 demo tickets allowed per slot.');
      return;
    }

    const newTicket: DemoTicket = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      series: cleanSeries,
      number: cleanNum,
      slot: selectedSlot,
      date: todayStr,
      createdAt: Date.now()
    };

    const nextTickets = [newTicket, ...myTickets];
    saveTickets(nextTickets);

    // Update simulation stats (simulated ₹6 cost per ticket)
    updateStats({
      ...stats,
      totalSimulated: stats.totalSimulated + 1,
      simulatedSpend: stats.simulatedSpend + 6
    });

    setManualNumber('');
    setManualSeries('');

    // Trigger celebration if it wins immediately (for declared past slot)
    const evalRes = evaluateTicket(newTicket);
    if (evalRes.isWin) {
      updateStats({
        ...stats,
        totalSimulated: stats.totalSimulated + 1,
        totalWins: stats.totalWins + 1,
        simulatedSpend: stats.simulatedSpend + 6,
        simulatedReturns: stats.simulatedReturns + evalRes.prizeAmount
      });
      triggerConfetti();
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  // Quick Action: Smart Trend Pick
  const handleSmartPick = () => {
    const s = slotTrends.seriesList[Math.floor(Math.random() * slotTrends.seriesList.length)];
    const m = slotTrends.middles[Math.floor(Math.random() * slotTrends.middles.length)];
    const end = slotTrends.endings[Math.floor(Math.random() * slotTrends.endings.length)];
    const leadDigit = String(Math.floor(Math.random() * 9) + 1);
    const num = `${leadDigit}${m}${end.slice(-2)}`;
    addTicket(s, num);
  };

  // Quick Action: Lucky Random Pick
  const handleLuckyPick = () => {
    const randomSeries = `${Math.floor(Math.random() * 80) + 10}${String.fromCharCode(65 + Math.floor(Math.random() * 12))}`;
    const randomNum = String(Math.floor(10000 + Math.random() * 90000));
    addTicket(randomSeries, randomNum);
  };

  // Manual Add Form Submit
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addTicket(manualSeries, manualNumber);
  };

  // Remove individual ticket
  const handleDeleteTicket = (id: string) => {
    const filtered = myTickets.filter(t => t.id !== id);
    saveTickets(filtered);
  };

  // Reset all stats
  const handleResetStats = () => {
    if (confirm(lang === 'bn' ? 'আপনি কি সব ডেমো স্কোর ও পরিসংখ্যান রিসেট করতে চান?' : 'Are you sure you want to reset your simulation statistics?')) {
      saveTickets([]);
      updateStats({
        totalSimulated: 0,
        totalWins: 0,
        simulatedSpend: 0,
        simulatedReturns: 0
      });
    }
  };

  // Filter tickets for currently selected slot and date
  const activeSlotTickets = myTickets.filter(t => t.date === todayStr && t.slot === selectedSlot);

  // Calculate live accuracy
  const accuracyPercent = stats.totalSimulated > 0 
    ? Math.round((stats.totalWins / stats.totalSimulated) * 100) 
    : 0;
  const netPnl = stats.simulatedReturns - stats.simulatedSpend;

  // WhatsApp share message
  const shareText = `🎯 *Dear Lottery Demo Play (ভার্চুয়াল পেপার টেস্ট)*\n📅 তারিখ: ${todayStr} • ${selectedSlot}\n\n📊 আমার সিমুলেশন স্কোর:\n• মোট টেস্ট টিকিট: ${stats.totalSimulated}\n• ম্যাচ / জয়: ${stats.totalWins} (সফলতা ${accuracyPercent}%)\n• ভার্চুয়াল প্রফিট/লসের হিসাব: ${netPnl >= 0 ? '+' : ''}${formatINR(netPnl)}\n\n👉 আপনিও আপনার টার্গেট নম্বর বিনামূল্যে টেস্ট করুন:\nhttps://dearresultlive.in/demo`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="space-y-4 max-w-[620px] mx-auto text-slate-800">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
            <span>🎮</span>
            <span>{lang === 'bn' ? 'ভার্চুয়াল পেপার টিকিট' : lang === 'hi' ? 'वर्चुअल पेपर लॉटरी' : '100% Free Paper Simulation'}</span>
          </span>
          <span className="text-[10px] text-blue-300 font-bold bg-white/10 px-2 py-0.5 rounded-lg">
            {todayStr.split('-').reverse().join('/')}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          {lang === 'bn' 
            ? 'ডিয়ার লটারি ডেমো প্লে ও প্র্যাকটিস' 
            : lang === 'hi' 
            ? 'डियर लॉटरी डेमो प्ले एवं प्रैक्टिस' 
            : 'Dear Lottery Demo & Paper Play'}
        </h1>
        <p className="text-xs sm:text-sm text-blue-100/90 mt-1 leading-relaxed">
          {lang === 'bn'
            ? 'কাউন্টারে আসল টাকা দিয়ে টিকিট কাটার আগে এখানে বিনামূল্যে আপনার নম্বর প্রেডিকশন টেস্ট করুন। দেখুন আপনার টার্গেটের হিট রেট কত!'
            : lang === 'hi'
            ? 'काउंटर पर असली पैसे लगाने से पहले यहां मुफ्त में अपने नंबरों का अनुमान टेस्ट करें। जानें आपकी सटीकता कितनी है!'
            : 'Practice your number predictions for free before buying physical tickets. Test your hit rate with real-time draw verification!'}
        </p>
      </div>

      {/* 2. Personal Performance & Accuracy Stats Cards */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">
            {lang === 'bn' ? 'মোট টিকিট' : 'Tickets'}
          </span>
          <span className="font-mono text-base sm:text-lg font-black text-slate-900">
            {stats.totalSimulated}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">
            {lang === 'bn' ? 'ম্যাচ/জয়' : 'Matches'}
          </span>
          <span className="font-mono text-base sm:text-lg font-black text-emerald-600">
            {stats.totalWins}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">
            {lang === 'bn' ? 'সফলতা' : 'Accuracy'}
          </span>
          <span className="font-mono text-base sm:text-lg font-black text-blue-700">
            {accuracyPercent}%
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">
            {lang === 'bn' ? 'ভার্চুয়াল P/L' : 'Demo P/L'}
          </span>
          <span className={`font-mono text-base sm:text-lg font-black ${netPnl >= 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
            {netPnl >= 0 ? `+${formatINR(netPnl)}` : `-${formatINR(Math.abs(netPnl))}`}
          </span>
        </div>
      </div>

      {/* 3. Slot Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <span>⏰</span>
            <span>{lang === 'bn' ? 'ড্র টাইম সিলেক্ট করুন:' : lang === 'hi' ? 'ड्रॉ समय चुनें:' : 'Select Draw Time:'}</span>
          </span>
          <span className="text-[11px] font-bold text-blue-700">
            {activeSlotTickets.length}/6 {lang === 'bn' ? 'টি টিকিট অ্যাক্টিভ' : 'Active'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['1PM', '6PM', '8PM'] as const).map(slot => {
            const isSelected = selectedSlot === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => { setSelectedSlot(slot); setErrorMsg(null); }}
                className={`py-2 px-2 rounded-xl text-center font-black transition-all ${
                  isSelected
                    ? 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-600 scale-[1.01]'
                    : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700'
                }`}
              >
                <div className="text-sm sm:text-base leading-tight">
                  {slot === '1PM' ? '1:00 PM' : slot === '6PM' ? '6:00 PM' : '8:00 PM'}
                </div>
                <div className={`text-[9px] sm:text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  {slot === '1PM' ? 'Morning' : slot === '6PM' ? 'Day' : 'Night'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Ticket Picker & Generator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <span>🎟️</span>
            <span>{lang === 'bn' ? 'ভার্চুয়াল টিকিট যোগ করুন' : lang === 'hi' ? 'वर्चुअल टिकट जोड़ें' : 'Add Simulated Ticket'}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
            ₹6 / {lang === 'bn' ? 'টিকিট (সিমুলেটেড)' : 'ticket (simulated)'}
          </span>
        </div>

        {/* 1-Click Quick Picks */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleSmartPick}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-2xs transition-all active:scale-95"
          >
            <span>🔥</span>
            <span>{lang === 'bn' ? 'স্মার্ট ট্রেন্ড পিক' : lang === 'hi' ? 'स्मार्ट ट्रेंड पिक' : 'Smart Trend Pick'}</span>
          </button>

          <button
            type="button"
            onClick={handleLuckyPick}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-2xs transition-all active:scale-95"
          >
            <span>🎲</span>
            <span>{lang === 'bn' ? 'লাকি র‍্যান্ডম পিক' : lang === 'hi' ? 'लकी रैंडम पिक' : 'Lucky Random Pick'}</span>
          </button>
        </div>

        {/* Manual Input Form */}
        <form onSubmit={handleManualAdd} className="space-y-2 pt-1">
          <div className="text-[11px] font-bold text-slate-600">
            {lang === 'bn' ? 'অথবা আপনার পছন্দের নম্বর টাইপ করুন:' : lang === 'hi' ? 'या अपनी पसंद का नंबर टाइप करें:' : 'Or enter custom ticket numbers:'}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="72B"
              maxLength={4}
              value={manualSeries}
              onChange={e => setManualSeries(e.target.value.toUpperCase())}
              className="w-20 text-center font-mono font-black text-sm uppercase bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
            />
            <input
              type="text"
              placeholder="28192 (5 digits)"
              maxLength={5}
              value={manualNumber}
              onChange={e => setManualNumber(e.target.value.replace(/\D/g, ''))}
              className="flex-1 font-mono font-black text-base tracking-widest bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none text-center"
            />
            <button
              type="submit"
              className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95 flex-shrink-0"
            >
              {lang === 'bn' ? 'যোগ করুন' : lang === 'hi' ? 'जोड़ें' : 'Add'}
            </button>
          </div>

          {errorMsg && (
            <div className="text-[11px] text-red-600 font-bold bg-red-50 border border-red-200 rounded-lg p-2">
              ⚠️ {errorMsg}
            </div>
          )}
        </form>
      </div>

      {/* 5. "My Virtual Pocket" - Active Simulated Tickets List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <span>👛</span>
            <span>
              {lang === 'bn' 
                ? `আমার ভার্চুয়াল টিকিট (${selectedSlot} ড্র)` 
                : lang === 'hi' 
                ? `मेरे वर्चुअल टिकट (${selectedSlot} ड्रॉ)` 
                : `My Simulated Tickets (${selectedSlot})`}
            </span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {activeSlotTickets.length}
            </span>
          </h2>

          {activeSlotTickets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const rest = myTickets.filter(t => !(t.date === todayStr && t.slot === selectedSlot));
                saveTickets(rest);
              }}
              className="text-[11px] font-bold text-red-600 hover:underline"
            >
              {lang === 'bn' ? 'এই ড্র ক্লিয়ার করুন' : 'Clear slot'}
            </button>
          )}
        </div>

        {activeSlotTickets.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2">
            <span className="text-3xl block">🎟️</span>
            <p className="text-xs font-bold text-slate-600">
              {lang === 'bn'
                ? `আপনার কাছে এখনও ${selectedSlot} ড্র-এর কোনো ভার্চুয়াল টিকিট নেই।`
                : lang === 'hi'
                ? `आपके पास अभी ${selectedSlot} ड्रॉ का कोई वर्चुअल टिकट नहीं है।`
                : `No active simulated tickets for ${selectedSlot} draw yet.`}
            </p>
            <p className="text-[11px] text-slate-400">
              {lang === 'bn'
                ? 'উপরের "স্মার্ট ট্রেন্ড পিক" বা "লাকি পিক" বাটনে ক্লিক করে টিকিট যোগ করুন!'
                : 'Tap "Smart Trend Pick" or "Lucky Random Pick" above to simulate your tickets!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeSlotTickets.map((ticket, index) => {
              const evalRes = evaluateTicket(ticket);
              return (
                <div
                  key={ticket.id}
                  className={`border rounded-2xl p-3 sm:p-3.5 transition-all shadow-2xs relative ${
                    evalRes.isWin
                      ? 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-emerald-400 ring-2 ring-emerald-500/30'
                      : evalRes.status === 'DRAWING'
                      ? 'bg-red-50/60 border-red-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    
                    {/* Ticket Representation Badge */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs sm:text-sm bg-slate-900 text-amber-400 px-2 py-1 rounded-lg shadow-2xs">
                        {ticket.series}
                      </span>
                      <span className="font-mono font-black text-xl sm:text-2xl tracking-widest text-slate-900">
                        {ticket.number}
                      </span>
                    </div>

                    {/* Result Status / Delete */}
                    <div className="flex items-center gap-2">
                      {evalRes.isWin ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-2xs animate-bounce">
                          <span>🎉</span>
                          <span>{formatINR(evalRes.prizeAmount)}</span>
                        </span>
                      ) : evalRes.status === 'DRAWING' ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                          <span>{lang === 'bn' ? 'ড্র চলছে...' : 'Drawing...'}</span>
                        </span>
                      ) : evalRes.status === 'UPCOMING' ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <span>⏳</span>
                          <span>{lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">
                          {lang === 'bn' ? 'মেলেনি' : 'No match'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="text-slate-400 hover:text-red-600 text-xs p-1"
                        title="Delete ticket"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Evaluation Message */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className={`font-black ${evalRes.isWin ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {evalRes.prizeTitle}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {ticket.slot} • {ticket.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. WhatsApp Share & Reset Actions */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 text-center"
        >
          <span>💬</span>
          <span>{lang === 'bn' ? 'স্কোর হোয়াটসঅ্যাপে শেয়ার করুন' : lang === 'hi' ? 'स्कोर व्हाट्सएप पर शेयर करें' : 'Share Score on WhatsApp'}</span>
        </a>

        {stats.totalSimulated > 0 && (
          <button
            type="button"
            onClick={handleResetStats}
            className="text-slate-500 hover:text-red-700 font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 transition-colors"
          >
            {lang === 'bn' ? 'রিসেট' : 'Reset'}
          </button>
        )}
      </div>

      {/* 7. Responsible Play & Educational Disclaimer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[11px] text-slate-600 leading-relaxed space-y-1">
        <div className="font-black text-slate-800 flex items-center gap-1">
          <span>ℹ️</span>
          <span>{lang === 'bn' ? 'ডেমো প্লে সংক্রান্ত তথ্য ও নিয়মাবলী:' : 'Demo Simulator Disclaimer:'}</span>
        </div>
        <p>
          {lang === 'bn'
            ? 'এটি একটি সম্পূর্ণ ফ্রি শিক্ষামূলক ডেমো ও পেপার সিমুলেটর। এখানে কোনো বাস্তব আর্থিক লেনদেন, আমানত বা আসল টাকা জেতার সুযোগ নেই। লটারি ড্র সবসময় সম্পূর্ণ এলোমেলো ও ভাগ্যের বিষয়।'
            : 'This is a strictly free educational simulator for statistical practice and paper analysis. There are no real monetary deposits, withdrawals, or prizes. All lottery draws are independent and random.'}
        </p>
      </div>

    </div>
  );
}
