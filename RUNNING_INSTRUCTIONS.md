# Running DeliveryPulse AI V2

Assuming you have already set up the database and installed dependencies (if not, please refer to the detailed `demo_v2_threshold/demo_v2/LAPTOP_SETUP.md` file for full setup instructions), follow these steps to run the project locally.

## 1. Start the Backend

Open a terminal (Command Prompt or PowerShell) and navigate to the backend folder:
```cmd
cd demo_v2_threshold/demo_v2/backend
```

Activate your Python virtual environment (if you created one):
```cmd
.venv\Scripts\activate
```

Start the FastAPI backend server:
```cmd
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- The API will be available at: `http://localhost:8000`
- Swagger API documentation is at: `http://localhost:8000/docs`

## 2. Start the Frontend

Open a **new, separate terminal** and navigate to the frontend folder:
```cmd
cd demo_v2_threshold/demo_v2/frontend
```

Start the React development server:
```cmd
npm run dev
```

- The web application will be accessible at: `http://localhost:5173`

## 3. Access the Application

Once both servers are running, open your browser and go to `http://localhost:5173`. You can log in using one of the default seed accounts:

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | admin@deliverypulse.ai | Admin@123 |
| Delivery Excellence | de@deliverypulse.ai | Demo@12345 |
| CEO | ceo@deliverypulse.ai | Demo@12345 |
| DH — Digital Services | buhead1@deliverypulse.ai | Demo@12345 |
| DH — Cloud Infrastructure | buhead2@deliverypulse.ai | Demo@12345 |
| DH — BFSI | buhead3@deliverypulse.ai | Demo@12345 |
| DM1 — Acme Corp | dm1@deliverypulse.ai | Demo@12345 |
| DM2 — Tech Nova | dm2@deliverypulse.ai | Demo@12345 |
| DM3 — Globex | dm3@deliverypulse.ai | Demo@12345 |
| DM4 — Nexus Cloud | dm4@deliverypulse.ai | Demo@12345 |
| DM5 — Apex Bank | dm5@deliverypulse.ai | Demo@12345 |
| DM6 — Sterling Finance | dm6@deliverypulse.ai | Demo@12345 |
| PM1 — Digital Services | pm1@deliverypulse.ai | Demo@12345 |
| PM2 — Cloud Infrastructure | pm2@deliverypulse.ai | Demo@12345 |
| PM3 — BFSI | pm3@deliverypulse.ai | Demo@12345 |
