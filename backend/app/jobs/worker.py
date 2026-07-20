import asyncio

from backend.app.core.config import settings
from backend.app.core.logging import log_event
from backend.app.db.session import SessionLocal
from backend.app.jobs.runner import process_one_job


async def run_worker() -> None:
    log_event("INFO", "Starting durable local job worker process...")
    poll_interval_sec = settings.JOB_POLL_INTERVAL_MS / 1000.0

    while True:
        try:
            db = SessionLocal()
            try:
                processed = await process_one_job(db)
            finally:
                db.close()

            if not processed:
                await asyncio.sleep(poll_interval_sec)
        except KeyboardInterrupt:
            log_event("INFO", "Worker process stopped by user.")
            break
        except Exception as err:
            log_event("ERROR", f"Worker loop error: {err}")
            await asyncio.sleep(poll_interval_sec)


if __name__ == "__main__":
    asyncio.run(run_worker())
