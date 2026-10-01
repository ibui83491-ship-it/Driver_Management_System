/**
 * Application Shell, Router, State Coordinator & Toasts
 * Driver Management System
 */

const App = {
  currentUser: null,
  activeLoginRole: "admin", // default login portal tab
  mobileMenuOpen: false,

  async init() {
    this.currentUser = API.getCurrentUser();

    // Check if token exists and verify with backend
    if (API.getToken()) {
      try {
        const me = await API.getMe();
        this.currentUser = me.user;
        API.setCurrentUser(me.user);
      } catch (err) {
        API.clearAuth();
        this.currentUser = null;
      }
    }

    // Hash change listener
    window.addEventListener("hashchange", () => this.handleRoute());

    // Handle initial route
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash || "";

    // If not logged in
    if (!API.getToken() || !this.currentUser) {
      this.renderLoginView();
      return;
    }

    // Role-based route guard
    const userRole = this.currentUser.role;

    // Default route redirects
    if (!hash || hash === "#" || hash === "#/login") {
      if (userRole === "admin") {
        window.location.hash = "#/admin/dashboard";
      } else {
        window.location.hash = "#/driver/dashboard";
      }
      return;
    }

    // Guard: Driver trying to access admin
    if (userRole === "driver" && hash.startsWith("#/admin")) {
      this.showToast("Access Denied: Admin privileges required.", "error");
      window.location.hash = "#/driver/dashboard";
      return;
    }

    // Guard: Admin trying to access driver self-service
    if (userRole === "admin" && hash.startsWith("#/driver")) {
      window.location.hash = "#/admin/dashboard";
      return;
    }

    // Render Main Application Shell
    this.renderAppShell();

    // Route to appropriate view
    if (hash === "#/admin/dashboard") {
      AdminView.renderDashboard();
    } else if (hash.startsWith("#/admin/drivers")) {
      const url = new URL(window.location.href);
      const statusParam = url.searchParams.get("status") || "";
      AdminView.renderDrivers(statusParam);
    } else if (hash === "#/admin/trips") {
      AdminView.renderTrips();
    } else if (hash === "#/admin/logs") {
      AdminView.renderLogs();
    } else if (hash === "#/driver/dashboard") {
      DriverView.renderDashboard();
    } else if (hash === "#/driver/trips") {
      DriverView.renderTrips();
    } else if (hash === "#/driver/documents") {
      DriverView.renderDocuments();
    } else if (hash === "#/driver/settings") {
      DriverView.renderSettings();
    } else {
      // Fallback
      if (userRole === "admin") {
        AdminView.renderDashboard();
      } else {
        DriverView.renderDashboard();
      }
    }

    this.updateActiveNavLinks();
  },

  renderLoginView() {
    const appEl = document.getElementById("app");
    const isAdmin = this.activeLoginRole === "admin";
    const dummyId = isAdmin ? "admin" : "DRV-2026-1001";
    const dummyPwd = isAdmin ? "Admin@123456" : "Driver@123";

    appEl.innerHTML = `
      <div class="min-h-screen bg-[#0b0f19] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
        <!-- Background Ambient Glow -->
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-10 right-10 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="w-full max-w-md relative z-10 animate-fade-in">
          <!-- Logo & Branding -->
          <div class="text-center mb-8">
            <div class="inline-flex p-3 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-2xl shadow-xl shadow-indigo-600/30 mb-3 text-white">
              <i data-lucide="truck" class="w-8 h-8"></i>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Driver Management System</h1>
            <p class="text-slate-400 text-xs sm:text-sm mt-1">Enterprise Fleet Operations & Driver Access</p>
          </div>

          <!-- Login Container Card -->
          <div class="glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-800">
            <!-- Role Switcher Tabs -->
            <div class="flex p-1 bg-slate-900/90 rounded-2xl border border-slate-800 mb-6">
              <button 
                type="button" 
                onclick="App.setLoginRole('admin')" 
                id="tab-admin"
                class="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${isAdmin ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}"
              >
                <i data-lucide="shield" class="w-4 h-4"></i>
                <span>Admin Login</span>
              </button>
              <button 
                type="button" 
                onclick="App.setLoginRole('driver')" 
                id="tab-driver"
                class="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isAdmin ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}"
              >
                <i data-lucide="id-card" class="w-4 h-4"></i>
                <span>Driver Login</span>
              </button>
            </div>

            <!-- Login Form -->
            <form onsubmit="App.handleLogin(event)" class="space-y-5" autocomplete="off">
              <!-- User ID field -->
              <div>
                <label for="login-identifier" class="block text-xs font-semibold text-slate-300 mb-1.5">
                  User ID
                </label>
                <div class="relative">
                  <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input 
                    type="text" 
                    id="login-identifier" 
                    name="user_id"
                    value="${dummyId}" 
                    required 
                    autocomplete="off"
                    placeholder="Enter User ID" 
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                </div>
              </div>

              <!-- Password field -->
              <div>
                <label for="login-password" class="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div class="relative">
                  <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input 
                    type="password" 
                    id="login-password" 
                    name="password"
                    value="${dummyPwd}" 
                    required 
                    autocomplete="off"
                    placeholder="Enter Password" 
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                </div>
              </div>

              <!-- Dummy Credentials Banner -->
              <div class="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 overflow-hidden">
                  <i data-lucide="key" class="w-4 h-4 text-indigo-400 shrink-0"></i>
                  <div class="text-slate-300 truncate">
                    <span class="text-indigo-300 font-semibold">Dummy ${isAdmin ? 'Admin' : 'Driver'}:</span>
                    <span class="font-mono text-slate-200 ml-1 font-bold">${dummyId}</span>
                    <span class="text-slate-500 mx-1">/</span>
                    <span class="font-mono text-slate-200 font-bold">${dummyPwd}</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onclick="App.fillDummyCredentials()"
                  id="btn-fill-dummy"
                  class="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-indigo-500/30 shrink-0 ml-2"
                >
                  Set Dummy
                </button>
              </div>

              <!-- Login Button -->
              <button 
                type="submit" 
                id="btn-login"
                class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 mt-4"
              >
                <span>Login</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
              </button>
            </form>
          </div>

          <!-- Bottom Notice -->
          <div class="text-center mt-6 text-xs text-slate-500">
            <span>Driver Management System &bull; Secure Authentication</span>
          </div>
        </div>
      </div>
    `;

    // Ensure inputs are pre-populated with dummy credentials
    const identifierInput = document.getElementById("login-identifier");
    const passwordInput = document.getElementById("login-password");
    if (identifierInput) identifierInput.value = dummyId;
    if (passwordInput) passwordInput.value = dummyPwd;

    if (window.lucide) window.lucide.createIcons();
  },

  fillDummyCredentials() {
    const isAdmin = this.activeLoginRole === "admin";
    const dummyId = isAdmin ? "admin" : "DRV-2026-1001";
    const dummyPwd = isAdmin ? "Admin@123456" : "Driver@123";
    const identifierInput = document.getElementById("login-identifier");
    const passwordInput = document.getElementById("login-password");
    if (identifierInput) identifierInput.value = dummyId;
    if (passwordInput) passwordInput.value = dummyPwd;
    this.showToast(`Dummy ${isAdmin ? 'Admin' : 'Driver'} credentials set!`, "info");
  },

  setLoginRole(role) {
    this.activeLoginRole = role;
    this.renderLoginView();
  },

  async handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const identifier = document.getElementById("login-identifier").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("btn-login");

    if (!identifier || !password) {
      this.showToast("Please enter both User ID and password", "warning");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Logging in...`;
    }

    try {
      const res = await API.login(identifier, password, this.activeLoginRole);
      this.currentUser = res.user;
      this.showToast(res.message || "Login successful!", "success");

      if (this.currentUser.role === "admin") {
        window.location.hash = "#/admin/dashboard";
      } else {
        window.location.hash = "#/driver/dashboard";
      }
    } catch (err) {
      this.showToast(err.message || "Login failed. Check your credentials.", "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Login</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },

  renderAppShell() {
    const appEl = document.getElementById("app");
    const user = this.currentUser || {};
    const isAdmin = user.role === "admin";

    // Only render full shell if not already initialized
    if (document.getElementById("main-layout")) {
      return;
    }

    appEl.innerHTML = `
      <div id="main-layout" class="min-h-screen bg-[#0b0f19] flex">
        <!-- Sidebar Navigation (Desktop) -->
        <aside id="sidebar" class="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between hidden md:flex z-30 sticky top-0 h-screen flex-shrink-0">
          <div>
            <!-- Sidebar Header -->
            <div class="p-6 border-b border-slate-800 flex items-center gap-3">
              <div class="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
                <i data-lucide="truck" class="w-5 h-5"></i>
              </div>
              <div>
                <h2 class="font-extrabold text-sm text-white tracking-tight">Fleet Command</h2>
                <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Driver System</span>
              </div>
            </div>

            <!-- Navigation Links -->
            <nav class="p-4 space-y-1.5" id="nav-links">
              ${isAdmin ? `
                <a href="#/admin/dashboard" class="nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all">
                  <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
                  <span>Dashboard</span>
                </a>
                <a href="#/admin/drivers" class="nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all">
                  <i data-lucide="users" class="w-4 h-4"></i>
                  <span>Driver Directory</span>
                </a>
                <a href="#/admin/trips" class="nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all">
                  <i data-lucide="navigation" class="w-4 h-4"></i>
                  <span>Fleet Trips</span>
                </a>
                <a href="#/admin/logs" class="nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all">
                  <i data-lucide="shield-check" class="w-4 h-4"></i>
                  <span>Audit Logs</span>
                </a>
              ` : `
                <a href="#/driver/dashboard" class="nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all">
                  <i data-lucide="id-card" class="w-4 h-4"></i>
                  <span>Overview & ID Card</span>
                </a>
                <a href="#/driver/trips" class="nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all">
                  <i data-lucide="navigation" class="w-4 h-4"></i>
                  <span>My Assigned Trips</span>
                </a>
                <a href="#/driver/documents" class="nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all">
                  <i data-lucide="file-check" class="w-4 h-4"></i>
                  <span>My Certifications</span>
                </a>
                <a href="#/driver/settings" class="nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all">
                  <i data-lucide="settings" class="w-4 h-4"></i>
                  <span>Account Settings</span>
                </a>
              `}
            </nav>
          </div>

          <!-- User Card in Sidebar -->
          <div class="p-4 border-t border-slate-800">
            <div class="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
              <div class="flex items-center gap-2.5 overflow-hidden">
                <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                  ${user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div class="overflow-hidden">
                  <p class="text-xs font-bold text-white truncate">${user.driver_id || user.username}</p>
                  <span class="text-[10px] text-slate-400 uppercase font-medium">${user.role}</span>
                </div>
              </div>
              <button onclick="App.handleLogout()" title="Log out" class="text-slate-400 hover:text-rose-400 p-1.5 transition-colors">
                <i data-lucide="log-out" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Wrapper -->
        <div class="flex-1 flex flex-col min-w-0">
          <!-- Top Sticky Navbar -->
          <header class="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Mobile Hamburger Toggle -->
              <button onclick="App.toggleMobileMenu()" class="md:hidden p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800">
                <i data-lucide="menu" class="w-5 h-5"></i>
              </button>
              <div class="hidden sm:block text-xs text-slate-400 font-medium">
                System Status: <span class="text-emerald-400 font-semibold">● Healthy & Online</span>
              </div>
            </div>

            <!-- Right Controls -->
            <div class="flex items-center gap-3">
              ${!isAdmin ? `
                <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                  <span class="text-slate-400">Driver ID:</span>
                  <span class="font-mono font-bold text-indigo-300">${user.driver_id}</span>
                </div>
              ` : `
                <button onclick="AdminView.openCreateDriverModal()" class="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Add Driver</span>
                </button>
              `}

              <div class="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div class="text-right hidden sm:block">
                  <span class="block text-xs font-bold text-white">${user.username}</span>
                  <span class="block text-[10px] text-slate-400 uppercase font-semibold">${user.role}</span>
                </div>
                <button onclick="App.handleLogout()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-slate-300 hover:text-rose-400 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors">
                  <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                  <span class="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <!-- Mobile Drawer Overlay -->
          <div id="mobile-drawer" class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm hidden md:hidden" onclick="App.toggleMobileMenu()">
            <div class="w-64 bg-slate-900 h-full p-6 flex flex-col justify-between" onclick="event.stopPropagation()">
              <div>
                <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                  <div class="flex items-center gap-2">
                    <div class="p-2 bg-indigo-600 rounded-lg text-white">
                      <i data-lucide="truck" class="w-4 h-4"></i>
                    </div>
                    <span class="font-bold text-white text-sm">Fleet Command</span>
                  </div>
                  <button onclick="App.toggleMobileMenu()" class="text-slate-400 hover:text-white p-1">
                    <i data-lucide="x" class="w-5 h-5"></i>
                  </button>
                </div>
                <nav class="space-y-2">
                  ${isAdmin ? `
                    <a href="#/admin/dashboard" onclick="App.toggleMobileMenu()" class="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800">Dashboard</a>
                    <a href="#/admin/drivers" onclick="App.toggleMobileMenu()" class="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800">Driver Directory</a>
                    <a href="#/admin/trips" onclick="App.toggleMobileMenu()" class="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800">Fleet Trips</a>
                    <a href="#/admin/logs" onclick="App.toggleMobileMenu()" class="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800">Audit Logs</a>
                  ` : `
                    <a href="#/driver/dashboard" onclick="App.toggleMobileMenu()" class="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800">Overview & ID Card</a>
                    <a href="#/driver/trips" onclick="App.toggleMobileMenu()" class="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800">My Assigned Trips</a>
                    <a href="#/driver/documents" onclick="App.toggleMobileMenu()" class="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800">My Certifications</a>
                    <a href="#/driver/settings" onclick="App.toggleMobileMenu()" class="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800">Account Settings</a>
                  `}
                </nav>
              </div>
              <button onclick="App.handleLogout()" class="w-full py-2 bg-slate-800 text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                <i data-lucide="log-out" class="w-4 h-4"></i> Logout
              </button>
            </div>
          </div>

          <!-- Main Content Area -->
          <main id="main-content" class="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
            <!-- Dynamic view rendered here -->
          </main>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    const drawer = document.getElementById("mobile-drawer");
    if (drawer) {
      if (this.mobileMenuOpen) {
        drawer.classList.remove("hidden");
      } else {
        drawer.classList.add("hidden");
      }
    }
  },

  updateActiveNavLinks() {
    const currentHash = window.location.hash || "";
    document.querySelectorAll(".nav-item").forEach(item => {
      const href = item.getAttribute("href");
      if (currentHash.startsWith(href)) {
        item.classList.add("bg-indigo-600", "text-white", "shadow-lg", "shadow-indigo-600/20");
        item.classList.remove("text-slate-400");
      } else {
        item.classList.remove("bg-indigo-600", "text-white", "shadow-lg", "shadow-indigo-600/20");
        item.classList.add("text-slate-400");
      }
    });
  },

  async handleLogout() {
    await API.logout();
    this.currentUser = null;
    this.showToast("Signed out successfully.", "info");
    window.location.hash = "#/login";
    this.renderLoginView();
  },

  showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const icons = {
      success: `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>`,
      error: `<i data-lucide="alert-circle" class="w-4 h-4 text-rose-400"></i>`,
      warning: `<i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i>`,
      info: `<i data-lucide="info" class="w-4 h-4 text-cyan-400"></i>`
    };

    const borders = {
      success: "border-emerald-500/40 bg-slate-900/95",
      error: "border-rose-500/40 bg-slate-900/95",
      warning: "border-amber-500/40 bg-slate-900/95",
      info: "border-cyan-500/40 bg-slate-900/95"
    };

    toast.className = `toast max-w-sm p-3.5 rounded-2xl border ${borders[type] || borders.info} shadow-2xl flex items-center gap-3 text-xs text-white`;
    toast.innerHTML = `
      <div class="flex-shrink-0">${icons[type] || icons.info}</div>
      <div class="flex-1 font-medium">${message}</div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white">&times;</button>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => toast.classList.add("toast-show"), 10);
    setTimeout(() => {
      toast.classList.remove("toast-show");
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
};

window.App = App;

// Bootstrap on DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
