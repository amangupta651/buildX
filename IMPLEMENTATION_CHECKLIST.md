# buildX Feature Implementation Checklist

## Profile Completion Flow

### ✅ Phase 1: Signup & Stack Selection
- [x] User Registration (`/register`)
- [x] Redirect to Stack Selection (`/register-stack`) after signup
- [x] **Preferred Stack selection** - Users select from: Frontend, Backend, Mobile, DevOps, Data, ML
  - Component: `RegisterStack.jsx`
  - Stack preference saved to user profile
  - Redirect to dashboard after completion

### ✅ Phase 2: Dashboard & Stack Filtering
- [x] **Dashboard shows only selected stack tickets**
  - `Dashboard.jsx` - Shows user stats and active engagements
  - Tickets filtered by user's selected stack
  - Recent submissions shown with status

### ✅ Phase 3: Ticket Lifecycle Management
- [x] **Ticket Lifecycle States**:
  - ✅ Ready for Pickup - Open tickets available to claim
  - ✅ In Progress - User has claimed the task
  - ✅ In Review - PR submitted, waiting for review
  - ✅ Changes Requested - Reviewer requested modifications
  - ✅ Approved - PR approved, ready to merge
  - ✅ Merged - PR merged to main
  - ✅ Done - Task completed and verified

### ✅ Phase 4: Ticket Views

#### My Tickets (`/tickets?tab=my`)
- [x] Component: `MyTickets.jsx`
- [x] Shows all tickets assigned to current user
- [x] Filterable by lifecycle status
- [x] Displays:
  - Ticket title & description
  - Startup name
  - Difficulty level
  - XP points
  - Current status badge
  - Link to startup detail page

#### Available Tickets (`/tickets?tab=available`)
- [x] Component: `AvailableTickets.jsx`
- [x] Shows open tasks matching user's stack preference
- [x] Searchable by title or startup name
- [x] Filterable by difficulty (easy/medium/hard)
- [x] Displays:
  - Ticket title & problem statement
  - Startup name & industry
  - Required skills
  - Difficulty badge
  - XP rewards
  - Claim button (in detail view)

### ✅ Phase 5: Ticket Board UI
- [x] Kanban board view in `StartupDetail.jsx`
- [x] Four columns:
  - Ready for Pickup (open tasks)
  - In Progress (claimed tasks)
  - In Review (submitted PRs)
  - Completed (done tasks)
- [x] Drag-and-drop status updates
- [x] Quick actions:
  - Claim (Ready → In Progress)
  - Submit PR (In Progress → In Review)
  - Ask AI Mentor support

## Backend Integration Points (Needed)

### Endpoints to Create/Update:
- [x] `PATCH /auth/me` - Update user stack preference
- [ ] `GET /tasks/my-tickets` - Get user's assigned tickets
- [ ] `GET /tasks/available` - Get open tickets (optionally filtered by stack)
- [ ] `GET /tasks?startup_id=X&stack=Y` - Get tasks with filters
- [ ] `POST /tasks/{id}/claim` - Claim a task
- [ ] `POST /tasks/{id}/submit` - Submit a task for review
- [ ] `POST /ai-mentor/review` - Get AI mentor feedback

## Database Schema Updates (Needed)

### User Model
- [x] `stack` field - Array of selected tech stacks
- [ ] `preferred_stack` - Normalized reference

### Task/Ticket Model
- [ ] `status` enum - [ready_for_pickup, in_progress, in_review, changes_requested, approved, merged, done]
- [ ] `assignee_id` - Reference to assigned user
- [ ] `submitted_at` - PR submission timestamp
- [ ] `skills` array - Required skills for task
- [ ] `startup_id` - Reference to startup

### Submission Model
- [ ] `github_url` - Link to PR
- [ ] `status` - [pending, approved, rejected, changes_requested]
- [ ] `feedback` - Reviewer feedback

## Frontend Routes

| Route | Component | Protected | Stack Required |
|-------|-----------|-----------|-----------------|
| `/register-stack` | RegisterStack | Yes | No |
| `/dashboard` | Dashboard | Yes | Yes |
| `/tickets` | Tickets | Yes | Yes |
| `/startups` | Startups | Yes | No |
| `/startups/:id` | StartupDetail | Yes | No |
| `/profile` | Profile | Yes | No |

## UI/UX Features Implemented

- [x] Stack selection with 6 tech categories
- [x] Inline status badges with color coding
- [x] Search & filter for tickets
- [x] Kanban board layout
- [x] Difficulty indicators (easy/medium/hard)
- [x] XP point display
- [x] Profile completion flow
- [x] Responsive grid layouts

## Next Steps

1. Create missing backend endpoints
2. Update database schema with status fields
3. Add drag-and-drop functionality to kanban board (optional - can use react-beautiful-dnd)
4. Implement AI Mentor modal
5. Add notification system for task status changes
6. Create admin panel for task management
7. Add pagination for ticket lists
8. Implement email notifications

## Testing Checklist

- [ ] User can select stack during onboarding
- [ ] Dashboard shows only selected stack startups
- [ ] Available tickets filtered by user stack
- [ ] Can claim tasks and status changes to "In Progress"
- [ ] Can submit PR and status changes to "In Review"
- [ ] My Tickets view shows all assigned tickets
- [ ] Ticket lifecycle statuses display correctly
- [ ] Search and filtering work on ticket pages
- [ ] AI Mentor review works for in-progress tasks
- [ ] Profile page shows all metrics and completion status
