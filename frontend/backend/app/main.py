import sys
import os

# Add workspace root to PYTHONPATH so backend AI models are accessible
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

from app.database import engine, Base, SessionLocal
from app.models import MockIdentity, User
from app.auth import hash_identity, hash_password
from app.middleware.security_middleware import SecurityHeadersAndRateLimitMiddleware
from app.routers import auth_router, user_router, citizen_router, issue_router, officer_router

# Create DB tables
Base.metadata.create_all(bind=engine)

# Seed Mock Identity Table & Demo Officer Accounts
def seed_initial_data():
    db = SessionLocal()
    try:
        # Seed Synthetic Demo Identity Numbers
        for idx, demo_num in enumerate(settings.DEMO_IDENTITIES):
            identity_hash = hash_identity(demo_num)
            existing = db.query(MockIdentity).filter(MockIdentity.mock_identity_hash == identity_hash).first()
            if not existing:
                mock_ref = f"MOCK-REF-90010000{1234 + idx}"
                new_mock = MockIdentity(
                    identity_reference=mock_ref,
                    mock_identity_hash=identity_hash,
                    is_registered=False
                )
                db.add(new_mock)
        
        # Seed Demo Officers (OFF001, OFF002, OFF003)
        demo_officers = [
            {"officer_id": "OFF001", "name": "Er. R. Murugan", "designation": "Ward Assistant Engineer", "dept": "HIGHWAYS", "role": "OFFICER"},
            {"officer_id": "OFF002", "name": "Er. S. Kumar", "designation": "Zonal Executive Engineer", "dept": "TNEB", "role": "OFFICER"},
            {"officer_id": "OFF003", "name": "Dr. K. Anitha", "designation": "Deputy Commissioner (Public Health)", "dept": "CORPORATION", "role": "SUPERVISOR"},
            {"officer_id": "ADMIN01", "name": "Admin Governance Director", "designation": "Chief Administrator", "dept": "CORPORATION", "role": "ADMIN"}
        ]

        for off in demo_officers:
            existing_off = db.query(User).filter(User.officer_id == off["officer_id"]).first()
            if not existing_off:
                new_off = User(
                    id=f"OFF-USER-{off['officer_id']}",
                    officer_id=off["officer_id"],
                    name=off["name"],
                    designation=off["designation"],
                    department_id=off["dept"],
                    role=off["role"],
                    account_status="ACTIVE",
                    password_hash=hash_password("Demo@123")
                )
                db.add(new_off)

        db.commit()
    finally:
        db.close()

seed_initial_data()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI Backend for CivicPulse — Module 2 Officer Portal & Operational Workspace",
    version="11.1.0"
)

# Module 10 Rate Limiting & Security Headers Middleware
app.add_middleware(SecurityHeadersAndRateLimitMiddleware)

# CORS middleware for Next.js / Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth_router, user_router, citizen_router, issue_router, officer_router, ai_integration_router

# Include Routers
app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(user_router.router, prefix="/api/v1")
app.include_router(citizen_router.router, prefix="/api/v1")
app.include_router(issue_router.router, prefix="/api/v1")
app.include_router(officer_router.router, prefix="/api/v1")
app.include_router(ai_integration_router.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "11.1.0",
        "role_auth": "Separated Citizen vs Officer Endpoint Architecture",
        "officer_workspace": "Module 2 Officer Operational Portal Enabled"
    }
