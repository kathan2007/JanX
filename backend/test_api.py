import subprocess
import time
import requests
import sys
import json

def run_tests():
    # Start the server
    print("Starting Django development server...")
    server_process = subprocess.Popen(
        ["venv\\Scripts\\python", "manage.py", "runserver", "127.0.0.1:8001"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    # Wait for the server to spin up
    time.sleep(3)
    
    base_url = "http://127.0.0.1:8001/api"
    submit_url = f"{base_url}/submit-request"
    ranked_url = f"{base_url}/get-ranked-projects"
    
    print("\n--- Test 1: Submit Text Request ---")
    payload = {
        "state": "Maharashtra",
        "text": "The water pipeline near Ward 4 is leaking heavily, wasting drinking water and flooding the main street.",
        "geo_lat": 19.0760,
        "geo_lng": 72.8777
    }
    try:
        response = requests.post(submit_url, json=payload, timeout=35)
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")
        
    print("\n--- Test 2: Get Ranked Projects ---")
    params = {
        "state": "Maharashtra"
    }
    try:
        response = requests.get(ranked_url, params=params, timeout=35)
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")
        
    print("\nShutting down Django server...")
    server_process.terminate()
    try:
        stdout, stderr = server_process.communicate(timeout=5)
        print("Server shutdown completed.")
    except subprocess.TimeoutExpired:
        server_process.kill()
        print("Server killed due to timeout during terminate.")

if __name__ == "__main__":
    run_tests()
