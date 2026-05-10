"""
BigQuery batch loader utility.
Handles creating datasets, tables, and loading DataFrames.
"""

from datetime import datetime, timedelta, timezone

from google.cloud import bigquery
import pandas as pd

from pipeline.src.utils.config import settings
from pipeline.src.utils.logger import log


def get_client() -> bigquery.Client:
    """Get authenticated BigQuery client."""
    return bigquery.Client(project=settings.GCP_PROJECT_ID)


def ensure_dataset(client: bigquery.Client, dataset_id: str) -> None:
    """Create dataset if it doesn't exist."""
    dataset_ref = f"{settings.GCP_PROJECT_ID}.{dataset_id}"
    dataset = bigquery.Dataset(dataset_ref)
    dataset.location = "US"
    client.create_dataset(dataset, exists_ok=True)
    log.debug(f"Dataset '{dataset_id}' ensured")


def refresh_table_expiration(client: bigquery.Client, table_id: str) -> None:
    """Refresh table expiration to 60 days from now (Sandbox limit)."""
    try:
        table = client.get_table(table_id)
        table.expires = datetime.now(timezone.utc) + timedelta(days=60)
        client.update_table(table, ["expires"])
        log.debug(f"Table expiration refreshed: {table_id}")
    except Exception as e:
        log.warning(f"Could not refresh expiration for {table_id}: {e}")


def load_dataframe(
    df: pd.DataFrame,
    table_name: str,
    dataset_id: str | None = None,
    write_disposition: str = "WRITE_APPEND",
) -> int:
    """
    Load a pandas DataFrame to BigQuery table.

    Args:
        df: DataFrame to load
        table_name: Target table name (e.g., 'raw_videos')
        dataset_id: BigQuery dataset (defaults to youtube_raw)
        write_disposition: WRITE_APPEND, WRITE_TRUNCATE, or WRITE_EMPTY

    Returns:
        Number of rows loaded
    """
    if df.empty:
        log.warning(f"Empty DataFrame, skipping load to {table_name}")
        return 0

    client = get_client()
    dataset = dataset_id or settings.BQ_DATASET_RAW
    table_id = f"{settings.GCP_PROJECT_ID}.{dataset}.{table_name}"

    ensure_dataset(client, dataset)

    job_config = bigquery.LoadJobConfig(
        write_disposition=write_disposition,
    )

    log.info(f"Loading {len(df)} rows → {table_id}")
    job = client.load_table_from_dataframe(df, table_id, job_config=job_config)
    job.result()  # Wait for completion

    # Refresh table expiration (Sandbox = 60 day limit)
    refresh_table_expiration(client, table_id)

    log.success(f"Loaded {job.output_rows} rows → {table_id}")
    return job.output_rows # type: ignore


def query(sql: str) -> pd.DataFrame:
    """Run a SQL query and return results as DataFrame."""
    client = get_client()
    log.debug(f"Running query: {sql[:100]}...")
    return client.query(sql).to_dataframe()


def table_exists(table_name: str, dataset_id: str | None = None) -> bool:
    """Check if a table exists in BigQuery."""
    client = get_client()
    dataset = dataset_id or settings.BQ_DATASET_RAW
    table_id = f"{settings.GCP_PROJECT_ID}.{dataset}.{table_name}"
    try:
        client.get_table(table_id)
        return True
    except Exception:
        return False
