# LaunchPad — Virtual Startup Platform for Engineering Students

## Original Problem Statement
> Create a platform where engineering students join virtual startups. Include student signup, startup listing, task board, GitHub submission, and verified experience profile.

## User Choices (from clarification)
- Authentication: JWT-based custom auth (email/password)
- Roles: Students only (admin auto-seeded for review automation)
- GitHub submission: Simple URL submission
- Verified profile: Both auto-generated from approved tasks AND downloadable PDF certificate
- Seed data: Yes, 5 sample virtual startups with tasks

## Architecture
- **Backend:** FastAPI + Motor (MongoDB async) on port 8001, all routes prefixed `/api`
- **Frontend:** React 19 + react-router 7 + Tailwind + shadcn (sonner for toasts) + lucide-react icons
- **Auth:** PyJWT + bcrypt; access token in httpOnly cookie AND returned as Bearer token (fallback for cross-origin preview)
- **PDF:** reportlab (server-side generated certificate)
- **Design:** Swiss / high-contrast brutalist (Outfit + JetBrains Mono, 1px borders, red #FF3B30 accent, no rounded corners)

## User Persona
- Engineering student (undergrad / grad) seeking real product experience with a verifiable record for recruiters.

## Core Requirements (static)
1. Student signup / login
2. Startup listing (browse + filter)
3. Task board (Kanban: Open → In Progress → In Review → Completed)
4. GitHub submission (URL-based) with auto-review via Mentor Bot
5. Verified experience profile + downloadable PDF certificate

## What's Been Implemented (2026-02)
- JWT auth (`/api/auth/register|login|me|logout|me PATCH`) with bcrypt + cookies + Bearer fallback
- 5 seeded virtual startups (Helix Robotics, Stratos Climate, Citadel Health, Forge AI, Beacon Mobility) with 2–3 tasks each
- Apply / join startup (auto-accept) + membership endpoint
- Task claim, submit, auto-approve flow
- Verified profile aggregation: XP, tasks completed, skills earned, startups joined, submission history
- PDF certificate (reportlab, landscape letter, with "VERIFIED" stamp)
- Landing page, login, register, dashboard, startups, startup detail (Kanban), profile
- Fully responsive, all interactive elements have `data-testid`
- Brutalist design (Outfit + JetBrains Mono, sharp borders, grid paper background)

## Backlog / Next Action Items
**P1**
- Real mentor review queue (admin dashboard to approve/reject submissions instead of demo auto-approve)
- Email notifications on submission / task assignment
- GitHub OAuth (verify PR ownership) — optional

**P2**
- Public profile share URL (`/u/:slug`) recruiters can audit
- Leaderboard of top contributors per startup
- Inline chat / discussion thread per task
- Team formation inside a startup

## Test Credentials
See `/app/memory/test_credentials.md`.
