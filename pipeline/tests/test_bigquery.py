"""
Test BigQuery connectivity & data loading WITHOUT billing.
If this works, we proceed with BigQuery.
If this fails, we pivot to Supabase PostgreSQL.
"""

import os
from dotenv import load_dotenv
from google.cloud import bigquery
import pandas as pd

load_dotenv()

def test_bigquery():
    project_id = os.getenv("GCP_PROJECT_ID")
    dataset_id = os.getenv("BQ_DATASET_RAW", "youtube_raw")

    print(f"Project: {project_id}")
    print(f"Dataset: {dataset_id}")

    # 1. Initialize client
    client = bigquery.Client(project=project_id)
    print("Client initialized")

    # 2. Create dataset (if not exists)
    dataset_ref = f"{project_id}.{dataset_id}"
    try:
        client.get_dataset(dataset_ref)
        print(f"Dataset '{dataset_id}' already exists")
    except Exception:
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = "US"
        client.create_dataset(dataset, exists_ok=True)
        print(f"Dataset '{dataset_id}' created")

    # 3. Create table
    table_id = f"{dataset_ref}.test_table"
    schema = [
        bigquery.SchemaField("video_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("title", "STRING"),
        bigquery.SchemaField("views", "INTEGER"),
        bigquery.SchemaField("upload_date", "DATE"),
    ]

    table = bigquery.Table(table_id, schema=schema)
    try:
        client.delete_table(table_id, not_found_ok=True)
        table = client.create_table(table)
        print(f"Table '{table_id}' created")
    except Exception as e:
        print(f"Table creation FAILED: {e}")
        return False

    # 4. Load data (batch - this is what we need to work)
    df = pd.DataFrame([
        {"video_id": "abc123", "title": "Test Video 1", "views": 1000, "upload_date": "2025-01-01"},
        {"video_id": "def456", "title": "Test Video 2", "views": 5000, "upload_date": "2025-02-15"},
        {"video_id": "ghi789", "title": "Test Video 3", "views": 250, "upload_date": "2025-03-20"},
    ])
    df["upload_date"] = pd.to_datetime(df["upload_date"]).dt.date

    try:
        job_config = bigquery.LoadJobConfig(write_disposition="WRITE_TRUNCATE")
        job = client.load_table_from_dataframe(df, table_id, job_config=job_config)
        job.result()  # Wait for completion
        print(f"Data loaded: {job.output_rows} rows")
    except Exception as e:
        print(f"Data load FAILED: {e}")
        return False

    # 5. Query data back
    try:
        query = f"SELECT * FROM `{table_id}`"
        result = client.query(query).to_dataframe()
        print(f"Query returned {len(result)} rows")
        print(result.to_string(index=False))
    except Exception as e:
        print(f"Query FAILED: {e}")
        return False

    # 6. Cleanup test table
    client.delete_table(table_id, not_found_ok=True)
    print("Test table cleaned up")

    print("\nALL TESTS PASSED — BigQuery works without billing!")
    return True


if __name__ == "__main__":
    test_bigquery()
