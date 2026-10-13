-- ============================================================================
-- Cloudflare D1 (Serverless SQLite) Database Schema for Dear Lottery Engine
-- Optimized for sub-15ms edge lookups and high-concurrency ticket checks
-- ============================================================================

-- Table 1: Master Draws Table
-- Fields: id, draw_date, draw_time, draw_name, created_at (+ metadata)
CREATE TABLE IF NOT EXISTS draws (
    id TEXT PRIMARY KEY,                       -- e.g. '2026-10-13-1PM'
    draw_date TEXT NOT NULL,                   -- 'YYYY-MM-DD'
    draw_time TEXT NOT NULL,                   -- '1:00 PM', '6:00 PM', '8:00 PM'
    draw_name TEXT NOT NULL,                   -- e.g. 'DEAR TEESTA MORNING'
    source_url TEXT,                           -- Official source PDF/Image URL
    checksum TEXT NOT NULL,                    -- SHA-256 integrity hash
    raw_json TEXT NOT NULL,                    -- Full serialized prize JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index on draw_date for instant calendar/historical querying
CREATE INDEX IF NOT EXISTS idx_draws_draw_date ON draws(draw_date);
CREATE INDEX IF NOT EXISTS idx_draws_date_time ON draws(draw_date, draw_time);

-- Table 2: Prizes Table (Flat list of all prize winners)
-- Fields: id, draw_id, prize_rank, prize_amount, ticket_number, last_digits (+ series)
CREATE TABLE IF NOT EXISTS prizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_id TEXT NOT NULL,
    prize_rank TEXT NOT NULL,                  -- '1st', 'Consolation', '2nd', '3rd', '4th', '5th'
    prize_amount INTEGER NOT NULL,             -- Amount in INR
    ticket_number TEXT NOT NULL,               -- 5 digits for 1st/2nd, 4 digits for 3rd/4th/5th
    last_digits TEXT NOT NULL,                 -- Exactly last 4 digits (e.g. '9283' for '19283', '4829' for '4829')
    series TEXT,                               -- e.g. '84D' (NULL for 2nd - 5th)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE
);

-- Crucial High-Performance SQL Indices for Instant Ticket Checker
-- Index on ticket_number for exact 5-digit matches (1st, 2nd, Consolation)
CREATE INDEX IF NOT EXISTS idx_prizes_ticket_number ON prizes(ticket_number);

-- Index on last_digits for instant 4-digit search across 3rd, 4th, 5th prizes & endings
CREATE INDEX IF NOT EXISTS idx_prizes_last_digits ON prizes(last_digits);

-- Composite indices for draw-scoped fast lookups
CREATE INDEX IF NOT EXISTS idx_prizes_draw_last_digits ON prizes(draw_id, last_digits);
CREATE INDEX IF NOT EXISTS idx_prizes_draw_rank ON prizes(draw_id, prize_rank);

-- Table 3: Pre-aggregated Digit Frequency Matrix (Positions 1 through 5, Digits 0 through 9)
CREATE TABLE IF NOT EXISTS digit_frequency (
    digit TEXT NOT NULL,                       -- '0' through '9'
    position INTEGER NOT NULL,                 -- 1, 2, 3, 4, 5
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (digit, position)
);

-- Initialize default 0 counts for all 50 position/digit combinations
INSERT OR IGNORE INTO digit_frequency (digit, position, count) VALUES
('0',1,0),('0',2,0),('0',3,0),('0',4,0),('0',5,0),
('1',1,0),('1',2,0),('1',3,0),('1',4,0),('1',5,0),
('2',1,0),('2',2,0),('2',3,0),('2',4,0),('2',5,0),
('3',1,0),('3',2,0),('3',3,0),('3',4,0),('3',5,0),
('4',1,0),('4',2,0),('4',3,0),('4',4,0),('4',5,0),
('5',1,0),('5',2,0),('5',3,0),('5',4,0),('5',5,0),
('6',1,0),('6',2,0),('6',3,0),('6',4,0),('6',5,0),
('7',1,0),('7',2,0),('7',3,0),('7',4,0),('7',5,0),
('8',1,0),('8',2,0),('8',3,0),('8',4,0),('8',5,0),
('9',1,0),('9',2,0),('9',3,0),('9',4,0),('9',5,0);

-- Table 4: Indexing & Push Audit Log
CREATE TABLE IF NOT EXISTS indexing_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_id TEXT NOT NULL,
    service TEXT NOT NULL,                     -- 'INDEXNOW', 'GOOGLE_INDEXING', 'ONESIGNAL'
    status TEXT NOT NULL,                      -- 'SUCCESS', 'FAILED'
    response_payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
