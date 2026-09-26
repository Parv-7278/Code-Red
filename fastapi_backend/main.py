import os
import sys
import logging
import hmac
from datetime import datetime
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.datastructures import MutableHeaders

from config import settings

from services.supabase_client import get_supabase_client, is_supabase_configured, check_supabase_connection
from routers import (
    stations_router, 
    research_router, 
    simulations_router, 
    websocket_router,
    telemetry_router,
    alerts_router,
    ai_analyst_router,
    energy_ai_router,
    predictive_ml_router,
    predictions_router
)

# Configure Logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("polaris.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Sequence
    logger.info("==================================================================")
    logger.info(f"❄️  {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"🌐 Environment: {settings.ENVIRONMENT} | Port: {settings.PORT}")
    logger.info(f"🛡️  Allowed CORS Origins: {settings.cors_origin_list}")
    
    # Initialize Supabase Client
    sb_client = get_supabase_client()
    if sb_client:
        logger.info("🛰️  Supabase PostgreSQL Gateway: ACTIVE")
    else:
        logger.info("🛰️  Supabase Gateway: IN-MEMORY SIMULATED FALLBACK")
        
    logger.info("🚀 POLARIS Antarctic Mission Control API Ready.")
    logger.info("==================================================================")
    
    yield
    
    # Shutdown Sequence
    logger.info("🛑 POLARIS API Gateway shutting down safely.")

# Initialize FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Simulation-prototype FastAPI backend for the POLARIS Antarctic Digital Twin platform. "
        "Provides real-time telemetry, 3D building statuses, energy grid flows, logistics inventory, "
        "dedicated scientific research observatories (seismic, geomagnetic Kp, snow accumulation, crew vitals), "
        "What-If failure simulation engine, and live WebSocket streaming for India's Maitri and Bharati research stations."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

PROTECTED_API_PREFIXES = (
    "/api/ai",
    "/api/ml",
    "/api/predictions",
    "/api/research/ai-analyst",
)

@app.middleware("http")
async def verified_operator_authentication(request: Request, call_next):
    """Use demo headers only in demo mode; require verified Supabase users otherwise."""
    if not settings.DEMO_MODE and request.method == "POST" and request.url.path.startswith("/api/telemetry"):
        supplied_key = request.headers.get("x-device-api-key", "")
        if not settings.DEVICE_INGEST_API_KEY:
            return JSONResponse(status_code=503, content={
                "success": False,
                "error_code": "DEVICE_AUTH_NOT_CONFIGURED",
                "message": "Device ingestion authentication is not configured.",
            })
        if not hmac.compare_digest(supplied_key, settings.DEVICE_INGEST_API_KEY):
            return JSONResponse(status_code=401, content={
                "success": False,
                "error_code": "INVALID_DEVICE_CREDENTIAL",
                "message": "A valid device ingestion credential is required.",
            })
        return await call_next(request)

    if settings.DEMO_MODE or request.method == "OPTIONS" or not request.url.path.startswith(PROTECTED_API_PREFIXES):
        return await call_next(request)

    client = get_supabase_client()
    if not client:
        return JSONResponse(status_code=503, content={
            "success": False,
            "error_code": "PRODUCTION_AUTH_NOT_CONFIGURED",
            "message": "Supabase authentication is not configured on this service.",
        })

    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme != "Bearer" or not token:
        return JSONResponse(status_code=401, content={
            "success": False,
            "error_code": "BEARER_TOKEN_REQUIRED",
            "message": "A valid Bearer access token is required.",
        })

    try:
        user_response = client.auth.get_user(token)
        user = getattr(user_response, "user", None)
        if not user:
            raise ValueError("No authenticated user")

        profile_response = client.table("user_profiles") \
            .select("id, role, station_id, full_name") \
            .eq("id", str(user.id)) \
            .single() \
            .execute()
        profile = profile_response.data
        if not profile or profile.get("role") not in {"india_operator", "station_operator"}:
            return JSONResponse(status_code=403, content={
                "success": False,
                "error_code": "TRUSTED_PROFILE_REQUIRED",
                "message": "No authorized server-side operator profile was found.",
            })

        trusted_headers = MutableHeaders(scope=request.scope)
        trusted_headers["x-user-role"] = profile["role"]
        if profile.get("station_id"):
            trusted_headers["x-station-id"] = profile["station_id"]
        return await call_next(request)
    except Exception as exc:
        logger.warning("[Auth] Token verification failed: %s", exc)
        return JSONResponse(status_code=401, content={
            "success": False,
            "error_code": "INVALID_ACCESS_TOKEN",
            "message": "The supplied access token is invalid or expired.",
        })

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Global Request Validation Error Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"[ValidationError] Route: {request.method} {request.url.path} - Details: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error_type": "VALIDATION_ERROR",
            "message": "Incoming payload failed Pydantic schema validation.",
            "details": exc.errors()
        }
    )

# Global Unexpected Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"[InternalError] Unhandled error at {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error_type": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred in Antarctic backend.",
            "detail": str(exc) if settings.DEBUG else "Please check server logs."
        }
    )

# Health Check & Root Discovery Endpoints
@app.get("/api/health", tags=["System Diagnostics"])
async def health_check():
    return {
        "status": "ONLINE",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "data_mode": "SIMULATION" if settings.DEMO_MODE else "CONFIGURED_DEPLOYMENT",
        "supabase_connected": is_supabase_configured(),
        "stations_monitored": ["Maitri (Schirmacher Oasis)", "Bharati (Larsemann Hills)"],
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/health/live", tags=["System Diagnostics"])
async def liveness_check():
    return {
        "status": "LIVE",
        "service": "polaris-fastapi-ml",
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/api/health/ready", tags=["System Diagnostics"])
async def readiness_check():
    database = await check_supabase_connection()
    ready = settings.DEMO_MODE or database["ready"]
    payload = {
        "status": "READY" if ready else "NOT_READY",
        "mode": "DEMO" if settings.DEMO_MODE else "CONNECTED",
        "checks": {"database": database["status"]},
        "synthetic_ml_allowed": settings.ALLOW_SYNTHETIC_ML,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if not ready:
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload)
    return payload

@app.get("/", tags=["System Diagnostics"])
async def root_index():
    return {
        "title": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "documentation": "/docs",
        "redoc": "/redoc",
        "endpoints": {
            "health": "/api/health",
            "stations_list": "/api/stations",
            "station_health": "/api/stations/{id}/health",
            "station_3d_modules": "/api/stations/{id}/modules",
            "station_energy": "/api/stations/{id}/energy",
            "station_logistics": "/api/stations/{id}/logistics",
            "station_environment": "/api/stations/{id}/environment",
            "station_research": "/api/stations/{id}/research",
            "energy_ai_prediction": "/api/ai/energy-prediction",
            "predictive_ml_predict": "/api/ml/predict",
            "predictive_ml_train": "/api/ml/train",
            "predictive_ml_status": "/api/ml/status",
            "simulations_run": "/api/simulations/run",
            "simulations_scenarios": "/api/simulations/scenarios",
            "websocket_telemetry": "/ws/telemetry"
        }
    }

# Register Routers
app.include_router(stations_router)
app.include_router(research_router)
app.include_router(simulations_router)
app.include_router(websocket_router)
app.include_router(telemetry_router)
app.include_router(alerts_router)
app.include_router(ai_analyst_router)
app.include_router(energy_ai_router)
app.include_router(predictive_ml_router)
app.include_router(predictions_router)

# Standalone Execution Entrypoint
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
