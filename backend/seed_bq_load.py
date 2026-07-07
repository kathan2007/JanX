import os
import uuid
from datetime import datetime, timezone
from google.cloud import bigquery
from dotenv import load_dotenv

load_dotenv()

def seed_load():
    project_id = os.getenv("GCP_PROJECT_ID", "janx-501309")
    dataset_id = os.getenv("BQ_DATASET", "janx_dataset")
    
    print(f"Connecting to BigQuery project: {project_id}, dataset: {dataset_id}")
    client = bigquery.Client(project=project_id)
    
    infra_table_id    = f"{project_id}.{dataset_id}.infrastructure_gaps"
    census_table_id   = f"{project_id}.{dataset_id}.census_demographics"
    complaints_table_id = f"{project_id}.{dataset_id}.citizen_complaints"

    # ── Infrastructure gaps ───────────────────────────────────────────────────
    infra_rows = [
        {"location_node": "Ward 1", "category": "Water Infrastructure", "distance_to_nearest_facility": 85.0},
        {"location_node": "Ward 2", "category": "Education",            "distance_to_nearest_facility": 30.0},
        {"location_node": "Ward 3", "category": "Transport",            "distance_to_nearest_facility": 95.0},
        {"location_node": "Ward 4", "category": "Water Infrastructure", "distance_to_nearest_facility": 75.0},
        {"location_node": "Ward 4", "category": "Road Damage",          "distance_to_nearest_facility": 65.0},
        {"location_node": "Ward 5", "category": "Electricity",          "distance_to_nearest_facility": 55.0},
    ]

    # ── Census demographics ───────────────────────────────────────────────────
    census_rows = [
        {"location_node": "Ward 1", "population_impact_factor": 70.0},
        {"location_node": "Ward 2", "population_impact_factor": 45.0},
        {"location_node": "Ward 3", "population_impact_factor": 90.0},
        {"location_node": "Ward 4", "population_impact_factor": 80.0},
        {"location_node": "Ward 5", "population_impact_factor": 60.0},
    ]

    # ── Citizen complaints (the table the ranking query reads from) ───────────
    def make_complaint(state, location, category, severity, translation, sector=None, image_url=None):
        return {
            "request_id":          str(uuid.uuid4()),
            "category":            category,
            "location_node":       location,
            "state":               state,
            "severity_index":      severity,
            "english_translation": translation,
            "embedding":           [0.125] * 768,
            "raw_input_type":      "text",
            "submitted_at":        datetime.now(timezone.utc).isoformat(),
            "geo_lat":             None,
            "geo_lng":             None,
            # 🔥 New fields
            "sector":              sector,
            "image_url":           image_url,
        }

    complaint_rows = [
        # Delhi – Ward 1 – Water (high severity × 4 complaints → top rank)
        make_complaint("Delhi", "Ward 1", "Water Infrastructure", 9, "No water supply for 3 days in Ward 1"),
        make_complaint("Delhi", "Ward 1", "Water Infrastructure", 8, "Pipeline burst near main road Ward 1"),
        make_complaint("Delhi", "Ward 1", "Water Infrastructure", 9, "Contaminated water coming from taps Ward 1"),
        make_complaint("Delhi", "Ward 1", "Water Infrastructure", 7, "Water tanker not arriving Ward 1"),
        # Delhi – Ward 3 – Transport
        make_complaint("Delhi", "Ward 3", "Transport", 7, "Bus service stopped in Ward 3"),
        make_complaint("Delhi", "Ward 3", "Transport", 8, "Road blocked due to construction Ward 3"),
        make_complaint("Delhi", "Ward 3", "Transport", 6, "No street lights on main route Ward 3"),
        # Delhi – Ward 4 – Road Damage
        make_complaint("Delhi", "Ward 4", "Road Damage", 8, "Large potholes causing accidents in Ward 4"),
        make_complaint("Delhi", "Ward 4", "Road Damage", 7, "Road completely broken after rain Ward 4"),
        # Delhi – Ward 2 – Education
        make_complaint("Delhi", "Ward 2", "Education", 5, "School building has leaking roof Ward 2"),
        make_complaint("Delhi", "Ward 2", "Education", 6, "No teachers for 2 weeks Ward 2"),
        # Maharashtra – Ward 4 – Water
        make_complaint("Maharashtra", "Ward 4", "Water Infrastructure", 9, "Severe water shortage in Ward 4 Maharashtra"),
        make_complaint("Maharashtra", "Ward 4", "Water Infrastructure", 8, "Borewell broken for a month Ward 4"),
        make_complaint("Maharashtra", "Ward 4", "Water Infrastructure", 7, "Water supply only 1 hour per day Ward 4"),
        # Maharashtra – Ward 3 – Transport
        make_complaint("Maharashtra", "Ward 3", "Transport", 9, "Bridge connecting village is damaged Ward 3"),
        make_complaint("Maharashtra", "Ward 3", "Transport", 8, "No bus route to hospital from Ward 3"),
        # Maharashtra – Ward 5 – Electricity
        make_complaint("Maharashtra", "Ward 5", "Electricity", 7, "Power cuts lasting 8 hours daily Ward 5"),
        make_complaint("Maharashtra", "Ward 5", "Electricity", 6, "Transformer not repaired for 2 weeks Ward 5"),
    ]

    # ── Load infrastructure_gaps ──────────────────────────────────────────────
    try:
        print("Loading infrastructure_gaps...")
        job = client.load_table_from_json(infra_rows, infra_table_id,
                  job_config=bigquery.LoadJobConfig(
                      write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE))
        job.result()
        print(f"  [OK] infrastructure_gaps ({len(infra_rows)} rows)")
    except Exception as e:
        print(f"  [ERROR] infrastructure_gaps: {e}")

    # ── Load census_demographics ──────────────────────────────────────────────
    try:
        print("Loading census_demographics...")
        job = client.load_table_from_json(census_rows, census_table_id,
                  job_config=bigquery.LoadJobConfig(
                      write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE))
        job.result()
        print(f"  [OK] census_demographics ({len(census_rows)} rows)")
    except Exception as e:
        print(f"  [ERROR] census_demographics: {e}")

    # ── Load citizen_complaints ───────────────────────────────────────────────
    try:
        print("Loading citizen_complaints...")
        job = client.load_table_from_json(complaint_rows, complaints_table_id,
                  job_config=bigquery.LoadJobConfig(
                      write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE))
        job.result()
        print(f"  [OK] citizen_complaints ({len(complaint_rows)} rows)")
    except Exception as e:
        print(f"  [ERROR] citizen_complaints: {e}")

    print("\nSeed complete! Test with:")
    print("  GET http://127.0.0.1:8000/api/get-ranked-projects?state=Delhi")
    print("  GET http://127.0.0.1:8000/api/get-ranked-projects?state=Maharashtra")

if __name__ == "__main__":
    seed_load()

