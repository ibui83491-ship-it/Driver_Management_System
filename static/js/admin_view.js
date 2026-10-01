/**
 * Admin View Components & Handlers
 * Driver Management System
 */

const AdminView = {
  activeFilterStatus: "",
  activeSearchQuery: "",
  activeCategory: "",
  searchDebounceTimer: null,

  // Render Admin Dashboard
  async renderDashboard() {
    const container = document.getElementById("main-content");
    container.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    `;

    try {
      const data = await API.getAdminStats();
      const stats = data.stats;
      const expiring = data.expiring_licenses || [];
      const logs = data.recent_activities || [];

      let expiringHtml = "";
      if (expiring.length > 0) {
        expiringHtml = `
          <div class="mb-8 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
            <div class="flex items-start gap-3">
              <div class="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                <i data-lucide="alert-triangle" class="w-5 h-5"></i>
              </div>
              <div class="flex-1">
                <h4 class="font-semibold text-amber-300">Driver License Expiration Warning</h4>
                <p class="text-sm text-amber-200/80 mt-1">
                  ${expiring.length} driver(s) have licenses expiring within 30 days or already overdue.
                </p>
                <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  ${expiring.map(d => `
                    <div class="bg-amber-900/30 p-2.5 rounded-lg border border-amber-600/30 flex items-center justify-between text-xs">
                      <div>
                        <span class="font-bold text-white">${this.escape(d.full_name)}</span>
                        <span class="text-amber-300 ml-2 font-mono">(${d.driver_id})</span>
                      </div>
                      <span class="font-medium px-2 py-0.5 rounded bg-amber-500/30 text-amber-200">
                        ${d.days_remaining <= 0 ? 'EXPIRED' : `${Math.ceil(d.days_remaining)} days left`}
                      </span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="animate-fade-in space-y-8">
          <!-- Page Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                <span>Fleet Operations Dashboard</span>
                <span class="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase tracking-wider">Admin</span>
              </h1>
              <p class="text-slate-400 text-sm mt-1">Real-time overview of drivers, assignments, and compliance.</p>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="AdminView.openCreateDriverModal()" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]">
                <i data-lucide="user-plus" class="w-4 h-4"></i>
                <span>Register Driver</span>
              </button>
              <button onclick="AdminView.openCreateTripModal()" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm flex items-center gap-2 border border-slate-700 transition-all">
                <i data-lucide="navigation" class="w-4 h-4"></i>
                <span>Assign Trip</span>
              </button>
            </div>
          </div>

          ${expiringHtml}

          <!-- Metric Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <!-- Total Drivers -->
            <div class="glass-card p-5 rounded-2xl relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 text-sm font-medium">Total Registered Drivers</span>
                <div class="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <i data-lucide="users" class="w-5 h-5"></i>
                </div>
              </div>
              <div class="mt-4 flex items-baseline gap-2">
                <span class="text-3xl font-extrabold text-white">${stats.total_drivers}</span>
                <span class="text-xs text-indigo-400 font-medium">in system</span>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <a href="#/admin/drivers" class="hover:text-indigo-400 font-medium flex items-center gap-1 transition-colors">
                  View Driver Roster <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                </a>
              </div>
            </div>

            <!-- Active Drivers -->
            <div class="glass-card p-5 rounded-2xl relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 text-sm font-medium">Active on Duty</span>
                <div class="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <i data-lucide="check-circle-2" class="w-5 h-5"></i>
                </div>
              </div>
              <div class="mt-4 flex items-baseline gap-2">
                <span class="text-3xl font-extrabold text-emerald-400">${stats.active_drivers}</span>
                <span class="text-xs text-slate-400">ready / dispatch</span>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Active fleet ratio</span>
                <span class="font-bold text-slate-300">
                  ${stats.total_drivers ? Math.round((stats.active_drivers / stats.total_drivers) * 100) : 0}%
                </span>
              </div>
            </div>

            <!-- Inactive / Suspended -->
            <div class="glass-card p-5 rounded-2xl relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 text-sm font-medium">Inactive / Suspended</span>
                <div class="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <i data-lucide="user-x" class="w-5 h-5"></i>
                </div>
              </div>
              <div class="mt-4 flex items-baseline gap-2">
                <span class="text-3xl font-extrabold text-rose-400">${stats.inactive_drivers + stats.suspended_drivers}</span>
                <span class="text-xs text-slate-400">(${stats.suspended_drivers} suspended)</span>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <a href="#/admin/drivers?status=suspended" class="hover:text-rose-400 font-medium flex items-center gap-1 transition-colors">
                  Review restricted <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                </a>
              </div>
            </div>

            <!-- Total Trips -->
            <div class="glass-card p-5 rounded-2xl relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 text-sm font-medium">Total Trips Handled</span>
                <div class="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                  <i data-lucide="truck" class="w-5 h-5"></i>
                </div>
              </div>
              <div class="mt-4 flex items-baseline gap-2">
                <span class="text-3xl font-extrabold text-white">${stats.total_trips}</span>
                <span class="text-xs text-cyan-400 font-medium">(${stats.active_trips} active now)</span>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Completed trips</span>
                <span class="font-bold text-slate-300">${stats.completed_trips}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Grid: Quick Drivers Table & Recent Activities -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Quick Management Shortcuts & Overview -->
            <div class="lg:col-span-2 glass-panel p-6 rounded-2xl">
              <div class="flex items-center justify-between mb-5">
                <div>
                  <h3 class="text-lg font-bold text-white">Dynamic Driver Management</h3>
                  <p class="text-xs text-slate-400">Manage drivers dynamically without application code edits.</p>
                </div>
                <a href="#/admin/drivers" class="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition-colors border border-indigo-500/30">
                  Open Full Directory &rarr;
                </a>
              </div>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div onclick="AdminView.openCreateDriverModal()" class="p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-all group">
                  <div class="flex items-center gap-3">
                    <div class="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <i data-lucide="user-plus" class="w-6 h-6"></i>
                    </div>
                    <div>
                      <h4 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">Create New Driver Account</h4>
                      <p class="text-xs text-slate-400 mt-0.5">Assign credentials & license details</p>
                    </div>
                  </div>
                </div>

                <div onclick="window.location.hash = '#/admin/drivers'" class="p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-all group">
                  <div class="flex items-center gap-3">
                    <div class="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <i data-lucide="toggle-left" class="w-6 h-6"></i>
                    </div>
                    <div>
                      <h4 class="font-semibold text-white group-hover:text-emerald-300 transition-colors">Activate / Deactivate Accounts</h4>
                      <p class="text-xs text-slate-400 mt-0.5">Instantly adjust driver access</p>
                    </div>
                  </div>
                </div>

                <div onclick="AdminView.openCreateTripModal()" class="p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-all group">
                  <div class="flex items-center gap-3">
                    <div class="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                      <i data-lucide="map-pin" class="w-6 h-6"></i>
                    </div>
                    <div>
                      <h4 class="font-semibold text-white group-hover:text-cyan-300 transition-colors">Assign New Delivery Trip</h4>
                      <p class="text-xs text-slate-400 mt-0.5">Route, cargo, and driver pairing</p>
                    </div>
                  </div>
                </div>

                <div onclick="window.location.hash = '#/admin/logs'" class="p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-all group">
                  <div class="flex items-center gap-3">
                    <div class="p-3 bg-purple-500/20 text-purple-400 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <i data-lucide="shield-check" class="w-6 h-6"></i>
                    </div>
                    <div>
                      <h4 class="font-semibold text-white group-hover:text-purple-300 transition-colors">Security & Audit Logs</h4>
                      <p class="text-xs text-slate-400 mt-0.5">Track account creations & edits</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quick Security Assurance -->
              <div class="mt-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div class="flex items-center gap-2">
                  <i data-lucide="lock" class="w-4 h-4 text-emerald-400"></i>
                  <span>Role-Based Access Control (RBAC) enforced on all database queries & endpoints.</span>
                </div>
                <span class="text-emerald-400 font-medium">Active</span>
              </div>
            </div>

            <!-- Recent Activity Audit Feed -->
            <div class="glass-panel p-6 rounded-2xl flex flex-col">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                  <i data-lucide="history" class="w-4 h-4 text-indigo-400"></i>
                  <span>Recent System Events</span>
                </h3>
                <a href="#/admin/logs" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium">All Logs</a>
              </div>
              <div class="flex-1 space-y-3 overflow-y-auto max-h-[340px] pr-1">
                ${logs.length === 0 ? '<p class="text-xs text-slate-500 py-6 text-center">No logs recorded yet.</p>' : logs.map(l => `
                  <div class="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-semibold text-indigo-300">${this.escape(l.action)}</span>
                      <span class="text-slate-500 font-mono text-[10px]">${l.created_at ? l.created_at.slice(11, 16) : ''}</span>
                    </div>
                    <p class="text-slate-300">${this.escape(l.details || '')}</p>
                    <div class="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span>By <strong class="text-slate-300">${this.escape(l.actor_name)}</strong></span>
                      <span class="px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 uppercase text-[9px]">${l.actor_role}</span>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      container.innerHTML = `
        <div class="p-6 rounded-2xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-center">
          <p class="font-bold">Failed to load dashboard statistics</p>
          <p class="text-sm mt-1">${err.message}</p>
          <button onclick="AdminView.renderDashboard()" class="mt-4 px-4 py-2 bg-rose-800 hover:bg-rose-700 rounded-xl text-white text-xs">Retry</button>
        </div>
      `;
    }
  },

  // Render Full Drivers Management Page
  async renderDrivers(filterStatus = "", searchQuery = "") {
    this.activeFilterStatus = filterStatus;
    this.activeSearchQuery = searchQuery;

    const container = document.getElementById("main-content");
    container.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    `;

    try {
      const data = await API.getDrivers({
        status: this.activeFilterStatus,
        search: this.activeSearchQuery,
        category: this.activeCategory
      });
      const drivers = data.drivers || [];

      container.innerHTML = `
        <div class="animate-fade-in space-y-6">
          <!-- Page Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Driver Directory & Management</span>
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">${drivers.length} drivers</span>
              </h1>
              <p class="text-slate-400 text-sm mt-0.5">Dynamically create, update, activate/deactivate, or delete drivers.</p>
            </div>
            <button onclick="AdminView.openCreateDriverModal()" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto hover:scale-[1.02]">
              <i data-lucide="user-plus" class="w-4 h-4"></i>
              <span>Register New Driver</span>
            </button>
          </div>

          <!-- Filters & Search Toolbar -->
          <div class="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <!-- Search Input -->
            <div class="relative flex-1 max-w-md">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
              <input 
                type="text" 
                id="driver-search-input"
                value="${this.escape(this.activeSearchQuery)}"
                placeholder="Search by Name, Driver ID, License, Vehicle, Phone..." 
                class="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700/70 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                oninput="AdminView.onSearchInput(this.value)"
              >
              ${this.activeSearchQuery ? `
                <button onclick="AdminView.clearSearch()" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                  &times;
                </button>
              ` : ''}
            </div>

            <!-- Status Filter Tabs -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button onclick="AdminView.setFilterStatus('')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!this.activeFilterStatus ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
                All
              </button>
              <button onclick="AdminView.setFilterStatus('active')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${this.activeFilterStatus === 'active' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
                Active
              </button>
              <button onclick="AdminView.setFilterStatus('inactive')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${this.activeFilterStatus === 'inactive' ? 'bg-amber-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
                Inactive
              </button>
              <button onclick="AdminView.setFilterStatus('suspended')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${this.activeFilterStatus === 'suspended' ? 'bg-rose-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
                Suspended
              </button>
            </div>
          </div>

          <!-- Drivers Table Card -->
          <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            ${drivers.length === 0 ? `
              <div class="p-12 text-center">
                <div class="inline-flex p-3 bg-slate-800/80 rounded-2xl text-slate-400 mb-3">
                  <i data-lucide="user-x" class="w-8 h-8"></i>
                </div>
                <h3 class="text-base font-semibold text-white">No drivers found</h3>
                <p class="text-xs text-slate-400 mt-1">Try adjusting your search criteria or register a new driver account.</p>
                <button onclick="AdminView.openCreateDriverModal()" class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-medium text-white inline-flex items-center gap-2">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> Register Driver
                </button>
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm text-slate-300">
                  <thead class="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th class="py-3.5 px-4">Driver Profile</th>
                      <th class="py-3.5 px-4">Unique Driver ID</th>
                      <th class="py-3.5 px-4">Contact Info</th>
                      <th class="py-3.5 px-4">License & Expiry</th>
                      <th class="py-3.5 px-4">Vehicle Assigned</th>
                      <th class="py-3.5 px-4">Account Status</th>
                      <th class="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/70">
                    ${drivers.map(d => this.renderDriverTableRow(d)).join("")}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      container.innerHTML = `
        <div class="p-6 rounded-2xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-center">
          <p class="font-bold">Failed to load drivers</p>
          <p class="text-sm mt-1">${err.message}</p>
        </div>
      `;
    }
  },

  renderDriverTableRow(d) {
    const statusColors = {
      active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      inactive: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      suspended: "bg-rose-500/10 text-rose-400 border-rose-500/30"
    };

    // Calculate license expiry warning
    const now = new Date();
    const expiry = new Date(d.license_expiry);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    let licenseTag = `<span class="text-xs text-slate-400">${d.license_expiry || 'N/A'}</span>`;
    if (diffDays <= 0) {
      licenseTag = `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">Expired (${d.license_expiry})</span>`;
    } else if (diffDays <= 30) {
      licenseTag = `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">${diffDays}d left (${d.license_expiry})</span>`;
    }

    return `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <!-- Driver Profile -->
        <td class="py-4 px-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold text-sm shadow">
              ${d.full_name ? d.full_name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div>
              <div class="font-semibold text-white hover:text-indigo-300 cursor-pointer" onclick="AdminView.openDriverDetailModal(${d.id})">
                ${this.escape(d.full_name || 'Unnamed')}
              </div>
              <div class="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>★ ${d.rating ? d.rating.toFixed(1) : '5.0'}</span>
                <span>•</span>
                <span>${d.total_trips || 0} trips</span>
              </div>
            </div>
          </div>
        </td>

        <!-- Driver ID -->
        <td class="py-4 px-4 font-mono">
          <div class="flex items-center gap-1.5">
            <span class="px-2 py-1 bg-slate-900 text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-500/20">
              ${d.driver_id || 'N/A'}
            </span>
            <button onclick="navigator.clipboard.writeText('${d.driver_id}'); App.showToast('Copied Driver ID!', 'info')" title="Copy ID" class="text-slate-500 hover:text-slate-300 p-1">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>

        <!-- Contact Info -->
        <td class="py-4 px-4">
          <div class="text-xs text-white font-medium">${this.escape(d.email)}</div>
          <div class="text-xs text-slate-400 mt-0.5">${this.escape(d.phone || 'No phone')}</div>
        </td>

        <!-- License & Expiry -->
        <td class="py-4 px-4">
          <div class="text-xs text-slate-200 font-mono font-medium">${this.escape(d.license_number)}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${this.escape(d.license_category)}</div>
          <div class="mt-1">${licenseTag}</div>
        </td>

        <!-- Vehicle Assigned -->
        <td class="py-4 px-4">
          ${d.assigned_vehicle ? `
            <div class="text-xs text-white font-medium">${this.escape(d.assigned_vehicle)}</div>
            <div class="text-[11px] font-mono text-slate-400 mt-0.5">${this.escape(d.vehicle_plate || '')}</div>
          ` : `
            <span class="text-xs text-slate-500 italic">Unassigned</span>
          `}
        </td>

        <!-- Account Status -->
        <td class="py-4 px-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${statusColors[d.status] || statusColors.active}">
            <span class="w-1.5 h-1.5 rounded-full ${d.status === 'active' ? 'bg-emerald-400' : d.status === 'suspended' ? 'bg-rose-400' : 'bg-slate-400'}"></span>
            ${d.status}
          </span>
        </td>

        <!-- Actions -->
        <td class="py-4 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <!-- View Details -->
            <button onclick="AdminView.openDriverDetailModal(${d.id})" title="View Complete Record" class="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            <!-- Edit Details -->
            <button onclick="AdminView.openEditDriverModal(${d.id})" title="Edit Driver" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <!-- Toggle Status -->
            <button onclick="AdminView.toggleDriverStatus(${d.id}, '${d.status}', '${this.escape(d.full_name)}')" title="Change Status" class="p-1.5 bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700">
              <i data-lucide="power" class="w-4 h-4"></i>
            </button>
            <!-- Reset Password -->
            <button onclick="AdminView.openResetPasswordModal(${d.id}, '${d.driver_id}')" title="Reset Password" class="p-1.5 bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700">
              <i data-lucide="key" class="w-4 h-4"></i>
            </button>
            <!-- Delete Driver -->
            <button onclick="AdminView.confirmDeleteDriver(${d.id}, '${this.escape(d.full_name)}', '${d.driver_id}')" title="Delete Driver Account" class="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  onSearchInput(val) {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.renderDrivers(this.activeFilterStatus, val);
    }, 300);
  },

  clearSearch() {
    this.renderDrivers(this.activeFilterStatus, "");
  },

  setFilterStatus(status) {
    this.renderDrivers(status, this.activeSearchQuery);
  },

  // Dynamic Driver Creation Modal
  openCreateDriverModal() {
    const modalContainer = document.getElementById("modal-container");
    const autoId = "DRV-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto modal-backdrop">
        <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in my-8">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <h3 class="text-xl font-bold text-white flex items-center gap-2">
                <i data-lucide="user-plus" class="w-5 h-5 text-indigo-400"></i>
                <span>Register New Driver Account</span>
              </h3>
              <p class="text-xs text-slate-400 mt-1">This dynamically provisions a unique Driver ID and personal portal login.</p>
            </div>
            <button onclick="AdminView.closeModal()" class="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <!-- Form -->
          <form id="create-driver-form" onsubmit="AdminView.submitCreateDriver(event)" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Full Name -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name *</label>
                <input type="text" name="full_name" required placeholder="e.g. Jordan Hayes" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>

              <!-- Driver ID -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-semibold text-slate-300">Unique Driver ID *</label>
                  <button type="button" onclick="document.getElementById('new-driver-id').value='${autoId}'" class="text-[11px] text-indigo-400 hover:text-indigo-300">Auto-Generate</button>
                </div>
                <input type="text" id="new-driver-id" name="driver_id" value="${autoId}" required placeholder="DRV-2026-XXXX" class="w-full font-mono px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-indigo-300 font-bold focus:outline-none focus:border-indigo-500">
              </div>

              <!-- Email -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                <input type="email" name="email" required placeholder="driver@fleet.com" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>

              <!-- Phone -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Mobile Phone Number *</label>
                <input type="tel" name="phone" required placeholder="+1 (555) 000-0000" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>

              <!-- Initial Password -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Driver Login Password *</label>
                <input type="password" name="password" required value="Driver@123" placeholder="Min 6 characters" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                <span class="text-[10px] text-slate-500">Default: Driver@123 (Driver can change later)</span>
              </div>

              <!-- Initial Status -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Account Status</label>
                <select name="status" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="active">Active (Immediate Dispatch)</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <!-- License Number -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Driver License Number *</label>
                <input type="text" name="license_number" required placeholder="DL-8849201" class="w-full font-mono px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>

              <!-- License Category -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">License Class / Category</label>
                <select name="license_category" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="Class B - Passenger Vehicle / Van">Class B - Passenger Vehicle / Van</option>
                  <option value="Class A - Commercial Heavy">Class A - Commercial Heavy Semi</option>
                  <option value="Class C - Standard Sedan / Light">Class C - Standard Sedan / Light</option>
                  <option value="Class D - Specialized Cargo">Class D - Specialized Cargo</option>
                  <option value="Motorcycle / Delivery Fleet">Motorcycle / Delivery Fleet</option>
                </select>
              </div>

              <!-- License Expiration Date -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">License Expiry Date *</label>
                <input type="date" name="license_expiry" required class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>

              <!-- Assigned Vehicle -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Assigned Vehicle (Optional)</label>
                <input type="text" name="assigned_vehicle" placeholder="e.g. Ford Transit Cargo Van #402" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>

              <!-- Vehicle Plate -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Vehicle License Plate</label>
                <input type="text" name="vehicle_plate" placeholder="e.g. NY-VAN-402" class="w-full font-mono px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>

              <!-- Experience Years -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Years of Driving Experience</label>
                <input type="number" name="experience_years" value="3" min="0" max="50" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>
            </div>

            <!-- Emergency Contact -->
            <div class="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Emergency Contact Name</label>
                <input type="text" name="emergency_contact_name" placeholder="e.g. Mary Hayes (Spouse)" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Emergency Contact Phone</label>
                <input type="tel" name="emergency_contact_phone" placeholder="+1 (555) 999-1234" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>
            </div>

            <!-- Address -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Residential Address</label>
              <input type="text" name="address" placeholder="123 Fleet Way, Apt 4B, New York, NY" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button type="button" onclick="AdminView.closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium">Cancel</button>
              <button type="submit" id="btn-submit-driver" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                <span>Create Driver Account</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  async submitCreateDriver(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-driver");
    btn.disabled = true;
    btn.innerHTML = `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Creating...`;

    const form = e.target;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await API.createDriver(payload);
      App.showToast(res.message || "Driver account successfully registered!", "success");
      AdminView.closeModal();
      // Reload current view
      if (window.location.hash.includes("drivers")) {
        AdminView.renderDrivers(AdminView.activeFilterStatus, AdminView.activeSearchQuery);
      } else {
        AdminView.renderDashboard();
      }
    } catch (err) {
      App.showToast(err.message, "error");
      btn.disabled = false;
      btn.innerHTML = `<span>Create Driver Account</span>`;
    }
  },

  // Edit Driver Modal
  async openEditDriverModal(driverId) {
    try {
      const data = await API.getDriverDetail(driverId);
      const d = data.driver;
      const modalContainer = document.getElementById("modal-container");

      modalContainer.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto modal-backdrop">
          <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in my-8">
            <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                  <i data-lucide="edit-3" class="w-5 h-5 text-indigo-400"></i>
                  <span>Edit Driver: ${this.escape(d.full_name)}</span>
                </h3>
                <p class="text-xs text-slate-400 mt-1 font-mono">Driver ID: ${d.driver_id}</p>
              </div>
              <button onclick="AdminView.closeModal()" class="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <form onsubmit="AdminView.submitUpdateDriver(event, ${driverId})" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name *</label>
                  <input type="text" name="full_name" required value="${this.escape(d.full_name)}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                  <input type="email" name="email" required value="${this.escape(d.email)}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Phone *</label>
                  <input type="tel" name="phone" required value="${this.escape(d.phone)}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select name="status" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="active" ${d.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${d.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    <option value="suspended" ${d.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">License Number *</label>
                  <input type="text" name="license_number" required value="${this.escape(d.license_number)}" class="w-full font-mono px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">License Category</label>
                  <select name="license_category" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="Class B - Passenger Vehicle / Van" ${d.license_category === 'Class B - Passenger Vehicle / Van' ? 'selected' : ''}>Class B - Passenger Vehicle / Van</option>
                    <option value="Class A - Commercial Heavy" ${d.license_category === 'Class A - Commercial Heavy' ? 'selected' : ''}>Class A - Commercial Heavy</option>
                    <option value="Class C - Standard Sedan / Light" ${d.license_category === 'Class C - Standard Sedan / Light' ? 'selected' : ''}>Class C - Standard Sedan / Light</option>
                    <option value="Class D - Specialized Cargo" ${d.license_category === 'Class D - Specialized Cargo' ? 'selected' : ''}>Class D - Specialized Cargo</option>
                    <option value="Motorcycle / Delivery Fleet" ${d.license_category === 'Motorcycle / Delivery Fleet' ? 'selected' : ''}>Motorcycle / Delivery Fleet</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">License Expiry Date *</label>
                  <input type="date" name="license_expiry" required value="${d.license_expiry}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Assigned Vehicle</label>
                  <input type="text" name="assigned_vehicle" value="${this.escape(d.assigned_vehicle || '')}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Vehicle Plate</label>
                  <input type="text" name="vehicle_plate" value="${this.escape(d.vehicle_plate || '')}" class="w-full font-mono px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Experience Years</label>
                  <input type="number" name="experience_years" value="${d.experience_years || 1}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
              </div>

              <div class="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Emergency Contact</label>
                  <input type="text" name="emergency_contact_name" value="${this.escape(d.emergency_contact_name || '')}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Emergency Phone</label>
                  <input type="tel" name="emergency_contact_phone" value="${this.escape(d.emergency_contact_phone || '')}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Address</label>
                <input type="text" name="address" value="${this.escape(d.address || '')}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onclick="AdminView.closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium">Cancel</button>
                <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/30">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      App.showToast("Failed to fetch driver info: " + err.message, "error");
    }
  },

  async submitUpdateDriver(e, driverId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await API.updateDriver(driverId, payload);
      App.showToast(res.message, "success");
      AdminView.closeModal();
      AdminView.renderDrivers(AdminView.activeFilterStatus, AdminView.activeSearchQuery);
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  // Toggle Driver Status
  async toggleDriverStatus(driverId, currentStatus, driverName) {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    if (!confirm(`Are you sure you want to change status of ${driverName} to "${nextStatus.toUpperCase()}"?`)) return;

    try {
      const res = await API.setDriverStatus(driverId, nextStatus);
      App.showToast(res.message, "success");
      AdminView.renderDrivers(AdminView.activeFilterStatus, AdminView.activeSearchQuery);
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  // Reset Password Modal
  openResetPasswordModal(driverId, driverCode) {
    const modalContainer = document.getElementById("modal-container");
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
        <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in">
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="key" class="w-5 h-5 text-purple-400"></i>
                <span>Reset Driver Password</span>
              </h3>
              <p class="text-xs text-slate-400 mt-0.5 font-mono">Driver ID: ${driverCode}</p>
            </div>
            <button onclick="AdminView.closeModal()" class="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="AdminView.submitResetPassword(event, ${driverId})" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">New Password (Min 6 chars) *</label>
              <input type="text" name="new_password" required minlength="6" value="Driver@2026" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono">
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button type="button" onclick="AdminView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-lg shadow-purple-600/30">Set Password</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  },

  async submitResetPassword(e, driverId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newPassword = formData.get("new_password");

    try {
      const res = await API.resetDriverPassword(driverId, newPassword);
      App.showToast(res.message, "success");
      AdminView.closeModal();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  // Confirm Delete Driver
  async confirmDeleteDriver(driverId, driverName, driverCode) {
    if (!confirm(`CAUTION: Are you sure you want to permanently delete driver ${driverName} (${driverCode})?\n\nThis will also remove all associated trip logs and documents.`)) {
      return;
    }

    try {
      const res = await API.deleteDriver(driverId);
      App.showToast(res.message, "success");
      AdminView.renderDrivers(AdminView.activeFilterStatus, AdminView.activeSearchQuery);
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  // View Driver Dossier / Full Record Modal
  async openDriverDetailModal(driverId) {
    try {
      const data = await API.getDriverDetail(driverId);
      const d = data.driver;
      const trips = data.trips || [];
      const documents = data.documents || [];
      const logs = data.activity_logs || [];
      const modalContainer = document.getElementById("modal-container");

      modalContainer.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto modal-backdrop">
          <div class="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in my-8 max-h-[90vh] flex flex-col">
            <!-- Modal Header -->
            <div class="flex items-start justify-between border-b border-slate-800 pb-5 mb-5 flex-shrink-0">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl">
                  ${d.full_name ? d.full_name.charAt(0).toUpperCase() : 'D'}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h2 class="text-2xl font-bold text-white">${this.escape(d.full_name)}</h2>
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${d.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                      ${d.status}
                    </span>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                    <span class="text-indigo-400 font-bold">${d.driver_id}</span>
                    <span>•</span>
                    <span>Joined: ${d.joining_date || 'Recent'}</span>
                    <span>•</span>
                    <span>★ ${d.rating ? d.rating.toFixed(1) : '5.0'} (${d.total_trips || 0} trips)</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="AdminView.openEditDriverModal(${d.id})" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5">
                  <i data-lucide="edit" class="w-3.5 h-3.5"></i> Edit
                </button>
                <button onclick="AdminView.closeModal()" class="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800">
                  <i data-lucide="x" class="w-5 h-5"></i>
                </button>
              </div>
            </div>

            <!-- Modal Body (Scrollable) -->
            <div class="overflow-y-auto space-y-6 flex-1 pr-1">
              <!-- Grid: Profile Info & Vehicle -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Contact & License -->
                <div class="md:col-span-2 p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Driver Credentials & Contact</h4>
                  <div class="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span class="text-slate-500">Email:</span>
                      <p class="font-medium text-white">${this.escape(d.email)}</p>
                    </div>
                    <div>
                      <span class="text-slate-500">Phone:</span>
                      <p class="font-medium text-white">${this.escape(d.phone)}</p>
                    </div>
                    <div>
                      <span class="text-slate-500">License Number:</span>
                      <p class="font-medium font-mono text-indigo-300">${this.escape(d.license_number)}</p>
                    </div>
                    <div>
                      <span class="text-slate-500">License Expiration:</span>
                      <p class="font-medium text-amber-300">${d.license_expiry}</p>
                    </div>
                    <div>
                      <span class="text-slate-500">Category:</span>
                      <p class="font-medium text-white">${this.escape(d.license_category)}</p>
                    </div>
                    <div>
                      <span class="text-slate-500">Experience:</span>
                      <p class="font-medium text-white">${d.experience_years} years</p>
                    </div>
                  </div>
                  <div class="pt-2 border-t border-slate-800/80 text-xs">
                    <span class="text-slate-500">Residential Address:</span>
                    <p class="font-medium text-slate-300">${this.escape(d.address || 'Not registered')}</p>
                  </div>
                  <div class="text-xs">
                    <span class="text-slate-500">Emergency Contact:</span>
                    <p class="font-medium text-slate-300">${this.escape(d.emergency_contact_name || 'N/A')} (${this.escape(d.emergency_contact_phone || 'N/A')})</p>
                  </div>
                </div>

                <!-- Assigned Vehicle -->
                <div class="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Vehicle Assignment</h4>
                    <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 text-center">
                      <div class="w-10 h-10 mx-auto rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2">
                        <i data-lucide="truck" class="w-5 h-5"></i>
                      </div>
                      <h5 class="text-sm font-bold text-white">${this.escape(d.assigned_vehicle || 'No vehicle assigned')}</h5>
                      <p class="text-xs font-mono text-indigo-300 mt-1">${this.escape(d.vehicle_plate || 'No plate registered')}</p>
                    </div>
                  </div>
                  <div class="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>Total Distance Covered</span>
                    <span class="font-bold text-white font-mono">${(d.total_distance_km || 0).toFixed(1)} km</span>
                  </div>
                </div>
              </div>

              <!-- Trips Records Section -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-sm font-bold text-white flex items-center gap-2">
                    <i data-lucide="navigation" class="w-4 h-4 text-cyan-400"></i>
                    <span>Assigned Trip Records (${trips.length})</span>
                  </h4>
                  <button onclick="AdminView.openCreateTripModal(${d.id})" class="text-xs px-2.5 py-1 bg-cyan-600/20 text-cyan-300 rounded-lg hover:bg-cyan-600/30 transition-colors border border-cyan-500/30">
                    + Assign Trip
                  </button>
                </div>

                <div class="glass-card rounded-xl overflow-hidden border border-slate-800">
                  ${trips.length === 0 ? `
                    <p class="p-6 text-xs text-slate-500 text-center">No trips currently assigned to this driver.</p>
                  ` : `
                    <div class="overflow-x-auto">
                      <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-900/60 font-semibold text-slate-400 border-b border-slate-800">
                          <tr>
                            <th class="py-2.5 px-3">Trip Code</th>
                            <th class="py-2.5 px-3">Route (Origin &rarr; Destination)</th>
                            <th class="py-2.5 px-3">Date</th>
                            <th class="py-2.5 px-3">Distance</th>
                            <th class="py-2.5 px-3">Earnings</th>
                            <th class="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                          ${trips.map(t => `
                            <tr>
                              <td class="py-2.5 px-3 font-mono font-bold text-indigo-300">${t.trip_code}</td>
                              <td class="py-2.5 px-3">
                                <span class="text-white">${this.escape(t.origin)}</span>
                                <span class="text-slate-500 mx-1">&rarr;</span>
                                <span class="text-white">${this.escape(t.destination)}</span>
                              </td>
                              <td class="py-2.5 px-3 text-slate-400">${t.start_time ? t.start_time.slice(0, 16) : ''}</td>
                              <td class="py-2.5 px-3 font-mono">${t.distance_km || 0} km</td>
                              <td class="py-2.5 px-3 font-mono text-emerald-400">$${(t.earnings || 0).toFixed(2)}</td>
                              <td class="py-2.5 px-3">
                                <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                                  t.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700 text-slate-300'
                                }">
                                  ${t.status}
                                </span>
                              </td>
                            </tr>
                          `).join("")}
                        </tbody>
                      </table>
                    </div>
                  `}
                </div>
              </div>

              <!-- Documents Section -->
              <div>
                <h4 class="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <i data-lucide="file-check" class="w-4 h-4 text-emerald-400"></i>
                  <span>Compliance & Certifications</span>
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  ${documents.map(doc => `
                    <div class="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
                      <div>
                        <div class="font-semibold text-white">${this.escape(doc.doc_type)}</div>
                        <div class="font-mono text-slate-400 text-[11px] mt-0.5">${this.escape(doc.doc_number)}</div>
                        <div class="text-slate-500 text-[10px] mt-0.5">Expires: ${doc.expiry_date}</div>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/20 text-emerald-300">
                        ${doc.status}
                      </span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      App.showToast("Failed to load driver details: " + err.message, "error");
    }
  },

  // Assign Trip Modal
  async openCreateTripModal(preselectedDriverId = null) {
    try {
      const driversRes = await API.getDrivers({ status: "active" });
      const activeDrivers = driversRes.drivers || [];
      const modalContainer = document.getElementById("modal-container");

      modalContainer.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div class="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in">
            <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                  <i data-lucide="navigation" class="w-5 h-5 text-cyan-400"></i>
                  <span>Assign New Trip</span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">Schedule a delivery or transport mission for a driver.</p>
              </div>
              <button onclick="AdminView.closeModal()" class="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <form onsubmit="AdminView.submitCreateTrip(event)" class="space-y-4">
              <!-- Select Driver -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Select Driver *</label>
                <select name="driver_id" required class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="">-- Choose active driver --</option>
                  ${activeDrivers.map(d => `
                    <option value="${d.id}" ${preselectedDriverId === d.id ? 'selected' : ''}>
                      ${this.escape(d.full_name)} (${d.driver_id}) - ${this.escape(d.assigned_vehicle || 'No vehicle')}
                    </option>
                  `).join("")}
                </select>
              </div>

              <!-- Origin & Destination -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Origin *</label>
                  <input type="text" name="origin" required placeholder="e.g. Central Terminal" class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Destination *</label>
                  <input type="text" name="destination" required placeholder="e.g. North Depot" class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500">
                </div>
              </div>

              <!-- Distance & Earnings -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Estimated Distance (km)</label>
                  <input type="number" step="0.1" name="distance_km" value="35.0" class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Driver Earnings ($)</label>
                  <input type="number" step="1" name="earnings" value="120" class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-indigo-500 font-mono">
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Delivery Notes / Instructions</label>
                <input type="text" name="notes" placeholder="e.g. Priority delivery. Check seal upon arrival." class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500">
              </div>

              <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onclick="AdminView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium shadow-lg shadow-cyan-600/30">Assign Trip</button>
              </div>
            </form>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  async submitCreateTrip(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await API.createTrip(payload);
      App.showToast(res.message, "success");
      AdminView.closeModal();
      if (window.location.hash.includes("trips")) {
        AdminView.renderTrips();
      }
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  // Render Trips Page
  async renderTrips() {
    const container = document.getElementById("main-content");
    container.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    `;

    try {
      const data = await API.getAdminTrips();
      const trips = data.trips || [];

      container.innerHTML = `
        <div class="animate-fade-in space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Fleet Trips & Assignments</span>
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">${trips.length} trips</span>
              </h1>
              <p class="text-slate-400 text-sm mt-0.5">Overview and management of all logistics trips.</p>
            </div>
            <button onclick="AdminView.openCreateTripModal()" class="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-cyan-600/20">
              <i data-lucide="navigation" class="w-4 h-4"></i>
              <span>Assign New Trip</span>
            </button>
          </div>

          <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            ${trips.length === 0 ? `
              <p class="p-12 text-center text-slate-500 text-sm">No trips recorded yet in the system.</p>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm text-slate-300">
                  <thead class="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th class="py-3 px-4">Trip Code</th>
                      <th class="py-3 px-4">Assigned Driver</th>
                      <th class="py-3 px-4">Route</th>
                      <th class="py-3 px-4">Distance & Earnings</th>
                      <th class="py-3 px-4">Timestamp</th>
                      <th class="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/70">
                    ${trips.map(t => `
                      <tr class="hover:bg-slate-800/40">
                        <td class="py-3.5 px-4 font-mono font-bold text-indigo-300">${t.trip_code}</td>
                        <td class="py-3.5 px-4">
                          <div class="font-medium text-white">${this.escape(t.driver_name)}</div>
                          <div class="text-xs font-mono text-indigo-400">${t.driver_code}</div>
                        </td>
                        <td class="py-3.5 px-4 text-xs">
                          <div class="font-medium text-slate-200">${this.escape(t.origin)}</div>
                          <div class="text-slate-500 text-[11px]">&darr; ${this.escape(t.destination)}</div>
                        </td>
                        <td class="py-3.5 px-4 font-mono text-xs">
                          <div>${t.distance_km || 0} km</div>
                          <div class="text-emerald-400 font-bold">$${(t.earnings || 0).toFixed(2)}</div>
                        </td>
                        <td class="py-3.5 px-4 text-xs text-slate-400">${t.start_time ? t.start_time.slice(0, 16) : ''}</td>
                        <td class="py-3.5 px-4">
                          <span class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                            t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            t.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            'bg-slate-700 text-slate-300'
                          }">
                            ${t.status}
                          </span>
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  // Render Audit Logs Page
  async renderLogs() {
    const container = document.getElementById("main-content");
    container.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    `;

    try {
      const data = await API.getAuditLogs(100);
      const logs = data.logs || [];

      container.innerHTML = `
        <div class="animate-fade-in space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <i data-lucide="shield" class="w-6 h-6 text-purple-400"></i>
                <span>System Security & Audit Trail</span>
              </h1>
              <p class="text-slate-400 text-sm mt-0.5">Immutable record of driver creations, status modifications, and logins.</p>
            </div>
          </div>

          <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-900/80 font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th class="py-3 px-4">Timestamp</th>
                    <th class="py-3 px-4">Actor</th>
                    <th class="py-3 px-4">Action</th>
                    <th class="py-3 px-4">Details</th>
                    <th class="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/70">
                  ${logs.map(l => `
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-3 px-4 font-mono text-slate-400">${l.created_at}</td>
                      <td class="py-3 px-4">
                        <span class="font-bold text-white">${this.escape(l.actor_name)}</span>
                        <span class="ml-1.5 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 uppercase">${l.actor_role}</span>
                      </td>
                      <td class="py-3 px-4 font-mono font-bold text-indigo-300">${this.escape(l.action)}</td>
                      <td class="py-3 px-4 text-slate-300">${this.escape(l.details || '')}</td>
                      <td class="py-3 px-4 font-mono text-slate-500">${l.ip_address || '127.0.0.1'}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  closeModal() {
    document.getElementById("modal-container").innerHTML = "";
  },

  escape(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

window.AdminView = AdminView;
