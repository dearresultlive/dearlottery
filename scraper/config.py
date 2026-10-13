"""
Configuration module for the Dear Lottery Scraping & Analytics Pipeline.
Defines draw schedules, prize tiers, official source endpoints, and ingestion settings.
"""

import os
from typing import Dict, Any

# Environment variables with sensible defaults
WORKER_API_URL = os.environ.get("WORKER_API_URL", "http://127.0.0.1:8787/api/results")
WORKER_API_KEY = os.environ.get("WORKER_API_KEY", "dear_lottery_secret_key_prod_2026")
ONESIGNAL_APP_ID = os.environ.get("ONESIGNAL_APP_ID", "")
ONESIGNAL_API_KEY = os.environ.get("ONESIGNAL_API_KEY", "")

# Draw timings in Indian Standard Time (IST)
DRAW_SCHEDULE = {
    "1PM": {
        "time_str": "1:00 PM",
        "name_prefix": "DEAR MORNING",
        "cron_utc": "28 7 * * *",       # 12:58 PM IST
        "official_label": "1:00 PM MORNING"
    },
    "6PM": {
        "time_str": "6:00 PM",
        "name_prefix": "DEAR DAY",
        "cron_utc": "28 12 * * *",      # 5:58 PM IST
        "official_label": "6:00 PM DAY"
    },
    "8PM": {
        "time_str": "8:00 PM",
        "name_prefix": "DEAR NIGHT",
        "cron_utc": "28 14 * * *",      # 7:58 PM IST
        "official_label": "8:00 PM EVENING"
    }
}

# Official Prize Distribution for Dear Lottery (Nagaland & Sikkim State Lotteries)
PRIZE_STRUCTURE = {
    "1st": {
        "title": "1st Prize",
        "amount": 10000000,             # ₹1 Crore (₹10,000,000)
        "count": 1,
        "format": "SERIES_5DIGIT",      # e.g., "84D 19283" or "78K 54321"
        "digits": 5
    },
    "Consolation": {
        "title": "Consolation Prize",
        "amount": 1000,                 # ₹1,000
        "count": "REMAINING_SERIES",    # All other series for the same 5-digit number
        "format": "5DIGIT",
        "digits": 5
    },
    "2nd": {
        "title": "2nd Prize",
        "amount": 9000,                 # ₹9,000
        "count": 10,
        "format": "5DIGIT",             # 10 five-digit numbers
        "digits": 5
    },
    "3rd": {
        "title": "3rd Prize",
        "amount": 450,                  # ₹450
        "count": 10,
        "format": "4DIGIT",             # 10 four-digit numbers
        "digits": 4
    },
    "4th": {
        "title": "4th Prize",
        "amount": 250,                  # ₹250
        "count": 10,
        "format": "4DIGIT",             # 10 four-digit numbers
        "digits": 4
    },
    "5th": {
        "title": "5th Prize",
        "amount": 120,                  # ₹120
        "count": 100,
        "format": "4DIGIT",             # 100 four-digit numbers
        "digits": 4
    }
}

# Official Source Mirrors & CDNs for PDF / Image Results
OFFICIAL_SOURCES = [
    {
        "name": "Nagaland State Lotteries Portal",
        "base_url": "http://www.nagalandlotteries.com",
        "pdf_pattern": "http://www.nagalandlotteries.com/old_results/{day}_{month}_{year}_{time_code}.pdf"
    },
    {
        "name": "Lottery Sambad Official",
        "base_url": "https://www.lotterysambad.com",
        "pdf_pattern": "https://www.lotterysambad.com/result/{year}/{month}/{day}-{time_code}.pdf"
    },
    {
        "name": "Dear Lotteries Mirror CDN",
        "base_url": "https://www.dearlotteries.com",
        "pdf_pattern": "https://www.dearlotteries.com/results/{year}-{month}-{day}-{time_code}.pdf"
    }
]

# Polling configuration
MAX_POLL_DURATION_SECONDS = 1800  # 30 minutes
POLL_INTERVAL_SECONDS = 30        # Poll every 30 seconds
REQUEST_TIMEOUT_SECONDS = 15
MAX_RETRIES = 5
BACKOFF_FACTOR = 1.5
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (DearLotteryEngine/1.0)"
