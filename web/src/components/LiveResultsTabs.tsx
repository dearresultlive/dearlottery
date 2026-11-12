import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  formatINR,
  getISTNow,
  getISTDateString,
  getSlotStatus,
  getSlotCountdown
} from '../lib/lottery-utils';
import { useLanguage } from '../lib/i18n';
import HistoricalIntelligenceCard from './HistoricalIntelligenceCard';
import LiveDrawProgressCard from './LiveDrawProgressCard';
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

  // Yesterday date resolution
  const yesterdayDateStr = (yesterdayDraws && yesterdayDraws[0]?.draw_date) || (() => {
    const y = new Date(getISTNow());
    y.setDate(y.getDate() - 1);
    return getISTDateString(y);
  })();

  // Check if today has any published results
  const hasInitialTodayResults = (draws || []).some(d => 
    d.draw_date === todayStr && 
    Boolean(d.parsed_data?.prizes?.first_prize?.number || d.prizes?.first_prize?.number)
  );

  // Immediate SSR/Mount slot calculation - Prevents slot flipping & double-fetch
  const computeInitialSlot = (): '1PM' | '6PM' | '8PM' => {
    if (initialSlot) return initialSlot;
    if (isYesterdayPage) return '8PM';
    const ist = getISTNow();
    const totalMin = ist.getHours() * 60 + ist.getMinutes();
    if (totalMin >= 1170) return '8PM'; // 7:30 PM onwards
    if (totalMin >= 1050) return '6PM'; // 5:30 PM to 7:30 PM
    return '1PM'; // 12:00 AM to 5:30 PM (focus on 1PM upcoming or declared)
  };

  const computeInitialDate = (): string => {
    if (initialSlot) return todayDateStr || getISTDateString();
    if (isYesterdayPage) return todayDateStr || yesterdayDateStr;
    return todayDateStr || getISTDateString();
  };

  const [activeDateStr, setActiveDateStr] = useState<string>(computeInitialDate);
  const [activeSlot, setActiveSlot] = useState<'1PM' | '6PM' | '8PM'>(computeInitialSlot);
  const [drawsList, setDrawsList] = useState<DrawRecord[]>(draws);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const zoomFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showImageModal && zoomFrameRef.current) {
      zoomFrameRef.current.scrollTop = 0;
      zoomFrameRef.current.scrollLeft = 0;
    }
  }, [showImageModal, selectedImageUrl]);

  const [showTextTables, setShowTextTables] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [slotCountdown, setSlotCountdown] = useState(getSlotCountdown('1PM'));
  const [upcoming1pmCountdown, setUpcoming1pmCountdown] = useState(getSlotCountdown('1PM'));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const userOverrodeRef = useRef<boolean>(false);

  const getSmartTodaySlot = (): '1PM' | '6PM' | '8PM' => {
    const istNow = getISTNow();
    const h = istNow.getHours();
    const m = istNow.getMinutes();
    const totalMin = h * 60 + m;
    if (totalMin < 1050) return '1PM'; // Before 5:30 PM, focus on 1PM
    if (totalMin < 1170) return '6PM'; // Before 7:30 PM, focus on 6PM
    return '8PM';
  };

  const handleGoToToday = () => {
    userOverrodeRef.current = true;
    setActiveDateStr(todayStr);
    const targetSlot = getSmartTodaySlot();
    setActiveSlot(targetSlot);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.delete('date');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSlotSelect = (slotKey: '1PM' | '6PM' | '8PM') => {
    userOverrodeRef.current = true;
    setActiveSlot(slotKey);
    if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      (navigator as any).vibrate(10);
    }
  };

  useEffect(() => {
    setDrawsList(draws);
  }, [draws]);

  // Update countdown every second for active upcoming slot and next 1PM draw
  useEffect(() => {
    const update = () => {
      setSlotCountdown(getSlotCountdown(activeSlot));
      setUpcoming1pmCountdown(getSlotCountdown('1PM'));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [activeSlot]);

  // Check if today has any published results
  const hasTodayResults = drawsList.some(d => 
    d.draw_date === todayStr && 
    Boolean(d.parsed_data?.prizes?.first_prize?.number || d.prizes?.first_prize?.number)
  );

  // Auto-detect Slot selection based on current IST time (when not manually overridden by user)
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
    if (userOverrodeRef.current) return;

    const istNow = getISTNow();
    const hour = istNow.getHours();
    const min = istNow.getMinutes();
    const totalMin = hour * 60 + min;

    if (totalMin >= 1170) {
      // 7:30 PM onwards: focus on 8PM
      setActiveDateStr(todayStr);
      setActiveSlot('8PM');
    } else if (totalMin >= 1050) {
      // 5:30 PM to 7:30 PM: focus on 6PM
      setActiveDateStr(todayStr);
      setActiveSlot('6PM');
    } else {
      // 12:00 AM to 5:30 PM: focus on 1PM (Today's upcoming morning draw or declared result)
      setActiveDateStr(todayStr);
      setActiveSlot('1PM');
    }
  }, [hasTodayResults, isYesterdayPage, initialSlot, todayDateStr, todayStr]);

  // Auto-transition to current drawing slot when draw time arrives without manual refresh
  useEffect(() => {
    if (isYesterdayPage || initialSlot) return;

    const checkLiveTransition = () => {
      const istNow = getISTNow();
      const hour = istNow.getHours();
      const min = istNow.getMinutes();
      const totalMin = hour * 60 + min;

      // 1. At 12:45 PM (765 min), automatically switch from Morning Mode (yesterday 8PM) to Today's 1:00 PM Live Countdown!
      if (totalMin >= 765 && totalMin < 1050) {
        if (activeDateStr === yesterdayDateStr && !userOverrodeRef.current) {
          setActiveDateStr(todayStr);
          setActiveSlot('1PM');
        }
      }
      // 1:00 PM draw window (780 min to 820 min = 1:00 PM to 1:40 PM)
      else if (totalMin >= 780 && totalMin < 820) {
        if (activeDateStr !== todayStr || activeSlot !== '1PM') {
          const is1pmDeclared = drawsList.some(d => 
            d.draw_date === todayStr && 
            (d.draw_time?.includes('1') || d.id?.includes('1PM')) &&
            Boolean(d.parsed_data?.prizes?.first_prize?.number || d.prizes?.first_prize?.number)
          );
          if (!is1pmDeclared || activeDateStr === yesterdayDateStr) {
            setActiveDateStr(todayStr);
            setActiveSlot('1PM');
          }
        }
      }
      // 6:00 PM draw window (1080 min to 1120 min = 6:00 PM to 6:40 PM)
      else if (totalMin >= 1080 && totalMin < 1120) {
        if (activeDateStr !== todayStr || activeSlot !== '6PM') {
          const is6pmDeclared = drawsList.some(d => 
            d.draw_date === todayStr && 
            (d.draw_time?.includes('6') || d.id?.includes('6PM')) &&
            Boolean(d.parsed_data?.prizes?.first_prize?.number || d.prizes?.first_prize?.number)
          );
          if (!is6pmDeclared) {
            setActiveDateStr(todayStr);
            setActiveSlot('6PM');
          }
        }
      }
      // 8:00 PM draw window (1200 min to 1240 min = 8:00 PM to 8:40 PM)
      else if (totalMin >= 1200 && totalMin < 1240) {
        if (activeDateStr !== todayStr || activeSlot !== '8PM') {
          const is8pmDeclared = drawsList.some(d => 
            d.draw_date === todayStr && 
            (d.draw_time?.includes('8') || d.id?.includes('8PM')) &&
            Boolean(d.parsed_data?.prizes?.first_prize?.number || d.prizes?.first_prize?.number)
          );
          if (!is8pmDeclared) {
            setActiveDateStr(todayStr);
            setActiveSlot('8PM');
          }
        }
      }
    };

    const interval = setInterval(checkLiveTransition, 1000);
    return () => clearInterval(interval);
  }, [activeDateStr, activeSlot, drawsList, todayStr, yesterdayDateStr, isYesterdayPage, initialSlot]);

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

  // Reference prize for upcoming draws:
  // In morning (no today results declared yet): shows Yesterday's 8:00 PM winner
  // Later in the day: shows the latest declared prize of today (1PM or 6PM)
  const referencePrizeInfo = useMemo(() => {
    // 1. If today has declared 6PM:
    const today6pm = drawsList.find(d => d.draw_date === todayStr && (d.draw_time?.includes('6') || d.id?.includes('6PM')));
    const p6 = today6pm?.parsed_data?.prizes?.first_prize || today6pm?.prizes?.first_prize;
    if (activeSlot === '8PM' && p6?.number) {
      return {
        labelBn: `আজকের ৬:০০ PM ডে ড্র বিজয়ী (${todayStr.split('-').reverse().join('/')})`,
        labelHi: `आज का 6:00 PM डे ड्रॉ विजेता (${todayStr.split('-').reverse().join('/')})`,
        labelEn: `Today's 6:00 PM Day Winner (${todayStr.split('-').reverse().join('/')})`,
        subBn: 'নাগাল্যান্ড রাজ্য লটারি সরকারি গেজেট শিট',
        subHi: 'नागालैंड राज्य लॉटरी आधिकारिक गजट शीट',
        subEn: 'Nagaland State Lotteries Official Directorate Gazette',
        prize: p6,
        sheetUrl: `/results/${todayStr}/6pm.avif`,
        dateStr: todayStr,
        slot: '6PM' as const,
        isYesterday: false
      };
    }

    // 2. If today has declared 1PM:
    const today1pm = drawsList.find(d => d.draw_date === todayStr && (d.draw_time?.includes('1') || d.id?.includes('1PM')));
    const p1 = today1pm?.parsed_data?.prizes?.first_prize || today1pm?.prizes?.first_prize;
    if ((activeSlot === '6PM' || activeSlot === '8PM') && p1?.number) {
      return {
        labelBn: `আজকের ১:০০ PM মর্নিং ড্র বিজয়ী (${todayStr.split('-').reverse().join('/')})`,
        labelHi: `आज का 1:00 PM मॉर्निंग ड्रॉ विजेता (${todayStr.split('-').reverse().join('/')})`,
        labelEn: `Today's 1:00 PM Morning Winner (${todayStr.split('-').reverse().join('/')})`,
        subBn: 'সিকিম / নাগাল্যান্ড রাজ্য লটারি সরকারি গেজেট শিট',
        subHi: 'सिक्किम / नागालैंड राज्य लॉटरी आधिकारिक गजट शीट',
        subEn: 'Sikkim / Nagaland State Lotteries Official Gazette',
        prize: p1,
        sheetUrl: `/results/${todayStr}/1pm.avif`,
        dateStr: todayStr,
        slot: '1PM' as const,
        isYesterday: false
      };
    }

    // 3. Fallback to Yesterday's 8:00 PM Winner (default for morning mode)
    if (yesterday8pmPrize?.number) {
      return {
        labelBn: `সর্বশেষ অফিশিয়াল রেজাল্ট • গতরাতের ৮:০০ নাইট ড্র (${yesterdayDateStr.split('-').reverse().join('/')})`,
        labelHi: `नवीनतम आधिकारिक परिणाम • कल रात 8:00 बजे नाइट ड्रॉ (${yesterdayDateStr.split('-').reverse().join('/')})`,
        labelEn: `Latest Declared Official Result • Last Night 8:00 PM (${yesterdayDateStr.split('-').reverse().join('/')})`,
        subBn: 'নাগাল্যান্ড রাজ্য লটারি সরকারি গেজেট শিট',
        subHi: 'नागालैंड राज्य लॉटरी आधिकारिक गजट शीट',
        subEn: 'Nagaland State Lotteries Official Directorate Gazette',
        prize: yesterday8pmPrize,
        sheetUrl: `/results/${yesterdayDateStr}/8pm.avif`,
        dateStr: yesterdayDateStr,
        slot: '8PM' as const,
        isYesterday: true
      };
    }

    return null;
  }, [drawsList, todayStr, activeSlot, yesterday8pmPrize, yesterdayDateStr]);

  // Find active draw matching activeDateStr and activeSlot strictly
  const currentSlotNumber = activeSlot.replace('PM', '');
  const currentDraw = useMemo(() => {
    return allKnownDraws.find(d => 
      d.draw_date === activeDateStr &&
      (d.draw_time?.includes(currentSlotNumber) || d.id?.includes(activeSlot))
    ) || null;
  }, [allKnownDraws, activeDateStr, activeSlot, currentSlotNumber]);

  const prizesData: PrizeData = currentDraw?.parsed_data?.prizes || currentDraw?.prizes || {};
  const hasFirstPrize = Boolean(prizesData.first_prize?.number);
  const hasPrizes = Boolean(
    hasFirstPrize &&
    currentDraw?.status !== 'UPCOMING'
  );

  const activeStatus = isToday
    ? getSlotStatus(todayStr, activeSlot, hasPrizes)
    : (hasPrizes ? 'RESULT_OUT' : (isSyncing ? 'DRAWING' : 'RESULT_OUT'));

  // Autonomous live polling when active slot is in DRAWING or upcoming active drawing window
  useEffect(() => {
    const shouldPoll = activeStatus === 'DRAWING' || (isToday && !hasPrizes && activeSlot === getSmartTodaySlot());
    if (!shouldPoll) return;

    let isPolling = true;

    const pollLiveResult = async () => {
      try {
        const res = await fetch(`/api/results/latest?slot=${activeSlot}`, {
          headers: { 'Accept': 'application/json' },
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
    const interval = setInterval(pollLiveResult, 10000);

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

  const sambadDirectUrl = `https://lottery.sambad.com/images/lottery-sambad-${activeSlot.toLowerCase()}-${activeDateStr.split('-').reverse().join('-')}.jpg`;
  const [yearStr, monthStr, dayStr] = activeDateStr.split('-');
  const nagalandPrefix = activeSlot.includes('6') ? 'DN' : activeSlot.includes('8') ? 'EN' : 'MN';
  const nagalandDirectUrl = `https://www.nagalandlotteryresults.com/wp-content/uploads/${yearStr}/${monthStr}/${nagalandPrefix}${dayStr}${monthStr}${yearStr.slice(2)}_1.jpeg`;
  const cacheKey = currentDraw?.checksum ? encodeURIComponent(currentDraw.checksum) : (firstPrize.number ? `${activeDateStr}-${firstPrize.number}` : `${activeDateStr}-live`);
  const directStaticUrl = `/results/${activeDateStr}/${activeSlot.toLowerCase()}.jpg`;
  const directWebpUrl = `/results/${activeDateStr}/${activeSlot.toLowerCase()}.webp`;
  const directAvifUrl = `/results/${activeDateStr}/${activeSlot.toLowerCase()}.avif`;
  const pdfUrl = `/pdf/${activeDateStr}/${activeSlot.toLowerCase()}.pdf`;
  const sheetSvgUrl = `/api/gazette-sheet.svg?date=${activeDateStr}&slot=${activeSlot.toLowerCase()}`;
  const proxySheetUrl = `/api/sheet-image?date=${activeDateStr}&slot=${activeSlot.toLowerCase()}`;
  // activeSheetUrl uses AVIF (42-47 KB) for instant sub-0.6s paint with WebP fallback
  const activeSheetUrl = directAvifUrl;

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

  const handleZoomIn = () => setZoomScale(prev => Math.min(Number((prev + 0.25).toFixed(2)), 2.5));
  const handleZoomOut = () => setZoomScale(prev => Math.max(Number((prev - 0.25).toFixed(2)), 0.6));
  const handleResetZoom = () => setZoomScale(1);
  const toggleImageZoom = () => setZoomScale(prev => (prev === 1 ? 1.5 : 1));

  const currentSlotInfo = slots.find(s => s.key === activeSlot) || slots[0];
  const hasActiveDateInList = pastDatesList.some(item => item.value === activeDateStr);

  const handleDateChange = async (selectedValue: string) => {
    if (selectedValue === 'MORE') {
      window.location.href = '/old-results';
      return;
    }

    userOverrodeRef.current = true;
    setActiveDateStr(selectedValue);
    if (selectedValue === todayStr) {
      setActiveSlot(getSmartTodaySlot());
    }

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
      // If user arrived on root homepage '/' with yesterday's date query or stale date, clean it up
      const isRootHome = window.location.pathname === '/' || window.location.pathname === '';
      if (isRootHome && qDate) {
        const url = new URL(window.location.href);
        url.searchParams.delete('date');
        window.history.replaceState({}, '', url.toString());
        setActiveDateStr(todayStr);
        setActiveSlot(getSmartTodaySlot());
        return;
      }
      if (qDate && qDate !== todayStr && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) {
        handleDateChange(qDate);
      }
    }
  }, [todayStr]);

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-[557px] mx-auto">
      


      {/* Smart Morning Mode / Yesterday Notice Banner */}
      {isYesterday && (
        <div className="bg-gradient-to-r from-amber-50/90 via-white to-emerald-50/90 border border-amber-200/90 rounded-2xl p-3 sm:p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-900 shadow-sm">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="text-2xl flex-shrink-0">🌙</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-amber-950 text-xs sm:text-sm tracking-tight">
                  {lang === 'bn' 
                    ? `গতরাতের (${yesterdayDateStr.split('-').reverse().join('/')}) ${currentSlotInfo.time} ফলাফল শিট`
                    : lang === 'hi'
                    ? `कल रात (${yesterdayDateStr.split('-').reverse().join('/')}) ${currentSlotInfo.time} परिणाम शीट`
                    : `Last Night's (${yesterdayDateStr.split('-').reverse().join('/')}) ${currentSlotInfo.time} Official Result`}
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300 uppercase tracking-wider shadow-2xs">
                  {lang === 'bn' ? 'সর্বশেষ অফিশিয়াল রেজাল্ট' : lang === 'hi' ? 'नवीनतम परिणाम' : 'Latest Declared'}
                </span>
              </div>
              <span className="text-[11px] text-slate-600 font-medium block mt-0.5">
                {lang === 'bn'
                  ? `আজকের (${todayStr.split('-').reverse().join('/')}) ১ম ড্র দুপুর ১:০০ টায় • শুরু হতে বাকি: ${upcoming1pmCountdown.hours > 0 ? `${upcoming1pmCountdown.hours}ঘণ্টা ` : ''}${upcoming1pmCountdown.minutes}মিনিট ${upcoming1pmCountdown.seconds}সেকেন্ড`
                  : lang === 'hi'
                  ? `आज का (${todayStr.split('-').reverse().join('/')}) पहला ड्रॉ दोपहर 1:00 बजे • शेष समय: ${upcoming1pmCountdown.hours > 0 ? `${upcoming1pmCountdown.hours}घंटे ` : ''}${upcoming1pmCountdown.minutes}मिनट ${upcoming1pmCountdown.seconds}सेकंड`
                  : `Today's (${todayStr.split('-').reverse().join('/')}) 1st draw starts at 1:00 PM • in ${upcoming1pmCountdown.hours > 0 ? `${upcoming1pmCountdown.hours}h ` : ''}${upcoming1pmCountdown.minutes}m ${upcoming1pmCountdown.seconds}s`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoToToday}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 flex-shrink-0 transition-all self-end sm:self-auto cursor-pointer border border-amber-600/30"
          >
            <span>{lang === 'bn' ? 'আজকের লাইভ কাউন্টডাউন' : lang === 'hi' ? 'आज का लाइव কাউন্টডাউন' : "Today's Live Countdown"}</span>
            <span>➔</span>
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
            onClick={handleGoToToday}
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
        <LiveDrawProgressCard
          slot={activeSlot}
          slotTime={currentSlotInfo.time}
          drawName={currentDraw?.draw_name || `DEAR ${activeSlot}`}
          lang={lang}
        />
      ) : (
        /* UPCOMING PENDING CARD (Semantic Today Hub + Latest Declared Winner Reference) */
        <div className="bg-gradient-to-b from-white via-amber-50/20 to-emerald-50/30 border-2 border-amber-200/90 rounded-2xl p-4 sm:p-5 text-center space-y-4 shadow-sm relative overflow-hidden">
          
          {/* Top Live Countdown Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 text-xs font-black px-3.5 py-1 rounded-full border border-emerald-300 uppercase tracking-wider shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>
                {lang === 'bn'
                  ? `আজকের (${todayStr.split('-').reverse().join('/')}) ${currentSlotInfo.time} লাইভ ড্র`
                  : lang === 'hi'
                  ? `आज का (${todayStr.split('-').reverse().join('/')}) ${currentSlotInfo.time} लाइव ड्रॉ`
                  : `Today's (${todayStr.split('-').reverse().join('/')}) ${currentSlotInfo.time} Live Draw`}
              </span>
            </div>

            <div className="font-mono text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                {String(slotCountdown.hours).padStart(2, '0')}<span className="text-xs text-slate-400 font-sans ml-1">h</span>
              </span>
              <span className="text-slate-400">:</span>
              <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                {String(slotCountdown.minutes).padStart(2, '0')}<span className="text-xs text-slate-400 font-sans ml-1">m</span>
              </span>
              <span className="text-slate-400">:</span>
              <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs text-amber-600">
                {String(slotCountdown.seconds).padStart(2, '0')}<span className="text-xs text-slate-400 font-sans ml-1">s</span>
              </span>
            </div>

            <p className="text-xs text-slate-600 max-w-md mx-auto">
              {lang === 'bn'
                ? `আজকের ${currentSlotInfo.time} ড্র সম্পন্ন হওয়ার সাথে সাথে অফিশিয়াল ১ম পুরস্কার ১ কোটি টাকা ও সম্পূর্ণ গেজেট শিট এখানে স্বয়ংক্রিয়ভাবে লাইভ দেখতে পাবেন।`
                : lang === 'hi'
                ? `आज के ${currentSlotInfo.time} ड्रॉ पूरा होते ही प्रथम पुरस्कार ₹1 करोड़ एवं पूरी गजट शीट यहाँ स्वचालित रूप से लाइव दिखेगी।`
                : `Official 1st Prize ₹1 Crore winning ticket and complete gazette sheet will be published live immediately following today's ${currentSlotInfo.time} draw.`}
            </p>

            <span className="sr-only speakable-summary">
              Dear Lottery {activeSlot} draw for today {todayStr} is scheduled at {currentSlotInfo.time} IST. Results will be published live immediately following the official draw.
            </span>
          </div>

          {/* Prominent "Latest Declared Official Result" Ticket Reference */}
          {referencePrizeInfo?.prize?.number && (
            <div className="border border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/60 rounded-2xl p-3.5 sm:p-4 text-center shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                <div className="flex items-center gap-1.5 text-left">
                  <span className="text-base sm:text-lg">🌙</span>
                  <div>
                    <span className="text-[11px] sm:text-xs font-black text-amber-950 uppercase tracking-tight block">
                      {lang === 'bn' ? referencePrizeInfo.labelBn : lang === 'hi' ? referencePrizeInfo.labelHi : referencePrizeInfo.labelEn}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      {lang === 'bn' ? referencePrizeInfo.subBn : lang === 'hi' ? referencePrizeInfo.subHi : referencePrizeInfo.subEn}
                    </span>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-300 flex-shrink-0">
                  {lang === 'bn' ? 'যাচাইকৃত' : lang === 'hi' ? 'सत्यापित' : 'VERIFIED'}
                </span>
              </div>

              {/* Big 1st Prize Ticket */}
              <div>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  {lang === 'bn' ? '১ম পুরস্কার • 1st Prize ₹1 Crore Winner' : lang === 'hi' ? 'प्रथम पुरस्कार • 1st Prize ₹1 Crore Winner' : '1st Prize • ₹1 Crore Winner'}
                </span>
                <div className="font-mono font-black text-3xl sm:text-5xl tracking-widest text-[#138808] my-1">
                  {referencePrizeInfo.prize.series} {referencePrizeInfo.prize.number}
                </div>
                <span className="text-[11px] font-bold text-slate-500 block">
                  {lang === 'bn'
                    ? `সান্ত্বনা পুরস্কার: ₹১,০০০ • ${referencePrizeInfo.prize.number} অন্য সব সিরিজ`
                    : lang === 'hi'
                    ? `सांत्वना पुरस्कार: ₹1,000 • ${referencePrizeInfo.prize.number} अन्य सभी सीरीज`
                    : `Consolation Prize: ₹1,000 • ${referencePrizeInfo.prize.number} Remaining Series`}
                </span>
              </div>

              {/* Action Buttons: View Sheet, Full Draw Results, Check Ticket */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => openImageLightbox(referencePrizeInfo.sheetUrl)}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black py-2 px-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>📄</span>
                  <span>{lang === 'bn' ? 'গেজেট শিট দেখুন' : lang === 'hi' ? 'गजट शीट देखें' : 'View Gazette Sheet'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { handleDateChange(referencePrizeInfo.dateStr); setActiveSlot(referencePrizeInfo.slot); }}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black py-2 px-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>📋</span>
                  <span>
                    {referencePrizeInfo.isYesterday
                      ? (lang === 'bn' ? 'গতকালের পুরো রেজাল্ট' : lang === 'hi' ? 'कल का पूरा रिजल्ट' : 'Full Yesterday Draw')
                      : (lang === 'bn' ? 'এই ড্র-এর সব রেজাল্ট' : lang === 'hi' ? 'इस ड्रॉ का पूरा रिजल्ट' : 'Full Draw Sheet')}
                  </span>
                </button>

                <a
                  href="#checker"
                  className="col-span-2 sm:col-span-1 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-black py-2 px-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 text-center"
                >
                  <span>🔍</span>
                  <span>{lang === 'bn' ? 'টিকিট চেক করুন' : lang === 'hi' ? 'टिकट चेक करें' : 'Check Ticket'}</span>
                </a>
              </div>
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

      {/* 4. Direct Scanned Gazette Paper Preview (Only when Result is DECLARED) */}
      {hasPrizes && activeStatus === 'RESULT_OUT' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-2.5 shadow-sm text-center animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-slate-100 text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span>📰</span>
              <span>
                {lang === 'bn' ? 'অফিসিয়াল গেজেট শিট' : lang === 'hi' ? 'ऑफिशियल गजट शीट' : 'Official Gazette Sheet'}
              </span>
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              100% VERIFIED
            </span>
          </div>

          <div
            onClick={() => openImageLightbox(activeSheetUrl)}
            style={{ minHeight: '360px' }}
            className="cursor-zoom-in relative rounded-xl overflow-hidden border border-slate-200 bg-[#fcfbf7] group shadow-inner aspect-[1/1.414] max-w-[480px] mx-auto flex items-center justify-center"
          >
            <picture className="w-full h-full flex items-center justify-center">
              <source srcSet={directAvifUrl} type="image/avif" />
              <source srcSet={directWebpUrl} type="image/webp" />
              <img
                key={`gazette-sheet-${activeDateStr}-${activeSlot}`}
                src={directWebpUrl}
                alt={`Official Gazette Result Sheet ${currentDraw?.draw_name || 'Dear Lottery'} ${currentSlotInfo.time}`}
                width={550}
                height={778}
                decoding="async"
                className="w-full h-full object-contain transition-transform group-hover:scale-[1.01]"
                loading="eager"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (img.src.includes('.avif') || img.src.includes('.webp')) {
                    img.src = directStaticUrl;
                  } else if (!img.src.includes('lottery.sambad.com') && !img.src.includes('nagalandlotteryresults.com') && !img.src.includes('/api/sheet-image')) {
                    img.src = sambadDirectUrl;
                  } else if (img.src.includes('lottery.sambad.com')) {
                    img.src = nagalandDirectUrl;
                  } else if (img.src.includes('nagalandlotteryresults.com')) {
                    img.src = proxySheetUrl;
                  }
                }}
              />
            </picture>
          </div>

          <p className="text-[11px] text-slate-500 font-medium mt-1.5">
            {lang === 'bn' ? '🔍 সম্পূর্ণ রেজাল্ট শিট বড় করে দেখতে ছবির উপর ক্লিক করুন' : lang === 'hi' ? '🔍 पूरी रिजल्ट शीट बड़ी करने के लिए फोटो पर क्लिक करें' : '🔍 Tap/Click image to zoom full official gazette sheet'}
          </p>
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
            ref={zoomFrameRef}
            className="flex-1 overflow-auto max-w-3xl w-full mx-auto bg-slate-900/60 rounded-2xl p-2 sm:p-3 border border-white/10 flex justify-center items-start relative touch-manipulation"
            onClick={e => e.stopPropagation()}
          >
            <img
              key={`modal-img-${selectedImageUrl}`}
              src={selectedImageUrl}
              alt="Official Dear Lottery Gazette Sheet"
              onClick={toggleImageZoom}
              title={zoomScale === 1 ? 'Click to zoom in' : 'Click to reset zoom'}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src.includes('.avif')) {
                  img.src = directWebpUrl;
                } else if (img.src.includes('.webp')) {
                  img.src = directStaticUrl;
                } else if (!img.src.includes('lottery.sambad.com') && !img.src.includes('nagalandlotteryresults.com') && !img.src.includes('/api/sheet-image')) {
                  img.src = sambadDirectUrl;
                } else if (img.src.includes('lottery.sambad.com')) {
                  img.src = nagalandDirectUrl;
                } else if (img.src.includes('nagalandlotteryresults.com')) {
                  img.src = proxySheetUrl;
                }
              }}
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.18s ease'
              }}
              className={`max-w-full h-auto object-contain rounded shadow-2xl mx-auto block ${
                zoomScale === 1 ? 'cursor-zoom-in' : 'cursor-zoom-out'
              }`}
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
                disabled={zoomScale <= 0.6}
                aria-label="Zoom out"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-black text-base disabled:opacity-40 cursor-pointer"
              >
                −
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                aria-label="Reset zoom level"
                className="px-2 font-mono font-bold text-xs cursor-pointer hover:text-amber-400"
                title="Reset to 100%"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomScale >= 2.5}
                aria-label="Zoom in"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-black text-base disabled:opacity-40 cursor-pointer"
              >
                +
              </button>
            </div>

            {hasPrizes && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`Dear_Lottery_${activeDateStr}_${activeSlot}.pdf`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-full shadow-lg flex items-center gap-1.5"
              >
                <span>📥 PDF</span>
              </a>
            )}

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
