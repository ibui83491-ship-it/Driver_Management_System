import re
import unittest

class TestLoginPage(unittest.TestCase):
    def setUp(self):
        with open("static/js/app.js", "r", encoding="utf-8") as f:
            self.app_js = f.read()

        # Extract renderLoginView function body
        match = re.search(r"renderLoginView\s*\(\)\s*\{(.*?)\n  \},", self.app_js, re.DOTALL)
        self.assertTrue(match, "renderLoginView() function must exist in app.js")
        self.login_view_code = match.group(1)

    def test_form_elements_exist(self):
        # 1. User ID field exists
        self.assertIn('User ID', self.login_view_code)
        self.assertIn('id="login-identifier"', self.login_view_code)

        # 2. Password field exists
        self.assertIn('Password', self.login_view_code)
        self.assertIn('id="login-password"', self.login_view_code)

        # 3. Login button exists
        self.assertIn('id="btn-login"', self.login_view_code)
        self.assertIn('Login', self.login_view_code)

    def test_dummy_credentials_set(self):
        # Verify dummy admin credentials are defined and populated
        self.assertIn('admin', self.login_view_code)
        self.assertIn('Admin@123456', self.login_view_code)
        self.assertIn('fillDummyCredentials', self.app_js)
        self.assertIn('btn-fill-dummy', self.login_view_code)

if __name__ == "__main__":
    unittest.main()
