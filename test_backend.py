import json
import unittest
from app import create_app
from database import query_one

class BackendTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_01_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "online")

    def test_02_admin_login_success(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin",
            "password": "Admin@123456",
            "role": "admin"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["role"], "admin")

    def test_03_admin_login_failure(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin",
            "password": "WrongPassword!",
            "role": "admin"
        })
        self.assertEqual(res.status_code, 401)

    def test_04_driver_login_with_driver_id(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "DRV-2026-1001",
            "password": "Driver@123",
            "role": "driver"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["user"]["role"], "driver")
        self.assertEqual(data["user"]["driver_id"], "DRV-2026-1001")

    def test_05_driver_blocked_from_admin_api(self):
        # Login as driver
        login_res = self.client.post("/api/auth/login", json={
            "identifier": "DRV-2026-1001",
            "password": "Driver@123"
        })
        driver_token = login_res.get_json()["token"]

        # Attempt to access admin stats
        res = self.client.get("/api/admin/stats", headers={
            "Authorization": f"Bearer {driver_token}"
        })
        # Should be strictly 403 Forbidden!
        self.assertEqual(res.status_code, 403)

    def test_06_dynamic_driver_creation_and_login(self):
        # 1. Login as admin
        admin_login = self.client.post("/api/auth/login", json={
            "identifier": "admin",
            "password": "Admin@123456"
        })
        admin_token = admin_login.get_json()["token"]

        # 2. Admin dynamically creates a new driver
        new_driver_payload = {
            "full_name": "Test Autonomous Driver",
            "email": "auto.driver@fleet.com",
            "phone": "+1 555-0192",
            "license_number": "CDL-TEST-9988",
            "license_category": "Class A - Commercial Heavy",
            "license_expiry": "2028-12-31",
            "password": "SuperSecretPass!123",
            "assigned_vehicle": "Tesla Semi #909",
            "vehicle_plate": "NV-TESLA-1"
        }
        create_res = self.client.post("/api/admin/drivers", json=new_driver_payload, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(create_res.status_code, 201)
        created_data = create_res.get_json()
        assigned_id = created_data["driver"]["driver_id"]
        created_user_id = created_data["driver"]["id"]
        self.assertTrue(assigned_id.startswith("DRV-"))

        # 3. New driver immediately logs in with their new Driver ID & password!
        driver_login = self.client.post("/api/auth/login", json={
            "identifier": assigned_id,
            "password": "SuperSecretPass!123",
            "role": "driver"
        })
        self.assertEqual(driver_login.status_code, 200)
        driver_token = driver_login.get_json()["token"]

        # 4. New driver accesses their own profile
        profile_res = self.client.get("/api/driver/profile", headers={
            "Authorization": f"Bearer {driver_token}"
        })
        self.assertEqual(profile_res.status_code, 200)
        prof_data = profile_res.get_json()
        self.assertEqual(prof_data["profile"]["full_name"], "Test Autonomous Driver")
        self.assertEqual(prof_data["profile"]["assigned_vehicle"], "Tesla Semi #909")

        # 5. Admin updates driver status to suspended
        status_res = self.client.patch(f"/api/admin/drivers/{created_user_id}/status", json={
            "status": "suspended"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(status_res.status_code, 200)

        # 6. Suspended driver is now rejected from logging in
        failed_login = self.client.post("/api/auth/login", json={
            "identifier": assigned_id,
            "password": "SuperSecretPass!123"
        })
        self.assertEqual(failed_login.status_code, 403)

        # 7. Admin deletes the test driver
        del_res = self.client.delete(f"/api/admin/drivers/{created_user_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(del_res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
