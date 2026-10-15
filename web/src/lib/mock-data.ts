/**
 * Legacy mock helper routed directly to 100% official verified government gazette draws.
 * Zero random pseudo numbers are ever generated.
 */

import { getVerifiedDraw } from './verified-draws';
import { getISTNow } from './lottery-utils';

export function generateWebMockDraw(dateStr: string, timeSlot: '1PM' | '6PM' | '8PM') {
  return getVerifiedDraw(dateStr, timeSlot, getISTNow());
}
