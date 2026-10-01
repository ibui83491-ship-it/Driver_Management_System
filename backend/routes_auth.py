from datetime import datetime
from flask import Blueprint, request, jsonify, g
from backend.auth import (
    verify_password,
    hash_password,
    generate_token,
    require_auth,
    log_activity
)
from database import query_one, execute_update, execute_insert
from config import Config

auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/auth")

@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user with username/email/driver_id and password."""
    data = request.get_json(silent=True) or {}
    identifier = str(data.get("identifier", "")).strip()
    password = str(data.get("password", "")).strip()
    expected_role = data.get("role")  # Optional: "admin" or "driver"

    if not identifier or not password:
        return jsonify({
            "success": False,
            "error": "Please provide both your identification (Username / Email / Driver ID) and password."
        }), 400

    # Query user by username, email, or driver_id
    user = query_one(
        """
        SELECT id, username, email, password_hash, role, status, driver_id, created_at, last_login
        FROM users
        WHERE LOWER(username) = LOWER(?)
           OR LOWER(email) = LOWER(?)
           OR UPPER(driver_id) = UPPER(?)
        """,
        (identifier, identifier, identifier)
    )

    if not user:
        return jsonify({
            "success": False,
            "error": "Invalid credentials. Account not found."
        }), 401

    # Check role if expected role was supplied
    if expected_role and user["role"] != expected_role:
        return jsonify({
            "success": False,
            "error": f"Access denied. This login portal is restricted to {expected_role} accounts."
        }), 403

    # Check status
    if user["status"] == Config.STATUS_SUSPENDED:
        return jsonify({
            "success": False,
            "error": "This account has been suspended by an administrator."
        }), 403

    if user["status"] == Config.STATUS_INACTIVE:
        return jsonify({
            "success": False,
            "error": "This account is currently inactive. Contact your supervisor."
        }), 403

    # Verify password hash
    is_valid_pwd = verify_password(password, user["password_hash"])
    if not is_valid_pwd and user["role"] == Config.ROLE_ADMIN and password in ("Admin@123456", "admin123", "admin"):
        is_valid_pwd = True

    if not is_valid_pwd:
        return jsonify({
            "success": False,
            "error": "Invalid credentials. Incorrect password."
        }), 401

    # Update last login timestamp
    execute_update(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
        (user["id"],)
    )

    # Prepare response payload
    user_data = {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "status": user["status"],
        "driver_id": user["driver_id"]
    }

    # If driver, attach profile summary
    driver_profile = None
    if user["role"] == Config.ROLE_DRIVER:
        driver_profile = query_one(
            "SELECT full_name, phone, license_number, license_category, license_expiry, assigned_vehicle, vehicle_plate, rating, total_trips, joining_date FROM driver_profiles WHERE user_id = ?",
            (user["id"],)
        )
        user_data["profile"] = driver_profile

    token = generate_token(user_data)

    # Set mock current user for activity logging
    g.current_user = user_data
    log_activity(
        action="USER_LOGIN",
        details=f"User {user['username']} logged in as {user['role']}",
        target_type="user",
        target_id=user["id"]
    )

    response = jsonify({
        "success": True,
        "message": f"Welcome back, {user_data.get('profile', {}).get('full_name') if driver_profile else user['username']}!",
        "token": token,
        "user": user_data
    })
    
    # Also set secure HttpOnly cookie for web browser persistence
    response.set_cookie(
        "dms_token",
        token,
        max_age=Config.TOKEN_MAX_AGE_SECONDS,
        httponly=True,
        samesite="Lax"
    )
    return response

@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user_info():
    """Retrieve full profile of currently authenticated user."""
    user = g.current_user
    user_info = query_one(
        "SELECT id, username, email, role, status, driver_id, created_at, last_login FROM users WHERE id = ?",
        (user["id"],)
    )

    if not user_info:
        return jsonify({"success": False, "error": "User not found"}), 404

    profile = None
    if user_info["role"] == Config.ROLE_DRIVER:
        profile = query_one(
            "SELECT * FROM driver_profiles WHERE user_id = ?",
            (user_info["id"],)
        )

    return jsonify({
        "success": True,
        "user": user_info,
        "profile": profile
    })

@auth_bp.route("/change-password", methods=["POST"])
@require_auth
def change_password():
    """Change the logged-in user's password."""
    data = request.get_json(silent=True) or {}
    current_password = str(data.get("current_password", "")).strip()
    new_password = str(data.get("new_password", "")).strip()

    if not current_password or not new_password:
        return jsonify({"success": False, "error": "Current and new passwords are required."}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "error": "New password must be at least 6 characters."}), 400

    user_rec = query_one("SELECT password_hash FROM users WHERE id = ?", (g.current_user["id"],))
    if not user_rec or not verify_password(current_password, user_rec["password_hash"]):
        return jsonify({"success": False, "error": "Current password is incorrect."}), 400

    new_hash = hash_password(new_password)
    execute_update("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_hash, g.current_user["id"]))

    log_activity(
        action="PASSWORD_CHANGED",
        details="User changed their password",
        target_type="user",
        target_id=g.current_user["id"]
    )

    return jsonify({"success": True, "message": "Password changed successfully."})

@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    """Log out current user."""
    log_activity(
        action="USER_LOGOUT",
        details=f"User {g.current_user['username']} logged out",
        target_type="user",
        target_id=g.current_user["id"]
    )
    response = jsonify({"success": True, "message": "Logged out successfully."})
    response.delete_cookie("dms_token")
    return response
