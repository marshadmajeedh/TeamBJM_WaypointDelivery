# Dispatcher Planning & Allocation

Owner: M.M.M Munshif  
Branch: `feature/dispatcher-planning`

## Demonstration flow

1. Sign in with the seeded Dispatcher account and open `/dispatcher`.
2. Review confirmed, planned, deferred, active-trip and available-vehicle totals on DP-02.
3. Open DP-03 Confirmed Orders and inspect an order's delivery window, temperature and access restrictions.
4. Start DP-04 Daily Planning, select orders and validate the plan.
5. Review DP-05 order detail and DP-06/DP-07 fleet capacity information.
6. Check every served/deferred result in DP-08 before publishing.
7. Publish the plan to create shared `Trip` and `TripOrder` records for Loader and Driver workflows.
8. Record a required reason and review repeat-deferral risk in DP-09.
9. Expand a trip in DP-10 and open DP-11 full trip monitoring for driver, vehicle, stops, ETA, cold-chain availability and issues.

## Enforced constraints

- Depot match and active vehicle availability
- Refrigerated vehicle for chilled or frozen goods
- Van-only outlet access
- Weight and volume capacity
- Delivery-window ordering
- Remaining weekly fuel quota
- Maximum two trips per vehicle per day

The allocation service is deterministic. Every selected confirmed order returns `SERVED` with a vehicle/trip or `DEFERRED` with an explicit reason. Backend role middleware restricts all `/api/dispatcher/*` routes to the Dispatcher role.

## Verification

Run `npm run typecheck`, `npm test`, and `npm run build` from the repository root. No Dispatcher-specific Prisma models or database are introduced; the workflow uses the existing shared models and integration contracts.
