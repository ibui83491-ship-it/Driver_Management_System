from flask import Blueprint, request, jsonify, g
from backend.auth import require_role, log_activity
from database import query_one, query_all, execute_update
from config import Config

driver_bp = Blueprint("driver_bp", __name__, url_prefix="/api/driver")

@driver_bp.route("/profile", methods=["GET"])
@require_role(Config.ROLE_DRIVER)
def get_my_profile():
    """Retrieve the logged-in driver's personal profile and statistics."""
    # Strictly extract driver user_id from verified JWT session
    driver_user_id = g.current_user["id"]

    user_info = query_one(
        """
        SELECT id, username, email, role, status, driver_id, created_at, last_login
        FROM users
        WHERE id = ?
        """,
        (driver_user_id,)
    )

    profile = query_one(
        """
        SELECT 
            full_name, phone, license_number, license_category, license_expiry,
            experience_years, emergency_contact_name, emergency_contact_phone,
            address, assigned_vehicle, vehicle_plate, rating, total_trips,
            total_distance_km, joining_date, avatar_url, notes,
            julianday(license_expiry) - julianday('now') as license_days_remaining
        FROM driver_profiles
        WHERE user_id = ?
        """,
        (driver_user_id,)
    )

    if not profile:
        return jsonify({"success": False, "error": "Driver profile not found."}), 404

    # Calculate trip summary stats
    trip_stats = query_one(
        """
        SELECT 
            COUNT(*) as total_assigned,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
            SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN earnings ELSE 0 END), 0.0) as total_earnings,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN distance_km ELSE 0 END), 0.0) as total_distance
        FROM trips
        WHERE driver_id = ?
        """,
        (driver_user_id,)
    )

    return jsonify({
        "success": True,
        "account": user_info,
        "profile": profile,
        "trip_stats": trip_stats
    })

@driver_bp.route("/profile", methods=["PATCH"])
@require_role(Config.ROLE_DRIVER)
def update_my_contact():
    """Driver can update their own personal contact details (phone, emergency contact, address)."""
    driver_user_id = g.current_user["id"]
    data = request.get_json(silent=True) or {}

    phone = str(data.get("phone", "")).strip()
    emergency_name = str(data.get("emergency_contact_name", "")).strip()
    emergency_phone = str(data.get("emergency_contact_phone", "")).strip()
    address = str(data.get("address", "")).strip()

    updates = []
    params = []

    if phone:
        updates.append("phone = ?")
        params.append(phone)
    if emergency_name:
        updates.append("emergency_contact_name = ?")
        params.append(emergency_name)
    if emergency_phone:
        updates.append("emergency_contact_phone = ?")
        params.append(emergency_phone)
    if address:
        updates.append("address = ?")
        params.append(address)

    if not updates:
        return jsonify({"success": False, "error": "No valid fields provided to update."}), 400

    params.append(driver_user_id)
    execute_update(f"UPDATE driver_profiles SET {', '.join(updates)} WHERE user_id = ?", tuple(params))

    log_activity(
        action="DRIVER_SELF_UPDATE",
        details="Driver updated their contact details",
        target_type="driver",
        target_id=driver_user_id
    )

    return jsonify({"success": True, "message": "Your profile information has been updated."})

@driver_bp.route("/trips", methods=["GET"])
@require_role(Config.ROLE_DRIVER)
def get_my_trips():
    """Retrieve only the authenticated driver's assigned trips."""
    driver_user_id = g.current_user["id"]
    status_filter = request.args.get("status", "").strip().lower()

    sql = """
        SELECT id, trip_code, origin, destination, start_time, end_time, status, distance_km, earnings, vehicle, notes
        FROM trips
        WHERE driver_id = ?
    """
    params = [driver_user_id]

    if status_filter:
        sql += " AND status = ?"
        params.append(status_filter)

    sql += " ORDER BY start_time DESC"
    trips = query_all(sql, params)

    return jsonify({
        "success": True,
        "count": len(trips),
        "trips": trips
    })

@driver_bp.route("/trips/<int:trip_id>/status", methods=["PATCH"])
@require_role(Config.ROLE_DRIVER)
def update_my_trip_status(trip_id):
    """Driver can update status of their OWN assigned trip (e.g. start or complete)."""
    driver_user_id = g.current_user["id"]
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status", "")).strip().lower()

    if new_status not in [Config.TRIP_STATUS_IN_PROGRESS, Config.TRIP_STATUS_COMPLETED]:
        return jsonify({"success": False, "error": "Drivers can only update status to 'in_progress' or 'completed'."}), 400

    # Ensure this trip strictly belongs to the requesting driver!
    trip = query_one("SELECT id, trip_code, status, distance_km FROM trips WHERE id = ? AND driver_id = ?", (trip_id, driver_user_id))
    if not trip:
        return jsonify({"success": False, "error": "Trip not found or unauthorized."}), 404

    if new_status == Config.TRIP_STATUS_COMPLETED:
        execute_update(
            "UPDATE trips SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?",
            (new_status, trip_id)
        )
        # Update driver stats
        execute_update(
            """
            UPDATE driver_profiles
            SET total_trips = total_trips + 1, total_distance_km = total_distance_km + ?
            WHERE user_id = ?
            """,
            (trip["distance_km"], driver_user_id)
        )
    else:
        execute_update("UPDATE trips SET status = ? WHERE id = ?", (new_status, trip_id))

    log_activity(
        action="DRIVER_TRIP_STATUS_UPDATE",
        details=f"Driver updated trip {trip['trip_code']} status to {new_status}",
        target_type="trip",
        target_id=trip_id
    )

    return jsonify({"success": True, "message": f"Trip {trip['trip_code']} marked as {new_status}."})

@driver_bp.route("/documents", methods=["GET"])
@require_role(Config.ROLE_DRIVER)
def get_my_documents():
    """Retrieve only the authenticated driver's compliance documents."""
    driver_user_id = g.current_user["id"]
    docs = query_all(
        """
        SELECT id, doc_type, doc_number, issue_date, expiry_date, status, notes
        FROM driver_documents
        WHERE driver_id = ?
        ORDER BY expiry_date ASC
        """,
        (driver_user_id,)
    )

    return jsonify({"success": True, "documents": docs})
