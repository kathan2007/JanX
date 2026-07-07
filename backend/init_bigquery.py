import os
from google.cloud import bigquery
from dotenv import load_dotenv

load_dotenv()

def init_bq():
    project_id = os.getenv("GCP_PROJECT_ID", "janx-501309")
    dataset_id = os.getenv("BQ_DATASET", "janx_dataset")
    
    print(f"Connecting to BigQuery project: {project_id}, dataset: {dataset_id}")
    client = bigquery.Client(project=project_id)
    dataset_ref = client.dataset(dataset_id)
    
    # Create Dataset
    try:
        client.get_dataset(dataset_ref)
        print(f"Dataset '{dataset_id}' already exists.")
    except Exception:
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = "US"
        dataset = client.create_dataset(dataset)
        print(f"Created dataset '{dataset_id}' in US.")

    # 1. Create table citizen_complaints
    complaints_table_id = f"{project_id}.{dataset_id}.citizen_complaints"
    complaints_schema = [
        bigquery.SchemaField("request_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("category", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("location_node", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("state", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("severity_index", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("english_translation", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("embedding", "FLOAT64", mode="REPEATED"),
        bigquery.SchemaField("raw_input_type", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("submitted_at", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("geo_lat", "FLOAT64", mode="NULLABLE"),
        bigquery.SchemaField("geo_lng", "FLOAT64", mode="NULLABLE"),
        bigquery.SchemaField("image_url", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("status", "STRING", mode="NULLABLE"),
    ]
    
    try:
        table = client.get_table(complaints_table_id)
        print("Table 'citizen_complaints' already exists. Checking schema updates...")
        existing_fields = {field.name for field in table.schema}
        new_fields = list(table.schema)
        schema_changed = False
        if "image_url" not in existing_fields:
            new_fields.append(bigquery.SchemaField("image_url", "STRING", mode="NULLABLE"))
            schema_changed = True
        if "status" not in existing_fields:
            new_fields.append(bigquery.SchemaField("status", "STRING", mode="NULLABLE"))
            schema_changed = True
        
        if schema_changed:
            table.schema = new_fields
            client.update_table(table, ["schema"])
            print("Successfully updated 'citizen_complaints' schema with new columns.")
        else:
            print("Schema is up to date.")
    except Exception:
        table = bigquery.Table(complaints_table_id, schema=complaints_schema)
        client.create_table(table)
        print("Created table 'citizen_complaints'.")

    # 2. Create table infrastructure_gaps
    infra_table_id = f"{project_id}.{dataset_id}.infrastructure_gaps"
    infra_schema = [
        bigquery.SchemaField("location_node", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("category", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("distance_to_nearest_facility", "FLOAT64", mode="NULLABLE"),
    ]
    
    try:
        client.get_table(infra_table_id)
        print("Table 'infrastructure_gaps' already exists.")
    except Exception:
        table = bigquery.Table(infra_table_id, schema=infra_schema)
        client.create_table(table)
        print("Created table 'infrastructure_gaps'.")

    # 3. Create table census_demographics
    census_table_id = f"{project_id}.{dataset_id}.census_demographics"
    census_schema = [
        bigquery.SchemaField("location_node", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("population_impact_factor", "FLOAT64", mode="NULLABLE"),
    ]
    
    try:
        client.get_table(census_table_id)
        print("Table 'census_demographics' already exists.")
    except Exception:
        table = bigquery.Table(census_table_id, schema=census_schema)
        client.create_table(table)
        print("Created table 'census_demographics'.")

    # Mock Data to seed tables
    infra_rows = [
        {"location_node": "Ward 1", "category": "Water Infrastructure", "distance_to_nearest_facility": 85.0},
        {"location_node": "Ward 2", "category": "Education", "distance_to_nearest_facility": 30.0},
        {"location_node": "Ward 3", "category": "Transport", "distance_to_nearest_facility": 95.0},
        {"location_node": "Ward 4", "category": "Water Infrastructure", "distance_to_nearest_facility": 75.0},
        {"location_node": "Ward 4", "category": "Road Damage", "distance_to_nearest_facility": 65.0},
        {"location_node": "Ward 5", "category": "Electricity", "distance_to_nearest_facility": 55.0},
    ]
    
    census_rows = [
        {"location_node": "Ward 1", "population_impact_factor": 70.0},
        {"location_node": "Ward 2", "population_impact_factor": 45.0},
        {"location_node": "Ward 3", "population_impact_factor": 90.0},
        {"location_node": "Ward 4", "population_impact_factor": 80.0},
        {"location_node": "Ward 5", "population_impact_factor": 60.0},
    ]

    try:
        query_infra = client.query(f"SELECT COUNT(*) as cnt FROM `{infra_table_id}`")
        cnt_infra = list(query_infra.result())[0].cnt
        if cnt_infra == 0:
            errors = client.insert_rows_json(infra_table_id, infra_rows)
            if not errors:
                print("Seeded 'infrastructure_gaps' table with mock data.")
            else:
                print(f"Error seeding infrastructure: {errors}")
        else:
            print("Table 'infrastructure_gaps' already has data.")
            
        query_census = client.query(f"SELECT COUNT(*) as cnt FROM `{census_table_id}`")
        cnt_census = list(query_census.result())[0].cnt
        if cnt_census == 0:
            errors = client.insert_rows_json(census_table_id, census_rows)
            if not errors:
                print("Seeded 'census_demographics' table with mock data.")
            else:
                print(f"Error seeding demographics: {errors}")
        else:
            print("Table 'census_demographics' already has data.")
    except Exception as e:
        print(f"Error checking/seeding BigQuery tables: {e}")

if __name__ == "__main__":
    init_bq()
