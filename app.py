import os
import sys

from flask import Flask, render_template, jsonify, send_from_directory, request
from flask_cors import CORS

from config import Config
from database import init_db
from backend.routes_auth import auth_bp
from backend.routes_admin import admin_bp
from backend.routes_driver import driver_bp


def create_app():
    app = Flask(
        __name__,
        static_folder="static",
        template_folder="templates"
    )

    app.config.from_object(Config)

    # ============================================================
    # CORS CONFIGURATION
    # ============================================================
    # Allow the Vercel frontend to communicate with the
    # Flask backend running on Render.
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "https://drivermanagementsystem-templates-po2wb604v-avengers-fcc5.vercel.app"
                ]
            }
        },
        supports_credentials=True
    )

    # ============================================================
    # DATABASE INITIALIZATION
    # ============================================================

    # Initialize tables if not already existing
    init_db()

    # Ensure initial dummy data is present on cloud deployments
    from database import query_one
    from seed import seed_database

    if not query_one("SELECT id FROM users LIMIT 1"):
        seed_database()

    # ============================================================
    # REGISTER BLUEPRINTS
    # ============================================================

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(driver_bp)

    # ============================================================
    # FRONTEND
    # ============================================================

    @app.route("/")
    def index():
        """Serve Single Page Application (SPA)."""
        return render_template("index.html")

    # ============================================================
    # HEALTH CHECK
    # ============================================================

    @app.route("/api/health")
    def health():
        """Health check endpoint."""
        return jsonify({
            "status": "online",
            "service": "Driver Management System",
            "version": "1.0.0"
        })

    # ============================================================
    # ERROR HANDLERS
    # ============================================================

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/"):
            return jsonify({
                "success": False,
                "error": "Endpoint not found"
            }), 404

        return render_template("index.html")

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500

    return app


app = create_app()


if __name__ == "__main__":
    print("==================================================")
    print("  DRIVER MANAGEMENT SYSTEM (DMS)")
    print(f"  Starting server at http://{Config.HOST}:{Config.PORT}")
    print("  Admin Login:  admin / Admin@123456")
    print("  Driver Login: DRV-2026-1001 / Driver@123")
    print("==================================================")

    # Run server
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
