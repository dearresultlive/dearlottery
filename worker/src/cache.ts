/**
 * Global In-Memory Cache Layer for Cloudflare Worker Isolates
 * Shields D1 database from redundant reads during high-concurrency client polling.
 */

export const memoryLatestDrawsCache: Record<string, { data: any; timestamp: number }> = {};
export const memoryAnalyticsCache: Record<string, { data: any; timestamp: number }> = {};
export const memoryDateDrawsCache: Record<string, { data: any; timestamp: number }> = {};

export function clearMemoryCaches(): void {
  for (const k in memoryLatestDrawsCache) delete memoryLatestDrawsCache[k];
  for (const k in memoryAnalyticsCache) delete memoryAnalyticsCache[k];
  for (const k in memoryDateDrawsCache) delete memoryDateDrawsCache[k];
}
