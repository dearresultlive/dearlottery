/**
 * Lottery Utility functions: IST timezone calculations, prize formatting, and ticket validation.
 */

export interface DrawScheduleInfo {
  slot: '1PM' | '6PM' | '8PM';
  timeLabel: string;
  name: string;
  targetDate: string;
  isUpcoming: boolean;
  minutesUntil: number;
}

/**
 * Returns current Indian Standard Time (UTC+5:30) date object.
 */
export function getISTNow(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 5.5 * 3600000);
}

/**
 * Returns YYYY-MM-DD formatted string in IST.
 */
export function getISTDateString(d: Date = getISTNow()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates next upcoming draw time in IST.
 */
export function getNextUpcomingDraw(): {
  slot: '1PM' | '6PM' | '8PM';
  name: string;
  targetTimestamp: number;
  timeLabel: string;
} {
  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);

  const drawSlots = [
    { slot: '1PM' as const, hour: 13, min: 0, label: '1:00 PM', name: 'DEAR MORNING' },
    { slot: '6PM' as const, hour: 18, min: 0, label: '6:00 PM', name: 'DEAR DAY' },
    { slot: '8PM' as const, hour: 20, min: 0, label: '8:00 PM', name: 'DEAR NIGHT' }
  ];

  for (const s of drawSlots) {
    const target = new Date(istNow);
    target.setHours(s.hour, s.min, 0, 0);
    if (target.getTime() > istNow.getTime()) {
      return {
        slot: s.slot,
        name: s.name,
        targetTimestamp: target.getTime(),
        timeLabel: s.label
      };
    }
  }

  // If past 8:00 PM, next draw is tomorrow 1:00 PM
  const tomorrow = new Date(istNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(13, 0, 0, 0);

  return {
    slot: '1PM',
    name: 'DEAR MORNING',
    targetTimestamp: tomorrow.getTime(),
    timeLabel: '1:00 PM Tomorrow'
  };
}

/**
 * Format currency in Indian Numbering System (Lakhs, Crores)
 */
export function formatINR(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr.toLocaleString('en-IN')} Crore`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Normalizes ticket string into series and numbers
 */
export function parseTicketInput(input: string): { series: string | null; number: string } {
  const clean = input.trim().toUpperCase().replace(/\s+/g, ' ');
  const parts = clean.split(' ');

  if (parts.length === 2) {
    return { series: parts[0], number: parts[1].replace(/\D/g, '') };
  }

  // Check if starts with 1-2 letters or digit+letter
  const match = clean.match(/^([0-9]{0,2}[A-Z]{1,2})\s*([0-9]{4,5})$/);
  if (match) {
    return { series: match[1], number: match[2] };
  }

  return { series: null, number: clean.replace(/\D/g, '') };
}

/**
 * Checks whether a specific draw slot on a given date is upcoming (not yet conducted/declared).
 */
export function isDrawSlotUpcoming(dateStr: string, slot: '1PM' | '6PM' | '8PM'): boolean {
  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);

  if (dateStr > todayStr) return true;
  if (dateStr < todayStr) return false;

  // On today's date: 1PM is 13:00, 6PM is 18:00, 8PM is 20:00
  const targetHour = slot === '1PM' ? 13 : slot === '6PM' ? 18 : 20;
  return istNow.getHours() < targetHour;
}

/**
 * Returns precise status of a draw slot: 'UPCOMING', 'DRAWING' (publishing in progress), or 'RESULT_OUT'.
 */
export function getSlotStatus(
  dateStr: string,
  slot: '1PM' | '6PM' | '8PM',
  hasDeclaredPrizes: boolean
): 'UPCOMING' | 'DRAWING' | 'RESULT_OUT' {
  if (hasDeclaredPrizes) return 'RESULT_OUT';

  const istNow = getISTNow();
  const todayStr = getISTDateString(istNow);

  if (dateStr > todayStr) return 'UPCOMING';
  if (dateStr < todayStr) return 'RESULT_OUT';

  const targetHour = slot === '1PM' ? 13 : slot === '6PM' ? 18 : 20;
  const currentHour = istNow.getHours();
  const currentMinute = istNow.getMinutes();

  if (currentHour < targetHour) {
    return 'UPCOMING';
  } else if (currentHour === targetHour && currentMinute < 15) {
    return 'DRAWING';
  } else {
    return 'RESULT_OUT';
  }
}

/**
 * Calculates countdown to a specific slot on today's date in IST.
 */
export function getSlotCountdown(slot: '1PM' | '6PM' | '8PM'): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isPassed: boolean;
} {
  const istNow = getISTNow();
  const targetHour = slot === '1PM' ? 13 : slot === '6PM' ? 18 : 20;

  const target = new Date(istNow);
  target.setHours(targetHour, 0, 0, 0);

  const diffMs = target.getTime() - istNow.getTime();
  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isPassed: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds, isPassed: false };
}

