export interface Env {
  DB: D1Database;
  RESULTS_BUCKET?: R2Bucket;
  API_KEY: string;
  ENVIRONMENT: string;
  FRONTEND_URL: string;
  INDEXNOW_KEY: string;
  ONESIGNAL_APP_ID?: string;
  ONESIGNAL_REST_KEY?: string;
  GOOGLE_CLIENT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  GITHUB_TOKEN?: string;
  SAMBAD_RELAY_URL?: string;
}

export interface DrawRecord {
  id: string; // e.g. '2026-10-13-1PM'
  draw_date: string; // 'YYYY-MM-DD'
  draw_time: string; // '1:00 PM', '6:00 PM', '8:00 PM'
  draw_name: string;
  source_url?: string;
  checksum: string;
  raw_json: string;
  created_at?: string;
}

export interface PrizeRecord {
  id?: number;
  draw_id: string;
  prize_rank: '1st' | 'Consolation' | '2nd' | '3rd' | '4th' | '5th';
  prize_amount: number;
  ticket_number: string;
  last_digits: string;
  series: string | null;
}

export interface IngestPayload {
  draw: DrawRecord;
  prizes: PrizeRecord[];
}

export interface CheckTicketMatch {
  matched: boolean;
  ticket_number: string;
  draw_id: string;
  draw_name: string;
  draw_time: string;
  draw_date: string;
  prize_rank: string;
  prize_amount: number;
  series_matched?: boolean;
  required_series?: string | null;
}

export interface FrequencyDigitStat {
  digit: string;
  position: number;
  count: number;
}

export interface HotNumberStat {
  ticket_number: string;
  occurrences: number;
  last_seen_date: string;
}

export interface EndingStat {
  ending: string;
  frequency: number;
  last_seen_date: string;
}

export interface FrequencyAnalysisResult {
  days: number;
  total_draws_analyzed: number;
  four_digit_endings: {
    most_frequent: EndingStat[];
    least_frequent: EndingStat[];
  };
  two_digit_endings: {
    most_frequent: EndingStat[];
    least_frequent: EndingStat[];
  };
}
