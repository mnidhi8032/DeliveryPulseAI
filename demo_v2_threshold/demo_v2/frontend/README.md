# DeliveryPulse AI — Frontend

React + Vite + TypeScript + Tailwind + React Router + Axios.

## Prerequisites

- Node.js 18+
- Backend API running at `http://127.0.0.1:8000`

## Setup

```powershell
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173

## Test login

- Email: `admin@deliverypulse.ai`
- Password: `Admin@123`
- Role: Platform Admin → `/platform`

API calls use the Vite proxy (`/api/v1` → backend). Optional override: copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.

## Phase 6 scope

- Login, JWT in `localStorage`, session restore on refresh
- Role-based routes and layout shells (no dashboard widgets yet)

## Phase 7 scope (PM)

- `/pm/projects` — assigned projects list
- `/pm/projects/:projectId` — create draft submission, view history
- `/pm/submissions/:submissionId` — manual metrics by dimension, save draft, health panel

Log in as a **PM** user (not Platform Admin) to use the workspace. Seed demo PM via backend scripts or create a project with `project_manager_id` set to your PM user.
