# Contributing to Waypoint Delivery Planning System

Welcome to the development workflow for **Team BJM** in the Rootcode Tech-Triathlon 2026 Hackathon.

---

## Branching Strategy

Our repository uses a structured Git branching model to ensure rapid, collision-free collaboration:

- `main`: Production-ready, stable hackathon deliverables. Direct pushes to `main` are strictly prohibited.
- `develop`: Primary integration branch for active development.
- `feature/<short-description>`: Feature development branches created off `develop`.
- `fix/<short-description>`: Bug fixes addressing issues in `develop`.
- `docs/<short-description>`: Documentation additions and updates.

### Examples of Feature Branch Names

- `feature/store-manager-orders`
- `feature/dispatcher-planning`
- `feature/loader-workflow`
- `feature/driver-delivery`
- `feature/offline-sync`

---

## Core Development Rules

1. **Never commit directly to `main`**: All changes arrive via Pull Requests.
2. **Branch from latest `develop`**: Always pull the newest changes before creating a branch.
3. **Keep commits atomic and descriptive**: Use conventional commit messages (e.g., `feat(driver): add offline delivery caching`).
4. **Pull Requests target `develop`**: Open PRs targeting the `develop` branch.
5. **Peer Review**: At least one team member reviews significant architectural or feature PRs.
6. **Local Conflict Resolution**: Always rebase or merge `develop` into your branch locally to resolve merge conflicts before requesting review.
7. **Zero Secrets in Git**: Never commit `.env` files, credentials, API keys, or database passwords.
8. **No Dirty Commits**: Do not commit `node_modules`, build artifacts (`dist/`, `build/`), or OS metadata (`.DS_Store`, `Thumbs.db`).
9. **Scoped Formatting**: Avoid running blanket linters/formatters on unrelated files to keep PR diffs clean and reviewable.

---

## Example Workflow

### 1. Start a New Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/loader-workflow
```

### 2. Make and Commit Changes

```bash
# Verify modified files
git status

# Stage relevant files
git add .

# Commit with a clear, conventional message
git commit -m "feat(loader): add loading task workflow"
```

### 3. Push and Open a Pull Request

```bash
git push -u origin feature/loader-workflow
```

Navigate to GitHub and create a Pull Request against `develop` using the repository's Pull Request Template.
