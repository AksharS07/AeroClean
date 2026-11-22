from fastapi import APIRouter
from app.api.v1.surveys import router as surveys_router
from app.api.v1.studio import router as studio_router

api_router = APIRouter()
api_router.include_router(surveys_router)
api_router.include_router(studio_router)
