# NAWI Test Report Generation System (OIML R-76)

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-blue.svg)](https://www.sih.gov.in/)
[![Problem Statement](https://img.shields.io/badge/PS--ID-26035-orange.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)

**Smart India Hackathon (SIH 2026) | Problem Statement ID: 26035**  
**Title**: Development of a Software Program / Application for Generation of Test Reports for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R-76  

---

## 🤖 Antigravity AI Setup Prompt (For Teammates)

If you are a teammate opening this repository inside the **Antigravity IDE / Agent**, copy and paste the prompt below directly into your Antigravity chat. The agent will inspect your local environment, install dependencies, guide you through setting your local database credentials, run migrations, and launch the application.

> [!TIP]
> ### 📋 Copy-Paste Prompt for Antigravity Agent
> ```text
> Please set up and run the NAWI Test Report Generation System on my machine by executing the following steps:
> 
> 1. Check that my system has Node.js (v18+) and that local PostgreSQL is running on my machine.
> 2. Install all dependencies across the workspace:
>    - Root directory (`npm install`)
>    - Backend directory (`cd server && npm install`)
>    - Frontend directory (`cd client && npm install`)
> 3. Configure environment files:
>    - If `client/.env` does not exist, copy it from `client/.env.example` (API base URL: http://localhost:5000/api).
>    - If `server/.env` does not exist, copy it from `server/.env.example`.
>    - Check my local PostgreSQL credentials (username, password, host, and port). Ask me for my local PostgreSQL password/username if you cannot determine it or need confirmation, and set DATABASE_URL accordingly in `server/.env` (format: postgresql://<USER>:<PASSWORD>@localhost:5432/nawi_r76). Generate a random string for JWT_SECRET if needed.
> 4. Initialize and migrate the database:
>    - Run `npm run migrate` from the root directory to verify connectivity, auto-create the `nawi_r76` database, and execute all migrations in `server/migrations/`.
>    - Run `npm run seed:admin` from root to seed the initial system administrator.
> 5. Launch the application:
>    - Run `npm run dev` to start both the Express backend (port 5000) and Vite React frontend (port 5173) concurrently.
> 6. Verify that the health endpoint (http://localhost:5000/api/health) returns 200 OK and summarize the access URLs and default admin credentials for me.
> ```

---

## 📖 Table of Contents
1. [Problem Statement & Overview](#-problem-statement--overview)
2. [Technology Stack](#-technology-stack)
3. [Architecture Overview](#-architecture-overview)
4. [Prerequisites](#-prerequisites)
5. [Manual Installation & Setup](#-manual-installation--setup)
6. [Database Setup & Migrations](#-database-setup--migrations)
7. [Running the Application](#-running-the-application)
8. [Testing & Verification](#-testing--verification)
9. [Default Credentials](#-default-credentials)
10. [Repository Structure](#-repository-structure)
11. [Security Best Practices](#-security-best-practices)

---

## 🎯 Problem Statement & Overview

Verification and testing of Non-Automatic Weighing Instruments (NAWI) in accordance with the international metrological standard **OIML Recommendation R-76** is a critical function for legal metrology departments, calibration laboratories, pharmaceuticals, and manufacturing sectors.

### Key Challenges Addressed
- **Elimination of Human Calculation Errors**: Automated evaluation of Maximum Permissible Error (MPE), repeatability spread, eccentricity deviation, and tare influence.
- **Instrument Intake Digitization**: Integrated offline OCR engine to extract nameplate parameters (Class, $Max$, $Min$, $e$, $d$) directly from instrument images.
- **Regulatory Compliance**: Strictly structured according to OIML R-76 test procedures and accuracy classes (Class I, II, III, IIII).
- **Tamper-Evident Reporting**: Standardized test report generation with digital cryptographic verification QR codes.
- **Zero Cloud Lock-in**: Fully functional on local offline infrastructure with local PostgreSQL storage.

---

## 🛠 Technology Stack

### Frontend (`client/`)
- **Framework**: React 19 + TypeScript
- **Bundler / Dev Server**: Vite
- **Styling**: Tailwind CSS (Enterprise Legal Metrology UI Theme)
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios (configured with JWT Bearer interceptors)
- **Icons**: Lucide React

### Backend (`server/`)
- **Runtime**: Node.js v18+ (Node 22 / 24 compatible)
- **Framework**: Express 4 with TypeScript (`tsx` runtime)
- **Database Driver**: `pg` (PostgreSQL connection pool with parameterized queries)
- **Data Validation**: Zod schemas
- **Authentication**: JWT (`jsonwebtoken`) + Salted Bcrypt (`bcryptjs`, work factor 12)
- **Security Middleware**: Helmet, CORS, Express Rate Limit
- **OCR Engine**: Tesseract.js + Sharp image processor

### Database
- **Engine**: Local PostgreSQL 14+ (tested on PostgreSQL 16, 17, 18)
- **No Cloud Dependencies**: Works entirely offline on `localhost`.

---

## 🏛 Architecture Overview

```text
 ┌───────────────────────────┐         ┌───────────────────────────┐
 │   React 19 + TypeScript   │  HTTP   │     Express 4 REST API    │
 │       (Vite Client)       │ ◄─────► │     (TypeScript Server)   │
 │   http://localhost:5173   │  (JWT)  │    http://localhost:5000  │
 └───────────────────────────┘         └─────────────┬─────────────┘
                                                     │ Parameterized SQL
                                                     ▼
                                       ┌───────────────────────────┐
                                       │      PostgreSQL (Local)   │
                                       │   localhost:5432/nawi_r76 │
                                       └───────────────────────────┘
```

---

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed on your machine:

1. **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
2. **npm**: `v9.0.0` or higher (bundled with Node.js)
3. **PostgreSQL**: `v14.0` or higher installed and running as a local service on port `5432` ([Download PostgreSQL](https://www.postgresql.org/download/))
4. **Git**: Installed and configured on your system

---

## 💻 Manual Installation & Setup

If you prefer setting up the repository manually without the AI prompt:

### Step 1: Clone the Repository
```bash
git clone https://github.com/VipulRekhi/SIH-NEW-APPROACH.git
cd SIH-NEW-APPROACH
```

### Step 2: Install Dependencies
Install dependencies for the root orchestrator, backend server, and frontend client:

```bash
# 1. Install root workspace packages
npm install

# 2. Install backend packages
cd server
npm install

# 3. Install frontend packages
cd ../client
npm install

# 4. Return to project root
cd ..
```

### Step 3: Configure Environment Variables

#### 1. Backend Configuration (`server/.env`)
Create `server/.env` by copying the template file:
```bash
# On Windows (PowerShell):
Copy-Item server/.env.example server/.env

# On Linux / macOS:
cp server/.env.example server/.env
```

Open `server/.env` and update the `DATABASE_URL` with **your local PostgreSQL credentials**:
```env
PORT=5000
NODE_ENV=development

# Configure with YOUR local PostgreSQL user and password:
DATABASE_URL=postgresql://<YOUR_POSTGRES_USER>:<YOUR_POSTGRES_PASSWORD>@localhost:5432/nawi_r76

JWT_SECRET=super_secret_local_dev_key_sih_2026_nawi_r76_oiml_test_report
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

#### 2. Frontend Configuration (`client/.env`)
Create `client/.env` by copying the template file:
```bash
# On Windows (PowerShell):
Copy-Item client/.env.example client/.env

# On Linux / macOS:
cp client/.env.example client/.env
```

Verify that `client/.env` contains:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🗄 Database Setup & Migrations

The repository includes an automated migration script that checks your PostgreSQL instance, creates the `nawi_r76` database if it does not already exist, and applies all SQL schema migrations in sequence.

From the project root:

```bash
# Run database migrations
npm run migrate
```

### Seed the Initial Admin Account
Once migrations complete, seed the default system administrator account:

```bash
npm run seed:admin
```

---

## 🚀 Running the Application

### Option 1: Run Concurrently (Recommended)
From the root directory, start both the backend API and frontend dev server in a single terminal:

```bash
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Option 2: Run Services in Separate Terminals

**Terminal 1 (Backend):**
```bash
npm run server
```

**Terminal 2 (Frontend):**
```bash
npm run client
```

---

## 🧪 Testing & Verification

### 1. Automated Backend API Tests
Run the automated test suite to verify database connectivity, authentication, RBAC authorization, and API contracts:

```bash
npm run test:server
```

### 2. Production Build Verification
Verify that both frontend and backend compile without errors:

```bash
npm run build
```

---

## 🔑 Default Credentials

After running `npm run seed:admin`, the following credentials are ready to use:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@nawi.gov.in` | `Admin@123456` | Full administrative control, user & lab management |
| **Technician** | *(Self-register via UI)* | *(Custom)* | Intake instruments, run test sessions, data entry |

---

## 📁 Repository Structure

```text
SIH-NEW-APPROACH/
├── client/                     # React 19 + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components & layouts
│   │   ├── context/            # AuthContext (JWT session state)
│   │   ├── pages/              # Application pages & verification studios
│   │   ├── services/           # Axios API client & interceptors
│   │   └── types/              # Metrology & domain TypeScript interfaces
│   ├── .env.example            # Client environment template
│   └── package.json
│
├── server/                     # Express + TypeScript Backend
│   ├── migrations/             # SQL schema migrations (001 - 006)
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_seed_roles.sql
│   │   ├── 003_instrument_domain.sql
│   │   ├── 004_seed_demo_data.sql
│   │   ├── 005_test_sessions_and_calculations.sql
│   │   └── 006_test_applicability_and_state_model.sql
│   ├── src/
│   │   ├── config/             # Database pool & environment loader
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── modules/            # OCR & OIML R-76 calculation engines
│   │   ├── repositories/       # Parameterized SQL database queries
│   │   ├── routes/             # Express API route definitions
│   │   ├── scripts/            # Migration, seeding, and verification scripts
│   │   └── server.ts           # Express server entry point
│   ├── .env.example            # Server environment template
│   └── package.json
│
├── docs/                       # Architecture diagrams & documentation
├── package.json                # Root orchestration scripts
└── README.md                   # Project documentation & teammate guide
```

---

## 🛡 Security Best Practices

- **Zero Hardcoded Secrets**: No database credentials, passwords, or secrets are tracked in version control.
- **Parameterized Queries**: All database operations use strict SQL parameterization to prevent SQL injection.
- **Password Security**: Passwords are encrypted using `bcryptjs` with salt factor 12 before storage.
- **JWT Protection**: Secure, signed tokens with automatic expiration.
- **Defense-in-Depth**: Express endpoints are fortified with Helmet security headers, CORS restrictions, and rate limiting on sensitive routes.