"""
YouTube data scraper using yt-dlp and scrapetube.
Extracts channel metadata and video information without API keys.
"""

import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yaml

from pipeline.src.utils.config import settings
from pipeline.src.utils.logger import log


def load_channels(yaml_path: Path | None = None) -> list[dict]:
    """Load channel list from validated YAML config."""
    path = yaml_path or (settings.CONFIG_DIR / "channels_validated.yaml")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    channels = []
    for niche, channel_list in data.items():
        for ch in channel_list:
            channels.append({
                "name": ch["name"],
                "url": ch["url"],
                "channel_id": ch.get("channel_id"),
                "niche": niche,
                "region": ch["region"],
            })

    log.info(f"Loaded {len(channels)} channels from {path.name}")
    return channels


def get_channel_videos(channel_url: str, limit: int | None = None) -> list[str]:
    """
    Get video IDs from a channel using yt-dlp.

    Args:
        channel_url: YouTube channel URL (@handle or /channel/ID)
        limit: Max number of videos to retrieve (None = all)

    Returns:
        List of video IDs
    """
    try:
        url = f"{channel_url}/videos"

        cmd = [
            "yt-dlp",
            "--flat-playlist",
            "--dump-json",
            "--no-warnings",
            url,
        ]
        if limit:
            cmd.extend(["--playlist-items", f"1:{limit}"])

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0 or not result.stdout.strip():
            log.warning(f"yt-dlp returned no videos for {channel_url}")
            return []

        video_ids = []
        for line in result.stdout.strip().split("\n"):
            if line.strip():
                try:
                    data = json.loads(line)
                    vid_id = data.get("id") or data.get("url")
                    if vid_id:
                        video_ids.append(vid_id)
                except json.JSONDecodeError:
                    continue

        log.debug(f"Found {len(video_ids)} videos from {channel_url}")
        return video_ids

    except subprocess.TimeoutExpired:
        log.warning(f"Timeout getting videos from {channel_url}")
        return []
    except Exception as e:
        log.error(f"Error getting videos from {channel_url}: {e}")
        return []


def get_channel_streams(channel_url: str, limit: int | None = None) -> list[str]:
    """
    Get live stream replay IDs from a channel's Live tab.
    """
    try:
        url = f"{channel_url}/streams"

        cmd = [
            "yt-dlp",
            "--flat-playlist",
            "--dump-json",
            "--no-warnings",
            url,
        ]
        if limit:
            cmd.extend(["--playlist-items", f"1:{limit}"])

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0 or not result.stdout.strip():
            log.debug(f"No streams found for {channel_url}")
            return []

        video_ids = []
        for line in result.stdout.strip().split("\n"):
            if line.strip():
                try:
                    data = json.loads(line)
                    vid_id = data.get("id") or data.get("url")
                    if vid_id:
                        video_ids.append(vid_id)
                except json.JSONDecodeError:
                    continue

        log.debug(f"Found {len(video_ids)} streams from {channel_url}")
        return video_ids

    except subprocess.TimeoutExpired:
        log.warning(f"Timeout getting streams from {channel_url}")
        return []
    except Exception as e:
        log.error(f"Error getting streams from {channel_url}: {e}")
        return []


def get_video_metadata(video_id: str) -> dict | None:
    """
    Extract video metadata using yt-dlp (no download).

    Returns dict with: title, views, likes, comments, duration,
    upload_date, description, tags, channel info, etc.
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "--dump-json",
                "--skip-download",
                "--no-warnings",
                url,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            log.warning(f"yt-dlp failed for {video_id}: {result.stderr[:200]}")
            return None

        data = json.loads(result.stdout.strip())

        return {
            "video_id": video_id,
            "title": data.get("title", ""),
            "description": (data.get("description") or "")[:1000],
            "channel_name": data.get("channel", ""),
            "channel_id": data.get("channel_id", ""),
            "channel_url": data.get("channel_url", ""),
            "upload_date": _parse_date(data.get("upload_date")),
            "duration_seconds": data.get("duration"),
            "view_count": data.get("view_count", 0),
            "like_count": data.get("like_count", 0),
            "comment_count": data.get("comment_count", 0),
            "tags": json.dumps(data.get("tags") or []),
            "categories": json.dumps(data.get("categories") or []),
            "thumbnail_url": data.get("thumbnail", ""),
            "language": data.get("language"),
            "is_live": data.get("is_live", False),
            "was_live": data.get("was_live", False),
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    except subprocess.TimeoutExpired:
        log.warning(f"Timeout for video {video_id}")
        return None
    except Exception as e:
        log.error(f"Error extracting {video_id}: {e}")
        return None


def get_channel_metadata(channel_url: str) -> dict | None:
    """
    Extract channel-level metadata using yt-dlp.
    Gets subscriber count, total views, channel description, etc.
    """
    try:
        # Get first video from channel, extract channel info from it
        result = subprocess.run(
            [
                "yt-dlp",
                "--dump-json",
                "--playlist-items", "1",
                "--flat-playlist",
                "--no-warnings",
                channel_url,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0 or not result.stdout.strip():
            log.warning(f"yt-dlp returned no data for {channel_url}")
            return None

        data = json.loads(result.stdout.strip().split("\n")[0])

        # Get subscriber count from a full video extract (flat-playlist doesn't have it)
        subscriber_count = None
        video_url = data.get("url") or data.get("webpage_url")
        if video_url:
            if not video_url.startswith("http"):
                video_url = f"https://www.youtube.com/watch?v={video_url}"
            vid_result = subprocess.run(
                [
                    "yt-dlp",
                    "--dump-json",
                    "--skip-download",
                    "--no-warnings",
                    video_url,
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if vid_result.returncode == 0 and vid_result.stdout.strip():
                vid_data = json.loads(vid_result.stdout.strip())
                subscriber_count = vid_data.get("channel_follower_count")
                data["channel"] = vid_data.get("channel") or data.get("channel")
                data["channel_id"] = vid_data.get("channel_id") or data.get("channel_id")
                data["channel_url"] = vid_data.get("channel_url") or data.get("channel_url")
                data["description"] = vid_data.get("channel_description") or ""

        return {
            "channel_id": data.get("channel_id", ""),
            "channel_name": data.get("channel", "") or data.get("uploader", ""),
            "channel_url": data.get("channel_url", "") or channel_url,
            "subscriber_count": subscriber_count,
            "description": (data.get("description") or "")[:500],
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        log.error(f"Error getting channel metadata for {channel_url}: {e}")
        return None


def scrape_channel(
    channel: dict,
    max_videos: int = 30,
    delay: float = 1.5,
) -> tuple[dict | None, pd.DataFrame]:
    """
    Full scrape for a single channel: metadata + recent videos.

    Args:
        channel: Dict with name, url, niche, region
        max_videos: Max videos to scrape per channel
        delay: Seconds between requests

    Returns:
        (channel_metadata, videos_dataframe)
    """
    name = channel["name"]
    url = channel["url"]
    niche = channel["niche"]
    region = channel["region"]

    log.info(f"Scraping: {name} ({niche}/{region})")
    log.debug(f"URL: {url}")

    # Get channel metadata
    ch_meta = get_channel_metadata(url)
    if ch_meta:
        ch_meta["niche"] = niche
        ch_meta["region"] = region
        ch_meta["config_name"] = name
        subs = ch_meta.get("subscriber_count")
        if subs:
            log.info(f"Channel: {ch_meta['channel_name']} | Subs: {subs:,}")
        else:
            log.info(f"Channel: {ch_meta['channel_name']}")
    else:
        log.warning(f"Could not get channel metadata for {name}")

    time.sleep(delay)

    # Get video list
    log.info(f"Getting video list (max {max_videos})...")
    video_ids = get_channel_videos(url, limit=max_videos)
    log.info(f"Found {len(video_ids)} videos from Videos tab")

    # Get live stream replays
    stream_ids = get_channel_streams(url, limit=max_videos)
    new_streams = [s for s in stream_ids if s not in set(video_ids)]
    if new_streams:
        log.info(f"Found {len(new_streams)} additional streams from Live tab")
        video_ids.extend(new_streams)
    else:
        log.debug("No additional streams found")
    log.info(f"Total: {len(video_ids)} videos to scrape")

    # Get metadata for each video
    videos = []
    for i, vid_id in enumerate(video_ids):
        log.debug(f"[{i+1}/{len(video_ids)}] Extracting {vid_id}")
        meta = get_video_metadata(vid_id)
        if meta:
            meta["niche"] = niche
            meta["region"] = region
            videos.append(meta)
            log.info(
                f"[{i+1}/{len(video_ids)}] {meta['title'][:60]} "
                f"({meta.get('view_count', 0):,} views)"
            )
        else:
            log.warning(f"[{i+1}/{len(video_ids)}] {vid_id} → skipped")
        time.sleep(delay)

    df = pd.DataFrame(videos) if videos else pd.DataFrame()
    log.success(f"{name}: {len(videos)} videos scraped")
    return ch_meta, df


def _parse_date(date_str: str | None) -> str | None:
    """Parse yt-dlp date format (YYYYMMDD) to ISO format."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y%m%d").strftime("%Y-%m-%d")
    except ValueError:
        return date_str


# === Quick test ===
if __name__ == "__main__":
    test_channel = {
        "name": "Fireship",
        "url": "https://www.youtube.com/@Fireship",
        "niche": "tech",
        "region": "GLOBAL",
    }

    log.info("=" * 60)
    log.info("SCRAPER TEST — Fireship (3 videos)")
    log.info("=" * 60)

    ch_meta, df = scrape_channel(test_channel, max_videos=3, delay=2)

    log.info("=" * 60)
    log.info("CHANNEL METADATA:")
    if ch_meta:
        for k, v in ch_meta.items():
            log.info(f"  {k}: {v}")

    log.info("VIDEOS:")
    if not df.empty:
        for _, row in df.iterrows():
            log.info(
                f"  {row['title'][:50]} | "
                f"Views: {row['view_count']:,} | "
                f"Likes: {row['like_count']:,} | "
                f"Date: {row['upload_date']}"
            )
    else:
        log.warning("No videos scraped")
