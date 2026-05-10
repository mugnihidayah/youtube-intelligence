"""
Incremental ingestion flow
Only scrapes new videos that don't exist in BigQuery yet
Update channel metadata every run
"""

import time
from datetime import datetime, timezone

import pandas as pd
from prefect import flow, task

from pipeline.src.ingestion.youtube_scraper import (
    get_video_metadata,
    get_channel_videos,
    get_channel_streams,
    get_channel_metadata,
    load_channels,
)
from pipeline.src.loaders.bigquery_loader import (
    load_dataframe,
    query,
    table_exists,
)
from pipeline.src.utils.config import settings
from pipeline.src.utils.logger import log


def get_existing_video_ids() -> set[str]:
    """Query BigQuery for all video_ids already ingested"""
    if not table_exists("raw_videos"):
        log.info("raw_videos table doesn't exist yet. Firts run.")
        return set()
    
    table = f"{settings.GCP_PROJECT_ID}.{settings.BQ_DATASET_RAW}.raw_videos"
    df = query(f"SELECT DISTINCT video_id FROM `{table}`")
    existing = set(df["video_id"].tolist())
    log.info(f"Found {len(existing)} existing video_ids in BigQuery")
    return existing


@task(retries=2, retry_delay_seconds=30)
def scrape_channel_incremental(
    channel: dict,
    existing_ids: set[str],
    max_new_videos: int = 20,
    delay: float = 1.5,
) -> tuple[dict | None, pd.DataFrame, int, int]:
    """
    Incremental scrape only new videos

    Returns:
        (channel_metadata, new_videos_df, total_found, new_count)
    """
    name = channel["name"]
    url = channel["url"]
    niche = channel["niche"]
    region = channel["region"]

    log.info(f"{name} ({niche}/{region})")

    # channel metadata (always refresh for subscriber count)
    ch_meta = get_channel_metadata(url)
    if ch_meta:
        ch_meta["niche"] = niche
        ch_meta["region"] = region
        ch_meta["config_name"] = name
        subs = ch_meta.get("subscriber_count")
        log.info(f"Subs: {subs:,}" if subs else "Subs: N/A")
    else:
        log.warning("Could not get channel metadata")

    time.sleep(delay)

    # get video list (Videos tab + Live tab)
    video_ids = get_channel_videos(url, limit=30)
    stream_ids = get_channel_streams(url, limit=30)
    new_streams = [s for s in stream_ids if s not in set(video_ids)]
    video_ids.extend(new_streams)
    total_found = len(video_ids)

    # filter only new video_ids
    new_ids = [vid for vid in video_ids if vid not in existing_ids]
    new_ids = new_ids[:max_new_videos]

    if not new_ids:
        log.info(f"0 new videos (checked {total_found})")
        return ch_meta, pd.DataFrame(), total_found, 0
    
    log.info(f"{len(new_ids)} new videos (of {total_found} checked)")

    # scrape only new videos
    videos = []
    for i, vid_id in enumerate(new_ids):
        meta = get_video_metadata(vid_id)
        if meta:
            meta["niche"] = niche
            meta["region"] = region
            videos.append(meta)
            log.info(
                f"[{i+1}/{len(new_ids)}] {meta['title'][:50]}"
                f"({meta.get('view_count', 0):,} views)"
            )
        else:
            log.warning(f"[{i+1}/{len(new_ids)}] {vid_id} skipped")

        time.sleep(delay)
    
    df = pd.DataFrame(videos) if videos else pd.DataFrame()
    return ch_meta, df, total_found, len(videos)


@task(retries=2, retry_delay_seconds=10)
def load_incrimental_batch(
    channel_meta: list[dict],
    videos_dfs: list[pd.DataFrame],
    batch_num: int,
) -> dict:
    """Load incremental batch to BigQuery"""
    result = {"channels": 0, "videos": 0}

    # channel TRUNCATE (always overwrite with latest subriber counts)
    if channel_meta:
        df_ch = pd.DataFrame(channel_meta)
        df_ch["subscriber_count"] = df_ch["subscriber_count"].astype("Int64")
        mode = "WRITE_APPEND"
        result["channels"] = load_dataframe(df_ch, "raw_channels", write_disposition=mode)

    # videos always APPEND (incremental)
    valid_dfs = [df for df in videos_dfs if not df.empty]
    if valid_dfs:
        df_vid = pd.concat(valid_dfs, ignore_index=True)
        for col in ["view_count", "like_count", "comment_count", "duration_seconds"]:
            if col in df_vid.columns:
                df_vid[col] = df_vid[col].astype("Int64")
        for col in {"is_live", "was_live"}:
            if col in df_vid.columns:
                df_vid[col] = df_vid[col].astype(bool)
        result["videos"] = load_dataframe(df_vid, "raw_videos", write_disposition="WRITE_APPEND")
    
    log.info(f"Batch {batch_num}: {result['channels']} ch, {result['videos']} vid loaded")
    return result


@flow(name="youtube-incremental-ingestion", log_prints=True)
def incremental_ingestion(
    max_new_videos: int = 20,
    batch_size: int = 10,
    delay: float = 1.5,
    niche_filter: str | None = None,
):
    """
    Incremental ingestion only scrape new videos and refresh channel metadata

    Args:
        max_new_videos: max new videos to scrape per channel
        batch_size: channel per batch before BigQuery load
        delay: seconds between requests
        niche_filter: optional niche filter
    """
    start_time = time.time()

    # load channel
    channels = load_channels()
    if niche_filter:
        channels = [c for c in channels if c["niche"] == niche_filter]

    total = len(channels)

    # get existing video_ids from BigQuery
    existing_ids = get_existing_video_ids()

    log.info("INCREMENTAL INGESTION")
    log.info(f"Channels: {total}")
    log.info(f"Existing videos: {len(existing_ids)}")
    log.info(f"Max new per channel: {max_new_videos}")

    # process in batches
    total_new_videos = 0
    total_channels_loaded = 0
    skipped_channels = 0
    failed_channels = []

    for batch_start in range(0, total, batch_size):
        batch_end = min(batch_start + batch_size, total)
        batch_channels = channels[batch_start:batch_end]
        batch_num = (batch_start // batch_size) + 1

        log.info(f"BATCH {batch_num} (channels {batch_start+1}-{batch_end})")

        batch_meta = []
        batch_videos = []

        for i, channel in enumerate(batch_channels):
            global_idx = batch_start + i + 1

            try:
                ch_meta, df_vid, total_found, new_count = scrape_channel_incremental(
                    channel, existing_ids, max_new_videos, delay
                )

                if ch_meta:
                    batch_meta.append(ch_meta)
                    total_channels_loaded += 1
                
                batch_videos.append(df_vid)
                total_new_videos += new_count

                if new_count == 0:
                    skipped_channels += 1

                # add new video_ids to existing set
                if not df_vid.empty:
                    existing_ids.update(df_vid["video_id"].tolist())

            except Exception as e:
                log.error(f"{channel['name']}: {e}")
                failed_channels.append(channel['name'])

        # load batch
        if batch_meta or any(not df.empty for df in batch_videos):
            load_incrimental_batch(batch_meta, batch_videos, batch_num)

        # progress
        elapsed = time.time() - start_time
        log.info(
            f"Progress: {batch_end}/{total} | "
            f"New Videos: {total_new_videos} |"
            f"Elapsed: {elapsed/60:.1f} min"
        )

    # summary
    elapsed = time.time() - start_time
    log.success("INCREMENTAL INGESTION COMPLETE")
    log.success(f"Time: {elapsed/60:.1f} minutes")
    log.success(f"Channels: {total_channels_loaded}")
    log.success(f"New Videos: {total_new_videos}")
    log.success(f"Skipped (0 new): {skipped_channels}")
    if failed_channels:
        log.warning(f"Failed ({len(failed_channels)}): {', '.join(failed_channels)}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="YouTube Incremental Ingestion")
    parser.add_argument("--max-new", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=10)
    parser.add_argument("--delay", type=float, default=1.5)
    parser.add_argument("--niche", type=str, default=None)
    args = parser.parse_args()
    incremental_ingestion(
        max_new_videos=args.max_new,
        batch_size=args.batch_size,
        delay=args.delay,
        niche_filter=args.niche,
    )