# Store Manager workflow

Implemented on `feature/store-manager-workflow` inside the existing monorepo. No dependencies, Prisma migrations, authentication changes, database configuration changes, or Dispatcher/Loader/Driver changes.

## Run with the existing backend

From the repository root, with the existing local environment and Supabase database configured:

```powershell
npm ci
npm run build:shared
npm run db:generate
npm run dev:api
```

In a second terminal:

```powershell
npm run dev:web
```

Open http://localhost:5173/store. Unauthenticated visitors go to `/store/login`. Sign in using an existing Store Manager account. Passwords remain configured through the team's existing environment/seed process; none are introduced here. Remember me remembers only the email, preserving existing session-only token storage.

The Store Manager account must have a non-null depotId and the database must contain outlets with that depotId. Missing depot assignment fails closed. This schema has no manager-to-outlet ownership relation: authorization is depot-level, not individual outlet-level. No outlet assignments are invented or seeded by this change. Team agreement and a later schema change are needed for stricter per-outlet ownership.

## Development visual preview

Sample data is isolated in `mock-service.ts`. It never activates on API errors and is disabled in production builds. A valid existing Store Manager login is still required.

```powershell
$env:VITE_STORE_DEMO='true'
npm run dev --workspace=@waypoint/web -- --port 5174 --strictPort
```

Visit http://localhost:5174/store. The preview has a visible sample-data banner. Sample submissions, drafts, bay readiness, slot responses and receipts persist in session storage per user across reloads. They remain sample data and do not write to the database. Close this preview terminal to return to the normal environment. A normal `npm run dev:web` in a fresh terminal uses the real API.

## Routes and manual checks

- `/store/login`: existing authentication, wrong roles sent to their own portal.
- `/store`: summaries, next delivery, recent orders, dock link.
- `/store/orders/new`: choose depot outlet/date; add products; save to the authenticated account. Drafts restore on another session/device; past-date drafts keep their items and require an updated date before submission. Empty orders cannot advance.
- `/store/orders/review`: confirm destination and manifest, check sign-off, submit once. Totals are recalculated server-side.
- `/store/orders/:id/confirmation`: submitted ID, specifications and progress. Copy ID and track.
- `/store/orders`: search ID/outlet, date and status filtering, load more.
- `/store/orders/:id`: full payload detail.
- `/store/orders/:id/track`: trip/driver/window, checkpoint timeline, receiving-bay modal. All five checks are required and saved on the server. Escape/Cancel closes it; keyboard focus returns to the opener.
- `/store/orders/:id/deferred`: reason, requested date and impacted manifest; server-persisted acknowledgement / revised-slot acceptance.
- `/store/orders/:id/receipt`: verify received counts, select shortage/damaged/incorrect if appropriate, provide notes and a typed acknowledgement. Submitted exceptions persist and appear under Exceptions in My Orders. Duplicate receipts are rejected.

Test with an order from another depot: reads return 404 and creation for its outlet returns 403. Other roles and unauthenticated requests cannot access Store endpoints.

## API integration

Existing routers mount these additive routes:

- `GET /api/orders/store/catalog`: initial server-owned three-product replenishment catalog.
- `GET /api/orders/store/outlets`: current manager's depot outlets.
- `GET /api/orders/store`: depot orders, including existing trip/delivery data.
- `GET /api/orders/store/:id`: scoped order detail.
- `POST /api/orders/store`: `{ clientRequestId?, outletId, requestedDeliveryDate: "YYYY-MM-DD", category?, receivingInstructions?, items: [{ productId, quantity }] }`. The UI always includes a UUID request ID; retries reuse the order. A changed manifest with the same ID returns 409.
- `GET /api/orders/store/draft`, `PUT /api/orders/store/draft`: load/save the current user's account draft.
- `POST /api/orders/store/:id/bay`: `{ checks: [true,true,true,true,true] }`.
- `POST /api/orders/store/:id/deferral`: `{ action: "ACKNOWLEDGE" | "ACCEPT", slotId? }`.
- `POST /api/receipts/store/:id`: `{ signature, issue, affectedItemId?, notes, dockTemperatureC?, proof?: { name, dataUrl }, received: [{ itemId, quantity }] }`. JPEG/PNG proof is limited to 64 KB binary; the request stays within the existing JSON body limit.

Uses existing `authenticate`, `authorizeRoles`, response helpers, Prisma models and `apiRequest` wrapper. Receipt signature, issue, photo proof, dock temperature and item counts are serialized into the existing ReceiptConfirmation.notes field; receipt and order status updates run in one transaction. Unique order receipt constraints prevent duplicate confirmations. No allocation logic is implemented.

## Existing-model limitations

- No product table/assets exist. The initial catalog is maintained in `orders/store-service.ts`; icons stand in for product photos. Replace the catalog provider when the team adds a product service.
- The Store tracking consumer now reads typed DELIVERY_TELEMETRY records, displays ETA, GPS link, stops and temperature readings, and marks updates older than two minutes stale. The actual GPS/temperature publisher belongs to the vehicle/Driver integration and is not supplied here. Missing source data stays unavailable.
- Deferral acknowledgement and acceptance now persist on the server. Acceptance requires the latest published, unexpired slot for the current deferral count. The Store module reads this published slot; it does not allocate/reschedule deliveries on behalf of Dispatcher.
- Bay #02 is the reference UI bay. Its five checks and server timestamp now persist through the Store bay endpoint in a namespaced, SYNCED journal record; they survive browser/device changes.
- Receipt proof uploads now accept JPEG/PNG, compress them to at most 64 KB, preview them, and store them with ReceiptConfirmation.notes in the existing database. Original full-resolution image storage is not configured. SMS alerts and password-reset delivery still require the existing shared services.
- Receiving instructions and manifest category are editable and persist in the submitted Store action journal.
- No login screenshot was provided. Login follows the requested design system; the supplied nine Store screenshots guide the other screens.

## Validation

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

New tests cover depot authorization, input validation, authoritative totals, receipt integrity, empty drafts, filters, order submission, and the modal checklist. Browser checks use the isolated development adapter, not production credentials or database writes. Real Supabase end-to-end validation requires the team's configured database and Store Manager account.

## Files

Modified:

- `apps/web/src/routes/index.tsx`
- `apps/web/src/features/store-manager/StoreManagerPortal.tsx`
- `apps/api/src/modules/orders/routes.ts`
- `apps/api/src/modules/receipts/routes.ts`

Created:

- `apps/web/src/features/store-manager/StoreContext.tsx`
- `apps/web/src/features/store-manager/types.ts`
- `apps/web/src/features/store-manager/service.ts`
- `apps/web/src/features/store-manager/mock-service.ts`
- `apps/web/src/features/store-manager/store.css`
- `apps/web/src/features/store-manager/store.test.tsx`
- `apps/web/src/features/store-manager/components/StoreShell.tsx`
- `apps/web/src/features/store-manager/components/OrderComponents.tsx`
- `apps/web/src/features/store-manager/components/ReceivingBayModal.tsx`
- `apps/web/src/features/store-manager/pages/StoreLogin.tsx`
- `apps/web/src/features/store-manager/pages/Dashboard.tsx`
- `apps/web/src/features/store-manager/pages/CreateOrder.tsx`
- `apps/web/src/features/store-manager/pages/ReviewOrder.tsx`
- `apps/web/src/features/store-manager/pages/Confirmation.tsx`
- `apps/web/src/features/store-manager/pages/MyOrders.tsx`
- `apps/web/src/features/store-manager/pages/OrderDetails.tsx`
- `apps/web/src/features/store-manager/pages/Tracking.tsx`
- `apps/web/src/features/store-manager/pages/DeferredNotice.tsx`
- `apps/web/src/features/store-manager/pages/Receipt.tsx`
- `apps/api/src/modules/orders/store-service.ts`
- `apps/api/src/modules/orders/store-routes.ts`
- `apps/api/src/modules/receipts/store-routes.ts`
- `apps/api/tests/store.test.ts`
- `docs/STORE_MANAGER_WORKFLOW.md`

## Durable Store state and integration contracts

Store actions reuse the generic SyncRecord envelope with isolated entity types. Driver sync routes and event payloads are unchanged. Store rows are marked SYNCED immediately, with server timestamps and authenticated user IDs. No schema migration is required. This extends the existing journal to Store actions; consumers must filter their own entity types.

- STORE_MANAGER_DRAFT: entityId is the authenticated user ID; unique key `store:draft:<userId>`.
- STORE_ORDER_SUBMITTED: entityId is the created order ID; unique request key `store:submit:<userId>:<clientRequestId>`. Manifest metadata and order creation share a transaction.
- STORE_BAY_READY: entityId is the order ID; payload includes bayNumber, five checks, readyAt and userId.
- STORE_DEFERRAL_RESPONSE: entityId is the order ID; payload includes action, slotId, deferralCount, respondedAt and userId. Changing the published slot invalidates acceptance of its previous revision.

Read-only integration inputs, written by the responsible publishing service (not by Store Manager):

```json
{
  "entityType": "STORE_DELIVERY_SLOT",
  "entityId": "order-id",
  "status": "SYNCED",
  "payload": {
    "id": "unique-slot-revision",
    "deferralCount": 1,
    "start": "2026-10-03T06:30:00+05:30",
    "end": "2026-10-03T08:30:00+05:30",
    "publishedAt": "2026-10-02T12:00:00+05:30"
  }
}
```

The publisher supplies a new slot ID for every revision and the order's current deferralCount. Expired or stale slot acceptance returns 409. This is a documented integration contract; no Dispatcher publishing logic is added.

DELIVERY_TELEMETRY uses the order ID as entityId and a payload with `capturedAt`, nullable `eta`, nullable `latitude`/`longitude`, nullable `chilledC`/`frozenC`, and nullable integer `stopsAway`. All timestamps are ISO strings with an offset. Records must be SYNCED. Malformed readings are ignored; updates older than two minutes or more than 30 seconds in the future are stale and not shown as live.

## Check the real Supabase setup

Configure the existing credentials locally in `apps/api/.env`; do not paste them into chat or commit them. This implementation does not create a separate database or change the team's connection configuration.

```powershell
npm exec --workspace=@waypoint/api -- tsx scripts/check-store.ts
```

This read-only check verifies connectivity, Store Manager/depot/outlet prerequisites and the existing journal table without printing secrets.

For an explicitly invoked real database end-to-end check:

```powershell
npm exec --workspace=@waypoint/api -- tsx scripts/store-smoke.ts
```

The smoke script creates a uniquely named temporary Store Manager and outlet, uses the existing login endpoint, tests draft/create/retry/bay/slot/receipt flows, and deletes only its temporary fixtures in finally. Run it against the team's development database. It does not create Driver/Loader/Dispatcher users or change real orders.

Local Supabase connectivity and Store Manager login have been verified. Full real-database workflow smoke execution remains pending. Mock-backed tests do not prove the complete database workflow.

Additional files created in the completion pass:

- `apps/api/src/modules/orders/store-workflow.ts`
- `apps/api/src/modules/orders/store-action-routes.ts`
- `apps/api/scripts/check-store.ts`
- `apps/api/scripts/store-smoke.ts`
- `apps/web/src/features/store-manager/components/ReceiptProofField.tsx`
- `apps/web/src/features/store-manager/components/ReceiptDocument.tsx`
