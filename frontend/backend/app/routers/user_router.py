from fastapi import APIRouter, Depends
from app.models import User
from app.schemas import UserResponse, StandardResponse
from app.security import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieves protected user profile without exposing raw identity numbers."""
    return UserResponse(
        civic_user_id=current_user.id,
        email=current_user.email,
        officer_id=current_user.officer_id,
        name=current_user.name,
        designation=current_user.designation,
        department_id=current_user.department_id,
        preferred_language=current_user.preferred_language,
        identity_verified=current_user.identity_verified,
        identity_reference=current_user.identity_reference,
        role=current_user.role,
        account_status=current_user.account_status,
        created_at=current_user.created_at
    )
