/**
 * API Service for Driver Management System
 * Handles authentication headers, token storage, and REST endpoints.
 */

const API = {
  TOKEN_KEY: "dms_auth_token",
  USER_KEY: "dms_auth_user",

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  },

  getCurrentUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.USER_KEY);
    }
  },

  clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.clearAuth();
          if (!window.location.hash.startsWith("#/login")) {
            window.location.hash = "#/login";
            if (window.App && window.App.showToast) {
              window.App.showToast("Your session expired. Please log in again.", "warning");
            }
          }
        }
        const error = new Error(data.error || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  // Auth endpoints
  async login(identifier, password, role = null) {
    const res = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password, role })
    });
    if (res.token) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async getMe() {
    return this.request("/api/auth/me");
  },

  async changePassword(currentPassword, newPassword) {
    return this.request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
  },

  async logout() {
    try {
      await this.request("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore network logout errors
    } finally {
      this.clearAuth();
    }
  },

  // Admin endpoints
  async getAdminStats() {
    return this.request("/api/admin/stats");
  },

  async getDrivers(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.status) query.append("status", params.status);
    if (params.category) query.append("category", params.category);
    return this.request(`/api/admin/drivers?${query.toString()}`);
  },

  async getDriverDetail(driverId) {
    return this.request(`/api/admin/drivers/${driverId}`);
  },

  async createDriver(driverData) {
    return this.request("/api/admin/drivers", {
      method: "POST",
      body: JSON.stringify(driverData)
    });
  },

  async updateDriver(driverId, driverData) {
    return this.request(`/api/admin/drivers/${driverId}`, {
      method: "PUT",
      body: JSON.stringify(driverData)
    });
  },

  async setDriverStatus(driverId, status) {
    return this.request(`/api/admin/drivers/${driverId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },

  async resetDriverPassword(driverId, newPassword) {
    return this.request(`/api/admin/drivers/${driverId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword })
    });
  },

  async deleteDriver(driverId) {
    return this.request(`/api/admin/drivers/${driverId}`, {
      method: "DELETE"
    });
  },

  async getAdminTrips(status = "") {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/api/admin/trips${query}`);
  },

  async createTrip(tripData) {
    return this.request("/api/admin/trips", {
      method: "POST",
      body: JSON.stringify(tripData)
    });
  },

  async getAuditLogs(limit = 50) {
    return this.request(`/api/admin/logs?limit=${limit}`);
  },

  // Driver endpoints (Strict Isolation)
  async getDriverProfile() {
    return this.request("/api/driver/profile");
  },

  async updateDriverContact(contactData) {
    return this.request("/api/driver/profile", {
      method: "PATCH",
      body: JSON.stringify(contactData)
    });
  },

  async getDriverTrips(status = "") {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/api/driver/trips${query}`);
  },

  async updateDriverTripStatus(tripId, status) {
    return this.request(`/api/driver/trips/${tripId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },

  async getDriverDocuments() {
    return this.request("/api/driver/documents");
  }
};

window.API = API;
