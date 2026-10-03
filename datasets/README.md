# Waypoint Delivery Planning Datasets

## Confidentiality Notice

> **IMPORTANT COMPETITION CONSTRAINT**
> 
> Competition datasets must not be committed publicly if competition rules prohibit redistribution.
>
> The supplied competition datasets (including outlets, vehicles, product catalog, calendar, and operational logs) are confidential under the Rootcode Tech-Triathlon 2026 challenge rules.

## Policy & Guidelines

- **No Public Dataset Uploads:** Do NOT commit official competition CSV or JSON files to public repositories.
- **No Fabricated Mock Datasets Pretending to be Official:** Do not fabricate or falsify official data.
- **Local Development Data:** Team members must place local dataset files in their private, uncommitted local environment or populate seed scripts via environment-driven paths.
- **Production / Evaluation Seeding:** Seed runners and database ingest utilities in `scripts/` will read from local paths specified via environment variables when executing in staging or evaluation environments.

## Synthetic Development Data

Development fixtures in `apps/api/prisma/seed.ts` (e.g. test vehicles VEH014/VEH021/VEH033/VEH018 and mockup stops) are purely synthetic test data created independently for automated testing and UI layout verification (LS-02 and LS-03). They do NOT contain, derive from, or reconstruct any official competition datasets.
