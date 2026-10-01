import sqlite3
import os
from contextlib import contextmanager
from config import Config

def get_connection():
    """Create a connection with foreign keys and dict row factory."""
    conn = sqlite3.connect(Config.DATABASE_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

@contextmanager
def get_db():
    """Context manager for safe database transactions."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def query_one(sql, params=()):
    """Execute a query and return a single row as dict, or None."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None

def query_all(sql, params=()):
    """Execute a query and return all rows as list of dicts."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def execute_insert(sql, params=()):
    """Execute an insert query and return the last inserted row id."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return cursor.lastrowid

def execute_update(sql, params=()):
    """Execute an update or delete query and return rowcount."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return cursor.rowcount

def init_db():
    """Initialize database tables and indexes."""
    schema = """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'driver')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
        driver_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_driver_id ON users(driver_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS driver_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        license_number TEXT UNIQUE NOT NULL,
        license_category TEXT NOT NULL,
        license_expiry DATE NOT NULL,
        experience_years INTEGER DEFAULT 1,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        address TEXT,
        assigned_vehicle TEXT,
        vehicle_plate TEXT,
        rating REAL DEFAULT 5.0,
        total_trips INTEGER DEFAULT 0,
        total_distance_km REAL DEFAULT 0.0,
        joining_date DATE DEFAULT (DATE('now')),
        avatar_url TEXT,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);

    CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        trip_code TEXT UNIQUE NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'in_progress', 'scheduled', 'cancelled')),
        distance_km REAL DEFAULT 0.0,
        earnings REAL DEFAULT 0.0,
        vehicle TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
    CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS driver_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        doc_type TEXT NOT NULL,
        doc_number TEXT NOT NULL,
        issue_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'valid' CHECK(status IN ('valid', 'expiring_soon', 'expired')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_driver_docs_driver_id ON driver_documents(driver_id);
    """

    with get_db() as conn:
        conn.executescript(schema)
