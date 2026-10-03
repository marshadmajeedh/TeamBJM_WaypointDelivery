# Driver delivery workflow

Implemented on `feature/ahmed-Driver-workflow`. Authentication is the existing AuthContext/JWT system. Other role screens are unchanged. No Prisma schema or database migration is required.

## Files

Created:

- `packages/shared/src/driver.ts`: shared DTOs and runtime action validation; existing enums are reused.
- `apps/api/src/modules/driver/{routes,service}.ts`: authenticated Driver API and transactional business logic.
- `apps/api/tests/driver.test.ts`: backend authorization, quantity validation, finalization and idempotency tests.
- `apps/api/prisma/seed-driver.ts`: optional real-database development scenario.
- `apps/web/src/features/driver/DriverContext.tsx`, `driver.css`, `driver.test.tsx`.
- Driver `components/{DriverIssueModal,SignatureInput,ui}.tsx` and `components/media.ts`.
- Driver `services/{driverApi,offlineActions,validation}.ts`.
- Eleven driver pages: `DriverTodayRoutePage`, `DriverRouteOverviewPage`, `DriverStopListPage`, `DriverStopDetailsPage`, `DriverDeliveryOutcomePage`, `DriverProofOfDeliveryPage`, `DriverOfflinePage`, `DriverSyncStatusPage`, `DriverTripCompletedPage`, `DriverIssuesPage`, `DriverProfilePage`.

Modified:

- `apps/web/src/features/driver/DriverPortal.tsx`: layout, connectivity, feedback, working bottom navigation.
- `apps/web/src/routes/index.tsx`: nested protected driver routes.
- `apps/web/src/layouts/AppLayout.tsx`: driver pages use the mobile layout without the foundation header.
- `apps/web/src/features/auth/LoginPortal.tsx`: driver branding/safety variant and password visibility using existing login.
- `apps/web/src/offline/db.ts`: version 2 preserves existing tables, adds indexed driver ownership and a cache for routes/drafts/server responses.
- `apps/web/src/main.tsx`, `apps/web/vite.config.ts`: production app-shell service worker.
- `apps/api/src/app.ts`: driver router and bounded JSON photo payload support.
- `packages/shared/src/index.ts`: driver exports.
- Root/API package scripts: optional driver seed. Web package/lock: test-only `fake-indexeddb`. The lockfile already contained user changes before this work.

## Routes

`/driver`, `/driver/route`, `/driver/stops`, `/driver/stops/:stopId`, `/driver/stops/:stopId/outcome`, `/driver/stops/:stopId/proof`, `/driver/offline`, `/driver/sync`, `/driver/trip-completed`, `/driver/issues`, `/driver/profile`.

Driver login uses `/login?portal=driver` or the existing redirect when opening a protected Driver URL. All driver pages retain the existing DRIVER role guard. Logging in does not grant access to other role portals.

## API and database

- `GET /api/driver/trip` returns today's assigned published trip, including ordered stops, outlets, consignments, quantities and delivery progress. Date uses Asia/Colombo. In-transit and ready trips take priority over completed waves. Unpublished PLANNED/LOADING trips are excluded.
- `GET /api/driver/issues` reads the authenticated driver's issues from the existing SyncRecord ledger.
- `POST /api/driver/actions` accepts one validated action.
- `POST /api/driver/sync` accepts up to 50 validated actions and returns per-action confirmation/error.

Supported actions: START_TRIP, ARRIVAL, COMPLETE_DELIVERY, ISSUE, FINISH_TRIP. Every action verifies the authenticated driver owns the published trip and that stop/order belong to it. Delivery updates existing Delivery, ProofOfDelivery, Order and Trip models. Accepted per-item quantities, reasons, designation and both evidence photos remain in the action ledger; existing proof fields also receive primary evidence and signature. Photo files are bounded JPEG/PNG/WebP data URLs, sent through Express/Prisma, with no direct database connection from React.

Issue records use `SyncRecord` with `entityType = DRIVER_ISSUE`; there is no second issue table. Report timestamps, trip, TripOrder stop and order IDs are attached automatically. `payload.resolved` can be read when supplied by a future dispatch resolution integration; drivers do not resolve dispatch issues. Reporting normally leaves the driver on Stop Details. Explicitly selecting “prevents delivery” opens the failed-outcome workflow; reporting alone does not mark goods delivered or failed.

## Offline and idempotency

The same existing Dexie `syncQueue` stores every Driver action, including issues and proof evidence. UUID `clientSyncId` is the local identifier/idempotency key; rows include action payload, driver, timestamps, retry count and PENDING/SYNCING/SYNCED/FAILED status. Offline-created issues are derived from queue rows. `driverCache` contains cached API responses and editable outcome drafts, not a separate issue write path.

Actions are persisted locally before submission. A single worker per signed-in driver sends them in creation order through the existing API helper, stops at a failed predecessor and retains failures for Retry. Reconnect and opening the module attempt sync. Startup recovers interrupted SYNCING actions. Confirmed rows remain SYNCED locally; they are not deleted before confirmation. Cached progress is overlaid with local queued actions to support route progression offline. Queues and cache queries are scoped to the signed-in driver.

The backend locks the trip within a PostgreSQL transaction, compares repeated keys against driver, normalized payload and timestamp, and records the unique SyncRecord key atomically with delivery changes. Repeating a confirmed action returns success without repeating delivery/proof writes. A different payload under the same key is rejected. Finalization checks every stop server-side and is disabled in the UI while any trip action remains unsynchronized.

The production build precaches the HTML/JS/CSS app shell. APIs are excluded from service-worker caching. Offline reload requires visiting the built app online first, remaining signed in and keeping browser storage. Vite development supports offline actions in an already-open app; use a production preview to test offline page reload.

## Data and team handoffs

Actual route/vehicle/order/outlet/manifest/progress data comes from Prisma via Driver API. Profile comes from AuthContext. No frontend demo fallback silently replaces an API failure. Missing ETA, distance, dock instructions, shift or depot origin details are explicitly labeled unavailable because the current schema does not expose them. Dispatch phone can be configured with public `VITE_DISPATCH_PHONE`; do not put secrets in frontend environment variables.

The optional fixture creates nine consistent stops for today's date, the existing seeded driver, a demo reefer and three product lines per order. It does not create another login or alter credentials. All demo data is centralized in the seed and consumed through real API calls. It is never automatically seeded into a connected database.

Loader/Dispatcher must publish READY_FOR_DISPATCH trips and assign a driver. Store Manager/Dispatcher can read the shared Order/Delivery/Trip changes; issue/action detail is in SyncRecord. Their placeholder UI/API modules are unchanged; issue resolution and planning travel-time/dock metadata integration remain their responsibility.

## Manual test

1. Configure the existing backend database/JWT environment and existing seeded account passwords privately. Run `npm run db:generate` and apply the repository's existing database setup. No new driver migration is needed. For local demo data, run `npm run db:seed`, then `npm run db:seed:driver`. The driver fixture is optional if an assigned ready trip already exists.
2. Start the API with `npm run dev:api`. Start the web app with `npm run dev:web` in another terminal. Open `/login?portal=driver`, use your existing driver email/password, and verify redirection to `/driver`. No passwords are included here.
3. Verify vehicle/manifest/stop totals across Today's Route, Route and Stops. Check all pre-trip items and press Start Route. Filter stops, open the first stop, call the configured receiver if available and record arrival.
4. Open Report Problem / Access Delay. Submit a category with blank optional description/photo. Confirm success, remaining on Stop Details, and the new row under Issues. Repeat with a photo. A “prevents delivery” report should open Record Outcome and preselect an unsuccessful delivery reason.
5. Record Full delivery and confirm quantities; capture a drawn or typed recipient signature, recipient information, optional photos/notes and handover confirmation. Complete Delivery and confirm the next stop opens. On another stop choose Partial, lower Milk from 20 to 18 and enter a reason; verify the same 18/20 quantities in proof and in the queue payload. Test Unable to Deliver with a required reason and zero accepted quantities.
6. With the route loaded, use browser developer tools to set Offline. Keep the API origin offline too. Record arrival, report an issue and complete a delivery with proof. Inspect IndexedDB WaypointOfflineDB > syncQueue for PENDING Driver rows, evidence and UUID keys. Verify Stops/Issues update immediately. Open Offline Mode and Sync Status, then restore Online. Confirm automatic sync, SYNCED rows and updated backend order state. Stop the API to test a failed request; restore it and Retry. Retry the same confirmed action through the API and verify no second delivery/proof is created.
7. Complete all nine stops, synchronize all pending records, open Trip Summary and press Finish Trip. Verify Trip.status COMPLETED and finalization remains unavailable while offline or while any critical action is unsynchronized. Verify Profile and Logout work. As a different role, attempting a Driver URL must redirect to that role's portal; as a driver, another role portal must be blocked.
8. For offline reload, run `npm run build`, start the API, and run `npm run preview --workspace=@waypoint/web`. Visit the preview online, wait for the service worker to activate, reload once online, then go offline and reload a Driver URL in the same signed-in browser tab.

## Verification limits

Final verification: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and `git diff --check` passed. Tests: 25 API + 22 web = 47 passing, including 29 new Driver tests. The optional seed also passed a separate strict TypeScript check. The production build emitted `sw.js` alongside the HTML/JS/CSS shell. Existing React Router future notices and one asynchronous React test act notice remain non-failing.

Automated tests use actual Dexie with fake IndexedDB and mocked API/Prisma boundaries. They do not exercise a live PostgreSQL server or physical camera. Live database and screenshot verification must be performed in the configured local environment. The in-app browser tool failed to initialize in this session, preventing interactive visual QA.

## Designathon screen prototype (October 3, 2026)

Integrated `origin/develop` at `b168ffa` into `feature/ahmed-Driver-workflow`, preserving prior local driver changes. A backup remains in Git stash with the description `Preserve driver workspace before integrating origin/develop`.

The driver designs on PDF pages 33-41 are implemented as a connected application flow. The PDF labels DR-08 as Proof of Delivery, but its design and rationale describe Offline Mode; the application uses the clearer Offline Mode label.

Start at `/driver/login`. Use the existing local driver account. `/driver/prototype` is a clickable screen guide, also accessible through Profile > Explore Driver Screens. This is the running application prototype; the source Figma document was not edited.

| PDF screen              | Application route               | Interaction                                                      |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------- |
| DR-01 Login             | `/driver/login`                 | Email/password login, password visibility                        |
| DR-02 Today's Route     | `/driver`                       | Checklist, Start/Continue Route Wave                             |
| DR-03 Route Overview    | `/driver/route`                 | Corridor, next stop, upcoming stop links                         |
| DR-04 Stop List         | `/driver/stops`                 | Search, filters, stop details                                    |
| DR-05 Stop Details      | `/driver/stops/:stopId`         | Arrival, navigation, receiver call when configured, issue report |
| DR-06 Delivery Outcome  | `/driver/stops/:stopId/outcome` | Full/partial/failed delivery, quantity/reason validation         |
| DR-07 Proof of Delivery | `/driver/stops/:stopId/proof`   | Recipient, drawn/typed signature, photos, completion             |
| DR-08 Offline Mode      | `/driver/offline`               | Cached route, queue, continue, retry connection                  |
| DR-09 Sync Status       | `/driver/sync`                  | Pending/confirmed actions, retry sync                            |
| DR-09 Trip Completed    | `/driver/trip-completed`        | Summary, finalization, CSV delivery report                       |

Supporting Issues and Profile screens use the same mobile design. Missing planning ETA, temperature telemetry, depot details, dispatch phone and dock directives are shown honestly rather than substituting the reference image's example values. Start Route is immediately clickable as requested; checklist items remain reviewable and are not automatically marked passed.

The upstream schema changes were applied to the local development database with `prisma db push --skip-generate`, and the Prisma client was regenerated. Live login and the nine-stop assigned route were checked after restarting the servers.

Browser screenshot verification was unavailable because the browser tool failed during connection. PDF screen images were extracted and visually inspected; interaction coverage uses React Testing Library and the API test suites.
