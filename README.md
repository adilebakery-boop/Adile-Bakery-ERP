# Adile Bakery ERP

A production multi-branch Enterprise Resource Planning (ERP) system designed for commercial bakery operations, managing daily production batches across shifts, end-of-day inventory finalization, waste tracking, and financial snapshots.

---

## Overview

Adile Bakery ERP coordinates daily operational workflows across multi-branch bakery locations. Production staff log batch runs by shift, front-of-house staff record unsold inventory through collaborative drafts, and branch managers review aggregated figures to execute end-of-day closures. Closing an operational day calculates physical flows:

$$\text{Opening Stock} + \text{Total Production} - \text{Remaining Stock} - \text{Waste} = \text{Estimated Sold}$$

The system persists immutable daily snapshots for financial auditing, enforces timezone-safe (`Africa/Addis_Ababa`) automated rollovers, supports multi-lingual operations (English & Amharic), and exports reports to Excel spreadsheets.

---

## Technology

- **Frontend**: React 18, Vite, TanStack React Query (v5), React Router DOM (v7), Tailwind CSS, i18next (English & Amharic), Lucide React
- **Backend**: Node.js, Express
- **Database & Data Layer**: PostgreSQL, Prisma ORM, Decimal.js (monetary & weight precision)
- **Authentication & Security**: BCrypt, JSON Web Tokens (Access & Refresh Tokens), Helmet, Express Rate Limit
- **Timezone Management**: date-fns, date-fns-tz (`Africa/Addis_Ababa`)
- **API Testing & Tooling**: Postman Collections & Environments
- **Reporting**: ExcelJS (.xlsx report generation)

---

## Testing & QA Validation

The platform undergoes rigorous validation across API endpoints, data persistence, and security layers:

### 1. API Verification & Postman Suites
- Dedicated **Postman API test collections** (`postman/Adile-Bakery-ERP.postman_collection.json`) and sandbox environment configuration (`postman/local.postman_environment.json`).
- Automated validation of HTTP status codes, structured response schemas (`docs/api-response-standard.md`), and JWT Bearer token headers across role endpoints.

### 2. Role-Based Access Control (RBAC) Boundary Testing
- Validation of permission enforcement across all 7 user roles (`ADMIN`, `MANAGER`, `BAKER`, `CAKE_CHEF`, `COOKIE_BAKER`, `FETIR_CHEF`, `CASHIER`).
- Verification that unauthorized role mutations (e.g., non-admin attempting branch modifications or unauthorized password resets) correctly return HTTP `403 Forbidden`.

### 3. Workflow & Lifecycle Testing
- **Collaborative Draft-to-Final Lifecycle**: Verified that multiple cashier sessions can update `DRAFT` status remainings without conflict, and that `Finalize All` atomically transitions records to `FINAL`, locking values against further edits.
- **Operational Closure Enforcement**: Verified that attempting to mutate quantities on closed operational days is rejected with HTTP `403 Forbidden` unless formally reopened by a Manager with an audit reason logged in `ReopenLog`.
- **Timezone Rollover Edge Cases**: Validated transactional auto-closure when queries for a new date arrive in `Africa/Addis_Ababa` local time before manual closure has occurred.

---

## My Contribution

- **Role**: Core Team Contributor (Multi-developer team — **129 verified commits** on project repository).
- **Key Engineering & QA Deliverables**:
  - **Authentication & Token Security**: Investigated, diagnosed, and resolved multi-device refresh token session invalidation defects, hardening token rotation and session revocation.
  - **RBAC Enforcement**: Implemented and verified Role-Based Access Control boundary guards for manager password resets and protected endpoints.
  - **Postman API Suite**: Configured and maintained Postman API collections and environment files for endpoint integration testing.
  - **System-Wide Defect Remediation**: Investigated and patched production defects across the Production Shift logging page, Reports analytics tab data overflow, Remaining inventory draft saving, and Amharic localized unit labels.
  - **Scheduler Stability**: Implemented error-handling boundaries on automated background schedulers to prevent unhandled promise rejections from terminating the backend process during startup.

---

## Architecture

The system follows a layered client-server architecture with strict separation of concerns:

```
Adile-Bakery-ERP/
├── docs/                      # Technical specifications & API contracts
│   ├── api.md                 # Full HTTP REST API specification
│   ├── api-response-standard.md
│   ├── development-guide.md   # Git conventions & workflow guidelines
│   └── test-data.md           # Sandbox credentials & seed tables
├── postman/                   # API test suites
│   ├── Adile-Bakery-ERP.postman_collection.json
│   └── local.postman_environment.json
├── backend/                   # Express REST API
│   ├── prisma/                # Schema definitions & seed scripts
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/            # Security, database, & timezone configuration
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── middleware/        # Auth, RBAC, & day-closure validation middleware
│   │   ├── routes/            # Route groups
│   │   ├── services/          # Transactional business logic
│   │   └── app.js             # Express application bootstrap
│   └── package.json
├── frontend/                  # React Single-Page Application (SPA)
│   ├── src/
│   │   ├── components/        # Reusable UI cards, tables, & modals
│   │   ├── hooks/             # Custom React Query data hooks
│   │   ├── pages/             # Dashboard, Production, Remaining, Reports
│   │   └── App.jsx            # Role-guarded client router
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## Setup & Running Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- PostgreSQL 14+ running locally or in Docker

### 1. Installation
```bash
git clone https://github.com/adilebakery-boop/Adile-Bakery-ERP.git
cd Adile-Bakery-ERP
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install

# Apply database migrations
npx prisma migrate dev --name init

# Seed test roles, users, and product catalog
npm run seed:all

# Start backend server
npm run dev
```
The backend API will start on `http://localhost:3000`. Default sandbox users created by seeding:
- **Admin**: `admin` / `admin123`
- **Manager**: `sara.manager` / `password123`
- **Baker**: `omar.baker` / `password123`

### 3. Frontend Setup
```bash
cd ../frontend
cp .env.example .env
npm install

# Start Vite frontend
npm run dev
```
The client application will start on `http://localhost:5173`.

### 4. Running API Tests with Postman
Import the collection and environment into Postman or run with Newman:
- Collection: `postman/Adile-Bakery-ERP.postman_collection.json`
- Environment: `postman/local.postman_environment.json`
