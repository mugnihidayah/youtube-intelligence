"""
Production ingestion flow using Prefect.
Scrapes all channels from config and loads to BigQuery.
Processes in batches to avoid data loss on failures.
"""

import time

import pandas as pd
from prefect import flow, task

from pipeline.src.ingestion.youtube_scraper import (
    load_channels,
    scrape_channel,
)
from pipeline.src.loaders.bigquery_loader import load_dataframe
from pipeline.src.utils.logger import log


@task(retries=2, retry_delay_seconds=30)
def scrape_single_channel(
    channel: dict,
    max_videos: int = 10,
    delay: float = 1.5,
) -> tuple[dict | None, pd.DataFrame]:
    """Prefect task: scrape a single channel."""
    try:
        ch_meta, df_videos = scrape_channel(
            channel, max_videos=max_videos, delay=delay
        )
        return ch_meta, df_videos
    except Exception as e:
        log.error(f"Failed to scrape {channel['name']}: {e}")
        return None, pd.DataFrame()


@task(retries=2, retry_delay_seconds=10)
def load_batch(
    channels_meta: list[dict],
    videos_dfs: list[pd.DataFrame],
    batch_num: int,
    is_first_batch: bool = False,
) -> dict:
    """Prefect task: load a batch of scraped data to BigQuery."""
    result = {"channels": 0, "videos": 0}

    # Channels
    if channels_meta:
        df_ch = pd.DataFrame(channels_meta)
        df_ch["subscriber_count"] = df_ch["subscriber_count"].astype("Int64")

        write_mode = "WRITE_TRUNCATE" if is_first_batch else "WRITE_APPEND"
        result["channels"] = load_dataframe(
            df_ch, table_name="raw_channels", write_disposition=write_mode
        )

    # Videos
    valid_dfs = [df for df in videos_dfs if not df.empty]
    if valid_dfs:
        df_vid = pd.concat(valid_dfs, ignore_index=True)

        # Ensure correct types
        for col in ["view_count", "like_count", "comment_count", "duration_seconds"]:
            if col in df_vid.columns:
                df_vid[col] = df_vid[col].astype("Int64")
        for col in ["is_live", "was_live"]:
            if col in df_vid.columns:
                df_vid[col] = df_vid[col].astype(bool)

        write_mode = "WRITE_TRUNCATE" if is_first_batch else "WRITE_APPEND"
        result["videos"] = load_dataframe(
            df_vid, table_name="raw_videos", write_disposition=write_mode
        )

    log.info(
        f"Batch {batch_num}: "
        f"{result['channels']} channels, {result['videos']} videos loaded"
    )
    return result


@flow(name="youtube-full-ingestion", log_prints=True)
def full_ingestion(
    max_videos: int = 10,
    batch_size: int = 10,
    delay: float = 1.5,
    niche_filter: str | None = None,
):
    """
    Full ingestion flow: scrape all channels → load to BigQuery.

    Args:
        max_videos: Max videos per channel
        batch_size: Channels per batch before loading to BigQuery
        delay: Seconds between requests
        niche_filter: Optional niche to filter (e.g., "gaming")
    """
    start_time = time.time()

    # Load channels
    channels = load_channels()

    if niche_filter:
        channels = [c for c in channels if c["niche"] == niche_filter]
        log.info(f"Filtered to niche '{niche_filter}': {len(channels)} channels")

    total = len(channels)
    log.info(f"{'='*60}")
    log.info(f"FULL INGESTION: {total} channels × {max_videos} videos")
    log.info(f"Batch size: {batch_size} | Estimated time: ~{total * max_videos * 5 / 60:.0f} min")
    log.info(f"{'='*60}")

    # Process in batches
    total_channels_loaded = 0
    total_videos_loaded = 0
    failed_channels = []

    for batch_start in range(0, total, batch_size):
        batch_end = min(batch_start + batch_size, total)
        batch_channels = channels[batch_start:batch_end]
        batch_num = (batch_start // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        log.info(f"\n{'─'*60}")
        log.info(f"BATCH {batch_num}/{total_batches} (channels {batch_start+1}-{batch_end})")
        log.info(f"{'─'*60}")

        batch_meta = []
        batch_videos = []

        for i, channel in enumerate(batch_channels):
            global_idx = batch_start + i + 1
            log.info(f"\n[{global_idx}/{total}] {channel['name']}")

            ch_meta, df_vid = scrape_single_channel(
                channel, max_videos=max_videos, delay=delay
            )

            if ch_meta:
                batch_meta.append(ch_meta)
            else:
                failed_channels.append(channel["name"])

            batch_videos.append(df_vid)

        # Load batch to BigQuery
        if batch_meta or any(not df.empty for df in batch_videos):
            is_first = batch_start == 0
            result = load_batch(batch_meta, batch_videos, batch_num, is_first)
            total_channels_loaded += result["channels"]
            total_videos_loaded += result["videos"]

        # Progress report
        elapsed = time.time() - start_time
        pct = batch_end / total * 100
        log.info(
            f"\nProgress: {batch_end}/{total} ({pct:.0f}%) | "
            f"Elapsed: {elapsed/60:.1f} min | "
            f"Channels: {total_channels_loaded} | Videos: {total_videos_loaded}"
        )

    # Final summary
    elapsed = time.time() - start_time
    log.success("INGESTION COMPLETE")
    log.success(f"Total time: {elapsed/60:.1f} minutes")
    log.success(f"Channels: {total_channels_loaded}")
    log.success(f"Videos: {total_videos_loaded}")
    if failed_channels:
        log.warning(f"Failed ({len(failed_channels)}): {', '.join(failed_channels)}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="YouTube Full Ingestion")
    parser.add_argument("--max-videos", type=int, default=10, help="Max videos per channel")
    parser.add_argument("--batch-size", type=int, default=10, help="Channels per batch")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between requests")
    parser.add_argument("--niche", type=str, default=None, help="Filter by niche")
    args = parser.parse_args()

    full_ingestion(
        max_videos=args.max_videos, 
        batch_size=args.batch_size,
        delay=args.delay,
        niche_filter=args.niche,
    )
