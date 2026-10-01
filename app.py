import os
import sys
from flask import Flask, render_template, jsonify, send_from_directory, request
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

    # Initialize tables if not already existing
    init_db()

    # Ensure initial dummy data is present on cloud deployments
    from database import query_one
    from seed import seed_database
    if not query_one("SELECT id FROM users LIMIT 1"):
        seed_database()

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(driver_bp)

    @app.route("/")
    def index():
        """Serve Single Page Application (SPA)."""
        return render_template("index.html")

    @app.route("/api/health")
    def health():
        """Health check endpoint."""
        return jsonify({
            "status": "online",
            "service": "Driver Management System",
            "version": "1.0.0"
        })

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/"):
            return jsonify({"success": False, "error": "Endpoint not found"}), 404
        return render_template("index.html")

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app

app = create_app()

if __name__ == "__main__":
    print(f"==================================================")
    print(f"  DRIVER MANAGEMENT SYSTEM (DMS)")
    print(f"  Starting server at http://{Config.HOST}:{Config.PORT}")
    print(f"  Admin Login:  admin / Admin@123456")
    print(f"  Driver Login: DRV-2026-1001 / Driver@123")
    print(f"==================================================")
    
    # Run server
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
