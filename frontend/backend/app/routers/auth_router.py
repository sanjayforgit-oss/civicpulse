import random
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import User, MockIdentity, OTPStore
from app.schemas import (
    OTPRequest, OTPVerifyRequest, IdentityCheckRequest, IdentityCheckResponse,
    RegisterCitizenRequest, LoginRequest, OfficerLoginRequest, RefreshTokenRequest, TokenResponse, UserResponse, StandardResponse
)
from app.auth import (
    hash_password, verify_password, hash_identity,
    create_access_token, create_refresh_token, decode_token
)
from app.security import check_otp_rate_limit, log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/request-otp", response_model=StandardResponse)
def request_otp(payload: OTPRequest, request: Request, db: Session = Depends(get_db)):
    """Generates and stores a demo 6-digit OTP for email verification."""
    email = payload.email.lower().strip()
    
    # 1. Enforce Rate Limiting
    check_otp_rate_limit(email, db)
    
    # 2. Generate OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Clean old OTPs for this email
    db.query(OTPStore).filter(OTPStore.email == email).delete()
    
    otp_entry = OTPStore(
        email=email,
        otp_code=otp_code,
        expires_at=expires_at
    )
    db.add(otp_entry)
    db.commit()
    
    log_audit_event(db, "OTP_REQUEST", details=f"OTP requested for {email}", ip_address=request.client.host)
    
    return StandardResponse(
        success=True,
        message=f"OTP generated successfully. Demo OTP is {otp_code} (Valid for 10 mins).",
        data={"demo_otp": otp_code, "expires_in_minutes": 10}
    )

@router.post("/verify-otp", response_model=StandardResponse)
def verify_otp(payload: OTPVerifyRequest, request: Request, db: Session = Depends(get_db)):
    """Verifies email OTP with attempt limits."""
    email = payload.email.lower().strip()
    otp_entry = db.query(OTPStore).filter(OTPStore.email == email).first()
    
    if not otp_entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active OTP found for this email. Request a new OTP.")
        
    if datetime.now(timezone.utc) > otp_entry.expires_at.replace(tzinfo=timezone.utc):
        db.delete(otp_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired. Please request a new OTP.")
        
    if otp_entry.attempts >= settings.MAX_OTP_ATTEMPTS:
        db.delete(otp_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Max OTP verification attempts exceeded. Request a new OTP.")
        
    if otp_entry.otp_code != payload.otp_code.strip():
        otp_entry.attempts += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid OTP code. {settings.MAX_OTP_ATTEMPTS - otp_entry.attempts} attempts remaining.")
        
    # Successful OTP verification
    db.delete(otp_entry)
    db.commit()
    
    log_audit_event(db, "OTP_VERIFIED", details=f"OTP verified for {email}", ip_address=request.client.host)
    
    return StandardResponse(
        success=True,
        message="Email verified successfully via OTP.",
        data={"email": email, "email_verified": True}
    )

@router.post("/check-demo-identity", response_model=IdentityCheckResponse)
def check_demo_identity(payload: IdentityCheckRequest, db: Session = Depends(get_db)):
    """Checks synthetic demo identity validity and registration status."""
    demo_num = payload.demo_aadhaar_number.strip()
    identity_hash = hash_identity(demo_num)
    
    identity = db.query(MockIdentity).filter(MockIdentity.mock_identity_hash == identity_hash).first()
    
    if not identity:
        # Allow any 12-digit test number during prototype testing
        return IdentityCheckResponse(
            valid=True,
            identity_reference=f"MOCK-REF-{demo_num}",
            message="Demo Identity is valid and available for registration."
        )
        
    if identity.is_registered:
        return IdentityCheckResponse(
            valid=False,
            message="This Demo Identity has already been registered to another citizen account. Registration rejected."
        )
        
    return IdentityCheckResponse(
        valid=True,
        identity_reference=identity.identity_reference,
        message="Demo Identity is valid and available for registration."
    )


@router.post("/register-citizen", response_model=TokenResponse)
def register_citizen(payload: RegisterCitizenRequest, request: Request, db: Session = Depends(get_db)):
    """
    Registers a new citizen with email + demo Aadhaar.
    Rejects duplicate emails or already-registered demo identities.
    """
    email = payload.email.lower().strip()
    demo_num = payload.demo_aadhaar_number.strip()
    
    # 1. Check existing email
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        log_audit_event(db, "REJECTED", details=f"Duplicate email registration attempt: {email}", ip_address=request.client.host)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
        
    # 2. Check demo identity
    identity_hash = hash_identity(demo_num)
    identity = db.query(MockIdentity).filter(MockIdentity.mock_identity_hash == identity_hash).first()
    
    if not identity:
        # Auto-create mock identity seed for smooth testing during hackathon
        mock_ref = f"MOCK-REF-{demo_num}"
        identity = MockIdentity(
            identity_reference=mock_ref,
            mock_identity_hash=identity_hash,
            is_registered=False
        )
        db.add(identity)
        db.commit()
        db.refresh(identity)
        
    if identity.is_registered:
        # If testing with same demo ID, allow linking or reset for test email
        existing_owner = db.query(User).filter(User.id == identity.registered_user_id).first()
        if existing_owner and existing_owner.email == email:
            pass # same owner re-registering
        else:
            log_audit_event(db, "REJECTED", details=f"Attempted reuse of registered demo identity", ip_address=request.client.host)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This Demo Identity has already been registered. Please enter a different 12-digit demo number (e.g. 900100001236)."
            )

        
    # 3. Create User & Update Mock Identity
    civic_user_id = f"CIV-{uuid.uuid4().hex[:8].upper()}"
    pwd_hash = hash_password(payload.password) if payload.password else None
    
    new_user = User(
        id=civic_user_id,
        email=email,
        preferred_language=payload.preferred_language,
        identity_verified=True,
        identity_reference=identity.identity_reference,
        role="CITIZEN",
        account_status="ACTIVE",
        password_hash=pwd_hash
    )
    db.add(new_user)
    
    # Update mock identity status
    identity.is_registered = True
    identity.registered_user_id = civic_user_id
    
    db.commit()
    db.refresh(new_user)
    
    log_audit_event(db, "REGISTRATION", user_id=civic_user_id, details=f"Citizen registered successfully: {email}", ip_address=request.client.host)
    
    # 4. Issue Tokens
    access_token = create_access_token({"sub": civic_user_id, "role": "CITIZEN", "email": email})
    refresh_token = create_refresh_token({"sub": civic_user_id, "role": "CITIZEN"})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=civic_user_id,
        role="CITIZEN",
        preferred_language=new_user.preferred_language
    )

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticates citizen via email + password or verified email + OTP."""
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        log_audit_event(db, "REJECTED", details=f"Login failed: User not found {email}", ip_address=request.client.host)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
        
    if user.role != "CITIZEN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role mismatch. Officer accounts must log in via Officer Login.")

    if user.account_status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive or suspended.")
        
    # Verify password if provided
    if payload.password:
        if not user.password_hash or not verify_password(payload.password, user.password_hash):
            log_audit_event(db, "REJECTED", user_id=user.id, details="Incorrect password login attempt", ip_address=request.client.host)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    elif payload.otp_code:
        # Verify OTP
        otp_entry = db.query(OTPStore).filter(OTPStore.email == email).first()
        if not otp_entry or otp_entry.otp_code != payload.otp_code.strip():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP code for login.")
        db.delete(otp_entry)
        db.commit()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must provide password or otp_code to log in.")
        
    access_token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})
    
    log_audit_event(db, "LOGIN", user_id=user.id, details=f"Citizen logged in: {email}", ip_address=request.client.host)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        preferred_language=user.preferred_language
    )

@router.post("/officer-login", response_model=TokenResponse)
def officer_login(payload: OfficerLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticates municipal/department officers via Officer ID and password."""
    off_id = payload.officer_id.upper().strip()
    user = db.query(User).filter(User.officer_id == off_id).first()
    
    if not user:
        log_audit_event(db, "REJECTED", details=f"Officer login failed: Officer ID not found {off_id}", ip_address=request.client.host)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Officer ID or password.")
        
    if user.role not in ["OFFICER", "SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Account is not an authorized officer.")
        
    if user.account_status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Officer account is suspended or inactive.")
        
    if not user.password_hash or not verify_password(payload.password, user.password_hash):
        log_audit_event(db, "REJECTED", user_id=user.id, details=f"Incorrect officer password for {off_id}", ip_address=request.client.host)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Officer ID or password.")
        
    access_token = create_access_token({"sub": user.id, "role": user.role, "officer_id": user.officer_id})
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})
    
    log_audit_event(db, "OFFICER_LOGIN", user_id=user.id, details=f"Officer logged in: {off_id} ({user.role})", ip_address=request.client.host)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        preferred_language=user.preferred_language
    )

@router.post("/refresh-token", response_model=StandardResponse)
def refresh_token(payload: RefreshTokenRequest):
    """Issues new access token from valid refresh token."""
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")
        
    user_id = decoded.get("sub")
    role = decoded.get("role", "CITIZEN")
    
    new_access_token = create_access_token({"sub": user_id, "role": role})
    return StandardResponse(
        success=True,
        message="Token refreshed successfully.",
        data={"access_token": new_access_token, "token_type": "bearer"}
    )
