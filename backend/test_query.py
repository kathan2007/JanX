from dotenv import load_dotenv; load_dotenv()
from google.cloud import bigquery

client = bigquery.Client(project='janx-501309')
query = """
SELECT
    c.category,
    c.location_node,
    COUNT(c.request_id) as volume,
    AVG(CAST(c.severity_index AS FLOAT64)) as mean_severity,
    AVG(CAST(c.geo_lat AS FLOAT64)) as representative_lat,
    AVG(CAST(c.geo_lng AS FLOAT64)) as representative_lng,
    COALESCE(AVG(ig.distance_to_nearest_facility), 65.0) as distance_to_nearest_facility,
    COALESCE(AVG(cd.population_impact_factor), 80.0) as population_impact_factor
FROM `janx-501309.janx_dataset.citizen_complaints` c
LEFT JOIN `janx-501309.janx_dataset.infrastructure_gaps` ig
  ON TRIM(LOWER(c.location_node)) = TRIM(LOWER(ig.location_node))
  AND TRIM(LOWER(c.category)) = TRIM(LOWER(ig.category))
LEFT JOIN `janx-501309.janx_dataset.census_demographics` cd
  ON TRIM(LOWER(c.location_node)) = TRIM(LOWER(cd.location_node))
WHERE c.state = @state
GROUP BY c.category, c.location_node
"""
job_config = bigquery.QueryJobConfig(
    query_parameters=[bigquery.ScalarQueryParameter('state', 'STRING', 'Delhi')]
)
try:
    results = list(client.query(query, job_config=job_config).result())
    print(f'SUCCESS - {len(results)} rows:')
    for r in results:
        print(dict(r))
except Exception as e:
    print(f'ERROR: {e}')
