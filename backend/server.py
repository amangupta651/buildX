from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import uuid
import json
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from bson import ObjectId
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

app = FastAPI(title="buildX API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": now_utc() + timedelta(hours=24),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": now_utc() + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc.get("name", ""),
        "university": doc.get("university", ""),
        "major": doc.get("major", ""),
        "year": doc.get("year", ""),
        "bio": doc.get("bio", ""),
        "skills": doc.get("skills", []),
        "github_handle": doc.get("github_handle", ""),
        "roles_wanted": doc.get("roles_wanted", []),
        "stack": doc.get("stack", []),
        "role": doc.get("role", "student"),
        "plan": doc.get("plan", "free"),
        "plan_expires_at": doc.get("plan_expires_at").isoformat() if isinstance(doc.get("plan_expires_at"), datetime) else doc.get("plan_expires_at"),
        "created_at": doc.get("created_at", now_utc()).isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


# -----------------------------------------------------------------------------
# Plans
# -----------------------------------------------------------------------------
PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price_inr": 0,
        "cadence": "forever",
        "tagline": "Try the platform, ship 1 project.",
        "project_limit": 1,
        "ai_mentor": False,
        "features": [
            "Join 1 virtual startup",
            "Access the task board & submit PRs",
            "Web-only experience profile",
            "Community mentor review",
        ],
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price_inr": 299,
        "cadence": "month",
        "tagline": "Unlimited projects + your own AI mentor.",
        "project_limit": None,  # unlimited
        "ai_mentor": True,
        "features": [
            "Unlimited virtual startups",
            "AI Mentor: instant PR & code reviews",
            "Downloadable PDF certificate",
            "Priority mentor review queue",
            "Featured student badge on profile",
        ],
    },
    "industry": {
        "id": "industry",
        "name": "Industry Experience Program",
        "price_inr": 1499,
        "cadence": "one-time",
        "tagline": "The full 3-month, founder-graded startup experience.",
        "project_limit": None,
        "ai_mentor": True,
        "features": [
            "Everything in Pro, for 3 months",
            "Assigned founder-mentor + weekly 1:1",
            "Industry-grade project brief with a real startup",
            "Founder-signed experience letter (verifiable)",
            "Recruiter-visible portfolio placement",
        ],
    },
}


def user_plan(user: dict) -> str:
    p = user.get("plan", "free")
    exp = user.get("plan_expires_at")
    if p != "free" and exp and isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now_utc():
            return "free"
    return p


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    university: Optional[str] = ""
    major: Optional[str] = ""
    year: Optional[str] = ""
    github_handle: Optional[str] = ""
    bio: Optional[str] = ""
    roles_wanted: Optional[List[str]] = []
    stack: Optional[List[str]] = []


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    year: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    github_handle: Optional[str] = None
    roles_wanted: Optional[List[str]] = None
    stack: Optional[List[str]] = None


class SubmissionIn(BaseModel):
    github_url: str
    notes: Optional[str] = ""


class ReviewIn(BaseModel):
    status: str  # "approved" | "rejected"
    feedback: Optional[str] = ""


# -----------------------------------------------------------------------------
# Auth endpoints
# -----------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "university": body.university or "",
        "major": body.major or "",
        "year": body.year or "",
        "bio": body.bio or "",
        "skills": [],
        "github_handle": (body.github_handle or "").lstrip("@").strip(),
        "roles_wanted": body.roles_wanted or [],
        "stack": body.stack or [],
        "role": "student",
        "plan": "free",
        "created_at": now_utc(),
    }
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    doc["_id"] = result.inserted_id
    return {"user": serialize_user(doc), "token": access}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"user": serialize_user(user), "token": access}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return serialize_user(user)


@api.patch("/auth/me")
async def update_me(body: ProfileUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    updated = await db.users.find_one({"_id": user["_id"]})
    return serialize_user(updated)


# -----------------------------------------------------------------------------
# Plans & Billing (MOCKED payment — swap for Razorpay/Stripe later)
# -----------------------------------------------------------------------------
class UpgradeIn(BaseModel):
    plan: str  # "pro" | "industry"


@api.get("/plans")
async def list_plans():
    return list(PLANS.values())


# -----------------------------------------------------------------------------
# Admin dashboard
# -----------------------------------------------------------------------------
async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


@api.get("/admin/overview")
async def admin_overview(user=Depends(require_admin)):
    # Counts
    total_users = await db.users.count_documents({"role": "student"})
    total_pro = await db.users.count_documents({"plan": "pro"})
    total_industry = await db.users.count_documents({"plan": "industry"})
    total_applications = await db.applications.count_documents({"status": "accepted"})
    total_submissions = await db.submissions.count_documents({})
    approved_submissions = await db.submissions.count_documents({"status": "approved"})
    total_startups = await db.startups.count_documents({})

    # Signups over last 7 days (by day)
    since = now_utc() - timedelta(days=7)
    signups_cursor = db.users.find({"role": "student", "created_at": {"$gte": since}}).sort("created_at", 1)
    signups_by_day = {}
    async for u in signups_cursor:
        d = u["created_at"].strftime("%Y-%m-%d") if isinstance(u.get("created_at"), datetime) else "-"
        signups_by_day[d] = signups_by_day.get(d, 0) + 1

    # Recent signups (latest 20)
    recent_users = []
    async for u in db.users.find({"role": "student"}).sort("created_at", -1).limit(20):
        recent_users.append({
            "id": str(u["_id"]),
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "university": u.get("university", ""),
            "github_handle": u.get("github_handle", ""),
            "roles_wanted": u.get("roles_wanted", []),
            "stack": u.get("stack", []),
            "plan": u.get("plan", "free"),
            "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else None,
        })

    # Recent submissions with student + task + interview score
    recent_subs = await db.submissions.find({}).sort("submitted_at", -1).limit(20).to_list(20)
    if recent_subs:
        uid_ids = list({s["user_id"] for s in recent_subs})
        tid_ids = list({s["task_id"] for s in recent_subs})
        users_map = {str(u["_id"]): u async for u in db.users.find({"_id": {"$in": [ObjectId(x) for x in uid_ids]}})}
        tasks_map = {str(t["_id"]): t async for t in db.tasks.find({"_id": {"$in": [ObjectId(x) for x in tid_ids]}})}
    else:
        users_map = {}; tasks_map = {}
    submissions_out = []
    for s in recent_subs:
        u = users_map.get(s["user_id"])
        t = tasks_map.get(s["task_id"])
        iv = s.get("interview") or {}
        submissions_out.append({
            "id": str(s["_id"]),
            "user_name": (u or {}).get("name", "?"),
            "user_email": (u or {}).get("email", ""),
            "task_title": (t or {}).get("title", ""),
            "ticket_no": (t or {}).get("ticket_no", ""),
            "github_url": s.get("github_url", ""),
            "status": s.get("status", "pending"),
            "overall": iv.get("overall"),
            "scores": iv.get("scores"),
            "submitted_at": s["submitted_at"].isoformat() if isinstance(s.get("submitted_at"), datetime) else s.get("submitted_at"),
        })

    return {
        "counts": {
            "students": total_users,
            "pro_subscribers": total_pro,
            "industry_subscribers": total_industry,
            "startups": total_startups,
            "startup_applications": total_applications,
            "submissions_total": total_submissions,
            "submissions_approved": approved_submissions,
        },
        "signups_by_day": [{"date": d, "count": signups_by_day[d]} for d in sorted(signups_by_day.keys())],
        "recent_users": recent_users,
        "recent_submissions": submissions_out,
    }


@api.get("/billing/me")
async def my_billing(user=Depends(get_current_user)):
    plan_id = user_plan(user)
    projects_used = await db.applications.count_documents({"user_id": str(user["_id"]), "status": "accepted"})
    return {
        "plan": PLANS[plan_id],
        "plan_expires_at": user.get("plan_expires_at").isoformat() if isinstance(user.get("plan_expires_at"), datetime) else None,
        "projects_used": projects_used,
    }


@api.post("/billing/upgrade")
async def upgrade_plan(body: UpgradeIn, user=Depends(get_current_user)):
    """MOCK checkout — flips the user's plan in DB. Replace with Razorpay/Stripe order flow."""
    if body.plan not in ("pro", "industry"):
        raise HTTPException(400, "Invalid plan")
    if body.plan == "pro":
        expires = now_utc() + timedelta(days=30)
    else:  # industry — 3 months
        expires = now_utc() + timedelta(days=90)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"plan": body.plan, "plan_expires_at": expires, "upgraded_at": now_utc()}},
    )
    updated = await db.users.find_one({"_id": user["_id"]})
    return {
        "user": serialize_user(updated),
        "plan": PLANS[body.plan],
        "message": f"Welcome to {PLANS[body.plan]['name']}!",
    }


# -----------------------------------------------------------------------------
# AI Mentor (paid tiers only) — mocked review; swap for LLM call later
# -----------------------------------------------------------------------------
class AIMentorIn(BaseModel):
    task_id: str
    github_url: Optional[str] = ""
    notes: Optional[str] = ""


@api.post("/ai-mentor/review")
async def ai_mentor_review(body: AIMentorIn, user=Depends(get_current_user)):
    plan_id = user_plan(user)
    if not PLANS[plan_id].get("ai_mentor"):
        raise HTTPException(
            402,
            detail={
                "code": "plan_required",
                "message": "AI Mentor is a Pro feature. Upgrade to unlock instant code reviews.",
                "current_plan": plan_id,
            },
        )
    t = await db.tasks.find_one({"_id": ObjectId(body.task_id)})
    if not t:
        raise HTTPException(404, "Task not found")

    # MOCKED response — replace with real LLM call via emergentintegrations
    skill_list = ", ".join(t.get("skills", [])[:3]) or "engineering fundamentals"
    review = {
        "summary": f"Solid attempt at '{t['title']}'. Your approach shows understanding of {skill_list}.",
        "strengths": [
            "Clear commit hygiene and PR description",
            f"Correct use of {t.get('skills', ['the required stack'])[0] if t.get('skills') else 'the required stack'}",
            "Readable code structure",
        ],
        "improvements": [
            "Add unit tests around the core logic to prevent regressions",
            "Extract magic numbers into named constants",
            "Consider edge cases: empty input, network failure, concurrent writes",
        ],
        "score": 82,
        "verdict": "Ready to merge with minor revisions",
    }
    return review



def serialize_startup(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "tagline": doc.get("tagline", ""),
        "description": doc.get("description", ""),
        "industry": doc.get("industry", ""),
        "stage": doc.get("stage", ""),
        "tech_stack": doc.get("tech_stack", []),
        "roles_open": doc.get("roles_open", []),
        "logo_url": doc.get("logo_url", ""),
        "members_count": doc.get("members_count", 0),
        "tasks_count": doc.get("tasks_count", 0),
        "created_at": doc.get("created_at", now_utc()).isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


# -----------------------------------------------------------------------------
# LLM helper — Claude Sonnet via Emergent LLM key
# -----------------------------------------------------------------------------
async def llm_json(system: str, user: str, session_id: str) -> dict:
    """Call Claude, parse JSON output. Raises on failure so caller can fallback."""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-6")
    out = ""
    async for ev in chat.stream_message(UserMessage(text=user)):
        if isinstance(ev, TextDelta):
            out += ev.content
        elif isinstance(ev, StreamDone):
            break
    txt = out.strip()
    if txt.startswith("```"):
        # strip ```json fences
        inner = txt.split("```")
        if len(inner) >= 2:
            txt = inner[1]
            if txt.lstrip().lower().startswith("json"):
                txt = txt.split("json", 1)[1]
    return json.loads(txt.strip())


@api.get("/startups")
async def list_startups():
    startups = await db.startups.find({}).sort("created_at", -1).to_list(500)
    if not startups:
        return []
    sids = [str(s["_id"]) for s in startups]
    # Bulk aggregate counts
    member_counts = {}
    task_counts = {}
    async for row in db.applications.aggregate([
        {"$match": {"startup_id": {"$in": sids}, "status": "accepted"}},
        {"$group": {"_id": "$startup_id", "n": {"$sum": 1}}},
    ]):
        member_counts[row["_id"]] = row["n"]
    async for row in db.tasks.aggregate([
        {"$match": {"startup_id": {"$in": sids}}},
        {"$group": {"_id": "$startup_id", "n": {"$sum": 1}}},
    ]):
        task_counts[row["_id"]] = row["n"]
    out = []
    for s in startups:
        sid = str(s["_id"])
        s["members_count"] = member_counts.get(sid, 0)
        s["tasks_count"] = task_counts.get(sid, 0)
        out.append(serialize_startup(s))
    return out


@api.get("/startups/{startup_id}")
async def get_startup(startup_id: str):
    s = await db.startups.find_one({"_id": ObjectId(startup_id)})
    if not s:
        raise HTTPException(404, "Startup not found")
    s["members_count"] = await db.applications.count_documents({"startup_id": startup_id, "status": "accepted"})
    s["tasks_count"] = await db.tasks.count_documents({"startup_id": startup_id})
    return serialize_startup(s)


@api.post("/startups/{startup_id}/apply")
async def apply_startup(startup_id: str, user=Depends(get_current_user)):
    s = await db.startups.find_one({"_id": ObjectId(startup_id)})
    if not s:
        raise HTTPException(404, "Startup not found")
    uid = str(user["_id"])
    existing = await db.applications.find_one({"user_id": uid, "startup_id": startup_id})
    if existing:
        return {"status": existing["status"], "message": "Already applied"}

    # Enforce project limit based on plan
    plan_id = user_plan(user)
    limit = PLANS.get(plan_id, PLANS["free"]).get("project_limit")
    if limit is not None:
        current = await db.applications.count_documents({"user_id": uid, "status": "accepted"})
        if current >= limit:
            raise HTTPException(
                402,
                detail={
                    "code": "plan_limit_reached",
                    "message": f"Your {PLANS[plan_id]['name']} plan allows {limit} project. Upgrade to Pro for unlimited startups.",
                    "current_plan": plan_id,
                },
            )

    doc = {
        "user_id": uid,
        "startup_id": startup_id,
        "status": "accepted",
        "applied_at": now_utc(),
    }
    await db.applications.insert_one(doc)
    return {"status": "accepted", "message": "You're in! Start picking tasks."}


@api.get("/startups/{startup_id}/membership")
async def membership(startup_id: str, user=Depends(get_current_user)):
    app_doc = await db.applications.find_one({"user_id": str(user["_id"]), "startup_id": startup_id})
    return {"joined": bool(app_doc and app_doc["status"] == "accepted")}


# -----------------------------------------------------------------------------
# Tasks
# -----------------------------------------------------------------------------
def serialize_task(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "startup_id": doc["startup_id"],
        "title": doc["title"],
        "description": doc.get("description", ""),
        "difficulty": doc.get("difficulty", "medium"),
        "skills": doc.get("skills", []),
        "status": doc.get("status", "open"),  # open, in_progress, in_review, completed
        "assignee_id": doc.get("assignee_id"),
        "assignee_name": doc.get("assignee_name"),
        "points": doc.get("points", 10),
        "ticket_no": doc.get("ticket_no", ""),
        "customer_problem": doc.get("customer_problem", ""),
        "acceptance_criteria": doc.get("acceptance_criteria", []),
        "business_context": doc.get("business_context", ""),
        "attachments": doc.get("attachments", []),
        "created_at": doc.get("created_at", now_utc()).isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


@api.get("/tasks")
async def list_tasks(startup_id: Optional[str] = None):
    q = {}
    if startup_id:
        q["startup_id"] = startup_id
    cursor = db.tasks.find(q).sort("created_at", -1).limit(500)
    return [serialize_task(t) async for t in cursor]


@api.get("/tasks/{task_id}")
async def get_task(task_id: str):
    t = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not t:
        raise HTTPException(404, "Task not found")
    return serialize_task(t)


@api.post("/tasks/{task_id}/claim")
async def claim_task(task_id: str, user=Depends(get_current_user)):
    t = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not t:
        raise HTTPException(404, "Task not found")
    if t.get("status") != "open":
        raise HTTPException(400, "Task is not available")
    # Must be a member
    app_doc = await db.applications.find_one({"user_id": str(user["_id"]), "startup_id": t["startup_id"], "status": "accepted"})
    if not app_doc:
        raise HTTPException(403, "Join the startup first")
    await db.tasks.update_one(
        {"_id": t["_id"]},
        {"$set": {"status": "in_progress", "assignee_id": str(user["_id"]), "assignee_name": user.get("name", "")}}
    )
    updated = await db.tasks.find_one({"_id": t["_id"]})
    return serialize_task(updated)


@api.post("/tasks/{task_id}/submit")
async def submit_task(task_id: str, body: SubmissionIn, user=Depends(get_current_user)):
    t = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not t:
        raise HTTPException(404, "Task not found")
    if t.get("assignee_id") != str(user["_id"]):
        raise HTTPException(403, "You are not the assignee of this task")
    if not body.github_url.strip().startswith("http"):
        raise HTTPException(400, "Provide a valid GitHub URL")
    sub = {
        "task_id": task_id,
        "startup_id": t["startup_id"],
        "user_id": str(user["_id"]),
        "user_name": user.get("name", ""),
        "github_url": body.github_url.strip(),
        "notes": body.notes or "",
        "status": "pending",
        "feedback": "",
        "submitted_at": now_utc(),
    }
    result = await db.submissions.insert_one(sub)
    await db.tasks.update_one({"_id": t["_id"]}, {"$set": {"status": "in_review"}})
    sub["_id"] = result.inserted_id
    return serialize_submission(sub)


def serialize_submission(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "task_id": doc["task_id"],
        "startup_id": doc["startup_id"],
        "user_id": doc["user_id"],
        "user_name": doc.get("user_name", ""),
        "github_url": doc["github_url"],
        "notes": doc.get("notes", ""),
        "status": doc.get("status", "pending"),
        "feedback": doc.get("feedback", ""),
        "interview": doc.get("interview"),  # {questions, scores, overall}
        "submitted_at": doc["submitted_at"].isoformat() if isinstance(doc.get("submitted_at"), datetime) else doc.get("submitted_at"),
    }


@api.get("/submissions")
async def list_submissions(mine: bool = False, user=Depends(get_current_user)):
    q = {"user_id": str(user["_id"])} if mine else {}
    cursor = db.submissions.find(q).sort("submitted_at", -1).limit(500)
    return [serialize_submission(s) async for s in cursor]


@api.post("/submissions/{sub_id}/review")
async def review_submission(sub_id: str, body: ReviewIn, user=Depends(get_current_user)):
    # Admin-only auto-approval workflow simulation: any user can simulate review for demo,
    # but only admins should normally do this. We restrict to admin role.
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    s = await db.submissions.find_one({"_id": ObjectId(sub_id)})
    if not s:
        raise HTTPException(404, "Submission not found")
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "Invalid status")
    await db.submissions.update_one({"_id": s["_id"]}, {"$set": {"status": body.status, "feedback": body.feedback or ""}})
    new_task_status = "completed" if body.status == "approved" else "in_progress"
    await db.tasks.update_one({"_id": ObjectId(s["task_id"])}, {"$set": {"status": new_task_status}})
    updated = await db.submissions.find_one({"_id": s["_id"]})
    return serialize_submission(updated)


# -----------------------------------------------------------------------------
# Explain-Your-Code Interview (the anti-AI-cheat core of buildX)
# -----------------------------------------------------------------------------
class InterviewAnswersIn(BaseModel):
    answers: List[str]  # one per question, same order


def fallback_questions(t: dict) -> List[str]:
    stack = ", ".join(t.get("skills", [])[:3]) or "your stack"
    return [
        f"Walk through your solution to '{t['title']}'. What was your key design decision and why?",
        f"You used {stack}. If traffic scaled 100x tomorrow, what would break first — and how would you fix it?",
        "Pick one function from your PR. Explain what it does, what could fail, and how you'd test it.",
    ]


def fallback_grade(answers: List[str]) -> dict:
    lens = [len((a or "").strip()) for a in answers]
    depth = min(100, sum(lens) // 4)
    base = max(50, min(92, depth))
    return {
        "scores": {
            "understanding": base,
            "architecture": max(40, base - 5),
            "communication": min(95, base + 3),
            "delivery": max(45, base - 2),
        },
        "overall": base,
        "feedback": "Answers received. This is a heuristic score — connect a real LLM key for AI-graded feedback.",
        "strengths": ["Attempted every question", "Showed reasoning"],
        "improvements": ["Add more concrete examples", "Reference specific lines of your code"],
    }


@api.post("/submissions/{sub_id}/interview/start")
async def interview_start(sub_id: str, user=Depends(get_current_user)):
    s = await db.submissions.find_one({"_id": ObjectId(sub_id)})
    if not s:
        raise HTTPException(404, "Submission not found")
    if s["user_id"] != str(user["_id"]):
        raise HTTPException(403, "Not your submission")
    if s.get("interview"):
        # Already generated — return same questions
        return {"questions": s["interview"]["questions"]}
    t = await db.tasks.find_one({"_id": ObjectId(s["task_id"])})
    if not t:
        raise HTTPException(404, "Ticket not found")

    questions: List[str] = []
    if EMERGENT_LLM_KEY:
        try:
            sys_prompt = (
                "You are a senior staff engineer conducting a code-review follow-up interview for a junior "
                "engineer who just submitted a pull request. Your job is to detect real understanding — "
                "not memorization or AI-copy-paste. Ask 3 short, sharp questions grounded in the ticket "
                "and the student's submission notes. One question must probe DESIGN CHOICES, one must probe "
                "OPERATIONAL RISK (scale/failure), one must probe DEBUGGING/EDGE CASES. Reply ONLY with "
                "valid JSON: {\"questions\": [\"q1\", \"q2\", \"q3\"]}"
            )
            user_prompt = (
                f"TICKET TITLE: {t['title']}\n"
                f"CUSTOMER PROBLEM: {t.get('customer_problem') or t.get('description','')}\n"
                f"ACCEPTANCE CRITERIA: {'; '.join(t.get('acceptance_criteria', []))}\n"
                f"TECH SKILLS: {', '.join(t.get('skills', []))}\n\n"
                f"STUDENT'S PR URL: {s['github_url']}\n"
                f"STUDENT'S NOTES: {s.get('notes','(none)')}"
            )
            data = await llm_json(sys_prompt, user_prompt, f"interview-{sub_id}")
            qs = data.get("questions", [])
            if isinstance(qs, list) and len(qs) >= 3:
                questions = [str(q) for q in qs[:3]]
        except Exception as e:
            logger.warning("interview_start LLM failed: %s", e)

    if not questions:
        questions = fallback_questions(t)

    interview = {"questions": questions, "answers": [], "scores": None, "overall": None, "generated_at": now_utc()}
    await db.submissions.update_one({"_id": s["_id"]}, {"$set": {"interview": interview}})
    return {"questions": questions}


@api.post("/submissions/{sub_id}/interview/answer")
async def interview_answer(sub_id: str, body: InterviewAnswersIn, user=Depends(get_current_user)):
    s = await db.submissions.find_one({"_id": ObjectId(sub_id)})
    if not s:
        raise HTTPException(404, "Submission not found")
    if s["user_id"] != str(user["_id"]):
        raise HTTPException(403, "Not your submission")
    interview = s.get("interview") or {}
    questions: List[str] = interview.get("questions", [])
    if not questions:
        raise HTTPException(400, "Start the interview first")
    if len(body.answers) < len(questions):
        raise HTTPException(400, "Answer all questions")

    t = await db.tasks.find_one({"_id": ObjectId(s["task_id"])})

    result = None
    if EMERGENT_LLM_KEY:
        try:
            qa_block = "\n\n".join(
                f"Q{i+1}: {q}\nA{i+1}: {(body.answers[i] or '').strip() or '(no answer)'}"
                for i, q in enumerate(questions)
            )
            sys_prompt = (
                "You are a senior staff engineer grading a code-review interview. Grade the student on 4 "
                "dimensions from 0-100: understanding (do they truly grasp the problem?), architecture "
                "(quality of design reasoning), communication (clarity & precision), delivery "
                "(pragmatism about shipping). Be fair but rigorous — vague or evasive answers get low "
                "understanding scores even if they sound confident. Reply ONLY with valid JSON of shape: "
                "{\"scores\":{\"understanding\":N,\"architecture\":N,\"communication\":N,\"delivery\":N},"
                "\"overall\":N,\"feedback\":\"1-2 sentences summarising performance\","
                "\"strengths\":[\"...\",\"...\"],\"improvements\":[\"...\",\"...\"]}"
            )
            user_prompt = (
                f"TICKET: {t['title'] if t else ''}\n"
                f"CUSTOMER PROBLEM: {(t or {}).get('customer_problem', '')}\n\n"
                f"INTERVIEW:\n{qa_block}"
            )
            data = await llm_json(sys_prompt, user_prompt, f"interview-grade-{sub_id}")
            scores = data.get("scores", {})
            if all(k in scores for k in ("understanding", "architecture", "communication", "delivery")):
                result = data
        except Exception as e:
            logger.warning("interview_answer LLM failed: %s", e)

    if result is None:
        result = fallback_grade(body.answers)

    scores = result["scores"]
    overall = int(result.get("overall") or sum(scores.values()) / 4)
    interview_out = {
        "questions": questions,
        "answers": body.answers[:len(questions)],
        "scores": scores,
        "overall": overall,
        "feedback": result.get("feedback", ""),
        "strengths": result.get("strengths", []),
        "improvements": result.get("improvements", []),
        "graded_at": now_utc(),
    }
    new_sub_status = "approved" if overall >= 60 else "rejected"
    new_task_status = "completed" if new_sub_status == "approved" else "in_progress"
    await db.submissions.update_one(
        {"_id": s["_id"]},
        {"$set": {"interview": interview_out, "status": new_sub_status, "feedback": result.get("feedback", "")}},
    )
    await db.tasks.update_one({"_id": ObjectId(s["task_id"])}, {"$set": {"status": new_task_status}})

    updated = await db.submissions.find_one({"_id": s["_id"]})
    return {"submission": serialize_submission(updated), "interview": interview_out}


# Self-review demo helper: lets the assignee mark their submission as "auto-approved" via mentor bot
@api.post("/submissions/{sub_id}/auto-approve")
async def auto_approve(sub_id: str, user=Depends(get_current_user)):
    s = await db.submissions.find_one({"_id": ObjectId(sub_id)})
    if not s:
        raise HTTPException(404, "Submission not found")
    if s["user_id"] != str(user["_id"]):
        raise HTTPException(403, "Not your submission")
    await db.submissions.update_one(
        {"_id": s["_id"]},
        {"$set": {"status": "approved", "feedback": "Auto-approved by Mentor Bot — code review passed."}}
    )
    await db.tasks.update_one({"_id": ObjectId(s["task_id"])}, {"$set": {"status": "completed"}})
    updated = await db.submissions.find_one({"_id": s["_id"]})
    return serialize_submission(updated)


# -----------------------------------------------------------------------------
# Verified Experience Profile
# -----------------------------------------------------------------------------
@api.get("/profile/me")
async def my_profile(user=Depends(get_current_user)):
    uid = str(user["_id"])
    apps = await db.applications.find({"user_id": uid, "status": "accepted"}).to_list(100)
    subs = await db.submissions.find({"user_id": uid}).sort("submitted_at", -1).to_list(200)

    # Bulk fetch startups + tasks referenced anywhere
    startup_id_strs = list({a["startup_id"] for a in apps} | {s["startup_id"] for s in subs})
    task_id_strs = list({s["task_id"] for s in subs})
    startups_map = {}
    tasks_map = {}
    if startup_id_strs:
        async for s in db.startups.find({"_id": {"$in": [ObjectId(x) for x in startup_id_strs]}}).limit(500):
            startups_map[str(s["_id"])] = s
    if task_id_strs:
        async for t in db.tasks.find({"_id": {"$in": [ObjectId(x) for x in task_id_strs]}}).limit(500):
            tasks_map[str(t["_id"])] = t

    startups = [serialize_startup(startups_map[a["startup_id"]]) for a in apps if a["startup_id"] in startups_map]

    enriched = []
    skills_set = set()
    points = 0
    for s in subs:
        t = tasks_map.get(s["task_id"])
        st = startups_map.get(s["startup_id"])
        item = serialize_submission(s)
        item["task_title"] = t["title"] if t else ""
        item["task_points"] = t.get("points", 10) if t else 0
        item["startup_name"] = st["name"] if st else ""
        enriched.append(item)
        if s.get("status") == "approved" and t:
            for sk in t.get("skills", []):
                skills_set.add(sk)
            points += t.get("points", 10)
    approved_count = sum(1 for s in subs if s.get("status") == "approved")

    # Dimensional averages from interview scores
    dim_totals = {"understanding": 0, "architecture": 0, "communication": 0, "delivery": 0}
    dim_count = 0
    for s in subs:
        iv = s.get("interview") or {}
        scores = iv.get("scores") or {}
        if all(k in scores for k in dim_totals.keys()):
            for k in dim_totals:
                dim_totals[k] += int(scores[k])
            dim_count += 1
    dim_averages = {k: round(v / dim_count) for k, v in dim_totals.items()} if dim_count else None

    return {
        "user": serialize_user(user),
        "startups": startups,
        "submissions": enriched,
        "stats": {
            "tasks_completed": approved_count,
            "submissions_total": len(subs),
            "skills_earned": sorted(skills_set),
            "experience_points": points,
            "dimensional_averages": dim_averages,
            "interviews_completed": dim_count,
        },
    }


@api.get("/profile/me/certificate")
async def my_certificate(user=Depends(get_current_user)):
    uid = str(user["_id"])
    apps = await db.applications.find({"user_id": uid, "status": "accepted"}).to_list(100)
    subs = await db.submissions.find({"user_id": uid, "status": "approved"}).to_list(200)

    startup_ids = [ObjectId(a["startup_id"]) for a in apps]
    task_ids = [ObjectId(s["task_id"]) for s in subs]
    startups = []
    if startup_ids:
        async for s in db.startups.find({"_id": {"$in": startup_ids}}):
            startups.append(s["name"])
    skills_set = set()
    points = 0
    completed_tasks = []
    if task_ids:
        async for t in db.tasks.find({"_id": {"$in": task_ids}}):
            completed_tasks.append(t["title"])
            for sk in t.get("skills", []):
                skills_set.add(sk)
            points += t.get("points", 10)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(letter))
    width, height = landscape(letter)

    # Border
    c.setStrokeColor(colors.black)
    c.setLineWidth(2)
    c.rect(0.5 * inch, 0.5 * inch, width - 1 * inch, height - 1 * inch)
    c.setLineWidth(0.5)
    c.rect(0.65 * inch, 0.65 * inch, width - 1.3 * inch, height - 1.3 * inch)

    # Overline
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.9 * inch, height - 1.0 * inch, "BUILDX // VERIFIED ENGINEERING EXPERIENCE")
    c.drawRightString(width - 0.9 * inch, height - 1.0 * inch, f"ISSUED {now_utc().strftime('%Y.%m.%d')}")

    # Title
    c.setFont("Helvetica-Bold", 36)
    c.drawString(0.9 * inch, height - 1.7 * inch, "CERTIFICATE OF EXPERIENCE")

    # Red stamp
    c.setFillColor(colors.HexColor("#FF3B30"))
    c.rect(width - 2.5 * inch, height - 1.85 * inch, 1.6 * inch, 0.4 * inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(width - 2.4 * inch, height - 1.72 * inch, "VERIFIED ✓")
    c.setFillColor(colors.black)

    # Body
    c.setFont("Helvetica", 11)
    c.drawString(0.9 * inch, height - 2.2 * inch, "This certificate is awarded to")
    c.setFont("Helvetica-Bold", 26)
    c.drawString(0.9 * inch, height - 2.7 * inch, user.get("name", "Student").upper())
    c.setFont("Helvetica", 11)
    info_line = f"{user.get('university','') or '—'}  /  {user.get('major','') or '—'}  /  {user.get('year','') or '—'}"
    c.drawString(0.9 * inch, height - 2.95 * inch, info_line)

    # Stats
    y = height - 3.6 * inch
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.9 * inch, y, "EXPERIENCE POINTS")
    c.drawString(3.0 * inch, y, "TASKS COMPLETED")
    c.drawString(5.0 * inch, y, "STARTUPS JOINED")
    c.drawString(7.0 * inch, y, "SKILLS")
    c.setFont("Helvetica-Bold", 22)
    c.drawString(0.9 * inch, y - 0.4 * inch, str(points))
    c.drawString(3.0 * inch, y - 0.4 * inch, str(len(subs)))
    c.drawString(5.0 * inch, y - 0.4 * inch, str(len(startups)))
    c.drawString(7.0 * inch, y - 0.4 * inch, str(len(skills_set)))

    # Skills list
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.9 * inch, y - 0.9 * inch, "VERIFIED SKILLS")
    c.setFont("Helvetica", 10)
    skills_line = ", ".join(sorted(skills_set)) or "—"
    c.drawString(0.9 * inch, y - 1.1 * inch, skills_line[:120])

    # Startups
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.9 * inch, y - 1.5 * inch, "STARTUPS")
    c.setFont("Helvetica", 10)
    c.drawString(0.9 * inch, y - 1.7 * inch, (", ".join(startups) or "—")[:120])

    # Footer
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.9 * inch, 0.85 * inch, "BUILDX // VIRTUAL STARTUP WORKSHOP")
    c.setFont("Helvetica", 8)
    c.drawRightString(width - 0.9 * inch, 0.85 * inch, f"CERT-ID: {uid[-12:].upper()}")

    c.showPage()
    c.save()
    buf.seek(0)
    filename = f"buildx-certificate-{user.get('name', 'student').replace(' ', '_').lower()}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# -----------------------------------------------------------------------------
# Seed
# -----------------------------------------------------------------------------
SEED_STARTUPS = [
    {
        "name": "Helix Robotics",
        "tagline": "Open-source robotic arms for biolabs.",
        "description": "Helix is building affordable robotic arms with ROS2 + Python firmware for university biolabs. We need engineers to ship reliable motion-planning + a web cockpit.",
        "industry": "Robotics",
        "stage": "Seed",
        "tech_stack": ["Python", "ROS2", "React", "C++"],
        "roles_open": ["Robotics Engineer", "Frontend Engineer"],
        "logo_url": "https://images.unsplash.com/photo-1689443111384-1cf214df988a?w=400&q=80",
        "tasks": [
            {
                "ticket_no": "HLX-101",
                "title": "Build inverse kinematics solver",
                "description": "Implement a 6-DOF inverse kinematics solver in Python with unit tests.",
                "difficulty": "hard", "points": 50,
                "skills": ["Python", "Linear Algebra", "ROS2"],
                "customer_problem": "Lab technicians report the arm 'freezes' when asked to pick up sample vials at odd angles — because our current solver can't find a valid joint configuration.",
                "acceptance_criteria": [
                    "Given a target pose (x,y,z,roll,pitch,yaw), return joint angles in <50ms",
                    "Reject unreachable poses with a clear error",
                    "Unit tests cover 20+ poses across the workspace",
                    "No numerical instability near singularities",
                ],
                "business_context": "Biolab customers are threatening to churn if we can't pick up vials from tilted racks. This unblocks 3 pilot contracts (~$120k ARR).",
                "attachments": [
                    {"label": "Arm kinematics diagram", "url": "https://en.wikipedia.org/wiki/Inverse_kinematics", "type": "spec"},
                    {"label": "ROS2 URDF file", "url": "#", "type": "asset"},
                ],
            },
            {
                "ticket_no": "HLX-102",
                "title": "Create web cockpit dashboard",
                "description": "Design a React dashboard that streams arm telemetry over WebSocket.",
                "difficulty": "medium", "points": 30,
                "skills": ["React", "WebSocket"],
                "customer_problem": "Operators can't tell if the arm is stalled or just paused — they need a live view of joint torques and camera feed.",
                "acceptance_criteria": [
                    "Live joint-torque chart updating at 10Hz",
                    "Reconnects automatically if WebSocket drops",
                    "Shows arm status: IDLE / MOVING / ERROR",
                    "Emergency stop button visible above the fold",
                ],
                "business_context": "Every 1min of downtime = 3 failed experiments. Ops team wants this on the wall monitor.",
                "attachments": [
                    {"label": "Figma cockpit design", "url": "https://www.figma.com", "type": "design"},
                    {"label": "WebSocket API spec", "url": "#", "type": "api"},
                ],
            },
            {
                "ticket_no": "HLX-103",
                "title": "Write firmware unit tests",
                "description": "Add pytest coverage for the motor control firmware abstractions.",
                "difficulty": "easy", "points": 15,
                "skills": ["Python", "Pytest"],
                "customer_problem": "Regressions have shipped twice this quarter because motor drivers have no test coverage.",
                "acceptance_criteria": [
                    "≥80% line coverage on motor_control.py",
                    "All hardware calls mocked (no physical hardware in CI)",
                    "Tests run in <5 seconds",
                ],
                "business_context": "Without tests, every firmware release is a coin flip. Blocks our v0.4 launch.",
                "attachments": [{"label": "Coverage report (latest)", "url": "#", "type": "asset"}],
            },
        ],
    },
    {
        "name": "Stratos Climate",
        "tagline": "Carbon accounting infrastructure for hardware companies.",
        "description": "Stratos provides APIs that let hardware startups measure their carbon footprint in real time. Backend-heavy, math-rich.",
        "industry": "Climate Tech",
        "stage": "Pre-seed",
        "tech_stack": ["FastAPI", "Postgres", "TypeScript", "Next.js"],
        "roles_open": ["Backend Engineer", "Data Engineer"],
        "logo_url": "https://images.unsplash.com/photo-1638864616270-64041b699a50?w=400&q=80",
        "tasks": [
            {
                "ticket_no": "STR-201",
                "title": "Design carbon factor schema",
                "description": "Model emission factors for >50 industrial materials in Postgres.",
                "difficulty": "medium", "points": 25,
                "skills": ["Postgres", "Data Modeling"],
                "customer_problem": "Our first pilot (a battery manufacturer) needs to attribute CO2e per BOM line. Current CSV import is a mess and can't handle unit conversions (kg vs tonne, per-part vs per-kg).",
                "acceptance_criteria": [
                    "Schema supports material → factor (kgCO2e/unit) with citation",
                    "Handles unit conversion (kg ↔ tonne, m² ↔ m³ where applicable)",
                    "Migration script + seed of 50 common materials",
                    "Index supports lookup by material_code in <10ms",
                ],
                "business_context": "Enables our first paying customer to close their Series-B sustainability report. Deal size: ₹18L ARR.",
                "attachments": [
                    {"label": "GHG Protocol factors PDF", "url": "https://ghgprotocol.org", "type": "spec"},
                    {"label": "Current CSV import (broken)", "url": "#", "type": "asset"},
                ],
            },
            {
                "ticket_no": "STR-202",
                "title": "Build emissions REST API",
                "description": "FastAPI endpoint that returns CO2e for a bill of materials.",
                "difficulty": "medium", "points": 30,
                "skills": ["FastAPI", "Python"],
                "customer_problem": "Customers want to POST their BOM JSON and get back a per-line CO2e breakdown they can drop into their reporting tool.",
                "acceptance_criteria": [
                    "POST /v1/emissions accepts {items:[{material_code, qty, unit}]}",
                    "Returns per-line + total CO2e with citation source",
                    "Rejects unknown material_code with 422 + suggestion",
                    "p95 latency <200ms for 100-item BOMs",
                ],
                "business_context": "The API IS the product. Anything above p95=200ms means we lose the enterprise deal.",
                "attachments": [{"label": "OpenAPI spec (draft)", "url": "#", "type": "api"}],
            },
            {
                "ticket_no": "STR-203",
                "title": "Add JWT auth to public API",
                "description": "Implement scoped API keys with rate limits.",
                "difficulty": "hard", "points": 40,
                "skills": ["Python", "Security", "JWT"],
                "customer_problem": "We're leaking free access — anyone with the URL can call the emissions API. Enterprise contracts require scoped keys and audit logs.",
                "acceptance_criteria": [
                    "API key issuance with scopes (read / write / admin)",
                    "Per-key rate limit (default 60 req/min)",
                    "Audit log persists key_id + endpoint + timestamp",
                    "Key rotation without downtime",
                ],
                "business_context": "Blocks our SOC2-lite compliance track. Two enterprise deals stalled waiting for this.",
                "attachments": [{"label": "Security review checklist", "url": "#", "type": "spec"}],
            },
        ],
    },
    {
        "name": "Citadel Health",
        "tagline": "Patient-owned medical records on a privacy-first stack.",
        "description": "Citadel is rebuilding patient records on end-to-end encrypted infrastructure. Looking for cryptography-curious engineers.",
        "industry": "Health Tech",
        "stage": "Seed",
        "tech_stack": ["Rust", "TypeScript", "React Native", "Postgres"],
        "roles_open": ["Mobile Engineer", "Security Engineer"],
        "logo_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80",
        "tasks": [
            {
                "ticket_no": "CIT-301",
                "title": "Implement E2E encryption flow",
                "description": "Design key-exchange + envelope encryption for patient documents.",
                "difficulty": "hard", "points": 50,
                "skills": ["Cryptography", "TypeScript"],
                "customer_problem": "Patients are refusing to upload documents because our servers can decrypt them. We need true zero-knowledge storage.",
                "acceptance_criteria": [
                    "Client-side key generation (never leaves device)",
                    "Envelope encryption: doc key → encrypted with patient master key",
                    "Server stores only ciphertext + metadata",
                    "Sharing with a doctor uses their public key (re-encrypt at rest)",
                ],
                "business_context": "Without E2E, we can't sell to hospital systems (they demand it in their infosec review).",
                "attachments": [
                    {"label": "libsodium docs", "url": "https://libsodium.gitbook.io", "type": "spec"},
                    {"label": "Threat model doc", "url": "#", "type": "spec"},
                ],
            },
            {
                "ticket_no": "CIT-302",
                "title": "Patient timeline mobile screen",
                "description": "Build the patient timeline UI in React Native with offline sync.",
                "difficulty": "medium", "points": 30,
                "skills": ["React Native", "TypeScript"],
                "customer_problem": "Patients want to scroll their full medical history like a chat thread — but the app dies on flaky hospital Wi-Fi.",
                "acceptance_criteria": [
                    "Timeline paginates in reverse-chronological order",
                    "Fully functional offline (reads from local encrypted store)",
                    "Background sync when connection returns",
                    "Handles 5k+ items without jank",
                ],
                "business_context": "Retention is bad — 40% of first-time users bounce because the app hangs. Fixing this is a P0.",
                "attachments": [{"label": "Figma timeline design", "url": "#", "type": "design"}],
            },
        ],
    },
    {
        "name": "Forge AI",
        "tagline": "Internal copilots for industrial manufacturing.",
        "description": "Forge fine-tunes small LLMs on factory SOPs. We need engineers comfortable with eval pipelines and inference.",
        "industry": "AI / Manufacturing",
        "stage": "Series A",
        "tech_stack": ["Python", "PyTorch", "FastAPI", "React"],
        "roles_open": ["ML Engineer", "Full-Stack Engineer"],
        "logo_url": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=80",
        "tasks": [
            {
                "ticket_no": "FRG-401",
                "title": "Build RAG eval harness",
                "description": "Implement a reproducible evaluation harness for retrieval-augmented generation.",
                "difficulty": "hard", "points": 45,
                "skills": ["Python", "PyTorch", "Evals"],
                "customer_problem": "Ops leads at customer factories don't trust our copilot's answers because we can't show 'this got 92% on our eval set' — we just say 'trust us'.",
                "acceptance_criteria": [
                    "Runs the same eval set across N model versions",
                    "Metrics: exact-match, semantic-similarity, retrieval-recall@k",
                    "CI-friendly (JSON + JUnit output)",
                    "Regression detection when a new version drops below threshold",
                ],
                "business_context": "Two Fortune-500 pilots gated on 'show us your eval numbers.' No eval → no PO.",
                "attachments": [{"label": "Example eval set (JSONL)", "url": "#", "type": "asset"}],
            },
            {
                "ticket_no": "FRG-402",
                "title": "SOP ingestion pipeline",
                "description": "Pipeline that parses PDF SOPs into structured chunks.",
                "difficulty": "medium", "points": 25,
                "skills": ["Python", "PDF parsing"],
                "customer_problem": "Customers hand us 200-page SOP PDFs and our current parser mangles tables + numbered lists — the copilot answers get garbled context.",
                "acceptance_criteria": [
                    "Extracts headings, paragraphs, tables, numbered steps as structured JSON",
                    "Preserves the section hierarchy",
                    "Handles multi-column layouts",
                    "Processes 200-page PDF in <30 seconds",
                ],
                "business_context": "Every day this stays broken, one more customer says 'the AI is wrong' and considers churning.",
                "attachments": [{"label": "Example customer SOP", "url": "#", "type": "asset"}],
            },
            {
                "ticket_no": "FRG-403",
                "title": "Operator chat UI",
                "description": "Streaming chat UI for factory operators.",
                "difficulty": "easy", "points": 20,
                "skills": ["React", "SSE"],
                "customer_problem": "Operators wear gloves and can't type long questions — they want big buttons, streaming responses, and voice input on tablets.",
                "acceptance_criteria": [
                    "Streams tokens as they arrive (SSE)",
                    "Voice-to-text input working on iPad Safari",
                    "Big-touch buttons (min 44px)",
                    "Works offline: shows queued question with retry",
                ],
                "business_context": "Adoption blocker on the shop floor. Operators literally won't use it if they have to type.",
                "attachments": [{"label": "Operator UX research", "url": "#", "type": "spec"}],
            },
        ],
    },
    {
        "name": "Beacon Mobility",
        "tagline": "Charging-network orchestration for electric fleets.",
        "description": "Beacon optimizes when and where EV fleets charge. We need engineers excited about optimization, telemetry, and maps.",
        "industry": "Mobility",
        "stage": "Seed",
        "tech_stack": ["Go", "TypeScript", "React", "Mapbox"],
        "roles_open": ["Backend Engineer", "Maps Engineer"],
        "logo_url": "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=80",
        "tasks": [
            {
                "ticket_no": "BCN-501",
                "title": "Charging-window optimizer",
                "description": "Implement an optimizer that picks the cheapest charging window per vehicle.",
                "difficulty": "hard", "points": 45,
                "skills": ["Go", "Optimization"],
                "customer_problem": "A 50-van last-mile fleet is burning 40% more on electricity than needed because vans charge whenever they're plugged in — regardless of grid pricing or route needs.",
                "acceptance_criteria": [
                    "Given (vehicle SoC, route start, grid price curve, target SoC), return charge schedule",
                    "Optimizes for lowest total cost while meeting SoC deadline",
                    "Runs in <2s for 100 vehicles",
                    "Handles constraint: 'must not fully drain grid connection'",
                ],
                "business_context": "First customer signs a 3-year deal if we can show 20% savings in the pilot.",
                "attachments": [{"label": "Grid pricing feed spec", "url": "#", "type": "spec"}],
            },
            {
                "ticket_no": "BCN-502",
                "title": "Fleet map view",
                "description": "Mapbox view showing live fleet positions with clustering.",
                "difficulty": "medium", "points": 30,
                "skills": ["React", "Mapbox"],
                "customer_problem": "Fleet ops managers currently open 50 separate tabs to track each vehicle. They want one live map with clustering + charging status.",
                "acceptance_criteria": [
                    "Live positions from WebSocket feed",
                    "Cluster markers when zoomed out (>50 points)",
                    "Color-code by state: driving / charging / idle / low-battery",
                    "Click cluster → zooms + expands",
                ],
                "business_context": "Ops managers said 'give us the map or we go back to spreadsheets.' Retention driver.",
                "attachments": [{"label": "Mapbox GL JS docs", "url": "https://docs.mapbox.com", "type": "spec"}],
            },
        ],
    },
]


async def seed_data():
    count = await db.startups.count_documents({})
    if count > 0:
        return
    for s in SEED_STARTUPS:
        tasks = s.pop("tasks", [])
        s["created_at"] = now_utc()
        result = await db.startups.insert_one(s)
        sid = str(result.inserted_id)
        for t in tasks:
            await db.tasks.insert_one({
                "startup_id": sid,
                "ticket_no": t.get("ticket_no", ""),
                "title": t["title"],
                "description": t["description"],
                "difficulty": t["difficulty"],
                "skills": t["skills"],
                "points": t["points"],
                "customer_problem": t.get("customer_problem", ""),
                "acceptance_criteria": t.get("acceptance_criteria", []),
                "business_context": t.get("business_context", ""),
                "attachments": t.get("attachments", []),
                "status": "open",
                "assignee_id": None,
                "assignee_name": None,
                "created_at": now_utc(),
            })


async def reseed_rich_tickets():
    """One-time upgrade: back-fill rich ticket fields onto existing seeded tasks."""
    for s in SEED_STARTUPS:
        startup_doc = await db.startups.find_one({"name": s["name"]})
        if not startup_doc:
            continue
        sid = str(startup_doc["_id"])
        for t in s.get("tasks", []):
            existing = await db.tasks.find_one({"startup_id": sid, "title": t["title"]})
            if not existing:
                continue
            # Only patch if the rich fields are missing
            if not existing.get("customer_problem"):
                await db.tasks.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "ticket_no": t.get("ticket_no", ""),
                        "customer_problem": t.get("customer_problem", ""),
                        "acceptance_criteria": t.get("acceptance_criteria", []),
                        "business_context": t.get("business_context", ""),
                        "attachments": t.get("attachments", []),
                    }},
                )


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@launchpad.dev")
    password = os.environ.get("ADMIN_PASSWORD", "LaunchPad2026!")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "email": email,
            "password_hash": hash_password(password),
            "name": "buildX Admin",
            "university": "",
            "major": "",
            "year": "",
            "bio": "",
            "skills": [],
            "role": "admin",
            "created_at": now_utc(),
        })


# -----------------------------------------------------------------------------
# Healthz / Startup
# -----------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"name": "buildX API", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.applications.create_index([("user_id", 1), ("startup_id", 1)], unique=True)
    await db.tasks.create_index("startup_id")
    await db.submissions.create_index("user_id")
    await seed_admin()
    await seed_data()
    await reseed_rich_tickets()
    logger.info("buildX backend ready.")


@app.on_event("shutdown")
async def shutdown_event():
    client.close()
