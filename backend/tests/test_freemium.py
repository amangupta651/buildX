"""Freemium tier tests — plans, billing, gating, AI mentor."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://collab-eng-ventures.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


def _register():
    email = f"TEST_free_{uuid.uuid4().hex[:10]}@buildx.dev"
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": "Student2026!", "name": "Test Student",
        "university": "IIT", "major": "CS", "year": "3"
    })
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s, email, r.json()["user"]


def test_plans_list():
    r = requests.get(f"{API}/plans")
    assert r.status_code == 200
    plans = r.json()
    assert len(plans) == 3
    by_id = {p["id"]: p for p in plans}
    assert by_id["free"]["price_inr"] == 0
    assert by_id["pro"]["price_inr"] == 299
    assert by_id["industry"]["price_inr"] == 1499
    assert by_id["free"]["project_limit"] == 1
    assert by_id["pro"]["ai_mentor"] is True
    assert by_id["free"]["ai_mentor"] is False
    for p in plans:
        assert isinstance(p.get("features"), list) and len(p["features"]) > 0


def test_billing_me_new_user_free():
    s, _, _ = _register()
    r = s.get(f"{API}/billing/me")
    assert r.status_code == 200
    data = r.json()
    assert data["plan"]["id"] == "free"
    assert data["projects_used"] == 0


def test_free_user_project_limit():
    s, _, _ = _register()
    startups = requests.get(f"{API}/startups").json()
    assert len(startups) >= 2
    r1 = s.post(f"{API}/startups/{startups[0]['id']}/apply")
    assert r1.status_code == 200, r1.text
    r2 = s.post(f"{API}/startups/{startups[1]['id']}/apply")
    assert r2.status_code == 402, r2.text
    detail = r2.json()["detail"]
    assert detail["code"] == "plan_limit_reached"


def test_free_user_ai_mentor_blocked():
    s, _, _ = _register()
    # need any task_id
    startups = requests.get(f"{API}/startups").json()
    tasks = requests.get(f"{API}/tasks", params={"startup_id": startups[0]["id"]}).json()
    tid = tasks[0]["id"]
    r = s.post(f"{API}/ai-mentor/review", json={"task_id": tid})
    assert r.status_code == 402
    assert r.json()["detail"]["code"] == "plan_required"


def test_upgrade_pro_flow():
    s, _, _ = _register()
    r = s.post(f"{API}/billing/upgrade", json={"plan": "pro"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["plan"] == "pro"
    assert body["user"]["plan_expires_at"] is not None

    # Verify via /auth/me
    me = s.get(f"{API}/auth/me").json()
    assert me["plan"] == "pro"

    # can join multiple startups
    startups = requests.get(f"{API}/startups").json()
    r1 = s.post(f"{API}/startups/{startups[0]['id']}/apply")
    assert r1.status_code == 200
    r2 = s.post(f"{API}/startups/{startups[1]['id']}/apply")
    assert r2.status_code == 200

    # AI mentor works
    tasks = requests.get(f"{API}/tasks", params={"startup_id": startups[0]["id"]}).json()
    r_ai = s.post(f"{API}/ai-mentor/review", json={"task_id": tasks[0]["id"]})
    assert r_ai.status_code == 200, r_ai.text
    review = r_ai.json()
    for key in ("summary", "strengths", "improvements", "score", "verdict"):
        assert key in review
    assert isinstance(review["strengths"], list)
    assert isinstance(review["improvements"], list)


def test_upgrade_industry_flow():
    s, _, _ = _register()
    r = s.post(f"{API}/billing/upgrade", json={"plan": "industry"})
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["plan"] == "industry"
    # ~90 days expiry
    from datetime import datetime, timezone
    exp = datetime.fromisoformat(body["user"]["plan_expires_at"].replace("Z", "+00:00"))
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    delta_days = (exp - datetime.now(timezone.utc)).days
    assert 88 <= delta_days <= 91, f"expected ~90d, got {delta_days}"


def test_invalid_plan():
    s, _, _ = _register()
    r = s.post(f"{API}/billing/upgrade", json={"plan": "enterprise"})
    assert r.status_code == 400
