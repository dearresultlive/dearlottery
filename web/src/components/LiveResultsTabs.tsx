import React, { useState, useEffect, useMemo } from 'react';
import {
  formatINR,
  getISTNow,
  getISTDateString,
  getSlotStatus,
  getSlotCountdown
} from '../lib/lottery-utils';
import { useLanguage } from '../lib/i18n';
import HistoricalIntelligenceCard from './HistoricalIntelligenceCard';
import { analyzeNumberHistory, getTopRecurringNumbers } from '../lib/history-analytics';

interface PrizeData {
  first_prize?: { series: string; number: string };
  consolation_prize_amount?: number;
  second_prize?: string[];
  third_prize?: string[];
  fourth_prize?: string[];
  fifth_prize?: string[];
}

interface DrawRecord {
  id: string;
  draw_date: string;
  draw_time: string;
  draw_name: string;
  draw_number?: string;
  status?: string;
  source_url?: string;
  pdf_r2_url?: string;
  image_r2_url?: string;
  parsed_data?: {
    status?: string;
    prizes?: PrizeData;
    source_url?: string;
    pdf_r2_url?: string;
    image_r2_url?: string;
  };
  prizes?: PrizeData;
}

interface LiveResultsTabsProps {
  draws?: DrawRecord[];
  yesterdayDraws?: DrawRecord[];
  todayDateStr?: string;
  isYesterdayPage?: boolean;
  initialSlot?: '1PM' | '6PM' | '8PM';
}

export default function LiveResultsTabs({
  draws = [],
  yesterdayDraws = [],
  todayDateStr,
  isYesterdayPage = false,
  initialSlot
}: LiveResultsTabsProps) {
  const slots = [
    { key: '1PM' as const, time: '1:00 PM', labelEn: 'Morning', labelBn: 'দুপুর ১:০০', labelHi: 'दोपहर 1:00', icon: '☀️' },
    { key: '6PM' as const, time: '6:00 PM', labelEn: 'Day', labelBn: 'সন্ধ্যা ৬:০০', labelHi: 'शाम 6:00', icon: '🌅' },
    { key: '8PM' as const, time: '8:00 PM', labelEn: 'Night', labelBn: 'রাত ৮:০০', labelHi: 'रात 8:00', icon: '🌙' }
  ];

  const todayStr = todayDateStr || getISTDateString();
  const { lang, t } = useLanguage();
  const [activeDateStr, setActiveDateStr] = useState<string>(
    todayDateStr || getISTDateString()
  );
  const [activeSlot, setActiveSlot] = useState<'1PM' | '6PM' | '8PM'>(
    initialSlot || (isYesterdayPage ? '8PM' : '1PM')
  );
  const [drawsList, setDrawsList] = useState<DrawRecord[]>(draws);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [showTextTables, setShowTextTables] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [slotCountdown, setSlotCountdown] = useState(getSlotCountdown('1PM'));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSlotSelect = (slotKey: '1PM' | '6PM' | '8PM') => {
    setActiveSlot(slotKey);
    if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      (navigator as any).vibrate(10);
    }
  };

  useEffect(() => {
    setDrawsList(draws);
  }, [draws]);

  // Update countdown every second for active upcoming slot
  useEffect(() => {
    const update = () => setSlotCountdown(getSlotCountdown(activeSlot));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [activeSlot]);

  // Check if today has any published results
  const hasTodayResults = drawsList.some(d => 
    d.draw_date === todayStr && 
    Boolean(d.parsed_data?.prizes?.first_prize?.number || d.prizes?.first_prize?.number)
  );

  // Yesterday date resolution
  const yesterdayDateStr = (yesterdayDraws && yesterdayDraws[0]?.draw_date) || (() => {
    const y = new Date(getISTNow());
    y.setDate(y.getDate() - 1);
    return getISTDateString(y);
  })();

  // Auto-detect Morning mode: before 1PM, if today has no results yet, default to Last Night 8PM!
  useEffect(() => {
    if (initialSlot) {
      if (todayDateStr) setActiveDateStr(todayDateStr);
      setActiveSlot(initialSlot);
      return;
    }
    if (isYesterdayPage) {
      if (todayDateStr) setActiveDateStr(todayDateStr);
      setActiveSlot('8PM');
      return;
    }
    const istNow = getISTNow();
    const hour = istNow.getHours();
    if (!hasTodayResults && hour < 13) {
      setActiveDateStr(yesterdayDateStr);
      setActiveSlot('8PM');
    } else if (hour >= 20) {
      setActiveDateStr(todayStr);
      setActiveSlot('8PM');
    } else if (hour >= 18) {
      setActiveDateStr(todayStr);
      setActiveSlot('6PM');
    } else {
      setActiveDateStr(todayStr);
      setActiveSlot('1PM');
    }
  }, [hasTodayResults, isYesterdayPage, initialSlot, todayDateStr, yesterdayDateStr, todayStr]);

  // Listen for auto-polling zero-refresh event from DrawCountdown
  useEffect(() => {
    const handleNewResult = (e: any) => {
      if (e.detail) {
        const newDraw = e.detail;
        setDrawsList(prev => {
          const index = prev.findIndex(d => d.id === newDraw.id);
          if (index >= 0) {
            const nextList = [...prev];
            nextList[index] = newDraw;
            return nextList;
          }
          return [newDraw, ...prev];
        });

        setActiveDateStr(todayStr);
        if (newDraw.draw_time?.includes('6') || newDraw.id?.includes('6PM')) {
          setActiveSlot('6PM');
        } else if (newDraw.draw_time?.includes('8') || newDraw.id?.includes('8PM')) {
          setActiveSlot('8PM');
        } else {
          setActiveSlot('1PM');
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('dearlottery:new_result', handleNewResult);
      return () => window.removeEventListener('dearlottery:new_result', handleNewResult);
    }
  }, [todayStr]);

  // Master pool of all known draws (initial props + client-fetched history)
  const allKnownDraws = useMemo(() => {
    const map = new Map<string, DrawRecord>();
    [...(yesterdayDraws || []), ...(draws || []), ...drawsList].forEach(d => {
      if (d) {
        const key = d.id || `${d.draw_date}-${d.draw_time}`;
        map.set(key, d);
      }
    });
    return Array.from(map.values());
  }, [yesterdayDraws, draws, drawsList]);

  const isToday = activeDateStr === todayStr;
  const isYesterday = activeDateStr === yesterdayDateStr;
  const isPastDate = !isToday && !isYesterday;

  // 7-day past dates list with full dd/mm/yyyy format (Today • DD/MM/YYYY, Yesterday • DD/MM/YYYY, DD/MM/YYYY (Day))
  const pastDatesList = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const baseDate = new Date(getISTNow());
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const iso = getISTDateString(d);
      const dayShort = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const ddmmyyyy = `${dd}/${mm}/${yyyy}`;
      let label = `${ddmmyyyy} (${dayShort})`;
      if (i === 0) {
        label = lang === 'bn' ? `আজ • ${ddmmyyyy}` : lang === 'hi' ? `आज • ${ddmmyyyy}` : `Today • ${ddmmyyyy}`;
      } else if (i === 1) {
        label = lang === 'bn' ? `গতকাল • ${ddmmyyyy}` : lang === 'hi' ? `कल • ${ddmmyyyy}` : `Yesterday • ${ddmmyyyy}`;
      }
      list.push({ value: iso, label });
    }
    return list;
  }, [lang]);

  // Find Yesterday's 8:00 PM Draw specifically (for morning check)
  const yesterday8pmDraw = (yesterdayDraws || []).find(d => 
    d.draw_time?.includes('8') || d.id?.includes('8PM')
  );
  const yesterday8pmPrize = yesterday8pmDraw?.parsed_data?.prizes?.first_prize || yesterday8pmDraw?.prizes?.first_prize;

  // Find active draw matching activeDateStr and activeSlot
  const currentSlotNumber = activeSlot.replace('PM', '');
  const currentDraw = useMemo(() => {
    return allKnownDraws.find(d => 
      d.draw_date === activeDateStr &&
      (d.draw_time?.includes(currentSlotNumber) || d.id?.includes(activeSlot))
    ) || allKnownDraws.find(d => d.draw_date === activeDateStr) || null;
  }, [allKnownDraws, activeDateStr, activeSlot, currentSlotNumber]);

  const prizesData: PrizeData = currentDraw?.parsed_data?.prizes || currentDraw?.prizes || {};
  const hasPrizes = Boolean(
    prizesData.first_prize?.number &&
    currentDraw?.status !== 'UPCOMING' &&
    currentDraw?.status !== 'DRAWING'
  );

  const activeStatus = isToday
    ? getSlotStatus(todayStr, activeSlot, hasPrizes)
    : (hasPrizes ? 'RESULT_OUT' : (isSyncing ? 'DRAWING' : 'RESULT_OUT'));

  // Autonomous live polling when active slot is in DRAWING state (Zero-refresh live reveal)
  useEffect(() => {
    if (activeStatus !== 'DRAWING') return;

    let isPolling = true;

    const pollLiveResult = async () => {
      try {
        const res = await fetch(`/api/results/latest?slot=${activeSlot}&t=${Date.now()}`, {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        if (res.ok && isPolling) {
          const data = await res.json();
          const draws = data.draws || [];
          const slotNumber = activeSlot.replace('PM', '');
          const matching = draws.find((d: any) => 
            d.draw_date === activeDateStr &&
            (d.draw_time?.includes(slotNumber) || d.id?.includes(activeSlot))
          );
          if (matching && (matching.parsed_data?.prizes?.first_prize?.number || matching.prizes?.first_prize?.number)) {
            setDrawsList(prev => {
              const idx = prev.findIndex(d => d.id === matching.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = matching;
                return next;
              }
              return [matching, ...prev];
            });
          }
        }
      } catch (err) {
        // Silently retry next cycle
      }
    };

    pollLiveResult();
    const interval = setInterval(pollLiveResult, 5000);

    return () => {
      isPolling = false;
      clearInterval(interval);
    };
  }, [activeStatus, activeSlot, activeDateStr]);

  const declaredPrizes: PrizeData = hasPrizes ? prizesData : {};
  const firstPrize = declaredPrizes.first_prize || { series: '', number: '' };
  const secondPrizes = declaredPrizes.second_prize || [];
  const thirdPrizes = declaredPrizes.third_prize || [];
  const fourthPrizes = declaredPrizes.fourth_prize || [];
  const fifthPrizes = declaredPrizes.fifth_prize || [];

  const firstPrizeHistory = useMemo(() => {
    if (!firstPrize.number) return null;
    return analyzeNumberHistory(firstPrize.number, activeDateStr);
  }, [firstPrize.number, activeDateStr]);

  const pdfUrl = `/pdf/${activeDateStr}/${activeSlot.toLowerCase()}.pdf`;
  const sheetSvgUrl = `/api/gazette-sheet.svg?date=${activeDateStr}&slot=${activeSlot.toLowerCase()}`;
  const activeSheetUrl = hasPrizes
    ? (currentDraw?.image_r2_url || `/results/${activeDateStr}/${activeSlot.toLowerCase()}.jpg`)
    : sheetSvgUrl;

  const dateLabel = isToday
    ? (lang === 'bn' ? 'আজকের' : 'Today')
    : isYesterday
    ? (lang === 'bn' ? 'গতকালকের' : 'Yesterday')
    : activeDateStr.split('-').reverse().join('/');

  const shareTargetUrl = `https://dearresultlive.in/results/${activeDateStr}/${activeSlot.toLowerCase()}`;
  const whatsappShareText = `🎯 *Dear Lottery Result (${dateLabel} ${currentDraw?.draw_time || activeSlot})*\n📅 তারিখ: ${activeDateStr}\n\n🏆 *১ম পুরস্কার (₹1 Crore Winner)*: *${firstPrize.series} ${firstPrize.number}*\n\n👉 সম্পূর্ণ অফিসিয়াল রেজাল্ট শিট ও সব প্রাইজ নম্বর দেখুন:\n${shareTargetUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareTargetUrl)}&text=${encodeURIComponent(`🎯 Dear Lottery Result (${dateLabel} ${currentDraw?.draw_time || activeSlot}) | 1st Prize ₹1 Crore: ${firstPrize.series} ${firstPrize.number}`)}`;

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Dear Lottery Result (${activeSlot})`,
          text: whatsappShareText,
          url: shareTargetUrl,
        });
        return;
      } catch (err) {
        return;
      }
    }
    window.open(whatsappUrl, '_blank');
  };

  const openImageLightbox = (url: string) => {
    setSelectedImageUrl(url);
    setZoomScale(1);
    setShowImageModal(true);
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.3, 1));
  const handleResetZoom = () => setZoomScale(1);

  const currentSlotInfo = slots.find(s => s.key === activeSlot) || slots[0];
  const hasActiveDateInList = pastDatesList.some(item => item.value === activeDateStr);

  const handleDateChange = async (selectedValue: string) => {
    if (selectedValue === 'MORE') {
      window.location.href = '/old-results';
      return;
    }

    setActiveDateStr(selectedValue);

    // Update browser URL query without full page reload for shareability
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      if (selectedValue === todayStr) {
        url.searchParams.delete('date');
      } else {
        url.searchParams.set('date', selectedValue);
      }
      window.history.replaceState({}, '', url.toString());
    }

    // Check if we already have draws for this date in memory
    const alreadyLoaded = allKnownDraws.some(d => 
      d.draw_date === selectedValue &&
      Boolean(d.parsed_data?.prizes?.first_prize?.number || d.prizes?.first_prize?.number)
    );

    if (!alreadyLoaded) {
      setIsSyncing(true);
      try {
        const res = await fetch(`/api/results/date/${selectedValue}`);
        if (res.ok) {
          const data = await res.json();
          if (data.draws && data.draws.length > 0) {
            setDrawsList(prev => {
              const next = [...prev];
              data.draws.forEach((nd: DrawRecord) => {
                const idx = next.findIndex(d => d.id === nd.id);
                if (idx >= 0) next[idx] = nd;
                else next.push(nd);
              });
              return next;
            });
          }
        }
      } catch (err) {
        console.error('Failed to load draws for date:', selectedValue, err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Check URL query on mount for direct link handling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qDate = params.get('date');
      if (qDate && qDate !== todayStr && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) {
        handleDateChange(qDate);
      }
    }
  }, []);

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-[557px] mx-auto">
      


      {/* Yesterday Mode Notice Banner */}
      {isYesterday && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs flex items-center justify-between text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base flex-shrink-0">🌙</span>
            <div>
              <span className="font-black text-slate-900 block leading-tight">
                {lang === 'bn' 
                  ? `গতকালকের (${yesterdayDateStr.split('-').reverse().join('/')}) ${currentSlotInfo.time} ফলাফল শিট`
                  : lang === 'hi'
                  ? `कल (${yesterdayDateStr.split('-').reverse().join('/')}) ${currentSlotInfo.time} परिणाम शीट`
                  : `Yesterday's (${yesterdayDateStr}) ${currentSlotInfo.time} Official Gazette Result`}
              </span>
              <span className="text-[10px] text-emerald-800 font-medium block">
                {lang === 'bn'
                  ? `আজকের ১:০০ দুপুর ড্র শুরু হতে বাকি: ${slotCountdown.hours}ঘণ্টা ${slotCountdown.minutes}মিনিট`
                  : lang === 'hi'
                  ? `आज का दोपहर 1:00 बजे का ड्रॉ शुरू होने में शेष: ${slotCountdown.hours}घंटे ${slotCountdown.minutes}मिनट`
                  : `Next draw today at 1:00 PM (starts in ${slotCountdown.hours}h ${slotCountdown.minutes}m)`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDateChange(todayStr)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs ml-2 flex-shrink-0 active:scale-95 transition-all"
          >
            {lang === 'bn' ? 'আজকের ড্র ➔' : lang === 'hi' ? 'आज का ड्रॉ ➔' : "Today's Draw ➔"}
          </button>
        </div>
      )}

      {/* Historical Archive Notice Banner */}
      {isPastDate && (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-2.5 text-xs flex items-center justify-between text-blue-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base flex-shrink-0">📜</span>
            <div>
              <span className="font-black text-slate-900 block leading-tight">
                {lang === 'bn' 
                  ? `পুরনো গেজেট রেকর্ড (${activeDateStr.split('-').reverse().join('/')}) • ${currentSlotInfo.time} ফলাফল`
                  : lang === 'hi'
                  ? `पुराना आधिकारिक रिकॉर्ड (${activeDateStr.split('-').reverse().join('/')}) • ${currentSlotInfo.time} परिणाम`
                  : `Official Gazette Archive (${activeDateStr}) • ${currentSlotInfo.time} Result`}
              </span>
              <span className="text-[10px] text-blue-800 font-medium block">
                {lang === 'bn'
                  ? 'নাগাল্যান্ড ও সিকিম রাজ্য লটারির ঐতিহাসিক ড্র ফলাফল'
                  : lang === 'hi'
                  ? 'नागालैंड और सिक्किम राज्य लॉटरी का ऐतिहासिक ड्रॉ परिणाम'
                  : 'Historical draw records for Nagaland & Sikkim State Lotteries'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDateChange(todayStr)}
            className="bg-blue-700 hover:bg-blue-800 text-white font-black text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs ml-2 flex-shrink-0 active:scale-95 transition-all"
          >
            {lang === 'bn' ? 'আজকের ড্র ➔' : lang === 'hi' ? 'आज का ड्रॉ ➔' : "Today's Draw ➔"}
          </button>
        </div>
      )}

      {/* 1. Lottery Sambad Style Big Slot Buttons */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {slots.map(slot => {
          const isActive = activeSlot === slot.key;
          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => handleSlotSelect(slot.key)}
              className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-[#138808] text-white font-black shadow-md ring-2 ring-[#138808]/40 scale-[1.01]'
                  : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800'
              }`}
            >
              <span className="text-base sm:text-lg font-black tracking-tight">
                {slot.time}
              </span>
              <span className={`text-[10px] sm:text-xs font-bold mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                {lang === 'bn' ? slot.labelBn : lang === 'hi' ? slot.labelHi : slot.labelEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Lottery Sambad Winning Result Card (.rcard) */}
      {activeStatus === 'RESULT_OUT' ? (
        <div
          onClick={() => openImageLightbox(activeSheetUrl)}
            className={`cursor-pointer relative overflow-hidden rounded-2xl border p-4 sm:p-5 text-center transition-all hover:shadow-md ${
              activeSlot === '1PM'
                ? 'bg-[#e9f5db] border-emerald-300'
                : activeSlot === '6PM'
                ? 'bg-[#e3eefb] border-blue-300'
                : 'bg-[#fbe8e8] border-red-300'
            }`}
          >
            {/* Vertical Side Band */}
            <div
              className={`absolute top-0 right-0 bottom-0 w-8 sm:w-10 flex items-center justify-center overflow-hidden ${
                activeSlot === '1PM'
                  ? 'bg-[#16a34a] text-[#ffdd00]'
                  : activeSlot === '6PM'
                  ? 'bg-[#f5c518] text-[#dc2626]'
                  : 'bg-[#dc2626] text-[#ffdd00]'
              }`}
            >
              <span className="font-black text-xs sm:text-sm tracking-wider uppercase -rotate-90 whitespace-nowrap">
                DEAR {activeSlot.replace('PM', ' PM')}
              </span>
            </div>

            <div className="pr-8 sm:pr-10">
              {/* Top Date Header */}
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-[#e93323] text-white font-extrabold text-xs px-2.5 py-0.5 rounded-md shadow-2xs">
                    {activeDateStr.split('-').reverse().join('/')}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    isYesterday
                      ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                      : isPastDate
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {isYesterday
                      ? (activeSlot === '8PM'
                          ? (lang === 'bn' ? 'গতরাতের ৮টা' : lang === 'hi' ? 'कल रात 8 बजे' : 'LAST NIGHT 8PM')
                          : (lang === 'bn' ? 'গতকাল' : lang === 'hi' ? 'कल' : 'YESTERDAY'))
                      : isPastDate
                      ? (lang === 'bn' ? 'পুরনো রেকর্ড' : lang === 'hi' ? 'पुराना रिकॉर्ड' : 'ARCHIVE')
                      : (lang === 'bn' ? 'আজকের' : lang === 'hi' ? 'आज' : 'TODAY')}
                  </span>
                </div>
                <span className="text-xs text-slate-600 font-bold truncate">
                  {currentDraw?.draw_name || 'DEAR LOTTERY'} • #{currentDraw?.draw_number || '74'}
                </span>
              </div>

              {/* Massive 1st Prize Number */}
              <div className="py-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-0.5">
                  {lang === 'bn' ? '১ম পুরস্কার • 1st Prize ₹1 Crore Winner' : lang === 'hi' ? 'प्रथम पुरस्कार • 1st Prize ₹1 Crore Winner' : '1st Prize • ₹1 Crore Winner'}
                </span>
                <div className={`first-prize-num font-mono font-black text-4xl sm:text-6xl tracking-widest ${
                  activeSlot === '1PM' ? 'text-[#2c65c5]' : activeSlot === '6PM' ? 'text-[#dc2626]' : 'text-[#32733b]'
                }`}>
                  {firstPrize.series} {firstPrize.number}
                </div>
                <span className="sr-only speakable-summary">
                  Dear Lottery {activeSlot} 1st prize 1 crore winning ticket number is {firstPrize.series} {firstPrize.number} for draw date {activeDateStr}.
                </span>
              </div>

              {/* Consolation info */}
              <div className="text-[11px] font-bold text-slate-500">
                {lang === 'bn'
                  ? `সান্ত্বনা পুরস্কার: ₹১,০০০ • ${firstPrize.number} অন্য সব সিরিজ`
                  : lang === 'hi'
                  ? `सांत्वना पुरस्कार: ₹1,000 • ${firstPrize.number} अन्य सभी सीरीज`
                  : `Consolation Prize: ₹1,000 • ${firstPrize.number} Remaining Series`}
              </div>

            </div>
          </div>
      ) : activeStatus === 'DRAWING' ? (
        <div className="bg-white border-2 border-red-300 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <div className="inline-flex items-center gap-2 bg-red-100 border border-red-300 text-red-800 px-3 py-1 rounded-full text-xs font-black animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            {lang === 'bn' ? 'ড্র চলছে • DRAW IN PROGRESS' : lang === 'hi' ? 'ड्रा प्रगति पर है • DRAW IN PROGRESS' : 'DRAW IN PROGRESS'}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">
            {lang === 'bn' ? `${currentSlotInfo.time} রেজাল্ট শিট আপলোড হচ্ছে` : lang === 'hi' ? `${currentSlotInfo.time} रिजल्ट शीट अपलोड हो रही है` : `${currentSlotInfo.time} Result Sheet Uploading`}
          </h3>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? 'সরকারি ডিরেক্টরেট শিট স্ক্যান সম্পন্ন হচ্ছে। কয়েক সেকেন্ডের মধ্যে নম্বর প্রদর্শিত হবে।'
              : lang === 'hi'
              ? 'सरकारी निदेशालय शीट स्कैन हो रही है। कुछ ही पलों में नंबर दिखाई देंगे।'
              : 'Official Directorate result sheet scanning in progress. Winning numbers will appear momentarily.'}
          </p>
        </div>
      ) : (
        /* UPCOMING PENDING CARD */
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-slate-200 text-slate-800 text-xs font-black px-3 py-1 rounded-full">
            <span>⏰</span>
            <span>{lang === 'bn' ? `আসন্ন ড্র • UPCOMING DRAW (${currentSlotInfo.time})` : lang === 'hi' ? `आगामी ड्रा • UPCOMING DRAW (${currentSlotInfo.time})` : `UPCOMING DRAW (${currentSlotInfo.time})`}</span>
          </div>
          <div className="font-mono text-3xl font-black text-slate-900">
            {String(slotCountdown.hours).padStart(2, '0')}h : {String(slotCountdown.minutes).padStart(2, '0')}m : {String(slotCountdown.seconds).padStart(2, '0')}s
          </div>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? `আজকের ${currentSlotInfo.time} ড্র সম্পন্ন হওয়ার পর অফিশিয়াল গেজেট রেজাল্ট প্রকাশিত হবে।`
              : lang === 'hi'
              ? `आज के ${currentSlotInfo.time} ड्रा पूरा होने के बाद आधिकारिक गजट रिजल्ट घोषित होगा।`
              : `Official gazette result will be declared immediately following today's ${currentSlotInfo.time} draw.`}
          </p>
          {/* Interactive Quick View for Last Night 8:00 PM */}
          {yesterday8pmPrize?.number && (
            <div className="mt-3 pt-3 border-t border-slate-200 bg-amber-50/80 border border-amber-300 rounded-xl p-3 text-left flex items-center justify-between gap-3 shadow-2xs">
              <div>
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                  {lang === 'bn' ? '🌙 গতরাতের ৮:০০ নাইট ড্র বিজয়ী নম্বর:' : lang === 'hi' ? '🌙 कल रात 8 बजे नाइट ड्रॉ विजेता:' : '🌙 Last Night 8:00 PM Winner:'}
                </span>
                <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                  {yesterday8pmPrize.series} {yesterday8pmPrize.number}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {lang === 'bn' ? '১ম পুরস্কার ₹১ কোটি • অফিসিয়াল গেজেট' : lang === 'hi' ? 'प्रथम पुरस्कार ₹1 करोड़ • आधिकारिक गजट' : '1st Prize ₹1 Crore • Official Gazette'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setDateMode('YESTERDAY'); setActiveSlot('8PM'); }}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-black px-3 py-2 rounded-xl shadow-xs transition-all flex-shrink-0 flex items-center gap-1"
              >
                <span>{lang === 'bn' ? 'শিট দেখুন' : lang === 'hi' ? 'शीट देखें' : 'View Sheet'}</span>
                <span>➔</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Draw Selector Row (Slot Selector + Date Selector) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="relative">
          <select
            value={activeSlot}
            aria-label="Select Draw Time Slot"
            onChange={(e) => setActiveSlot(e.target.value as any)}
            className="w-full bg-blue-50/90 hover:bg-blue-100 border-2 border-blue-600 text-blue-950 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-3 pr-8 sm:pl-4 sm:pr-9 font-black appearance-none text-center cursor-pointer shadow-xs ring-2 ring-blue-500/20 active:scale-95 transition-all text-sm sm:text-base"
          >
            <option value="1PM" className="bg-white text-slate-900 font-bold py-1.5">1:00 PM</option>
            <option value="6PM" className="bg-white text-slate-900 font-bold py-1.5">6:00 PM</option>
            <option value="8PM" className="bg-white text-slate-900 font-bold py-1.5">8:00 PM</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 text-blue-700 font-black text-sm sm:text-base leading-none">▾</span>
        </div>

        <div className="relative">
          <select
            value={activeDateStr}
            aria-label="Select Draw Date"
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full bg-blue-50/90 hover:bg-blue-100 border-2 border-blue-600 text-blue-950 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-2 pr-6 sm:pl-3 sm:pr-8 font-black appearance-none text-center cursor-pointer shadow-xs ring-2 ring-blue-500/20 active:scale-95 transition-all text-xs sm:text-sm truncate"
          >
            {!hasActiveDateInList && activeDateStr && (
              <option value={activeDateStr} className="bg-white text-slate-900 font-bold py-1.5">
                {activeDateStr.split('-').reverse().join('/')} (Archive)
              </option>
            )}
            {pastDatesList.map((item) => (
              <option key={item.value} value={item.value} className="bg-white text-slate-900 font-bold py-1.5">
                {item.label}
              </option>
            ))}
            <option value="MORE" className="bg-white text-slate-900 font-bold py-1.5">
              {lang === 'bn' ? 'পুরনো রেজাল্ট (৩০ দিন) →' : lang === 'hi' ? 'पुराने नतीजे (30 दिन) →' : 'More Results (30 Days) →'}
            </option>
          </select>
          <span className="pointer-events-none absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 text-blue-700 font-black text-sm sm:text-base leading-none">▾</span>
        </div>
      </div>

      {/* 4. Direct Scanned Gazette Paper Preview (Only when Result is Declared) */}
      {activeStatus === 'RESULT_OUT' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-2.5 shadow-sm text-center">
          <div
            onClick={() => openImageLightbox(activeSheetUrl)}
            style={{ minHeight: '360px' }}
            className="cursor-zoom-in relative rounded-xl overflow-hidden border border-slate-200 bg-[#fcfbf7] group shadow-inner aspect-[1/1.414] max-w-[480px] mx-auto"
          >
            <img
              src={activeSheetUrl}
              alt={`Official Gazette Result Sheet ${currentDraw?.draw_name || 'Dear Lottery'} ${currentSlotInfo.time}`}
              width={557}
              height={788}
              decoding="async"
              className="w-full h-full object-contain transition-transform group-hover:scale-[1.01]"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLImageElement).src = sheetSvgUrl;
              }}
            />
          </div>
        </div>
      )}

      {/* 5. WhatsApp Share Button & 6. Clean Structured Text Prize Tables (Declared Results Only) */}
      {activeStatus === 'RESULT_OUT' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25d366] hover:bg-[#20bd5a] text-white font-black text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 text-center"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleNativeShare}
              className="bg-[#0088cc] hover:bg-[#0077b5] text-white font-black text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 text-center"
            >
              <span>📲</span>
              <span>{lang === 'bn' ? 'শেয়ার' : lang === 'hi' ? 'शेयर' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(whatsappShareText);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }
              }}
              className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 text-center"
            >
              <span>{copiedLink ? '✓' : '📋'}</span>
              <span>{copiedLink ? (lang === 'bn' ? 'কপি হয়েছে' : lang === 'hi' ? 'कॉपी हुआ' : 'Copied!') : (lang === 'bn' ? 'কপি' : lang === 'hi' ? 'कॉपी' : 'Copy')}</span>
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {/* Toggle Bar */}
            <button
              type="button"
              onClick={() => setShowTextTables(prev => !prev)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 flex items-center justify-between text-xs font-black text-slate-800 transition-colors"
            >
              <span>{lang === 'bn' ? '📋 ২য় থেকে ৫ম পুরস্কারের বিস্তারিত নম্বর তালিকা' : lang === 'hi' ? '📋 2nd से 5th पुरस्कार की पूरी सूची' : '📋 2nd to 5th Prize Full Winning Numbers List'}</span>
              <span>{showTextTables ? (lang === 'bn' ? '▲ বন্ধ করুন' : lang === 'hi' ? '▲ बंद करें' : '▲ Hide') : (lang === 'bn' ? '▼ দেখুন' : lang === 'hi' ? '▼ देखें' : '▼ View')}</span>
            </button>

            {showTextTables && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {secondPrizes.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center space-y-1.5 shadow-2xs">
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
                      <span>
                        {lang === 'bn' ? '১ম পুরস্কার প্রকাশিত • বাকি প্রাইজ শিট স্ক্যান হচ্ছে' : lang === 'hi' ? '1st प्राइज घोषित • बाकी शीट स्कैन हो रही है' : '1st Prize Out • Remaining tiers scanning'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">
                      {lang === 'bn'
                        ? '১ কোটি টাকার ১ম পুরস্কার নম্বর লাইভ হয়েছে। সরকারি ডিরেক্টরেটের সম্পূর্ণ গেজেট শিট থেকে ২য় থেকে ৫ম পুরস্কারের নম্বরসমূহ কয়েক মিনিটের মধ্যে স্বয়ংক্রিয়ভাবে আপডেট হবে।'
                        : lang === 'hi'
                        ? '₹1 करोड़ का प्रथम पुरस्कार लाइव हो चुका है। आधिकारिक गजट शीट से 2nd से 5th पुरस्कार के नंबर कुछ ही मिनटों में अपडेट हो जाएंगे।'
                        : '1st Prize of ₹1 Crore is live above. Full 2nd to 5th prize tiers are being extracted from the official gazette sheet.'}
                    </p>
                  </div>
                ) : (
                  <>
                {/* 2nd Prize */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      <span>{lang === 'bn' ? '২য় পুরস্কার: ₹১০,০০০ (১০ জন বিজয়ী)' : lang === 'hi' ? 'द्वितीय पुरस्कार: ₹10,000 (10 विजेता)' : '2nd Prize: ₹10,000 (10 Winners)'}</span>
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-mono font-bold">5 Digits</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {secondPrizes.map((num: string, idx: number) => (
                      <div
                        key={idx}
                        className="bg-emerald-50/70 border border-emerald-200 rounded-lg py-2 text-center font-mono text-base font-black text-emerald-950 select-all"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3rd & 4th Prize */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <h5 className="text-xs font-black text-slate-900">{lang === 'bn' ? '৩য় পুরস্কার: ₹৫০০' : lang === 'hi' ? 'तृतीय पुरस्कार: ₹500' : '3rd Prize: ₹500'}</h5>
                      <span className="text-[10px] text-slate-500 font-mono">Last 4 Digits</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {thirdPrizes.map((num: string, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded py-1.5 text-center font-mono text-xs font-bold text-slate-900 select-all">
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <h5 className="text-xs font-black text-slate-900">{lang === 'bn' ? '৪র্থ পুরস্কার: ₹২৫০' : lang === 'hi' ? 'चतुर्थ पुरस्कार: ₹250' : '4th Prize: ₹250'}</h5>
                      <span className="text-[10px] text-slate-500 font-mono">Last 4 Digits</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {fourthPrizes.map((num: string, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded py-1.5 text-center font-mono text-xs font-bold text-slate-900 select-all">
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5th Prize */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>{lang === 'bn' ? '৫ম পুরস্কার: ₹১২০ (১০০ জন বিজয়ী)' : lang === 'hi' ? '5वां पुरस्कार: ₹120 (100 विजेता)' : '5th Prize: ₹120 (100 Winners)'}</span>
                    </h4>
                    <span className="text-[11px] text-blue-700 font-mono font-bold">Last 4 Digits</span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {fifthPrizes.map((num: string, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded py-1.5 text-center font-mono text-xs font-bold text-slate-900 select-all transition-colors"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}
              </div>
            )}
          </div>
        
          {/* 7. Historical Win & Pattern Intelligence Card (Below All Results) */}
          {firstPrizeHistory && (
            <HistoricalIntelligenceCard history={firstPrizeHistory} />
          )}
        </>
      )}

      {/* 7. Lightbox Zoom Modal (Like Lottery Sambad imodal) */}
      {showImageModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowImageModal(false)}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between max-w-3xl w-full mx-auto pb-2 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
              <span>📄</span>
              <span>{currentDraw?.draw_name || 'Dear Lottery'} • {currentSlotInfo.time}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              aria-label="Close gazette preview modal"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-base flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Interactive Zoom Frame */}
          <div
            className="flex-1 overflow-auto max-w-3xl w-full mx-auto bg-slate-900/60 rounded-2xl p-2 border border-white/10 flex items-center justify-center relative touch-manipulation"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedImageUrl}
              alt="Official Dear Lottery Gazette Sheet"
              onError={(e) => {
                (e.target as HTMLImageElement).src = sheetSvgUrl;
              }}
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.18s ease'
              }}
              className="max-w-full h-auto object-contain rounded shadow-2xl"
            />
          </div>

          {/* Bottom Zoom Controls (+ / - / % / PDF) */}
          <div
            className="max-w-3xl w-full mx-auto pt-3 flex items-center justify-center gap-3 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="inline-flex items-center bg-slate-800/90 border border-white/20 rounded-full h-10 px-3 gap-2 shadow-lg">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomScale <= 1}
                aria-label="Zoom out"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-black text-base disabled:opacity-40"
              >
                −
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                aria-label="Reset zoom level"
                className="px-2 font-mono font-bold text-xs"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomScale >= 3}
                aria-label="Zoom in"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-black text-base disabled:opacity-40"
              >
                +
              </button>
            </div>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`Dear_Lottery_${activeDateStr}_${activeSlot}.pdf`}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-full shadow-lg flex items-center gap-1.5"
            >
              <span>📥 PDF</span>
            </a>

            <a
              href={activeSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`Dear_Lottery_${activeDateStr}_${activeSlot}.jpg`}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-full shadow-lg flex items-center gap-1.5"
            >
              <span>🖼️ Save Image</span>
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
