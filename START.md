# CRM Dashboard — Quick Start

## Prerequisites
- Node.js 18+ installed
- MongoDB running locally (or use MongoDB Atlas free tier)

## Step 1 — Install & Start Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs at: http://localhost:5000

## Step 2 — Install & Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: http://localhost:3000

## Step 3 — Open Browser
Go to http://localhost:3000 and register your admin account.

---

## MongoDB Atlas (Cloud) Setup
If you don't have MongoDB locally, use Atlas:
1. Go to https://cloud.mongodb.com → create free cluster
2. Get your connection string
3. Replace MONGO_URI in backend/.env with your Atlas URI

## Project Structure
```
crm-dashboard/
├── backend/          ← Node.js + Express API
│   ├── models/       ← Mongoose schemas
│   ├── routes/       ← API endpoints
│   ├── middleware/   ← JWT auth
│   └── server.js
└── frontend/         ← React + Tailwind
    └── src/
        ├── pages/    ← Dashboard, Orders, Leads, Customers, Reports
        ├── components/
        └── utils/    ← API client, export helpers
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/orders | List orders (filter/paginate) |
| POST | /api/orders | Add order |
| PUT | /api/orders/:id | Update order |
| DELETE | /api/orders/:id | Delete order |
| GET | /api/leads | List leads |
| POST | /api/leads | Add lead |
| PUT | /api/leads/:id | Update lead |
| GET | /api/customers | List customers |
| GET | /api/customers/:mobile/orders | Customer profile |
| GET | /api/dashboard/stats | Dashboard analytics |
