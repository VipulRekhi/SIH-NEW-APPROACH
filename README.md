# NAWI Test Report Generation System (OIML R-76)

**Smart India Hackathon (SIH 2026)**  
**Problem Statement ID**: 26035  
**Title**: Development of a Software Program/Application for Generation of Test Reports for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R-76  
**Current Status**: **Phase 2: Instrument Management + OCR (Completed)**

---

## 1. Problem Summary

Non-Automatic Weighing Instruments (NAWI) used across legal metrology, trade, pharmaceuticals, and manufacturing require stringent verification and test reporting as per international recommendation **OIML R-76**.

Presently, many verification laboratories and legal metrology officers face:
1. Manual recording prone to mathematical calculation errors in evaluating Maximum Permissible Error (MPE).
2. Labor-intensive test report preparation.
3. Lack of unified tamper-evident verification (digital QR signatures).
4. Difficulty in digitizing instrument specifications directly from equipment nameplates.

This project delivers a **deployment-ready, fully local application** to digitize instrument intake via OCR, automatically execute OIML R-76 calculations (performance, repeatability, eccentricity, tare), and generate tamper-evident official test certificates.

---

## 2. 6-Phase Implementation Roadmap

- **Phase 1: Foundation & Authentication** *(Completed)*  
  Local PostgreSQL, Node/Express JWT backend, RBAC, React + Tailwind laboratory UI shell.
- **Phase 2: Instrument + OCR** *(Completed)*  
  Instrument domain, offline Tesseract.js OCR, side-by-side human verification studio, document gallery, and laboratory isolation.
- **Phase 3: R-76 Testing & Calculation Engine** *(UPCOMING)*  
  Weighing accuracy, repeatability, eccentricity, tare, and automated MPE limits.
- **Phase 4: Report Generation + QR**  
  Standardized OIML R-76 PDF generation and cryptographic verification QR codes.
- **Phase 5: Dashboard & Repository**  
  Laboratory archive, audit trails, and multi-laboratory management.
- **Phase 6: Integration, Security & SIH Polish**  
  Final hardening, performance optimization, and demonstration polish.

---

## 3. Technology Stack

### Frontend (`client/`)
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS (Tailored legal metrology / enterprise laboratory aesthetic)
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios with request/response interceptors for JWT
- **Icons**: Lucide React

### Backend (`server/`)
- **Runtime**: Node.js v24+
- **Framework**: Express 4 with TypeScript
- **Security**: Helmet, CORS (locked to client origin), Express Rate Limit
- **Validation**: Zod schema validation
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs` (work factor 12)
- **Database Driver**: `pg` (PostgreSQL connection pool with parameterized queries)

### Database
- **Engine**: Local PostgreSQL 18+ (No cloud services, No Supabase, No Firebase)
- **Migrations**: Automated SQL migration runner (`server/migrations/`)

---

## 4. Architecture Overview

```
 [ React + TypeScript (Vite) ]  <--->  [ Express API Server ]  <--->  [ Local PostgreSQL 18 ]
    http://localhost:5173                   http://localhost:5000         localhost:5432 (nawi_r76)
```

1. **Strictly Local**: Designed from the ground up to operate completely on local infrastructure without cloud dependencies.
2. **True Security Boundary**: Backend authorization middleware (`authenticateToken`, `authorizeRoles`) acts as the security boundary.
3. **No Premature Schemas**: Only foundational authentication tables (`roles`, `laboratories`, `users`) are introduced in Phase 1. Instruments and test observations are deferred to Phases 2 and 3.

---

## 5. Prerequisites

Before running the application, ensure the following are installed locally:
- **Node.js**: v18.0.0 or higher (v24+ recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Version 14 or higher running locally on port `5432`

---

## 6. Local Setup & Installation

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/VipulRekhi/SIH-NEW-APPROACH.git
cd SIH-NEW-APPROACH

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Return to root
cd ..
```

### Step 2: Configure Environment Variables

**Server Environment (`server/.env`):**
Create `server/.env` based on `server/.env.example`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nawi_r76
JWT_SECRET=super_secret_local_dev_key_sih_2026_nawi_r76_oiml_test_report
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```
*(Replace `postgres:postgres` with your local PostgreSQL username and password).*

**Client Environment (`client/.env`):**
Create `client/.env` based on `client/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 7. Database Initialization & Migrations

The project includes an automated database migration runner that automatically creates the `nawi_r76` database if it does not exist, enables `pgcrypto` extensions, creates tables, and seeds default roles.

```bash
# From workspace root:
npm run migrate

# Or directly from server directory:
cd server
npm run migrate
```

### Default Roles Seeded
1. `admin` (System administrator)
2. `officer` (Verification & review officer)
3. `technician` (Test session operator / data entry)

### Optional: Seed Initial Administrator Account
To create an initial administrator account for testing:

```bash
# From workspace root:
npm run seed:admin
```
Default seeded credentials:
- **Email**: `admin@nawi.gov.in`
- **Password**: `Admin@123456`

---

## 8. Running the Application

### Option A: Run Both Frontend and Backend Concurrently (Recommended)

From the project root directory:

```bash
npm run dev
```

This starts:
- **Backend API**: `http://localhost:5000`
- **Frontend Client**: `http://localhost:5173`

### Option B: Run Services Independently

In Terminal 1 (Backend):
```bash
npm run server
```

In Terminal 2 (Frontend):
```bash
npm run client
```

---

## 9. Verification & Testing

### Run Automated Backend Verification Tests
The repository includes a comprehensive automated test script validating all Phase 1 authentication, authorization, and database constraints:

```bash
# From workspace root:
npm run test:server
```

**Tests Executed**:
1. Health check: `GET /api/health`
2. Technician registration: `POST /api/auth/register`
3. Token issuance and password hash exclusion verification
4. Duplicate email rejection (409 Conflict)
5. Incorrect password rejection (401 Unauthorized)
6. Correct credential login (200 OK + JWT)
7. Session rehydration (`GET /api/auth/me`)
8. Missing/invalid token rejection
9. Stateless logout (`POST /api/auth/logout`)
10. RBAC enforcement: Technician forbidden from admin-only routes (403 Forbidden)
11. Phase 2 placeholder rejection (501 Not Implemented)

### Production Build Test
Verify both frontend and backend compile for production without errors:

```bash
npm run build
```

---

## 10. API Specification (Phase 1)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System and PostgreSQL connectivity status |
| `POST` | `/api/auth/register` | Public | Registers a new Technician account |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and returns JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieves active user profile and role |
| `POST` | `/api/auth/logout` | Authenticated | Terminates client session |
| `GET` | `/api/users` | Admin, Officer | Lists registered operators |
| `GET` | `/api/laboratories`| Authenticated | Lists accredited testing laboratories |
| `POST` | `/api/laboratories`| Admin | Registers a new testing laboratory |
| `*` | `/api/instruments` | N/A | Reserved for Phase 2 (Returns 501) |
| `*` | `/api/tests` | N/A | Reserved for Phase 3 (Returns 501) |
| `*` | `/api/reports` | N/A | Reserved for Phase 4 (Returns 501) |

---

## 11. Project Structure

```text
SIH-NEW-APPROACH/
├── client/                     # React + Vite + TypeScript Frontend
│   ├── public/
│   ├── src/
│   │   ├── context/            # AuthContext.tsx (Session state & JWT sync)
│   │   ├── layouts/            # AppLayout.tsx, AuthLayout.tsx
│   │   ├── pages/              # LoginPage, RegisterPage, DashboardPage, PlaceholderPage
│   │   ├── routes/             # AppRoutes.tsx, ProtectedRoute.tsx
│   │   ├── services/           # api.ts (Axios client with Bearer interceptors)
│   │   ├── types/              # index.ts (TypeScript interface declarations)
│   │   ├── App.tsx             # Root application component
│   │   ├── index.css           # Tailwind directives & laboratory styling
│   │   └── main.tsx            # Entry point
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── migrations/             # Reproducible SQL schema & role seeds
│   │   ├── 001_initial_schema.sql
│   │   └── 002_seed_roles.sql
│   ├── src/
│   │   ├── config/             # db.ts (pg pool), env.ts
│   │   ├── controllers/        # auth, user, laboratory controllers
│   │   ├── middleware/         # auth, role, validate, error handlers
│   │   ├── repositories/       # user, role, laboratory parameterized queries
│   │   ├── routes/             # auth, user, laboratory routes
│   │   ├── scripts/            # migrate.ts, seed-admin.ts, test-api.ts
│   │   ├── services/           # auth, user, laboratory business logic
│   │   ├── types/              # index.ts
│   │   ├── utils/              # jwt.ts, password.ts
│   │   └── server.ts           # Main Express server bootstrap
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   └── architecture.md         # Detailed architecture, ERD, and roadmap specs
├── .gitignore
├── README.md
└── package.json                # Root orchestration manifest
```

---

## 12. Security Specifications

- **Password Hashing**: Salted `bcryptjs` with cost factor 12. Plaintext passwords never stored or logged.
- **Injection Prevention**: All SQL statements use parameterized bindings ($1, $2) via `pg`.
- **Role Isolation**: Public registration endpoint assigns strictly `technician`. Admin accounts must be seeded or provisioned.
- **Sanitized Outputs**: `password_hash` is explicitly excluded from all responses and repository SafeUser queries.
- **HTTP Hardening**: `helmet` headers, origin-restricted `cors`, and route-specific rate limiting on authentication attempts.
- **Environment Isolation**: `.env` files are ignored by git; `.env.example` provides templates.