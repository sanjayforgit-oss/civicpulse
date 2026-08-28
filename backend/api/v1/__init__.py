from fastapi import APIRouter
from backend.api.v1.media import router as media_router
from backend.api.v1.authenticity import router as authenticity_router
from backend.api.v1.audio import router as audio_router
from backend.api.v1.analysis import router as analysis_router
from backend.api.v1.complaints import router as complaints_router

api_v1_router = APIRouter()
api_v1_router.include_router(media_router)
api_v1_router.include_router(authenticity_router)
api_v1_router.include_router(audio_router)
api_v1_router.include_router(analysis_router)
api_v1_router.include_router(complaints_router)


