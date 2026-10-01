import sys
from datetime import datetime, timedelta
from database import init_db, get_db, query_one
from backend.auth import hash_password
from config import Config

def seed_database():
    print("Initializing database schema...")
    init_db()

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Seed Dummy Admin
        admin_user = query_one("SELECT id FROM users WHERE username = 'admin' OR role = 'admin'")
        admin_pwd_hash = hash_password("Admin@123456")
        if not admin_user:
            cursor.execute(
                """
                INSERT INTO users (username, email, password_hash, role, status, driver_id)
                VALUES ('admin', 'admin@dms.local', ?, 'admin', 'active', NULL)
                """,
                (admin_pwd_hash,)
            )
            admin_id = cursor.lastrowid
            print(f"[+] Dummy admin account created: admin / Admin@123456 (User ID: {admin_id})")
        else:
            admin_id = admin_user["id"]
            cursor.execute(
                "UPDATE users SET username = 'admin', email = 'admin@dms.local', password_hash = ?, status = 'active' WHERE id = ?",
                (admin_pwd_hash, admin_id)
            )
            print(f"[+] Dummy admin credentials verified & updated: admin / Admin@123456 (User ID: {admin_id})")

        # 2. Seed Sample Drivers
        sample_drivers = [
            {
                "username": "marcus.vance",
                "email": "marcus.vance@fleet.com",
                "password": "Driver@123",
                "driver_id": "DRV-2026-1001",
                "status": "active",
                "full_name": "Marcus Vance",
                "phone": "+1 (555) 234-8901",
                "license_number": "DL-9948201",
                "license_category": "Class B - Passenger Vehicle / Van",
                "license_expiry": (datetime.now() + timedelta(days=280)).strftime("%Y-%m-%d"),
                "experience_years": 6,
                "assigned_vehicle": "Mercedes Sprinter Cargo Van",
                "vehicle_plate": "NYC-4892",
                "emergency_contact_name": "Sarah Vance (Spouse)",
                "emergency_contact_phone": "+1 (555) 234-8909",
                "address": "742 Evergreen Terrace, Brooklyn, NY",
                "rating": 4.9,
                "trips": [
                    {
                        "trip_code": "TRIP-81042",
                        "origin": "JFK Logistics Hub, Queens, NY",
                        "destination": "Midtown Manhattan Distribution Center",
                        "status": "completed",
                        "distance_km": 28.5,
                        "earnings": 145.0,
                        "start_time": (datetime.now() - timedelta(days=1, hours=4)).strftime("%Y-%m-%d %H:%M:%S"),
                        "end_time": (datetime.now() - timedelta(days=1, hours=2)).strftime("%Y-%m-%d %H:%M:%S"),
                        "vehicle": "Mercedes Sprinter Cargo Van",
                        "notes": "Delivered on schedule. Fragile electronic cargo."
                    },
                    {
                        "trip_code": "TRIP-82190",
                        "origin": "Newark Cargo Terminal, NJ",
                        "destination": "Stamford Distribution Depot, CT",
                        "status": "in_progress",
                        "distance_km": 82.0,
                        "earnings": 260.0,
                        "start_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "end_time": None,
                        "vehicle": "Mercedes Sprinter Cargo Van",
                        "notes": "Route via I-95 North. Light traffic."
                    }
                ]
            },
            {
                "username": "elena.rostova",
                "email": "elena.rostova@fleet.com",
                "password": "Driver@123",
                "driver_id": "DRV-2026-1002",
                "status": "active",
                "full_name": "Elena Rostova",
                "phone": "+1 (555) 472-1138",
                "license_number": "CDL-4820199",
                "license_category": "Class A - Commercial Heavy",
                "license_expiry": (datetime.now() + timedelta(days=18)).strftime("%Y-%m-%d"), # Expiring soon!
                "experience_years": 9,
                "assigned_vehicle": "Volvo FH16 Heavy Semi-Truck",
                "vehicle_plate": "PA-7721-H",
                "emergency_contact_name": "Alexander Rostov (Brother)",
                "emergency_contact_phone": "+1 (555) 472-1140",
                "address": "1204 Pine Ridge Rd, Philadelphia, PA",
                "rating": 5.0,
                "trips": [
                    {
                        "trip_code": "TRIP-79940",
                        "origin": "Philadelphia Port Terminal",
                        "destination": "Allentown Freight Terminal",
                        "status": "completed",
                        "distance_km": 115.0,
                        "earnings": 380.0,
                        "start_time": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
                        "end_time": (datetime.now() - timedelta(days=3, hours=-3)).strftime("%Y-%m-%d %H:%M:%S"),
                        "vehicle": "Volvo FH16 Heavy Semi-Truck",
                        "notes": "Container freight. Inspection signed."
                    }
                ]
            },
            {
                "username": "david.kim",
                "email": "david.kim@fleet.com",
                "password": "Driver@123",
                "driver_id": "DRV-2026-1003",
                "status": "inactive",
                "full_name": "David Kim",
                "phone": "+1 (555) 381-9920",
                "license_number": "DL-1109384",
                "license_category": "Class C - Standard Sedan / Light",
                "license_expiry": (datetime.now() + timedelta(days=450)).strftime("%Y-%m-%d"),
                "experience_years": 4,
                "assigned_vehicle": "Toyota Camry Hybrid",
                "vehicle_plate": "NY-KIM-99",
                "emergency_contact_name": "Grace Kim (Mother)",
                "emergency_contact_phone": "+1 (555) 381-9925",
                "address": "55 86th St, Bay Ridge, Brooklyn, NY",
                "rating": 4.7,
                "trips": []
            }
        ]

        for d in sample_drivers:
            existing = query_one("SELECT id FROM users WHERE driver_id = ? OR username = ?", (d["driver_id"], d["username"]))
            if not existing:
                pwd_hash = hash_password(d["password"])
                cursor.execute(
                    """
                    INSERT INTO users (username, email, password_hash, role, status, driver_id)
                    VALUES (?, ?, ?, 'driver', ?, ?)
                    """,
                    (d["username"], d["email"], pwd_hash, d["status"], d["driver_id"])
                )
                driver_uid = cursor.lastrowid

                cursor.execute(
                    """
                    INSERT INTO driver_profiles (
                        user_id, full_name, phone, license_number, license_category, license_expiry,
                        experience_years, assigned_vehicle, vehicle_plate, emergency_contact_name,
                        emergency_contact_phone, address, rating, total_trips, total_distance_km
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        driver_uid, d["full_name"], d["phone"], d["license_number"], d["license_category"],
                        d["license_expiry"], d["experience_years"], d["assigned_vehicle"], d["vehicle_plate"],
                        d["emergency_contact_name"], d["emergency_contact_phone"], d["address"],
                        d["rating"], len(d["trips"]), sum(t.get("distance_km", 0.0) for t in d["trips"])
                    )
                )

                # Documents
                cursor.execute(
                    """
                    INSERT INTO driver_documents (driver_id, doc_type, doc_number, issue_date, expiry_date, status)
                    VALUES (?, 'Driver License', ?, DATE('now', '-2 years'), ?, 'valid')
                    """,
                    (driver_uid, d["license_number"], d["license_expiry"])
                )
                cursor.execute(
                    """
                    INSERT INTO driver_documents (driver_id, doc_type, doc_number, issue_date, expiry_date, status)
                    VALUES (?, 'DOT Medical Card', ?, DATE('now', '-6 months'), DATE('now', '+18 months'), 'valid')
                    """,
                    (driver_uid, f"DOT-{driver_uid}099")
                )

                # Trips
                for t in d["trips"]:
                    cursor.execute(
                        """
                        INSERT INTO trips (driver_id, trip_code, origin, destination, start_time, end_time, status, distance_km, earnings, vehicle, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (driver_uid, t["trip_code"], t["origin"], t["destination"], t["start_time"], t["end_time"], t["status"], t["distance_km"], t["earnings"], t["vehicle"], t["notes"])
                    )

                print(f"[+] Driver seeded: {d['full_name']} | Driver ID: {d['driver_id']} | User: {d['username']} | Pwd: {d['password']}")
            else:
                print(f"[*] Driver {d['driver_id']} already exists.")

    print("\nDatabase initialization & seeding complete!")

if __name__ == "__main__":
    seed_database()
