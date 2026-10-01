import functools
from flask import request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from config import Config
from database import query_one, execute_insert

# Serializer for cryptographically signed tokens
serializer = URLSafeTimedSerializer(Config.SECRET_KEY, salt="dms-auth-salt-v1")

def hash_password(password: str) -> str:
    """Generate secure scrypt password hash."""
    return generate_password_hash(password, method="scrypt")

def verify_password(password: str, hashed: str) -> bool:
    """Verify raw password against hash."""
    if not hashed or not password:
        return False
    return check_password_hash(hashed, password)

def generate_token(user: dict) -> str:
    """Create signed token containing user payload."""
    payload = {
        "user_id": user["id"],
        "role": user["role"],
        "driver_id": user.get("driver_id"),
        "email": user["email"],
        "username": user["username"]
    }
    return serializer.dumps(payload)

def decode_token(token: str) -> dict:
    """Decode and verify token payload and expiry."""
    try:
        data = serializer.loads(token, max_age=Config.TOKEN_MAX_AGE_SECONDS)
        return data
    except SignatureExpired:
        return None
    except BadSignature:
        return None
    except Exception:
        return None

def get_bearer_token():
    """Extract bearer token from Authorization header or cookie."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    # Also support cookie token for browser convenience
    return request.cookies.get("dms_token")

def require_auth(f):
    """Decorator requiring a valid active authenticated user."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify({
                "success": False,
                "error": "Authentication token missing or invalid. Please log in."
            }), 401

        payload = decode_token(token)
        if not payload:
            return jsonify({
                "success": False,
                "error": "Session expired or invalid token. Please log in again."
            }), 401

        # Fetch fresh user record from database to verify status
        user = query_one(
            "SELECT id, username, email, role, status, driver_id, last_login FROM users WHERE id = ?",
            (payload["user_id"],)
        )
        if not user:
            return jsonify({
                "success": False,
                "error": "User account no longer exists."
            }), 401

        if user["status"] == Config.STATUS_SUSPENDED:
            return jsonify({
                "success": False,
                "error": "Account is suspended. Contact system administrator."
            }), 403

        if user["status"] == Config.STATUS_INACTIVE:
            return jsonify({
                "success": False,
                "error": "Account is inactive. Please contact your manager."
            }), 403

        # Attach authenticated user to Flask global request context
        g.current_user = user
        return f(*args, **kwargs)
    return decorated

def require_role(*allowed_roles):
    """Decorator enforcing Role-Based Access Control (RBAC)."""
    def decorator(f):
        @functools.wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            user = g.current_user
            if user["role"] not in allowed_roles:
                return jsonify({
                    "success": False,
                    "error": f"Access denied. Required role: {', '.join(allowed_roles)}. Your role: {user['role']}."
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def log_activity(action: str, details: str = "", target_type: str = None, target_id: str = None):
    """Write an audit log entry for the current user action."""
    try:
        user = getattr(g, "current_user", None)
        user_id = user["id"] if user else None
        actor_name = user["username"] if user else "SYSTEM"
        actor_role = user["role"] if user else "system"
        ip_addr = request.remote_addr if request else "127.0.0.1"

        execute_insert(
            """
            INSERT INTO activity_logs (user_id, actor_name, actor_role, action, target_type, target_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, actor_name, actor_role, action, target_type, str(target_id) if target_id else None, details, ip_addr)
        )
    except Exception as e:
        # Audit logging failure should not crash main request, print for diagnostics
        print(f"Failed to log activity: {e}")
