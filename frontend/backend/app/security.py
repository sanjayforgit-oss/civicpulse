from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, OTPStore, AuditLog
from app.auth import decode_token
from app.config import settings

security_bearer = HTTPBearer()

def check_otp_rate_limit(email: str, db: Session):
    """Enforces throttling for OTP requests."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.OTP_RATE_LIMIT_MINUTES)
    recent_otp = db.query(OTPStore).filter(
        OTPStore.email == email,
        OTPStore.created_at >= cutoff
    ).first()
    
    if recent_otp:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"OTP request rate limit reached. Please wait {settings.OTP_RATE_LIMIT_MINUTES} minute before requesting another OTP."
        )

def log_audit_event(db: Session, event_type: str, user_id: str = None, details: str = None, ip_address: str = None):
    """Logs security audit events."""
    audit = AuditLog(
        user_id=user_id,
        event_type=event_type,
        details=details,
        ip_address=ip_address
    )
    db.add(audit)
    db.commit()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_bearer), db: Session = Depends(get_db)) -> User:
    """Dependency to get authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if user.account_status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive or suspended")
        
    return user

def require_roles(allowed_roles: List[str]):
    """Strict Role-Based Access Control (RBAC) Dependency Factory."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unauthorized: Role '{current_user.role}' does not have access to this resource. Allowed roles: {allowed_roles}"
            )
        return current_user
    return role_checker
