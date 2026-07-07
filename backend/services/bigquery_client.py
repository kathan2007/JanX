import uuid
from datetime import datetime, timezone
from google.cloud import bigquery
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def stream_payload_to_bigquery(
    structured_data,
    embedding,
    raw_input_type,
    geo_lat=None,
    geo_lng=None,
    sector=None,
    image_url=None,
    audio_url=None,
    status="Pending",
    request_id=None,
):
    """Streams a structured complaint record into BigQuery, falling back to a Load Job if streaming is disabled."""
    client = bigquery.Client(project=settings.GCP_PROJECT_ID)
    table_id = f"{settings.GCP_PROJECT_ID}.{settings.BQ_DATASET}.citizen_complaints"

    lat_val = None
    lng_val = None
    if geo_lat is not None:
        try:
            lat_val = float(geo_lat)
        except (ValueError, TypeError):
            pass
    if geo_lng is not None:
        try:
            lng_val = float(geo_lng)
        except (ValueError, TypeError):
            pass

    row_to_insert = [{
        "request_id":           request_id or str(uuid.uuid4()),
        "category":             structured_data.get("category"),
        "location_node":        structured_data.get("location_node"),
        "state":                structured_data.get("state"),
        "severity_index":       int(structured_data.get("severity_index", 1)),
        "english_translation":  structured_data.get("english_translation"),
        "embedding":            embedding,
        "raw_input_type":       raw_input_type,
        "submitted_at":         datetime.now(timezone.utc).isoformat(),
        "geo_lat":              lat_val,
        "geo_lng":              lng_val,
        # 🔥 Extended fields — frontend sector + photo URL + status
        "sector":               sector or None,
        "image_url":            image_url or None,
        "audio_url":            audio_url or None,
        "status":               status,
    }]


    logger.info(f"Attempting to insert row into BigQuery {table_id} | sector={sector} | has_image={bool(image_url)} | status={status}...")

    # Try legacy streaming inserts first
    try:
        errors = client.insert_rows_json(table_id, row_to_insert)
        if not errors:
            logger.info("Successfully inserted row via streaming API.")
            return True
        else:
            logger.warning(f"Streaming insert failed: {errors}. Falling back to load job...")
    except Exception as e:
        logger.warning(f"Streaming exception: {e}. Falling back to load job...")

    # Fallback: load job (works in BigQuery Sandbox)
    try:
        job_config = bigquery.LoadJobConfig(
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND
        )
        job = client.load_table_from_json(row_to_insert, table_id, job_config=job_config)
        job.result()  # blocks until job is done
        logger.info("Successfully inserted row via Load Job fallback.")
        return True
    except Exception as e:
        logger.error(f"Load job fallback failed: {e}")
        return False
