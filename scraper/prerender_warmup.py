"""
Pre-Render & Edge Cache Warmup Script.
Executes 30 minutes before scheduled draw times (12:30 PM, 5:30 PM, 7:30 PM IST)
to ensure upcoming draw URLs are pre-cached at Cloudflare Edge and ready for instant indexing.
"""

import os
import sys
import requests
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))
FRONTEND_BASE = os.environ.get("FRONTEND_URL", "https://dearresultlive.in")
INDEXNOW_KEY = os.environ.get("INDEXNOW_KEY", "dearlotteryindexnowkey2026")


def get_target_warmup_urls():
    today = datetime.now(IST).strftime("%Y-%m-%d")
    return [
        f"{FRONTEND_BASE}/",
        f"{FRONTEND_BASE}/checker",
        f"{FRONTEND_BASE}/analytics",
        f"{FRONTEND_BASE}/results/{today}",
        f"{FRONTEND_BASE}/results/{today}/1pm",
        f"{FRONTEND_BASE}/results/{today}/6pm",
        f"{FRONTEND_BASE}/results/{today}/8pm",
        f"{FRONTEND_BASE}/sitemap.xml"
    ]


def warmup_edge_nodes():
    urls = get_target_warmup_urls()
    print(f"[{datetime.now(IST).isoformat()}] Warming up {len(urls)} edge endpoints...")

    for url in urls:
        try:
            res = requests.get(
                url,
                headers={"User-Agent": "DearLotteryEdgePreRenderer/1.0"},
                timeout=10
            )
            print(f"  [OK {res.status_code}] {url} ({len(res.content)} bytes)")
        except Exception as e:
            print(f"  [ERROR] Failed to warm {url}: {e}")

    # Pre-ping IndexNow to notify bots 30 minutes ahead of draw
    try:
        host = requests.utils.urlparse(FRONTEND_BASE).hostname or "dearresultlive.in"
        payload = {
            "host": host,
            "key": INDEXNOW_KEY,
            "keyLocation": f"https://{host}/{INDEXNOW_KEY}.txt",
            "urlList": urls
        }
        idx_res = requests.post(
            "https://api.indexnow.org/indexnow",
            json=payload,
            headers={"Content-Type": "application/json; charset=utf-8"},
            timeout=10
        )
        print(f"  [IndexNow Pre-Ping] Status: {idx_res.status_code}")
    except Exception as e:
        print(f"  [IndexNow Error]: {e}")


if __name__ == "__main__":
    warmup_edge_nodes()
