from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import UPLOAD_DIR
from app.core.database import init_db
from app.models.domain import HealthCheckResponse

init_db()

app = FastAPI(
    title="AeroClean API",
    description="Drone-Based Garbage Index Mapping System Backend",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploaded raw & annotated imagery
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.get("/api/v1/health", response_model=HealthCheckResponse, tags=["Health"])
def health_check():
    return HealthCheckResponse(
        status="online",
        version="1.0.0",
        database="sqlite"
    )

from app.api.v1.router import api_router
app.include_router(api_router, prefix="/api/v1")

