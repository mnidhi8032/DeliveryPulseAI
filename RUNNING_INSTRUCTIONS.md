# Running DeliveryPulse AI V2

Assuming you have already set up the database and installed dependencies (if not, refer to `demo_v2_threshold/demo_v2/LAPTOP_SETUP.md`), follow these steps to run the project locally.

---

## 1. Start the Backend

Open a terminal and navigate to the backend folder:
```cmd
cd demo_v2_threshold/demo_v2/backend
```

Activate the virtual environment:
```cmd
.venv\Scripts\activate
```

Start the FastAPI server:
```cmd
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

---

## 2. Start the Frontend

Open a **new separate terminal** and navigate to the frontend folder:
```cmd
cd demo_v2_threshold/demo_v2/frontend
```

Start the React dev server:
```cmd
npm run dev
```

- App: `http://localhost:5173`

---

## 3. Login Credentials

Open `http://localhost:5173`. The email tells you exactly who you're logging in as.

> **All demo passwords:** `Demo@12345`  
> **Platform Admin password:** `Admin@123`

---

### Global Roles

| Role | Email | Password |
|---|---|---|
| Platform Admin | admin@deliverypulse.ai | Admin@123 |
| CEO | ceo@deliverypulse.ai | Demo@12345 |
| Delivery Excellence | de@deliverypulse.ai | Demo@12345 |

---

### Delivery Heads  *(email format: `dh.<bu>@deliverypulse.ai`)*

| Business Unit | Email | Password |
|---|---|---|
| Banking & Financial Services | dh.bfsi@deliverypulse.ai | Demo@12345 |
| Cloud Infrastructure | dh.cloud@deliverypulse.ai | Demo@12345 |
| Digital Services | dh.digital@deliverypulse.ai | Demo@12345 |

---

### Project Managers  *(email format: `pm.<bu>@deliverypulse.ai`)*

| Business Unit | Email | Password |
|---|---|---|
| Banking & Financial Services | pm.bfsi@deliverypulse.ai | Demo@12345 |
| Cloud Infrastructure | pm.cloud@deliverypulse.ai | Demo@12345 |
| Digital Services | pm.digital@deliverypulse.ai | Demo@12345 |

---

### Delivery Managers  *(email format: `dm.<account>@deliverypulse.ai`)*

| BU | Account | Email | Password |
|---|---|---|---|
| Banking & Financial Services | Apex Bank | dm.apex@deliverypulse.ai | Demo@12345 |
| Banking & Financial Services | Sterling Finance | dm.sterling@deliverypulse.ai | Demo@12345 |
| Cloud Infrastructure | Globex | dm.globex@deliverypulse.ai | Demo@12345 |
| Cloud Infrastructure | Nexus Cloud | dm.nexus@deliverypulse.ai | Demo@12345 |
| Digital Services | Acme Corp | dm.acme@deliverypulse.ai | Demo@12345 |
| Digital Services | Tech Nova | dm.technova@deliverypulse.ai | Demo@12345 |

---

## 4. Organisation Structure

```
Banking & Financial Services
  ├── DH:  dh.bfsi@deliverypulse.ai
  ├── PM:  pm.bfsi@deliverypulse.ai
  ├── Apex Bank        →  dm.apex@deliverypulse.ai
  └── Sterling Finance →  dm.sterling@deliverypulse.ai

Cloud Infrastructure
  ├── DH:  dh.cloud@deliverypulse.ai
  ├── PM:  pm.cloud@deliverypulse.ai
  ├── Globex       →  dm.globex@deliverypulse.ai
  └── Nexus Cloud  →  dm.nexus@deliverypulse.ai

Digital Services
  ├── DH:  dh.digital@deliverypulse.ai
  ├── PM:  pm.digital@deliverypulse.ai
  ├── Acme Corp  →  dm.acme@deliverypulse.ai
  └── Tech Nova  →  dm.technova@deliverypulse.ai
```

---

## 5. Quick-Start Demo Scenarios

**KPI data entry (PM flow):**
1. Login as `pm.bfsi@deliverypulse.ai`
2. Click any project card on the dashboard → KPI summary
3. Navigate to Data Entry to enter parameter values and save

**DM review + action items:**
1. Login as `dm.sterling@deliverypulse.ai`
2. Dashboard shows projects needing review — click "Review KPIs →"
3. Go to Action Items page → create an action item → PM gets notified

**Executive portfolio view:**
1. Login as `ceo@deliverypulse.ai`
2. Portfolio Dashboard shows all projects across all BUs
3. Click any stat card (Green / Amber / Red) → filtered project modal
4. Click a project → read-only KPI summary

---

## 6. Theme

Every page has a **Light / Dark** toggle in the top-right header. Click the pill to switch. Preference is saved and persists across sessions.
