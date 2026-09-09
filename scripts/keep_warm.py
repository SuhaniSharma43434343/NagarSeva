"""Best-effort external health probes. Not an uptime guarantee or quota bypass."""
import concurrent.futures
import json
import os
from datetime import datetime
from urllib.parse import urlsplit
from urllib.request import urlopen
from zoneinfo import ZoneInfo

def in_window(hour, start, end):
    return start <= hour < end if start < end else hour >= start or hour < end

def main():
    zone = ZoneInfo(os.getenv("WAKE_TIMEZONE") or "Asia/Kolkata")
    start = int(os.getenv("WAKE_START_HOUR") or "9")
    end = int(os.getenv("WAKE_END_HOUR") or "16")
    if not 0 <= start <= 23 or not 0 <= end <= 23 or start == end:
        raise ValueError("Choose distinct start/end hours from 0 through 23.")
    if not in_window(datetime.now(zone).hour, start, end):
        print("Outside wake window; no requests sent.")
        return
    urls = json.loads(os.getenv("KEEP_WARM_URLS", "[]"))
    if not isinstance(urls, list) or not 1 <= len(urls) <= 3:
        raise ValueError("KEEP_WARM_URLS must contain 1â€“3 health endpoint URLs.")
    for url in urls:
        parsed = urlsplit(url)
        if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".onrender.com") or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ("/health", "/api/health"):
            raise ValueError("Only HTTPS Render health endpoints without credentials are accepted.")
    def probe(url):
        with urlopen(url, timeout=120) as response:
            if response.status != 200:
                raise RuntimeError("Health probe failed")
        print(f"{urlsplit(url).hostname}: healthy")
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(probe, urls))

if __name__ == "__main__":
    main()
