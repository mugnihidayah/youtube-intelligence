"""
End-to-end pipeline test.
Scrapes a few channels and loads data to BigQuery.
"""

import pandas as pd

from pipeline.src.ingestion.youtube_scraper import scrape_channel
from pipeline.src.loaders.bigquery_loader import load_dataframe
from pipeline.src.utils.logger import log


# Test with 3 channels from different niches (3 videos each)
TEST_CHANNELS = [
    {
        "name": "Fireship",
        "url": "https://www.youtube.com/@Fireship",
        "niche": "tech",
        "region": "GLOBAL",
    },
    {
        "name": "Windah Basudara",
        "url": "https://www.youtube.com/@WindahBasudara",
        "niche": "gaming",
        "region": "ID",
    },
    {
        "name": "Kok Bisa?",
        "url": "https://www.youtube.com/@KokBisa",
        "niche": "education",
        "region": "ID",
    },
]


def run_test_pipeline():
    log.info("END-TO-END PIPELINE TEST")
    log.info("3 channels × 3 videos = ~9 videos")

    all_channels_meta = []
    all_videos = []

    for ch in TEST_CHANNELS:
        ch_meta, df_videos = scrape_channel(ch, max_videos=3, delay=2)

        if ch_meta:
            all_channels_meta.append(ch_meta)

        if not df_videos.empty:
            all_videos.append(df_videos)

    # Combine DataFrames
    df_channels = pd.DataFrame(all_channels_meta)
    df_videos = pd.concat(all_videos, ignore_index=True) if all_videos else pd.DataFrame()

    log.info(f"SCRAPE COMPLETE: {len(df_channels)} channels, {len(df_videos)} videos")

    if df_channels.empty or df_videos.empty:
        log.error("No data scraped, aborting BigQuery load")
        return

    # Load to BigQuery
    log.info("Loading to BigQuery...")

    # Convert types for BigQuery compatibility
    df_channels["subscriber_count"] = df_channels["subscriber_count"].astype("Int64")

    df_videos["view_count"] = df_videos["view_count"].astype("Int64")
    df_videos["like_count"] = df_videos["like_count"].astype("Int64")
    df_videos["comment_count"] = df_videos["comment_count"].astype("Int64")
    df_videos["duration_seconds"] = df_videos["duration_seconds"].astype("Int64")
    df_videos["is_live"] = df_videos["is_live"].astype(bool)
    df_videos["was_live"] = df_videos["was_live"].astype(bool)

    rows_ch = load_dataframe(
        df_channels,
        table_name="raw_channels",
        write_disposition="WRITE_TRUNCATE",
    )

    rows_vid = load_dataframe(
        df_videos,
        table_name="raw_videos",
        write_disposition="WRITE_TRUNCATE",
    )

    log.success("PIPELINE TEST COMPLETE")
    log.success(f"Channels loaded: {rows_ch}")
    log.success(f"Videos loaded:   {rows_vid}")


if __name__ == "__main__":
    run_test_pipeline()
