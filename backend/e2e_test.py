import requests, json, sys

BASE = "http://127.0.0.1:8000/api"
HEADERS = {"Authorization": "Bearer mock-jwt-sandbox-token-string-12345"}
results = []
passed = 0
failed = 0

def log(msg=""):
    print(msg)
    results.append(msg)

def ok(label):
    global passed
    passed += 1
    log(f"  ✅  PASS  |  {label}")

def fail(label):
    global failed
    failed += 1
    log(f"  ❌  FAIL  |  {label}")

# ══════════════════════════════════════════════════════
log("=" * 56)
log(" JanX Platform — Full E2E Test Suite")
log("=" * 56)

# ─── TEST 1: Submit Gujarat complaint ──────────────────
log()
log("──── TEST 1: Submit Gujarat complaint ────────────────")
try:
    r = requests.post(
        f"{BASE}/submit-request",
        json={"state": "Gujarat", "text": "SG Highway near Prahlad Nagar has massive potholes from monsoon. Road surface completely broken, causing daily accidents."},
        headers=HEADERS,
        timeout=20
    )
    if r.status_code == 201:
        d = r.json()
        ok(f"201 Created  |  category={d.get('category')}  |  location={d.get('location_node')}")
    else:
        fail(f"Expected 201, got {r.status_code}: {r.text[:100]}")
except Exception as e:
    fail(f"Request error: {e}")

# ─── TEST 2: Submit Delhi water complaint ──────────────
log()
log("──── TEST 2: Submit Delhi water complaint ────────────")
try:
    r = requests.post(
        f"{BASE}/submit-request",
        json={"state": "Delhi", "text": "Water pipeline burst in Ward 1 near the bus stop. Water has been contaminated and flooding for 3 days."},
        headers=HEADERS,
        timeout=20
    )
    if r.status_code == 201:
        d = r.json()
        ok(f"201 Created  |  category={d.get('category')}  |  location={d.get('location_node')}")
    else:
        fail(f"Expected 201, got {r.status_code}: {r.text[:100]}")
except Exception as e:
    fail(f"Request error: {e}")

# ─── TEST 3: Auth guard — missing token ─────────────────
log()
log("──── TEST 3: Auth guard (no token) ───────────────────")
try:
    r = requests.post(f"{BASE}/submit-request", json={"state": "Delhi", "text": "test"}, timeout=10)
    if r.status_code == 401:
        ok(f"401 Unauthorized correctly rejected")
    else:
        fail(f"Expected 401, got {r.status_code}")
except Exception as e:
    fail(f"Request error: {e}")

# ─── TEST 4: Get ranked projects (Delhi) ────────────────
log()
log("──── TEST 4: GET ranked projects — Delhi ─────────────")
try:
    r = requests.get(f"{BASE}/get-ranked-projects", params={"state": "Delhi"}, timeout=30)
    if r.status_code == 200:
        projects = r.json()
        if isinstance(projects, list) and len(projects) > 0:
            ok(f"200 OK  |  {len(projects)} ranked projects returned")
            for p in projects:
                log(f"         Rank {p.get('rank')}  |  id={p.get('id')}  |  score={p.get('priority_score')}  |  status={p.get('status')}  |  {p.get('category')}")
            top = projects[0]
        else:
            fail("Empty list returned")
            top = None
    else:
        fail(f"Expected 200, got {r.status_code}: {r.text[:100]}")
        top = None
except Exception as e:
    fail(f"Request error: {e}")
    top = None

# ─── TEST 5: PATCH status → IN_PROGRESS ─────────────────
log()
log("──── TEST 5: PATCH top project status → IN_PROGRESS ──")
patched_id = None
if top and top.get("id"):
    top_id = top["id"]
    try:
        r = requests.patch(
            f"{BASE}/requests/{top_id}/",
            json={"status": "IN_PROGRESS"},
            headers=HEADERS,
            timeout=10
        )
        if r.status_code == 200 and r.json().get("status") == "IN_PROGRESS":
            patched_id = top_id
            ok(f"200 OK  |  id={top_id} status → IN_PROGRESS")
        else:
            fail(f"Unexpected response {r.status_code}: {r.text[:100]}")
    except Exception as e:
        fail(f"Request error: {e}")
else:
    fail("Skipped — no project id from step 4")

# ─── TEST 6: Verify persistence — re-fetch ──────────────
log()
log("──── TEST 6: Re-fetch — verify IN_PROGRESS persisted ─")
if patched_id:
    try:
        r = requests.get(f"{BASE}/get-ranked-projects", params={"state": "Delhi"}, timeout=30)
        updated = r.json()
        match = next((p for p in updated if p.get("id") == patched_id), None)
        if match and match.get("status") == "IN_PROGRESS":
            ok(f"Status correctly persisted  |  id={patched_id}  |  status=IN_PROGRESS")
        else:
            fail(f"Status mismatch — got: {match.get('status') if match else 'NOT FOUND'}")
    except Exception as e:
        fail(f"Request error: {e}")
else:
    fail("Skipped — no patched_id from step 5")

# ─── TEST 7: PATCH status → COMPLETED ───────────────────
log()
log("──── TEST 7: PATCH status → COMPLETED ────────────────")
if patched_id:
    try:
        r = requests.patch(
            f"{BASE}/requests/{patched_id}/",
            json={"status": "COMPLETED"},
            headers=HEADERS,
            timeout=10
        )
        if r.status_code == 200 and r.json().get("status") == "COMPLETED":
            ok(f"200 OK  |  id={patched_id} status → COMPLETED")
        else:
            fail(f"Unexpected response {r.status_code}: {r.text[:100]}")
    except Exception as e:
        fail(f"Request error: {e}")
else:
    fail("Skipped — no patched_id")

# ─── TEST 8: Invalid status value guard ─────────────────
log()
log("──── TEST 8: Invalid status value guard ──────────────")
if patched_id:
    try:
        r = requests.patch(
            f"{BASE}/requests/{patched_id}/",
            json={"status": "INVALID_STATUS"},
            headers=HEADERS,
            timeout=10
        )
        if r.status_code == 400:
            ok(f"400 Bad Request — invalid status correctly rejected")
        else:
            fail(f"Expected 400, got {r.status_code}: {r.text[:100]}")
    except Exception as e:
        fail(f"Request error: {e}")
else:
    fail("Skipped — no patched_id")

# ─── TEST 9: Missing state param guard ──────────────────
log()
log("──── TEST 9: Missing state param guard ────────────────")
try:
    r = requests.get(f"{BASE}/get-ranked-projects", timeout=10)
    if r.status_code == 400:
        ok(f"400 Bad Request — missing state param correctly rejected")
    else:
        fail(f"Expected 400, got {r.status_code}")
except Exception as e:
    fail(f"Request error: {e}")

# ─── SUMMARY ────────────────────────────────────────────
log()
log("=" * 56)
log(f" RESULTS:  {passed} passed  |  {failed} failed  |  {passed+failed} total")
log("=" * 56)

# Write to file for clean viewing
with open("e2e_results.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(results))
print("Results written to e2e_results.txt")
sys.exit(0 if failed == 0 else 1)
