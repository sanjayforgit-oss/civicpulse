import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Sliding Window Rate Limiter
class MemoryRateLimiter:
    def __init__(self):
        self.requests: Dict[str, list] = {}

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
        now = time.time()
        timestamps = self.requests.get(key, [])
        # Filter timestamps outside window
        timestamps = [t for t in timestamps if now - t < window_seconds]
        
        if len(timestamps) >= max_requests:
            retry_after = int(window_seconds - (now - timestamps[0]))
            self.requests[key] = timestamps
            return True, max(1, retry_after)

        timestamps.append(now)
        self.requests[key] = timestamps
        return False, 0

rate_limiter = MemoryRateLimiter()

class SecurityHeadersAndRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        path = request.url.path

        # Rate Limiting Policies
        rate_limits = {
            "/api/v1/auth/request-otp": (3, 300),     # 3 requests per 5 min
            "/api/v1/auth/login": (5, 300),           # 5 requests per 5 min
            "/api/v1/issues/create": (10, 3600),       # 10 requests per hour
        }

        for route_prefix, (max_req, window_sec) in rate_limits.items():
            if path.startswith(route_prefix):
                key = f"{client_ip}:{route_prefix}"
                limited, retry_after = rate_limiter.is_rate_limited(key, max_req, window_sec)
                if limited:
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "detail": f"Rate limit exceeded. Too many requests. Please try again in {retry_after} seconds.",
                            "retry_after_seconds": retry_after
                        },
                        headers={"Retry-After": str(retry_after)}
                    )

        response = await call_next(request)

        # Secure HTTP Response Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response
