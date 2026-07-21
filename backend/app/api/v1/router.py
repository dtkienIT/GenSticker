from fastapi import APIRouter

from backend.app.api.v1.endpoints import assets, characters, cost, health, jobs, me

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(me.router, prefix="/api/v1", tags=["User"])
api_router.include_router(assets.router, prefix="/api/v1", tags=["Assets"])
api_router.include_router(characters.router, prefix="/api/v1", tags=["Characters"])
api_router.include_router(jobs.router, prefix="/api/v1", tags=["Generation Jobs"])
api_router.include_router(cost.router, prefix="/api/v1", tags=["Cost Ledger"])
