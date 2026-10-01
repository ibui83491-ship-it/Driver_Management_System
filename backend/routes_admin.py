import random
import string
from datetime import datetime, date
from flask import Blueprint, request, jsonify, g
from backend.auth import require_role, hash_password, log_activity
from database import query_one, query_all, execute_insert, execute_update, get_db
from config import Config

admin_bp = Blueprint("admin_bp", __name__, url_prefix="/api/admin")

def generate_driver_id():
    """Generate a unique formatted driver ID: DRV-YYYY-XXXX."""
    current_year = datetime.now().year
    while True:
        suffix = "".join(random.choices(string.digits, k=4))
        candidate = f"DRV-{current_year}-{suffix}"
        exists = query_one("SELECT id FROM users WHERE driver_id = ?", (candidate,))
        if not exists:
            return candidate

@admin_bp.route("/stats", methods=["GET"])
@require_role(Config.ROLE_ADMIN)
def get_dashboard_stats():
    """Retrieve overall administrative statistics and metrics."""
    total_drivers = query_one("SELECT COUNT(*) as count FROM users WHERE role = 'driver'")["count"]
    active_drivers = query_one("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'active'")["count"]
    inactive_drivers = query_one("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'inactive'")["count"]
    suspended_drivers = query_one("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'suspended'")["count"]
    
    total_trips = query_one("SELECT COUNT(*) as count FROM trips")["count"]
    completed_trips = query_one("SELECT COUNT(*) as count FROM trips WHERE status = 'completed'")["count"]
    active_trips = query_one("SELECT COUNT(*) as count FROM trips WHERE status = 'in_progress'")["count"]
    
    # Check for drivers with expiring licenses (within 30 days) or already expired
    expiring_licenses = query_all(
        """
        SELECT u.id, u.driver_id, p.full_name, p.license_number, p.license_expiry,
               julianday(p.license_expiry) - julianday('now') as days_remaining
        FROM users u
        JOIN driver_profiles p ON u.id = p.user_id
        WHERE julianday(p.license_expiry) - julianday('now') <= 30
        ORDER BY days_remaining ASC
        """
    )

    # Recent activity logs
    recent_activities = query_all(
        """
        SELECT id, actor_name, actor_role, action, target_type, target_id, details, created_at
        FROM activity_logs
        ORDER BY created_at DESC
        LIMIT 10
        """
    )

    return jsonify({
        "success": True,
        "stats": {
            "total_drivers": total_drivers,
            "active_drivers": active_drivers,
            "inactive_drivers": inactive_drivers,
            "suspended_drivers": suspended_drivers,
            "total_trips": total_trips,
            "completed_trips": completed_trips,
            "active_trips": active_trips,
            "expiring_licenses_count": len(expiring_licenses)
        },
        "expiring_licenses": expiring_licenses,
        "recent_activities": recent_activities
    })

@admin_bp.route("/drivers", methods=["GET"])
@require_role(Config.ROLE_ADMIN)
def list_drivers():
    """List all drivers with filtering, search, and profile info."""
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip().lower()
    category = request.args.get("category", "").strip()

    sql = """
        SELECT 
            u.id, u.username, u.email, u.role, u.status, u.driver_id, u.created_at, u.last_login,
            p.full_name, p.phone, p.license_number, p.license_category, p.license_expiry,
            p.experience_years, p.assigned_vehicle, p.vehicle_plate, p.rating, p.total_trips,
            p.total_distance_km, p.emergency_contact_name, p.emergency_contact_phone, p.address
        FROM users u
        JOIN driver_profiles p ON u.id = p.user_id
        WHERE u.role = 'driver'
    """
    params = []

    if status and status in Config.VALID_STATUSES:
        sql += " AND u.status = ?"
        params.append(status)

    if category:
        sql += " AND p.license_category LIKE ?"
        params.append(f"%{category}%")

    if search:
        sql += """ AND (
            u.driver_id LIKE ? OR
            p.full_name LIKE ? OR
            u.email LIKE ? OR
            p.phone LIKE ? OR
            p.license_number LIKE ? OR
            p.assigned_vehicle LIKE ?
        )"""
        pattern = f"%{search}%"
        params.extend([pattern, pattern, pattern, pattern, pattern, pattern])

    sql += " ORDER BY u.created_at DESC"
    drivers = query_all(sql, params)

    return jsonify({
        "success": True,
        "count": len(drivers),
        "drivers": drivers
    })

@admin_bp.route("/drivers/<int:driver_id>", methods=["GET"])
@require_role(Config.ROLE_ADMIN)
def get_driver_detail(driver_id):
    """Retrieve full details, profile, trips, and documents for a specific driver."""
    user = query_one(
        """
        SELECT 
            u.id, u.username, u.email, u.role, u.status, u.driver_id, u.created_at, u.updated_at, u.last_login,
            p.full_name, p.phone, p.license_number, p.license_category, p.license_expiry,
            p.experience_years, p.assigned_vehicle, p.vehicle_plate, p.rating, p.total_trips,
            p.total_distance_km, p.emergency_contact_name, p.emergency_contact_phone, p.address,
            p.joining_date, p.notes
        FROM users u
        JOIN driver_profiles p ON u.id = p.user_id
        WHERE u.id = ? AND u.role = 'driver'
        """,
        (driver_id,)
    )

    if not user:
        return jsonify({"success": False, "error": "Driver not found"}), 404

    # Fetch trips
    trips = query_all(
        """
        SELECT id, trip_code, origin, destination, start_time, end_time, status, distance_km, earnings, vehicle, notes
        FROM trips
        WHERE driver_id = ?
        ORDER BY start_time DESC
        """,
        (driver_id,)
    )

    # Fetch compliance documents
    documents = query_all(
        """
        SELECT id, doc_type, doc_number, issue_date, expiry_date, status, notes
        FROM driver_documents
        WHERE driver_id = ?
        ORDER BY expiry_date ASC
        """,
        (driver_id,)
    )

    # Fetch audit logs regarding this driver
    logs = query_all(
        """
        SELECT id, actor_name, actor_role, action, details, created_at
        FROM activity_logs
        WHERE target_id = ? OR details LIKE ?
        ORDER BY created_at DESC
        LIMIT 15
        """,
        (str(driver_id), f"%{user['driver_id']}%")
    )

    return jsonify({
        "success": True,
        "driver": user,
        "trips": trips,
        "documents": documents,
        "activity_logs": logs
    })

@admin_bp.route("/drivers", methods=["POST"])
@require_role(Config.ROLE_ADMIN)
def create_driver():
    """Create a new driver dynamically with auto/custom driver_id and credentials."""
    data = request.get_json(silent=True) or {}

    # Required fields
    full_name = str(data.get("full_name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    license_number = str(data.get("license_number", "")).strip()
    license_category = str(data.get("license_category", "Class B - Passenger Vehicle / Van")).strip()
    license_expiry = str(data.get("license_expiry", "")).strip()
    raw_password = str(data.get("password", "")).strip()

    # Optional fields
    custom_driver_id = str(data.get("driver_id", "")).strip().upper()
    username = str(data.get("username", "")).strip()
    assigned_vehicle = str(data.get("assigned_vehicle", "")).strip()
    vehicle_plate = str(data.get("vehicle_plate", "")).strip()
    experience_years = int(data.get("experience_years") or 1)
    emergency_contact_name = str(data.get("emergency_contact_name", "")).strip()
    emergency_contact_phone = str(data.get("emergency_contact_phone", "")).strip()
    address = str(data.get("address", "")).strip()
    status = str(data.get("status", Config.STATUS_ACTIVE)).strip().lower()
    notes = str(data.get("notes", "")).strip()

    if not full_name:
        return jsonify({"success": False, "error": "Full name is required."}), 400
    if not email:
        return jsonify({"success": False, "error": "Email is required."}), 400
    if not phone:
        return jsonify({"success": False, "error": "Phone number is required."}), 400
    if not license_number:
        return jsonify({"success": False, "error": "License number is required."}), 400
    if not license_expiry:
        return jsonify({"success": False, "error": "License expiry date is required (YYYY-MM-DD)."}), 400
    if not raw_password:
        return jsonify({"success": False, "error": "Password is required for driver login."}), 400

    if status not in Config.VALID_STATUSES:
        status = Config.STATUS_ACTIVE

    # Generate or validate driver ID
    driver_id = custom_driver_id if custom_driver_id else generate_driver_id()

    # Check unique driver_id
    if query_one("SELECT id FROM users WHERE driver_id = ?", (driver_id,)):
        return jsonify({"success": False, "error": f"Driver ID '{driver_id}' is already registered."}), 409

    # Generate username if not provided
    if not username:
        base_username = full_name.lower().replace(" ", ".")
        # Sanitize username
        clean_user = "".join([c for c in base_username if c.isalnum() or c == "."])
        username = clean_user
        count = 1
        while query_one("SELECT id FROM users WHERE username = ?", (username,)):
            username = f"{clean_user}{count}"
            count += 1
    else:
        if query_one("SELECT id FROM users WHERE username = ?", (username,)):
            return jsonify({"success": False, "error": f"Username '{username}' is already in use."}), 409

    # Check unique email
    if query_one("SELECT id FROM users WHERE email = ?", (email,)):
        return jsonify({"success": False, "error": f"Email '{email}' is already registered."}), 409

    # Check unique license
    if query_one("SELECT id FROM driver_profiles WHERE license_number = ?", (license_number,)):
        return jsonify({"success": False, "error": f"License number '{license_number}' is already registered."}), 409

    password_hash = hash_password(raw_password)

    # Insert into users and driver_profiles in a transaction
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, role, status, driver_id)
            VALUES (?, ?, ?, 'driver', ?, ?)
            """,
            (username, email, password_hash, status, driver_id)
        )
        user_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO driver_profiles (
                user_id, full_name, phone, license_number, license_category, license_expiry,
                experience_years, emergency_contact_name, emergency_contact_phone, address,
                assigned_vehicle, vehicle_plate, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id, full_name, phone, license_number, license_category, license_expiry,
                experience_years, emergency_contact_name, emergency_contact_phone, address,
                assigned_vehicle, vehicle_plate, notes
            )
        )

        # Also add initial Driving License document entry
        cursor.execute(
            """
            INSERT INTO driver_documents (driver_id, doc_type, doc_number, issue_date, expiry_date, status)
            VALUES (?, 'Driver License', ?, DATE('now', '-1 year'), ?, 'valid')
            """,
            (user_id, license_number, license_expiry)
        )

    log_activity(
        action="DRIVER_CREATED",
        details=f"Admin created new driver: {full_name} (Driver ID: {driver_id}, Username: {username})",
        target_type="driver",
        target_id=user_id
    )

    return jsonify({
        "success": True,
        "message": f"Driver {full_name} created successfully with ID {driver_id}!",
        "driver": {
            "id": user_id,
            "driver_id": driver_id,
            "username": username,
            "email": email,
            "full_name": full_name,
            "status": status
        }
    }), 201

@admin_bp.route("/drivers/<int:driver_id>", methods=["PUT"])
@require_role(Config.ROLE_ADMIN)
def update_driver(driver_id):
    """Edit existing driver details."""
    data = request.get_json(silent=True) or {}

    user = query_one("SELECT * FROM users WHERE id = ? AND role = 'driver'", (driver_id,))
    if not user:
        return jsonify({"success": False, "error": "Driver not found"}), 404

    profile = query_one("SELECT * FROM driver_profiles WHERE user_id = ?", (driver_id,))

    full_name = data.get("full_name", profile["full_name"]).strip()
    email = data.get("email", user["email"]).strip().lower()
    phone = data.get("phone", profile["phone"]).strip()
    license_number = data.get("license_number", profile["license_number"]).strip()
    license_category = data.get("license_category", profile["license_category"]).strip()
    license_expiry = data.get("license_expiry", profile["license_expiry"]).strip()
    status = data.get("status", user["status"]).strip().lower()
    assigned_vehicle = data.get("assigned_vehicle", profile["assigned_vehicle"] or "")
    vehicle_plate = data.get("vehicle_plate", profile["vehicle_plate"] or "")
    experience_years = int(data.get("experience_years", profile["experience_years"] or 1))
    emergency_contact_name = data.get("emergency_contact_name", profile["emergency_contact_name"] or "")
    emergency_contact_phone = data.get("emergency_contact_phone", profile["emergency_contact_phone"] or "")
    address = data.get("address", profile["address"] or "")
    notes = data.get("notes", profile["notes"] or "")

    # Check email conflict
    email_check = query_one("SELECT id FROM users WHERE email = ? AND id != ?", (email, driver_id))
    if email_check:
        return jsonify({"success": False, "error": f"Email '{email}' is used by another account."}), 409

    # Check license conflict
    license_check = query_one("SELECT id FROM driver_profiles WHERE license_number = ? AND user_id != ?", (license_number, driver_id))
    if license_check:
        return jsonify({"success": False, "error": f"License '{license_number}' is registered to another driver."}), 409

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET email = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (email, status, driver_id)
        )
        cursor.execute(
            """
            UPDATE driver_profiles
            SET full_name = ?, phone = ?, license_number = ?, license_category = ?, license_expiry = ?,
                experience_years = ?, assigned_vehicle = ?, vehicle_plate = ?, emergency_contact_name = ?,
                emergency_contact_phone = ?, address = ?, notes = ?
            WHERE user_id = ?
            """,
            (
                full_name, phone, license_number, license_category, license_expiry,
                experience_years, assigned_vehicle, vehicle_plate, emergency_contact_name,
                emergency_contact_phone, address, notes, driver_id
            )
        )

    log_activity(
        action="DRIVER_UPDATED",
        details=f"Admin updated driver {full_name} ({user['driver_id']})",
        target_type="driver",
        target_id=driver_id
    )

    return jsonify({
        "success": True,
        "message": f"Driver {full_name} profile updated successfully."
    })

@admin_bp.route("/drivers/<int:driver_id>/status", methods=["PATCH"])
@require_role(Config.ROLE_ADMIN)
def set_driver_status(driver_id):
    """Quickly activate, deactivate, or suspend a driver account."""
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status", "")).strip().lower()

    if new_status not in Config.VALID_STATUSES:
        return jsonify({
            "success": False,
            "error": f"Invalid status. Must be one of: {', '.join(Config.VALID_STATUSES)}"
        }), 400

    user = query_one("SELECT driver_id, username FROM users WHERE id = ? AND role = 'driver'", (driver_id,))
    if not user:
        return jsonify({"success": False, "error": "Driver not found"}), 404

    execute_update(
        "UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (new_status, driver_id)
    )

    log_activity(
        action="DRIVER_STATUS_CHANGED",
        details=f"Status of driver {user['driver_id']} changed to {new_status}",
        target_type="driver",
        target_id=driver_id
    )

    return jsonify({
        "success": True,
        "message": f"Driver {user['driver_id']} status updated to '{new_status}' successfully.",
        "status": new_status
    })

@admin_bp.route("/drivers/<int:driver_id>/reset-password", methods=["POST"])
@require_role(Config.ROLE_ADMIN)
def reset_driver_password(driver_id):
    """Admin resets a driver's password."""
    data = request.get_json(silent=True) or {}
    new_password = str(data.get("new_password", "")).strip()

    if not new_password or len(new_password) < 6:
        return jsonify({"success": False, "error": "New password must be at least 6 characters."}), 400

    user = query_one("SELECT driver_id, username FROM users WHERE id = ? AND role = 'driver'", (driver_id,))
    if not user:
        return jsonify({"success": False, "error": "Driver not found"}), 404

    hashed = hash_password(new_password)
    execute_update(
        "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (hashed, driver_id)
    )

    log_activity(
        action="DRIVER_PASSWORD_RESET",
        details=f"Admin reset password for driver {user['driver_id']}",
        target_type="driver",
        target_id=driver_id
    )

    return jsonify({
        "success": True,
        "message": f"Password for driver {user['driver_id']} has been reset successfully."
    })

@admin_bp.route("/drivers/<int:driver_id>", methods=["DELETE"])
@require_role(Config.ROLE_ADMIN)
def delete_driver(driver_id):
    """Delete a driver account and cascade their profile and records."""
    user = query_one("SELECT driver_id, username FROM users WHERE id = ? AND role = 'driver'", (driver_id,))
    if not user:
        return jsonify({"success": False, "error": "Driver not found"}), 404

    # Delete user (foreign keys with ON DELETE CASCADE remove driver_profiles, trips, etc.)
    execute_update("DELETE FROM users WHERE id = ?", (driver_id,))

    log_activity(
        action="DRIVER_DELETED",
        details=f"Admin deleted driver account {user['driver_id']} ({user['username']})",
        target_type="driver",
        target_id=driver_id
    )

    return jsonify({
        "success": True,
        "message": f"Driver account {user['driver_id']} has been deleted permanently."
    })

@admin_bp.route("/trips", methods=["GET"])
@require_role(Config.ROLE_ADMIN)
def list_all_trips():
    """List all trips in system with driver info."""
    status = request.args.get("status", "").strip().lower()
    sql = """
        SELECT t.*, u.driver_id as driver_code, p.full_name as driver_name
        FROM trips t
        JOIN users u ON t.driver_id = u.id
        JOIN driver_profiles p ON u.id = p.user_id
    """
    params = []
    if status:
        sql += " WHERE t.status = ?"
        params.append(status)
    sql += " ORDER BY t.start_time DESC"

    trips = query_all(sql, params)
    return jsonify({"success": True, "trips": trips})

@admin_bp.route("/trips", methods=["POST"])
@require_role(Config.ROLE_ADMIN)
def create_trip():
    """Create a new trip assignment for a driver."""
    data = request.get_json(silent=True) or {}
    driver_user_id = data.get("driver_id")
    origin = str(data.get("origin", "")).strip()
    destination = str(data.get("destination", "")).strip()
    distance_km = float(data.get("distance_km") or 0.0)
    earnings = float(data.get("earnings") or 0.0)
    start_time = str(data.get("start_time", "")).strip() or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    end_time = str(data.get("end_time", "")).strip() or None
    status = str(data.get("status", Config.TRIP_STATUS_SCHEDULED)).strip().lower()
    vehicle = str(data.get("vehicle", "")).strip()
    notes = str(data.get("notes", "")).strip()

    if not driver_user_id:
        return jsonify({"success": False, "error": "Driver is required for trip assignment."}), 400
    if not origin or not destination:
        return jsonify({"success": False, "error": "Trip origin and destination are required."}), 400

    driver = query_one("SELECT id, driver_id FROM users WHERE id = ? AND role = 'driver'", (driver_user_id,))
    if not driver:
        return jsonify({"success": False, "error": "Selected driver does not exist."}), 404

    trip_code = f"TRIP-{random.randint(10000, 99999)}"

    trip_id = execute_insert(
        """
        INSERT INTO trips (driver_id, trip_code, origin, destination, start_time, end_time, status, distance_km, earnings, vehicle, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (driver_user_id, trip_code, origin, destination, start_time, end_time, status, distance_km, earnings, vehicle, notes)
    )

    # If completed, update driver's total trips and distance
    if status == Config.TRIP_STATUS_COMPLETED:
        execute_update(
            """
            UPDATE driver_profiles
            SET total_trips = total_trips + 1, total_distance_km = total_distance_km + ?
            WHERE user_id = ?
            """,
            (distance_km, driver_user_id)
        )

    log_activity(
        action="TRIP_CREATED",
        details=f"Admin assigned trip {trip_code} ({origin} -> {destination}) to driver {driver['driver_id']}",
        target_type="trip",
        target_id=trip_id
    )

    return jsonify({
        "success": True,
        "message": f"Trip {trip_code} successfully created and assigned to driver {driver['driver_id']}.",
        "trip_id": trip_id,
        "trip_code": trip_code
    }), 201

@admin_bp.route("/logs", methods=["GET"])
@require_role(Config.ROLE_ADMIN)
def get_audit_logs():
    """Retrieve system activity logs with pagination."""
    limit = int(request.args.get("limit", 50))
    logs = query_all(
        """
        SELECT id, actor_name, actor_role, action, target_type, target_id, details, ip_address, created_at
        FROM activity_logs
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (limit,)
    )
    return jsonify({"success": True, "logs": logs})
