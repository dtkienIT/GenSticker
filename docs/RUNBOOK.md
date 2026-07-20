# Operational Runbook

This runbook outlines operational procedures for managing local backend services, job workers, database migrations, and troubleshooting.

---

## 🚀 Service Entry Points

### 1. Fast API Server Process

```bash
python -m backend.app.main
```

Or via npm:

```bash
npm run api:dev
```

### 2. Durable Local Worker Process

```bash
python -m backend.app.jobs.worker
```

Or via npm:

```bash
npm run worker:dev
```

---

## 🗄️ Database Migrations (Alembic)

- Apply latest schema migrations:
  ```bash
  python -m alembic -c backend/alembic.ini upgrade head
  ```
- Generate new migration:
  ```bash
  python -m alembic -c backend/alembic.ini revision --autogenerate -m "description"
  ```

---

## 🧹 Asset Cleanup CLI

Clean up temporary assets exceeding TTL (`ASSET_TTL_HOURS`):

```bash
python -m backend.app.cli.cleanup_assets
```

---

## 🚨 Troubleshooting

- **Database lock errors**: Ensure SQLite check_same_thread configuration is active.
- **Stale running jobs**: The job worker automatically recovers jobs stuck in `running` state longer than `STALE_JOB_SECONDS` (120s).
