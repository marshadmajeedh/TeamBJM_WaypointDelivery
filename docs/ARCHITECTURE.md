# System Architecture

## Overview

The **Waypoint Delivery Planning System** is structured as an npm workspaces monorepo separating client interfaces, backend domain logic, and shared cross-cutting contracts.

## System Topology & Flow

```mermaid
graph TD
    subgraph ClientLayer ["Client Presentation Layer (apps/web)"]
        SM["Store Manager (Desktop/Mobile)"]
        DISP["Dispatcher (Desktop-First)"]
        LOAD["Loader (Tablet/Responsive)"]
        DRIV["Driver (Mobile-First PWA)"]
    end

    subgraph OfflineSubsystem ["Offline Subsystem (Planned / Foundation Ready)"]
        IDB[("IndexedDB (Dexie.js)")]
        SYNCQ["Pending Sync Queue"]
        DRIV -->|Store deliveries offline| IDB
        IDB -->|Enqueue changes| SYNCQ
    end

    subgraph APILayer ["Backend REST API (apps/api - Express + TS)"]
        ROUTERS["API Gateway / Express Routers (/api)"]
        AUTH["Auth & Role Guards"]
        SERVICES["Application Services Layer"]
        
        subgraph Domains ["Domain Logic Layer"]
            ALLOC["Allocation Engine (Feasibility / Rules)"]
            LOADM["Loading Verification Domain"]
            DELIV["Delivery & POD Domain"]
            SYNCM["Sync Reconciliation Module"]
        end
    end

    subgraph DataLayer ["Data Persistence Layer"]
        PRISMA["Prisma ORM Client"]
        PG[("PostgreSQL Database")]
    end

    %% Client Interactions
    SM -->|REST / HTTPS| ROUTERS
    DISP -->|REST / HTTPS| ROUTERS
    LOAD -->|REST / HTTPS| ROUTERS
    DRIV -->|Online REST / HTTPS| ROUTERS
    SYNCQ -.->|Background Sync when Online| SYNCM

    %% Internal API flow
    ROUTERS --> AUTH
    AUTH --> SERVICES
    SERVICES --> ALLOC
    SERVICES --> LOADM
    SERVICES --> DELIV
    SERVICES --> SYNCM

    %% Persistence
    ALLOC --> PRISMA
    LOADM --> PRISMA
    DELIV --> PRISMA
    SYNCM --> PRISMA
    PRISMA --> PG
```

## Key Architectural Principles

1. **Monorepo Separation of Concerns:**
   - `packages/shared`: Shared domain enums, Zod validation schemas, and TypeScript interfaces.
   - `apps/api`: REST API built on Express, Prisma ORM, and domain services.
   - `apps/web`: React + Vite + Tailwind frontend supporting desktop and mobile layouts.
2. **Stateless Backend & Token Security:**
   - JWT-based authentication with bcrypt password hashing.
   - External inputs validated strictly via Zod.
   - Business rules isolated in service domain layers (controllers never contain allocation algorithms).
3. **Driver Offline Resilience (Planned Architecture):**
   - Driver operations store state locally in browser IndexedDB via Dexie.js.
   - Offline actions are stamped with unique `clientSyncId` tokens into a synchronization queue.
   - When connectivity is restored, records replay idempotently against `POST /api/sync`.
