"""
Poller module for Dear Lottery official results.
Polls official state lottery websites at scheduled times with exponential backoff and jitter.
"""

import time
import random
import logging
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, date

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    requests = None

from .config import (
    OFFICIAL_SOURCES,
    MAX_POLL_DURATION_SECONDS,
    POLL_INTERVAL_SECONDS,
    REQUEST_TIMEOUT_SECONDS,
    USER_AGENT
)

logger = logging.getLogger("dear_lottery_poller")


class LotterySourcePoller:
    """
    Handles robust polling across multiple official portals and mirror CDNs.
    """

    def __init__(self):
        if requests:
            self.session = requests.Session()
            retry_strategy = Retry(
                total=3,
                backoff_factor=1,
                status_forcelist=[429, 500, 502, 503, 504],
                allowed_methods=["HEAD", "GET"]
            )
            adapter = HTTPAdapter(max_retries=retry_strategy)
            self.session.mount("https://", adapter)
            self.session.mount("http://", adapter)
            self.session.headers.update({
                "User-Agent": USER_AGENT,
                "Accept": "application/pdf,image/webp,image/jpeg,*/*",
                "Accept-Language": "en-US,en;q=0.9"
            })
        else:
            self.session = None

    def get_candidate_urls(self, target_date: date, time_slot: str) -> list[str]:
        """
        Builds probable direct PDF / image URLs for the specified date and draw time.
        time_slot: '1PM', '6PM', or '8PM'
        """
        urls = []
        d_str = target_date.strftime("%d")
        m_str = target_date.strftime("%m")
        y_str = target_date.strftime("%Y")

        time_codes = {
            "1PM": ["1pm", "115pm", "1-00-pm", "morning"],
            "6PM": ["6pm", "615pm", "6-00-pm", "day"],
            "8PM": ["8pm", "815pm", "8-00-pm", "night"]
        }

        codes = time_codes.get(time_slot.upper(), ["1pm"])
        for src in OFFICIAL_SOURCES:
            for c in codes:
                # Nagaland pattern: e.g. 13_10_2026_1pm.pdf
                u1 = f"{src['base_url']}/results/{d_str}_{m_str}_{y_str}_{c}.pdf"
                u2 = f"{src['base_url']}/pdf/{y_str}/{m_str}/{d_str}-{c}.pdf"
                urls.extend([u1, u2])

        return urls

    def poll_for_result(
        self,
        target_date: Optional[date] = None,
        time_slot: str = "1PM",
        max_duration: int = MAX_POLL_DURATION_SECONDS
    ) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Polls official sources until the result PDF is successfully downloaded or timeout is reached.
        Returns: (file_bytes, source_url) or (None, None)
        """
        if not requests or not self.session:
            logger.warning("Requests library not installed. Falling back.")
            return None, None

        if target_date is None:
            target_date = datetime.now().date()

        candidate_urls = self.get_candidate_urls(target_date, time_slot)
        start_time = time.time()
        attempt = 1

        logger.info(f"Starting poller for {target_date} [{time_slot}]. {len(candidate_urls)} URLs queued.")

        while time.time() - start_time < max_duration:
            for url in candidate_urls:
                try:
                    resp = self.session.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
                    if resp.status_code == 200 and len(resp.content) > 1024:
                        content_type = resp.headers.get("Content-Type", "")
                        # Verify it is PDF or Image
                        if "pdf" in content_type or resp.content.startswith(b"%PDF") or "image" in content_type:
                            logger.info(f"Result successfully retrieved from: {url} ({len(resp.content)} bytes)")
                            return resp.content, url
                except Exception as e:
                    logger.debug(f"Attempt failed for {url}: {e}")

            # Exponential backoff with jitter
            elapsed = time.time() - start_time
            jitter = random.uniform(0.8, 1.2)
            sleep_time = min(POLL_INTERVAL_SECONDS * jitter, max(5.0, max_duration - elapsed))
            logger.info(f"Attempt #{attempt} completed. No result published yet. Sleeping {sleep_time:.1f}s...")
            time.sleep(sleep_time)
            attempt += 1

        logger.warning(f"Polling timed out after {max_duration} seconds for {target_date} [{time_slot}].")
        return None, None
