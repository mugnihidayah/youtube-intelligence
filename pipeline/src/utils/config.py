"""
central configuration loader
Reads from .env and provides settings across the pipeline
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# load .env
PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")


class Settings:
    """Application settings loaded from environment variables"""

    # google cloud
    GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

    # BigQuery
    BQ_DATASET_RAW: str = os.getenv("BQ_DATASET_RAW", "youtube_raw")
    BQ_DATASET_ANALYTICS: str = os.getenv("BQ_DATASET_ANALYTICS", "youtube_analytics")

    # Scraping
    SCRAPE_DELAY: float = float(os.getenv("SCRAPE_DELAY", "2.0"))  # seconds between requests
    MAX_VIDEOS_PER_CHANNEL: int = int(os.getenv("MAX_VIDEOS_PER_CHANNEL", "200"))
    MAX_COMMENTS_PER_VIDEO: int = int(os.getenv("MAX_COMMENTS_PER_VIDEO", "50"))

    # Paths
    CONFIG_DIR: Path = PROJECT_ROOT / "pipeline" / "src" / "config"
    CHANNELS_FILE: Path = CONFIG_DIR / "channels.yaml"

settings = Settings()