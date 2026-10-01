# 🚖 Driver Management System (DMS)

An enterprise-grade, full-stack web application for managing drivers, vehicles, licensing compliance, and logistics delivery trips with strict role-based access control (RBAC) and privacy isolation.

---

## 🌟 Key Features

### 1. 🛡️ Role-Based Access Control (RBAC) & Security
- **Dual User Roles**: **Admin** and **Driver** with completely separated portals and capabilities.
- **Cryptographic Token Authentication**: Signed session tokens with tamper-proof HMAC verification (`itsdangerous` + PBKDF2/scrypt password hashing).
- **Strict Data Isolation**: Drivers can strictly access only their personal profile and trip records. All database queries enforce driver identity checking at the backend API layer. Drivers attempting to query or tamper with other driver records or access admin endpoints receive HTTP 403 Forbidden.
- **Audit Logging**: Every driver registration, status toggle, profile update, password reset, and login attempt is timestamped and recorded in the audit trail.

### 2. 👑 Admin Capabilities
- **Separate Secure Login**: Admin-only gateway.
- **Dynamic Driver Creation**: Create unlimited driver accounts directly from the UI without touching code or database files.
- **Unique Driver ID Generation**: Automatically generates formatted IDs (`DRV-YYYY-XXXX`) or supports custom IDs.
- **Driver Lifecycle Management**:
  - View comprehensive driver directory with live search (searches by Name, Driver ID, License Number, Vehicle, Phone).
  - Filter by account status: `Active`, `Inactive`, `Suspended`.
  - Filter by license category.
  - Quick status toggle (Activate / Deactivate / Suspend).
  - Edit driver records, emergency contacts, addresses, vehicle assignments.
  - Reset driver login passwords.
  - Delete driver accounts (with cascading profile & trip cleanup).
- **Driver Dossier**: Complete modal view showing credentials, assigned vehicle, license validity countdown, assigned trips, compliance certificates, and audit logs.
- **Trip & Mission Dispatching**: Assign new delivery trips to drivers with cargo notes, route, distance, and earnings.
- **Fleet Analytics & Compliance Alerts**: Overview cards for total drivers, active ratio, suspended accounts, completed trips, plus proactive alerts for licenses expiring within 30 days.

### 3. 🚚 Driver Capabilities
- **Individual Secure Login**: Log in with either unique **Driver ID** (e.g. `DRV-2026-1001`) or email and password.
- **Digital Driver ID Badge**: Visual digital ID card featuring driver photo avatar, official Driver ID, rating, vehicle assignment, license class, and expiration status.
- **Personal Records & Dashboard**:
  - Completed trip earnings and distance statistics.
  - Assigned trips summary (Scheduled, In-Progress, Completed).
  - License expiration countdown alert badge.
  - Assigned vehicle details and inspection status.
- **Trip Dispatch Management**:
  - View only personal trips.
  - Update status of active trips to *In Progress* or *Completed*.
- **Self-Service Profile & Security**:
  - Update personal phone number, residential address, emergency contact.
  - Change password.

---

## 🚀 Default Credentials

The system includes pre-seeded demo accounts ready for evaluation:

| Role | Identifier / Driver ID | Password | Portal Tab |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` (or `admin@dms.local`) | `Admin@123456` | Admin Portal |
| **Driver 1 (Active)** | `DRV-2026-1001` (Marcus Vance) | `Driver@123` | Driver Portal |
| **Driver 2 (Expiring License)** | `DRV-2026-1002` (Elena Rostova) | `Driver@123` | Driver Portal |
| **Driver 3 (Inactive)** | `DRV-2026-1003` (David Kim) | `Driver@123` | Driver Portal |

> 💡 **Quick 1-Click Demo Login**: The login screen includes quick buttons that fill in these credentials and sign in instantly.

---

## 📁 Project Structure

```
d:\Driver management system\
├── app.py                     # Main Flask Application & Web Server
├── config.py                  # Application settings & security constants
├── database.py                # SQLite schema, connection manager & migrations
├── seed.py                    # Database seeder (Admin + Sample Drivers + Trips)
├── test_backend.py            # Automated test suite (6 tests covering RBAC & dynamic CRUD)
├── requirements.txt           # Python dependency specifications
├── run.bat                    # One-click Windows runner script
├── run.ps1                    # PowerShell runner script
├── backend/
│   ├── __init__.py
│   ├── auth.py                # Password hashing, token signing, @require_role decorators
│   ├── routes_auth.py         # Login, logout, profile, password change
│   ├── routes_admin.py        # Admin management endpoints (CRUD drivers, stats, trips, logs)
│   └── routes_driver.py       # Driver self-service endpoints (my profile, my trips, settings)
├── static/
│   ├── css/
│   │   └── style.css          # Glassmorphism, animations, driver ID badge styling
│   └── js/
│       ├── api.js             # API client with token interceptor and error handling
│       ├── admin_view.js      # Admin dashboard, directory, modals, trips, and audit views
│       ├── driver_view.js     # Driver dashboard, digital ID card, trips, and profile views
│       └── app.js             # Client SPA router, role-based navigation, toasts
└── templates/
    └── index.html             # Master SPA HTML template with Tailwind CSS & Lucide icons
```

---

## 💻 How to Run the Application

### Option 1: Double-click `run.bat`
Simply double-click `run.bat` in Windows Explorer, or execute in PowerShell:
```powershell
.\run.bat
```

### Option 2: Run via Command Line
```powershell
# 1. Initialize and seed database
python seed.py

# 2. Start the web application
python app.py
```

Open your browser at:
👉 **`http://127.0.0.1:5000`**

---

## 🧪 Running Automated Tests

Run the comprehensive test suite verifying RBAC, password security, dynamic driver creation, status suspension, and role access:
```powershell
python test_backend.py
```
*All 6 tests verify authentication, token signing, driver account generation, and 403 authorization protection.*
