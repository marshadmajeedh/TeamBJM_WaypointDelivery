# Team BJM - Waypoint Delivery Planning System

The **Waypoint Delivery Planning System** is an end-to-end logistics and delivery management platform developed by **Team BJM** for the **Rootcode Tech-Triathlon 2026 Hackathon**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Competition Context](#2-competition-context)
3. [Problem Statement](#3-problem-statement)
4. [Solution Overview](#4-solution-overview)
5. [User Roles](#5-user-roles)
6. [End-to-End Workflow](#6-end-to-end-workflow)
7. [Tech Stack](#7-tech-stack)
8. [System Architecture](#8-system-architecture)
9. [Repository Structure](#9-repository-structure)
10. [Business Constraints](#10-business-constraints)
11. [Getting Started](#11-getting-started)
12. [Environment Setup](#12-environment-setup)
13. [Running Locally](#13-running-locally)
14. [Running with Docker](#14-running-with-docker)
15. [Database Setup](#15-database-setup)
16. [Seed Data](#16-seed-data)
17. [Development Workflow](#17-development-workflow)
18. [Branch Strategy](#18-branch-strategy)
19. [Testing](#19-testing)
20. [Hackathon Deliverables](#20-hackathon-deliverables)
21. [Judge Walkthrough](#21-judge-walkthrough)
22. [AI Tool Disclosure](#22-ai-tool-disclosure)
23. [Team Members](#23-team-members)

---

## 1. Project Overview

Waypoint Group manages regional retail store supply chains requiring precision delivery scheduling across multiple depots, vehicle fleets, and retail outlets. The Waypoint Delivery Planning System synchronizes the retail supply chain from store replenishment orders through dispatch optimization, warehouse vehicle loading, offline driver route execution, and store receipt confirmation.

---

## 2. Competition Context

- **Event:** Rootcode Tech-Triathlon 2026 Hackathon
- **Team Name:** Team BJM
- **Repository:** `TeamBJM_WaypointDelivery`
- **Challenge:** Transform the Designathon architectural submission into a resilient, production-ready full-stack software solution satisfying all operational and physical constraints.

---

## 3. Problem Statement

Retail store logistics suffer from:
- Multi-dimensional capacity bottlenecks (weight vs. volume conflicts).
- Perishable cargo spoilage caused by mismatched vehicle temperature capabilities.
- Downtown access bottlenecks where large trucks cannot physically reach narrow urban or mall outlets.
- Driver disconnection in underground loading docks or poor cellular coverage zones resulting in lost delivery confirmations.
- Lack of auditability when orders are deferred due to fleet exhaustion.

---

## 4. Solution Overview

Waypoint Delivery Planning System bridges the gap with:
- **Unified Monorepo Architecture:** Single TypeScript repository sharing types, validation schemas, and domain constants.
- **Rule-Based Allocation Engine:** Automated verification of weight, volume, temperature compatibility, van restrictions, delivery windows, and weekly fuel quotas.
- **Role-Optimized Client Interfaces:** Specialized responsive layouts tailored to user roles (desktop-first for dispatchers, mobile-first PWA for drivers).
- **Offline-First Driver PWA:** Local persistence via IndexedDB (Dexie.js) allowing drivers to complete stops offline and synchronize transparently when network reconnects.

---

## 5. User Roles

The platform serves four primary operational personas:

### 1. Store Manager (`STORE_MANAGER`)
- Place store inventory replenishment orders.
- Receive immediate order confirmation.
- View real-time order status and expected delivery ETA.
- Receive proactive deferral notifications with reasons if capacity is constrained.
- Confirm receipt of delivered goods upon vehicle arrival.
- Report delivery discrepancies, shortages, or damaged stock.

### 2. Dispatcher (`DISPATCHER`)
- Review confirmed store orders for each operational day.
- Run daily delivery allocation plans across the fleet.
- Assign vehicles, drivers, and trip sequences (maximum 2 trips per vehicle/day).
- Validate all physical and logistical constraints (weight, volume, reefer temperature, fuel quotas).
- Identify deferred orders and record explicit deferral reasons.
- Monitor active routes, delays, and fleet progression in real time.

### 3. Loader (`LOADER`)
- View warehouse vehicle loading manifests and assigned trip schedules.
- Follow vehicle stop sequence (reverse-order packing for smooth offloading).
- Verify loaded item counts, product categories, and temperature requirements.
- Report missing, mislabeled, or damaged warehouse goods.
- Sign off when a vehicle is packed and mark it `READY_FOR_DISPATCH`.

### 4. Driver (`DRIVER`)
- View assigned trip route, outlet sequence, and navigation details.
- Access outlet contact information, access hours, and delivery instructions.
- Record delivery outcomes (`FULL`, `PARTIAL`, `FAILED`).
- Capture proof of delivery (recipient name, signature, and optional photo).
- Work fully offline without active cellular connectivity.
- Synchronize delivery records and signatures automatically once connectivity resumes.

---

## 6. End-to-End Workflow

```text
Store Ordering (Store Manager)
      ↓
Dispatcher Planning & Allocation (Dispatcher)
      ↓
Warehouse Vehicle Loading (Loader)
      ↓
Driver Route Execution & Offline POD (Driver)
      ↓
Store Arrival & Receipt Confirmation (Store Manager)
```

---

## 7. Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router v6, TanStack Query v5
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL 16
- **ORM:** Prisma ORM
- **Validation:** Zod
- **Authentication:** JWT, bcrypt password hashing
- **Offline Storage:** IndexedDB, Dexie.js
- **Testing:** Vitest, Supertest, React Testing Library
- **Infrastructure:** Docker, Docker Compose
- **Repository Architecture:** npm workspaces monorepo

---

## 8. System Architecture

For complete architectural diagrams and offline synchronization design, refer to [docs/ARCHITECTURE.md](file:///docs/ARCHITECTURE.md).

```mermaid
graph LR
    Web["React Web / PWA (apps/web)"] -->|REST / HTTPS| API["Express REST API (apps/api)"]
    API --> Services["Domain Services"]
    Services --> Prisma["Prisma ORM"]
    Prisma --> PG[("PostgreSQL Database")]
    DriverPWA["Driver Offline PWA"] -->|Local Cache| Dexie[("IndexedDB / Dexie.js")]
    Dexie -.->|Sync Queue| API
```

---

## 9. Repository Structure

```text
TeamBJM_WaypointDelivery/
├── apps/
│   ├── web/                     # React + Vite + Tailwind frontend application
│   │   ├── src/
│   │   │   ├── app/             # Application root and QueryClient setup
│   │   │   ├── features/        # Role-based feature modules
│   │   │   │   ├── auth/        # Login and session handling
│   │   │   │   ├── store-manager/# Store manager portal components
│   │   │   │   ├── dispatcher/  # Dispatcher portal components
│   │   │   │   ├── loader/      # Loader portal components
│   │   │   │   └── driver/      # Driver mobile PWA components
│   │   │   ├── layouts/         # AppLayout, DesktopLayout, MobileLayout
│   │   │   ├── offline/         # Dexie.js IndexedDB schema and sync queue
│   │   │   ├── routes/          # Application routing definitions
│   │   │   └── services/        # API client and query services
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── api/                     # Express + TypeScript backend application
│       ├── src/
│       │   ├── config/          # Environment configuration
│       │   ├── middleware/      # Logging and error handling
│       │   ├── modules/         # Modular domain endpoints (auth, orders, allocation...)
│       │   ├── shared/          # Standard response helpers
│       │   ├── app.ts           # Express application factory
│       │   └── server.ts        # HTTP server entry point
│       ├── prisma/
│       │   ├── schema.prisma    # PostgreSQL Prisma schema
│       │   └── seed.ts          # Baseline user seed script
│       ├── tests/               # Vitest + Supertest endpoint tests
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared/                  # Shared domain types, enums, constants, and Zod schemas
│       ├── src/
│       │   ├── constants/
│       │   ├── enums/
│       │   ├── schemas/
│       │   ├── types/
│       │   └── index.ts
│       └── package.json
├── datasets/
│   └── README.md                # Competition dataset policy and confidentiality rules
├── docs/
│   ├── ARCHITECTURE.md          # System architecture and Mermaid topology
│   ├── DATA_MODEL.md            # Entity data model and Mermaid ER diagram
│   ├── AI_TOOL_DISCLOSURE.md    # Transparent AI usage disclosure and audit log
│   ├── DESIGNATHON_TRACEABILITY.md # Traceability matrix and business constraints
│   └── API_CONVENTIONS.md       # REST conventions and security baseline
├── scripts/
│   ├── README.md
│   └── seed-data.md             # Seeding execution guide
├── .github/
│   ├── pull_request_template.md # PR checklist and review guidelines
│   └── ISSUE_TEMPLATE/
│       └── feature.md           # Feature issue template
├── docker-compose.yml           # Production-ready PostgreSQL, API, and Web stack
├── package.json                 # Monorepo root workspace configuration
├── CONTRIBUTING.md              # Team Git branch rules and contribution guidelines
├── LICENSE.md                   # Project open source license
└── README.md                    # Project master documentation
```

---

## 10. Business Constraints

The system adheres strictly to the following 9 domain rules (detailed in [docs/DESIGNATHON_TRACEABILITY.md](file:///docs/DESIGNATHON_TRACEABILITY.md)):

1. **Weight Limits:** Total order weight allocated to a vehicle must never exceed `maxWeightKg`.
2. **Volume Limits:** Total cargo volume must never exceed `maxVolumeM3`. Both weight and volume must be satisfied simultaneously.
3. **Temperature Compatibility:** Chilled/frozen products mandate `REEFER` vehicles. Reefer vehicles can carry ambient cargo, but `AMBIENT` vehicles can never carry chilled or frozen goods.
4. **Van-Only Outlets:** Outlets flagged `vanOnly = true` must strictly be serviced by `VAN` type vehicles.
5. **Two Trips Per Vehicle/Day:** Each vehicle is restricted to a maximum of 2 trips per operational day.
6. **Depot Assignment:** Vehicles exclusively serve outlets assigned to their home depot.
7. **Fuel Quotas:** Routes must respect the vehicle's `weeklyFuelQuotaLiters`.
8. **Delivery Windows:** Deliveries must occur within outlet time windows. Fresh deliveries must arrive prior to store opening where designated. Mall outlets have fixed access times.
9. **Demand Management & Deferrals:** If fleet capacity is exhausted, orders are marked `DEFERRED` with an explicit reason logged and `deferralCount` tracked to prevent outlet starvation.
10. **Offline Resilience:** Drivers must be capable of working offline with local IndexedDB persistence and automated background sync upon network reconnection.

---

## 11. Getting Started

### Prerequisites

- **Node.js:** v20.x or higher
- **npm:** v10.x or higher
- **Docker & Docker Compose:** Optional for containerized execution; or local PostgreSQL 16.

---

## 12. Environment Setup

Copy `.env.example` to `.env` in the root and in the respective package folders:

```bash
# Copy root environment template
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Ensure your `.env` contains safe local credentials:

```dotenv
NODE_ENV=development
POSTGRES_DB=waypoint
POSTGRES_USER=waypoint
POSTGRES_PASSWORD=change_me
DATABASE_URL=postgresql://waypoint:change_me@localhost:5432/waypoint?schema=public
JWT_SECRET=replace_with_secure_secret
API_PORT=4000
WEB_PORT=5173
VITE_API_URL=http://localhost:4000/api
SEED_STORE_MANAGER_PASSWORD=change_me
SEED_DISPATCHER_PASSWORD=change_me
SEED_LOADER_PASSWORD=change_me
SEED_DRIVER_PASSWORD=change_me
```

---

## 13. Running Locally

Install dependencies across all workspaces from the repository root:

```bash
npm install
```

Build the shared package and applications:

```bash
npm run build
```

Run the backend and frontend development servers concurrently:

```bash
# Starts API on http://localhost:4000 and Web on http://localhost:5173
npm run dev:api
npm run dev:web
```

---

## 14. Running with Docker

> **Status:** Docker Compose: CONFIGURED, NOT YET RUNTIME VERIFIED  
> *(Host environment currently lacks Docker CLI; runtime container execution will be verified once Docker engine is active).*

To run the complete containerized stack (PostgreSQL, Express API, and Nginx Web):

```bash
docker compose up --build
```

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:4000/api/health`
- **PostgreSQL Database:** `localhost:5432`

---

## 15. Database Setup

Using Prisma with PostgreSQL:

```bash
# Generate the Prisma client
npm run db:generate

# Push schema directly to PostgreSQL database
npm run db:push

# Or execute migration workflow
npm run db:migrate
```

---

## 16. Seed Data

To populate the four foundational test accounts:

```bash
npm run db:seed
```

| Role | Email | Required Env Variable |
| :--- | :--- | :--- |
| Store Manager | `storemanager@waypoint.local` | `SEED_STORE_MANAGER_PASSWORD` |
| Dispatcher | `dispatcher@waypoint.local` | `SEED_DISPATCHER_PASSWORD` |
| Loader | `loader@waypoint.local` | `SEED_LOADER_PASSWORD` |
| Driver | `driver@waypoint.local` | `SEED_DRIVER_PASSWORD` |

*Note: The seed script requires explicit environment configuration; no fallback or default passwords exist.*  
*Refer to [scripts/seed-data.md](file:///scripts/seed-data.md) for detailed seeding instructions.*

---

## 17. Development Workflow

- Follow the contribution guide in [CONTRIBUTING.md](file:///CONTRIBUTING.md).
- Create branches off `develop`.
- Ensure all tests and type checks pass prior to opening a PR.

---

## 18. Branch Strategy

- `main`: Production-ready releases.
- `develop`: Ongoing integration.
- `feature/<name>`: New feature implementations.
- `fix/<name>`: Bug fixes.
- `docs/<name>`: Documentation enhancements.

---

## 19. Testing

Execute all workspace test suites:

```bash
# Run all Vitest suites across API and Web
npm run test

# Run TypeScript typechecks across all packages
npm run typecheck

# Run linter
npm run lint
```

---

## 20. Hackathon Deliverables

- [x] Initial Monorepo Foundation & Workspace Scaffolding
- [x] Shared Domain Models, Enums, Zod Schemas & Types (`@waypoint/shared`)
- [x] Express REST API Foundation with Modular Architecture (`@waypoint/api`)
- [x] Health Endpoint (`GET /api/health`)
- [x] PostgreSQL Prisma Schema & Seed Architecture (strict env validation)
- [x] Responsive React + Vite + Tailwind Web Application (`@waypoint/web`)
- [x] Dexie.js Offline Architecture Setup
- [x] Docker & Docker Compose Setup (CONFIGURED, NOT YET RUNTIME VERIFIED)
- [x] Comprehensive Architecture, Data Model, and Traceability Documentation
- [ ] Milestone 1: Store Manager Order Placement & Tracking
- [ ] Milestone 2: Dispatcher Allocation Engine & Vehicle Feasibility Solver
- [ ] Milestone 3: Warehouse Loader Packing Checklist & Issue Reporting
- [ ] Milestone 4: Mobile Driver Route Manifest, Offline POD & Sync
- [ ] Milestone 5: Store Arrival & Delivery Receipt Verification

---

## 21. Judge Walkthrough

To be finalized once the complete implementation is available.

---

## 22. AI Tool Disclosure

See [docs/AI_TOOL_DISCLOSURE.md](file:///docs/AI_TOOL_DISCLOSURE.md) for full compliance statement and audit log.

---

## 23. Team Members

**Team Name:** Team BJM

- **Member 1:** M.C Mujahidh
- **Member 2:** M.M.M Munshif
- **Member 3:** A.N.N Nafris Ahamed
- **Member 4:** A.M Marshad Ahamed
