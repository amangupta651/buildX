from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import uuid
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

# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]

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
        "role": doc.get("role", "student"),
        "created_at": doc.get("created_at", now_utc()).isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


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
        "bio": "",
        "skills": [],
        "role": "student",
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
# Startups
# -----------------------------------------------------------------------------
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


@api.get("/startups")
async def list_startups():
    cursor = db.startups.find({}).sort("created_at", -1)
    out = []
    async for s in cursor:
        members = await db.applications.count_documents({"startup_id": str(s["_id"]), "status": "accepted"})
        tasks = await db.tasks.count_documents({"startup_id": str(s["_id"])})
        s["members_count"] = members
        s["tasks_count"] = tasks
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
    # Auto-accept (simple flow)
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
        "created_at": doc.get("created_at", now_utc()).isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


@api.get("/tasks")
async def list_tasks(startup_id: Optional[str] = None):
    q = {}
    if startup_id:
        q["startup_id"] = startup_id
    cursor = db.tasks.find(q).sort("created_at", -1)
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
        "submitted_at": doc["submitted_at"].isoformat() if isinstance(doc.get("submitted_at"), datetime) else doc.get("submitted_at"),
    }


@api.get("/submissions")
async def list_submissions(mine: bool = False, user=Depends(get_current_user)):
    q = {"user_id": str(user["_id"])} if mine else {}
    cursor = db.submissions.find(q).sort("submitted_at", -1)
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
    # Startups joined
    apps = await db.applications.find({"user_id": uid, "status": "accepted"}).to_list(100)
    startup_ids = [a["startup_id"] for a in apps]
    startups = []
    for sid in startup_ids:
        s = await db.startups.find_one({"_id": ObjectId(sid)})
        if s:
            startups.append(serialize_startup(s))
    # Submissions (approved only count toward verified experience)
    subs = await db.submissions.find({"user_id": uid}).sort("submitted_at", -1).to_list(200)
    approved = [s for s in subs if s.get("status") == "approved"]
    # Enrich with task title + startup name
    enriched = []
    for s in subs:
        t = await db.tasks.find_one({"_id": ObjectId(s["task_id"])})
        st = await db.startups.find_one({"_id": ObjectId(s["startup_id"])})
        item = serialize_submission(s)
        item["task_title"] = t["title"] if t else ""
        item["task_points"] = t.get("points", 10) if t else 0
        item["startup_name"] = st["name"] if st else ""
        enriched.append(item)
    # Skills earned
    skills_set = set()
    points = 0
    for a in approved:
        t = await db.tasks.find_one({"_id": ObjectId(a["task_id"])})
        if t:
            for sk in t.get("skills", []):
                skills_set.add(sk)
            points += t.get("points", 10)
    return {
        "user": serialize_user(user),
        "startups": startups,
        "submissions": enriched,
        "stats": {
            "tasks_completed": len(approved),
            "submissions_total": len(subs),
            "skills_earned": sorted(skills_set),
            "experience_points": points,
        },
    }


@api.get("/profile/me/certificate")
async def my_certificate(user=Depends(get_current_user)):
    uid = str(user["_id"])
    apps = await db.applications.find({"user_id": uid, "status": "accepted"}).to_list(100)
    startups = []
    for a in apps:
        s = await db.startups.find_one({"_id": ObjectId(a["startup_id"])})
        if s:
            startups.append(s["name"])
    subs = await db.submissions.find({"user_id": uid, "status": "approved"}).to_list(200)
    skills_set = set()
    points = 0
    completed_tasks = []
    for sub in subs:
        t = await db.tasks.find_one({"_id": ObjectId(sub["task_id"])})
        if t:
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
            {"title": "Build inverse kinematics solver", "description": "Implement a 6-DOF inverse kinematics solver in Python with unit tests.", "difficulty": "hard", "skills": ["Python", "Linear Algebra", "ROS2"], "points": 50},
            {"title": "Create web cockpit dashboard", "description": "Design a React dashboard that streams arm telemetry over WebSocket.", "difficulty": "medium", "skills": ["React", "WebSocket"], "points": 30},
            {"title": "Write firmware unit tests", "description": "Add pytest coverage for the motor control firmware abstractions.", "difficulty": "easy", "skills": ["Python", "Pytest"], "points": 15},
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
            {"title": "Design carbon factor schema", "description": "Model emission factors for >50 industrial materials in Postgres.", "difficulty": "medium", "skills": ["Postgres", "Data Modeling"], "points": 25},
            {"title": "Build emissions REST API", "description": "FastAPI endpoint that returns CO2e for a bill of materials.", "difficulty": "medium", "skills": ["FastAPI", "Python"], "points": 30},
            {"title": "Add JWT auth to public API", "description": "Implement scoped API keys with rate limits.", "difficulty": "hard", "skills": ["Python", "Security", "JWT"], "points": 40},
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
            {"title": "Implement E2E encryption flow", "description": "Design key-exchange + envelope encryption for patient documents.", "difficulty": "hard", "skills": ["Cryptography", "TypeScript"], "points": 50},
            {"title": "Patient timeline mobile screen", "description": "Build the patient timeline UI in React Native with offline sync.", "difficulty": "medium", "skills": ["React Native", "TypeScript"], "points": 30},
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
            {"title": "Build RAG eval harness", "description": "Implement a reproducible evaluation harness for retrieval-augmented generation.", "difficulty": "hard", "skills": ["Python", "PyTorch", "Evals"], "points": 45},
            {"title": "SOP ingestion pipeline", "description": "Pipeline that parses PDF SOPs into structured chunks.", "difficulty": "medium", "skills": ["Python", "PDF parsing"], "points": 25},
            {"title": "Operator chat UI", "description": "Streaming chat UI for factory operators.", "difficulty": "easy", "skills": ["React", "SSE"], "points": 20},
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
            {"title": "Charging-window optimizer", "description": "Implement an optimizer that picks the cheapest charging window per vehicle.", "difficulty": "hard", "skills": ["Go", "Optimization"], "points": 45},
            {"title": "Fleet map view", "description": "Mapbox view showing live fleet positions with clustering.", "difficulty": "medium", "skills": ["React", "Mapbox"], "points": 30},
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
                "title": t["title"],
                "description": t["description"],
                "difficulty": t["difficulty"],
                "skills": t["skills"],
                "points": t["points"],
                "status": "open",
                "assignee_id": None,
                "assignee_name": None,
                "created_at": now_utc(),
            })


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
    logger.info("buildX backend ready.")


@app.on_event("shutdown")
async def shutdown_event():
    client.close()
