# Designathon Traceability Matrix & Business Constraints

## Requirement Traceability

| Design Requirement | Role | Planned Module | Implementation Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Place Order** | STORE_MANAGER | `orders` | NOT STARTED | Store ordering interface and product selection |
| **View Order Status & ETA** | STORE_MANAGER | `orders` | NOT STARTED | Tracking status progression and expected delivery time |
| **Receive Deferral Notice** | STORE_MANAGER | `orders` | NOT STARTED | Deferral alerts and reason visibility |
| **Plan & Allocate** | DISPATCHER | `planning` / `allocation` | NOT STARTED | Daily delivery scheduling & vehicle feasibility solver |
| **Record Deferrals** | DISPATCHER | `allocation` | NOT STARTED | Audit logging of capacity shortfall reasons |
| **Monitor Deliveries** | DISPATCHER | `planning` / `deliveries` | NOT STARTED | Real-time monitoring of fleet status |
| **View Loading Tasks (LS-02 Dashboard & LS-03 Vehicle Details)** | LOADER | `loading` | IMPLEMENTED | Loading Tasks Dashboard (LS-02) with filters & summary metrics; Vehicle Loading Details (LS-03) with capacity ratios & LIFO sequence |
| **Loading Sequence (LS-04)** | LOADER | `loading` | IMPLEMENTED | Reverse-stop truck loading guide (LS-04) with LIFO priority labels, cutaway trailer zones, and sequential staging queue |
| **Confirm Loaded Items (LS-05 Checklist)** | LOADER | `loading` | IMPLEMENTED | Loading checklist (LS-05) with grouped delivery stops, item confirmation, shortage detection, and dynamic database persistence |
| **Report Loading Issue (LS-06)** | LOADER | `loading` | IMPLEMENTED | Missing or damaged goods recording (LS-06) with primary issue categorization, quantity breakdown, mandatory dock notes, simulated attachment UI, and automatic status transition to ISSUE_REPORTED for Dispatcher review before clearance |
| **Sign-off Dispatch (LS-07)** | LOADER | `loading` | IMPLEMENTED | Loading Review & Ready for Dispatch (LS-07) with server-calculated cargo manifest fill, payload and cold-chain telematics, reverse-stop audit, 5-step pre-departure gate checklist, unresolved issue blocking, idempotent dispatch confirmation, and post-completion edit protection (transitions LoadingRecord & Trip to READY_FOR_DISPATCH) |
| **View Route & Manifest** | DRIVER | `deliveries` | NOT STARTED | Mobile sequence, outlet info, and directions |
| **Complete Delivery** | DRIVER | `deliveries` | NOT STARTED | Outcome recording (FULL, PARTIAL, FAILED) |
| **Proof of Delivery** | DRIVER | `deliveries` | NOT STARTED | Signature, recipient name, and photo capture |
| **Offline Delivery** | DRIVER | `sync` / `offline` | NOT STARTED | Local IndexedDB persistence & queue replay |
| **Confirm Receipt** | STORE_MANAGER | `receipts` | NOT STARTED | Store arrival sign-off and issue reporting |
| **Authentication & Role Authorization** | ALL ROLES | `auth` | IMPLEMENTED | Shared JWT + bcrypt foundation, role middleware, session storage, protected routing |

*Allowed Statuses: `NOT STARTED` | `IN PROGRESS` | `IMPLEMENTED` | `VERIFIED`*

---

## Core Business Constraints

### 1. Vehicle Capacity Limits
- Every vehicle enforces a strict maximum weight limit (`maxWeightKg`).
- Every vehicle enforces a strict maximum volume limit (`maxVolumeM3`).
- Both constraints must simultaneously be satisfied for any allocated trip.

### 2. Temperature Compatibility
- **Chilled** and **Frozen** goods strictly require refrigerated vehicles (`REEFER`).
- **Reefer** vehicles have multi-compartment capability and may carry ambient goods alongside chilled/frozen goods.
- **Ambient** vehicles cannot carry chilled or frozen goods under any circumstance.

### 3. Vehicle Access Constraints
- Outlets marked with `van_only = true` (narrow access streets, height restrictions, or historical centers) must only be assigned `VAN` type vehicles.

### 4. Daily Trip Limits
- A vehicle can execute a **maximum of two trips per day**.
- Trip 2 planning must account for return trip time and warehouse reloading duration.

### 5. Depot Alignment
- Vehicles only serve outlets assigned to their designated home depot.

### 6. Fuel Quotas
- Vehicles operate under weekly fuel allowances (`weeklyFuelQuotaLiters`).
- Daily planned route distances must not cause weekly cumulative fuel consumption to exceed allocated quotas.

### 7. Delivery Windows & Freshness
- Outlets have designated delivery time windows (`deliveryWindowStart` to `deliveryWindowEnd`).
- Fresh produce/perishable deliveries must arrive prior to store opening hours where designated.
- Shopping mall outlets operate under fixed security loading dock access windows.

### 8. Demand Management & Order Deferrals
- When fleet capacity or operational constraints prevent fulfilling an order on the requested day, the order must be marked `DEFERRED`.
- The allocation engine must record an explicit `deferralReason` (e.g., weight capacity exceeded, reefer fleet exhausted, time window violation).
- Repeat deferrals must increment `deferralCount` to prevent unfair starvation of the same outlet.

### 9. Offline Resilience
- Driver functionality must remain operational without an active internet connection.
- Delivery status updates, timestamps, recipient signatures, and notes are cached locally in IndexedDB.
- Pending synchronization records must replay to the backend once network connectivity returns.
