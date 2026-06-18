# 💻 Local Laptop Setup Guide — DeliveryPulse AI (V2)

This guide walks you through getting the full DeliveryPulse AI stack running on your local machine from scratch.

---

## Prerequisites

Install the following before you begin:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.14 | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| PostgreSQL | 13 or 18 | https://www.postgresql.org/download/ |
| Git | any | https://git-scm.com/ |

> **Windows users:** During PostgreSQL installation, note the password you set for the `postgres` user — you'll need it below.

---

## Step 1 — Clone or Extract the Project

If you received a ZIP file, extract it and navigate into the project root:

```bash
# The project root contains backend/ and frontend/
cd demo_v2_threshold/demo_v2
```

---

## Step 2 — Database Setup

### Create the database

**Windows (Command Prompt):**
```cmd
"C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h 127.0.0.1 -U postgres deliverypulse_ai_v2
```

**Mac / Linux:**
```bash
createdb -h 127.0.0.1 -U postgres deliverypulse_ai_v2
```

Enter your PostgreSQL `postgres` user password when prompted.

---

## Step 3 — Backend Setup

Open a terminal and navigate to the `backend/` folder:

```bash
cd backend
```

### 3a. Create and activate a virtual environment

**Windows:**
```cmd
python -m venv .venv
.venv\Scripts\activate
```

**Mac / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

> Your prompt should now show `(.venv)` to confirm the environment is active.

### 3b. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3c. Configure environment variables

Copy the example env file and fill in your values:

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Then open `.env` in a text editor and set at minimum:

```env
DATABASE_URL=postgresql://postgres:<YOUR_POSTGRES_PASSWORD>@127.0.0.1:5432/deliverypulse_ai_v2
JWT_SECRET=any-long-random-string-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
APP_NAME=DeliveryPulse AI
ENVIRONMENT=development
```

Replace `<YOUR_POSTGRES_PASSWORD>` with the password you set during PostgreSQL installation.

### 3d. Run database migrations

```bash
python -m alembic upgrade head
```

This creates all database tables.

### 3e. Seed the database

Run these scripts in order from the `backend/` directory:

```bash
python scripts/seed_roles.py
python scripts/seed_admin.py
python scripts/seed_demo_structure.py
python scripts/seed_metric_definitions.py
python scripts/seed_v2_thresholds.py
python scripts/seed_submission_statuses.py
python scripts/seed_governance_periods.py
python scripts/seed_qpm_catalog.py
```

---

## Step 4 — Frontend Setup

Open a **new terminal** (keep the backend terminal open) and navigate to `frontend/`:

```bash
cd frontend
```

### 4a. Install Node dependencies

```bash
npm install
```

### 4b. Configure the frontend environment

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

The default `.env.example` already points to `http://localhost:8000` — you only need to change this if your backend runs on a different port.

---

## Step 5 — Start the Application

### Start the backend (in its terminal)

```bash
# From the backend/ directory, with .venv active
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Start the frontend (in its terminal)

```bash
# From the frontend/ directory
npm run dev
```

---

## Step 6 — Access the App

| Service | URL |
|---------|-----|
| Frontend App | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger / API Docs | http://localhost:8000/docs |

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | admin@deliverypulse.ai | Admin@123 |
| Customer Admin | customer.admin@deliverypulse.ai | Demo@12345 |
| Delivery Head (BU 1) | rajesh.dh@deliverypulse.ai | Demo@12345 |
| Delivery Head (BU 2) | priya.dh@deliverypulse.ai | Demo@12345 |
| Project Manager 1 | pm1@deliverypulse.ai | Demo@12345 |
| Project Manager 2 | pm2@deliverypulse.ai | Demo@12345 |

---

## Troubleshooting

**`python` command not found on Mac/Linux**
Use `python3` instead of `python` for all commands.

**PostgreSQL connection refused**
Make sure PostgreSQL is running. On Windows, check Services; on Mac/Linux run `pg_ctl status`.

**`alembic upgrade head` fails**
Double-check your `DATABASE_URL` in `.env`. The password and database name must match exactly what you created in Step 2.

**Port 8000 or 5173 already in use**
Another process is using that port. Either stop it, or start the backend/frontend on a different port:
- Backend: `--port 8001`
- Frontend: edit `vite.config.ts` and add `server: { port: 5174 }`

**`npm install` fails**
Make sure Node.js 18 or higher is installed: `node --version`

**Virtual environment not activating on Windows**
If you see a permissions error, run this once in PowerShell as Administrator:
```powershell
Set-ExecutionPolicy RemoteSigned
```

---

## Project Structure (Quick Reference)

```
demo_v2/
├── backend/                FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/                Main application code
│   ├── alembic/            Database migrations
│   ├── scripts/            Seed scripts
│   ├── .env.example        ← copy to .env and fill in values
│   └── requirements.txt    Python dependencies
│
├── frontend/               React 19 + TypeScript + Vite + TailwindCSS
│   ├── src/                Application source code
│   ├── .env.example        ← copy to .env
│   └── package.json        Node dependencies
│
├── README.md               Full project documentation
└── LAPTOP_SETUP.md         ← You are here
```

---

*For full feature documentation, API reference, and architecture details, see [README.md](./README.md).*
