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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        this.clearAuth();
        if (!window.location.hash.startsWith("#/login")) {
          window.location.hash = "#/login";
          if (window.App && window.App.showToast) {
            window.App.showToast(
              "Your session expired. Please log in again.",
              "warning"
            );
          }
        }
      }

      const error = new Error(
        data.error || `Request failed with status ${response.status}`
      );

      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
},
