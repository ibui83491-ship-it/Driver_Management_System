@echo off
title Driver Management System
echo ========================================================
echo   DRIVER MANAGEMENT SYSTEM (DMS)
echo   Initializing Database and Starting Web Application...
echo ========================================================
python seed.py
python app.py
pause
