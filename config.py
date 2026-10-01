import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Config:
    SECRET_KEY = os.environ.get("DMS_SECRET_KEY", "dms-enterprise-secure-key-2026-xyz987")
    DATABASE_PATH = os.environ.get("DMS_DATABASE_PATH", str(BASE_DIR / "driver_management.db"))
    TOKEN_MAX_AGE_SECONDS = int(os.environ.get("DMS_TOKEN_MAX_AGE", 86400 * 7)) # 7 days
    HOST = os.environ.get("DMS_HOST", "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1")
    PORT = int(os.environ.get("PORT", os.environ.get("DMS_PORT", 5000)))
    DEBUG = os.environ.get("DMS_DEBUG", "False" if os.environ.get("PORT") else "True").lower() in ("true", "1")

    # Roles
    ROLE_ADMIN = "admin"
    ROLE_DRIVER = "driver"
    VALID_ROLES = [ROLE_ADMIN, ROLE_DRIVER]

    # Driver Statuses
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_SUSPENDED = "suspended"
    VALID_STATUSES = [STATUS_ACTIVE, STATUS_INACTIVE, STATUS_SUSPENDED]

    # License Categories
    LICENSE_CATEGORIES = [
        "Class A - Commercial Heavy",
        "Class B - Passenger Vehicle / Van",
        "Class C - Standard Sedan / Light",
        "Class D - Specialized Cargo",
        "Motorcycle / Delivery Fleet"
    ]

    # Trip Statuses
    TRIP_STATUS_COMPLETED = "completed"
    TRIP_STATUS_IN_PROGRESS = "in_progress"
    TRIP_STATUS_SCHEDULED = "scheduled"
    TRIP_STATUS_CANCELLED = "cancelled"
