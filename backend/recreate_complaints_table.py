"""
JanX — Recreate citizen_complaints Table with sector + image_url
Run: .\venv\Scripts\python.exe recreate_complaints_table.py
"""
import os
from dotenv import load_dotenv
from google.cloud import bigquery

load_dotenv()

def recreate_citizen_complaints_table():
    project_id = os.getenv("GCP_PROJECT_ID", "janx-501309")
    dataset_id = os.getenv("BQ_DATASET", "janx_dataset")
    table_id   = f"{project_id}.{dataset_id}.citizen_complaints"

    client = bigquery.Client(project=project_id)

    # Step 1: Delete existing table
    print(f"🗑️  Deleting table '{table_id}' if it exists...")
    client.delete_table(table_id, not_found_ok=True)
    print("    ✅ Table deleted (or did not exist).")

    # Step 2: Define new schema (with sector + image_url)
    schema = [
        bigquery.SchemaField("request_id",           "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("category",              "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("location_node",         "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("state",                 "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("severity_index",        "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("english_translation",   "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("embedding",             "FLOAT64",   mode="REPEATED"),
        bigquery.SchemaField("raw_input_type",        "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("submitted_at",          "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("geo_lat",               "FLOAT64",   mode="NULLABLE"),
        bigquery.SchemaField("geo_lng",               "FLOAT64",   mode="NULLABLE"),
        # 🔥 New fields:
        bigquery.SchemaField("sector",    "STRING", mode="NULLABLE"),   # WATER, ROAD, HEALTH, etc.
        bigquery.SchemaField("image_url", "STRING", mode="NULLABLE"),   # Firebase/Cloudinary photo URL
    ]

    # Step 3: Create fresh table
    print(f"🏗️  Creating fresh table '{table_id}' with SECTOR + IMAGE_URL fields...")
    table = bigquery.Table(table_id, schema=schema)
    table = client.create_table(table)
    print(f"    ✅ Created table '{table.table_id}' successfully! 🚀")
    print()
    print("Schema fields:")
    for field in schema:
        marker = "🔥 NEW" if field.name in ("sector", "image_url") else "   "
        print(f"  {marker}  {field.name:25s} {field.field_type:10s} ({field.mode})")

if __name__ == "__main__":
    recreate_citizen_complaints_table()
