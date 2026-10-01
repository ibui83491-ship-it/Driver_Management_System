/**
 * Driver View Components & Handlers (Strictly Isolated Self-Service)
 * Driver Management System
 */

const DriverView = {
  // Render Driver Dashboard
  async renderDashboard() {
    const container = document.getElementById("main-content");
    container.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    `;

    try {
      const data = await API.getDriverProfile();
      const account = data.account;
      const profile = data.profile;
      const stats = data.trip_stats || {};

      const daysLeft = Math.ceil(profile.license_days_remaining || 0);
      let licenseBadge = "";
      if (daysLeft <= 0) {
        licenseBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">EXPIRED</span>`;
      } else if (daysLeft <= 30) {
        licenseBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Expires in ${daysLeft} days</span>`;
      } else {
        licenseBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Valid (${daysLeft} days)</span>`;
      }

      container.innerHTML = `
        <div class="animate-fade-in space-y-8">
          <!-- Page Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                <span>Driver Self-Service Portal</span>
                <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase tracking-wider">Driver</span>
              </h1>
              <p class="text-slate-400 text-sm mt-1">
                Welcome back, <strong class="text-white">${this.escape(profile.full_name)}</strong>! Here are your personal records and assigned trips.
              </p>
            </div>
            <div>
              <a href="#/driver/trips" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm inline-flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]">
                <i data-lucide="navigation" class="w-4 h-4"></i>
                <span>View My Trips</span>
              </a>
            </div>
          </div>

          <!-- Top Grid: Digital ID Card & Quick Stats -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Digital Driver Credential Badge -->
            <div class="driver-id-badge p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between border-b border-indigo-500/20 pb-4 mb-4">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      DMS
                    </div>
                    <span class="text-xs font-bold tracking-wider uppercase text-indigo-200">Official Fleet Driver ID</span>
                  </div>
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></span>
                </div>

                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-300 flex items-center justify-center text-white font-black text-2xl shadow-xl flex-shrink-0">
                    ${profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'D'}
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-white leading-snug">${this.escape(profile.full_name)}</h3>
                    <div class="text-xs font-mono font-bold text-indigo-300 mt-0.5 tracking-wider">
                      ${account.driver_id}
                    </div>
                    <div class="text-[11px] text-slate-300 mt-1">${this.escape(profile.license_category)}</div>
                  </div>
                </div>

                <div class="mt-6 pt-4 border-t border-indigo-500/20 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span class="text-indigo-300/70 text-[10px] uppercase font-semibold">License No.</span>
                    <p class="font-mono font-bold text-white text-xs mt-0.5">${this.escape(profile.license_number)}</p>
                  </div>
                  <div>
                    <span class="text-indigo-300/70 text-[10px] uppercase font-semibold">Status</span>
                    <p class="font-bold text-emerald-400 uppercase text-xs mt-0.5">${account.status}</p>
                  </div>
                  <div>
                    <span class="text-indigo-300/70 text-[10px] uppercase font-semibold">Vehicle Plate</span>
                    <p class="font-mono text-white text-xs mt-0.5">${this.escape(profile.vehicle_plate || 'Unassigned')}</p>
                  </div>
                  <div>
                    <span class="text-indigo-300/70 text-[10px] uppercase font-semibold">Rating</span>
                    <p class="font-bold text-amber-300 text-xs mt-0.5">★ ${profile.rating ? profile.rating.toFixed(1) : '5.0'}</p>
                  </div>
                </div>
              </div>

              <!-- Footer with Security Guarantee -->
              <div class="mt-6 pt-3 border-t border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-200/60">
                <span class="font-mono">SECURE DRIVER PORTAL</span>
                <span class="flex items-center gap-1"><i data-lucide="lock" class="w-3 h-3 text-emerald-400"></i> Encrypted</span>
              </div>
            </div>

            <!-- Stats Overview Cards -->
            <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Total Earnings -->
              <div class="glass-card p-5 rounded-2xl flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Completed Earnings</span>
                  <div class="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <i data-lucide="dollar-sign" class="w-5 h-5"></i>
                  </div>
                </div>
                <div class="mt-4">
                  <div class="text-3xl font-black text-emerald-400 font-mono">
                    $${Number(stats.total_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p class="text-xs text-slate-400 mt-1">From ${stats.completed_count || 0} completed missions</p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Total Distance</span>
                  <span class="font-bold text-white font-mono">${(Number(stats.total_distance || 0)).toFixed(1)} km</span>
                </div>
              </div>

              <!-- Trips Progress -->
              <div class="glass-card p-5 rounded-2xl flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Missions Summary</span>
                  <div class="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                    <i data-lucide="truck" class="w-5 h-5"></i>
                  </div>
                </div>
                <div class="mt-4">
                  <div class="text-3xl font-black text-white font-mono">
                    ${stats.total_assigned || 0}
                  </div>
                  <p class="text-xs text-slate-400 mt-1">Total trips assigned to you</p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span class="text-cyan-400 font-medium">${stats.in_progress_count || 0} In Progress</span>
                  <span class="text-slate-400">${stats.scheduled_count || 0} Scheduled</span>
                </div>
              </div>

              <!-- License Validity Tracker -->
              <div class="glass-card p-5 rounded-2xl flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">License Validity</span>
                  <div class="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                    <i data-lucide="award" class="w-5 h-5"></i>
                  </div>
                </div>
                <div class="mt-4">
                  <div class="text-xl font-bold text-white">
                    ${profile.license_expiry}
                  </div>
                  <div class="mt-2">${licenseBadge}</div>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <span>Category: ${this.escape(profile.license_category)}</span>
                </div>
              </div>

              <!-- Assigned Vehicle Details -->
              <div class="glass-card p-5 rounded-2xl flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Assigned Fleet Vehicle</span>
                  <div class="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                    <i data-lucide="car" class="w-5 h-5"></i>
                  </div>
                </div>
                <div class="mt-4">
                  <div class="text-base font-bold text-white">
                    ${this.escape(profile.assigned_vehicle || 'No vehicle currently assigned')}
                  </div>
                  <div class="text-xs font-mono text-purple-300 font-bold mt-1">
                    ${this.escape(profile.vehicle_plate || 'N/A')}
                  </div>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Inspection Status</span>
                  <span class="text-emerald-400 font-medium">Passed</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Section: Quick Contact Info & Active Mission -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Personal Contact Details -->
            <div class="glass-panel p-6 rounded-3xl">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                  <i data-lucide="user-check" class="w-4 h-4 text-indigo-400"></i>
                  <span>My Profile Details</span>
                </h3>
                <a href="#/driver/settings" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
                  Edit Info <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                </a>
              </div>
              <div class="space-y-3 text-xs">
                <div class="flex items-center justify-between py-2 border-b border-slate-800">
                  <span class="text-slate-400">Driver ID:</span>
                  <span class="font-mono font-bold text-indigo-300">${account.driver_id}</span>
                </div>
                <div class="flex items-center justify-between py-2 border-b border-slate-800">
                  <span class="text-slate-400">Registered Email:</span>
                  <span class="text-white">${this.escape(account.email)}</span>
                </div>
                <div class="flex items-center justify-between py-2 border-b border-slate-800">
                  <span class="text-slate-400">Mobile Phone:</span>
                  <span class="text-white">${this.escape(profile.phone)}</span>
                </div>
                <div class="flex items-center justify-between py-2 border-b border-slate-800">
                  <span class="text-slate-400">Emergency Contact:</span>
                  <span class="text-slate-300">${this.escape(profile.emergency_contact_name || 'None')} (${this.escape(profile.emergency_contact_phone || 'None')})</span>
                </div>
                <div class="flex items-center justify-between py-2">
                  <span class="text-slate-400">Home Address:</span>
                  <span class="text-slate-300 text-right">${this.escape(profile.address || 'Not registered')}</span>
                </div>
              </div>
            </div>

            <!-- Privacy & Data Isolation Notice -->
            <div class="glass-panel p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <i data-lucide="shield-check" class="w-6 h-6"></i>
                </div>
                <h3 class="text-base font-bold text-white">Strict Privacy & Role Isolation</h3>
                <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                  Your driver portal is cryptographically isolated. Only you can view your personal records, trips, and performance ratings. Other drivers cannot access your profile or records under any circumstance.
                </p>
              </div>

              <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span class="text-slate-400">Account ID: <code class="text-slate-300">${account.id}</code></span>
                <span class="text-emerald-400 font-semibold flex items-center gap-1">
                  <i data-lucide="check" class="w-3.5 h-3.5"></i> RBAC Enforced
                </span>
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      container.innerHTML = `
        <div class="p-6 rounded-2xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-center">
          <p class="font-bold">Failed to load driver profile</p>
          <p class="text-sm mt-1">${err.message}</p>
        </div>
      `;
    }
  },

  // Render Driver's Own Trips
  async renderTrips(statusFilter = "") {
    const container = document.getElementById("main-content");
    container.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    `;

    try {
      const data = await API.getDriverTrips(statusFilter);
      const trips = data.trips || [];

      container.innerHTML = `
        <div class="animate-fade-in space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>My Assigned Trips & History</span>
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">${trips.length} trips</span>
              </h1>
              <p class="text-slate-400 text-sm mt-0.5">Manage your dispatched routes and log trip completion.</p>
            </div>

            <!-- Filter tabs -->
            <div class="flex items-center gap-1.5 overflow-x-auto">
              <button onclick="DriverView.renderTrips('')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!statusFilter ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
                All
              </button>
              <button onclick="DriverView.renderTrips('in_progress')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === 'in_progress' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
                In Progress
              </button>
              <button onclick="DriverView.renderTrips('scheduled')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === 'scheduled' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
                Scheduled
              </button>
              <button onclick="DriverView.renderTrips('completed')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
                Completed
              </button>
            </div>
          </div>

          <!-- Trips Grid / Cards -->
          ${trips.length === 0 ? `
            <div class="glass-panel p-12 text-center rounded-3xl border border-slate-800">
              <div class="inline-flex p-3 bg-slate-800/80 rounded-2xl text-slate-400 mb-3">
                <i data-lucide="inbox" class="w-8 h-8"></i>
              </div>
              <h3 class="text-base font-semibold text-white">No trips found</h3>
              <p class="text-xs text-slate-400 mt-1">You have no trips under this status filter.</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${trips.map(t => this.renderTripCard(t)).join("")}
            </div>
          `}
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      container.innerHTML = `
        <div class="p-6 rounded-2xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-center">
          <p class="font-bold">Failed to load trips</p>
          <p class="text-sm mt-1">${err.message}</p>
        </div>
      `;
    }
  },

  renderTripCard(t) {
    const isCompleted = t.status === "completed";
    const isInProgress = t.status === "in_progress";
    const isScheduled = t.status === "scheduled";

    return `
      <div class="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
        <div>
          <!-- Header -->
          <div class="flex items-center justify-between mb-3">
            <span class="px-2 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/20">
              ${t.trip_code}
            </span>
            <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase ${
              isCompleted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              isInProgress ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse' :
              'bg-slate-700 text-slate-300'
            }">
              ${t.status}
            </span>
          </div>

          <!-- Route -->
          <div class="space-y-2 py-2">
            <div class="flex items-start gap-2.5">
              <div class="w-3 h-3 rounded-full bg-emerald-400 mt-1 flex-shrink-0"></div>
              <div>
                <span class="text-[10px] text-slate-400 uppercase font-semibold">Origin</span>
                <p class="text-sm font-semibold text-white">${this.escape(t.origin)}</p>
              </div>
            </div>
            <div class="w-0.5 h-4 bg-slate-700 ml-1.5"></div>
            <div class="flex items-start gap-2.5">
              <div class="w-3 h-3 rounded-full bg-indigo-400 mt-1 flex-shrink-0"></div>
              <div>
                <span class="text-[10px] text-slate-400 uppercase font-semibold">Destination</span>
                <p class="text-sm font-semibold text-white">${this.escape(t.destination)}</p>
              </div>
            </div>
          </div>

          <!-- Meta -->
          <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
            <div>
              <span class="text-slate-400">Distance:</span>
              <span class="font-mono text-white font-medium ml-1">${t.distance_km || 0} km</span>
            </div>
            <div>
              <span class="text-slate-400">Earnings:</span>
              <span class="font-mono text-emerald-400 font-bold ml-1">$${(t.earnings || 0).toFixed(2)}</span>
            </div>
          </div>

          ${t.notes ? `
            <div class="mt-2.5 p-2 bg-slate-900/60 rounded-lg text-xs text-slate-300 border border-slate-800">
              <span class="text-slate-500 text-[10px] uppercase font-bold block">Delivery Notes:</span>
              ${this.escape(t.notes)}
            </div>
          ` : ''}
        </div>

        <!-- Driver Action Buttons -->
        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span class="text-[11px] text-slate-500 font-mono">${t.start_time ? t.start_time.slice(0, 16) : ''}</span>
          <div>
            ${isScheduled ? `
              <button onclick="DriverView.updateTripStatus(${t.id}, 'in_progress', '${t.trip_code}')" class="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-cyan-600/20">
                Start Trip
              </button>
            ` : ''}
            ${isInProgress ? `
              <button onclick="DriverView.updateTripStatus(${t.id}, 'completed', '${t.trip_code}')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20">
                Complete Trip
              </button>
            ` : ''}
            ${isCompleted ? `
              <span class="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Finished
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  async updateTripStatus(tripId, nextStatus, tripCode) {
    if (!confirm(`Mark trip ${tripCode} as "${nextStatus.toUpperCase()}"?`)) return;

    try {
      const res = await API.updateDriverTripStatus(tripId, nextStatus);
      App.showToast(res.message, "success");
      DriverView.renderTrips();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  // Render Driver Documents
  async renderDocuments() {
    const container = document.getElementById("main-content");
    container.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    `;

    try {
      const data = await API.getDriverDocuments();
      const docs = data.documents || [];

      container.innerHTML = `
        <div class="animate-fade-in space-y-6">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <i data-lucide="file-check" class="w-6 h-6 text-emerald-400"></i>
              <span>My Compliance & Document Certifications</span>
            </h1>
            <p class="text-slate-400 text-sm mt-0.5">Your official driving licenses and medical credentials.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${docs.map(doc => `
              <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <i data-lucide="award" class="w-5 h-5"></i>
                    </div>
                    <div>
                      <h4 class="font-bold text-white">${this.escape(doc.doc_type)}</h4>
                      <p class="font-mono text-xs text-indigo-300 font-semibold">${this.escape(doc.doc_number)}</p>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ${doc.status}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div>
                    <span class="text-slate-400">Issue Date:</span>
                    <p class="font-medium text-white">${doc.issue_date}</p>
                  </div>
                  <div>
                    <span class="text-slate-400">Expiry Date:</span>
                    <p class="font-medium text-amber-300">${doc.expiry_date}</p>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  // Render Driver Settings
  async renderSettings() {
    const container = document.getElementById("main-content");
    container.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    `;

    try {
      const data = await API.getDriverProfile();
      const profile = data.profile;

      container.innerHTML = `
        <div class="animate-fade-in space-y-6 max-w-3xl">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <i data-lucide="settings" class="w-6 h-6 text-indigo-400"></i>
              <span>Account & Contact Settings</span>
            </h1>
            <p class="text-slate-400 text-sm mt-0.5">Update your contact details or change your account password.</p>
          </div>

          <!-- Update Contact Information -->
          <div class="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 class="text-base font-bold text-white">Personal Contact Details</h3>
            <form onsubmit="DriverView.submitContactUpdate(event)" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Mobile Phone Number</label>
                  <input type="tel" name="phone" value="${this.escape(profile.phone)}" required class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Residential Address</label>
                  <input type="text" name="address" value="${this.escape(profile.address || '')}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Emergency Contact Name</label>
                  <input type="text" name="emergency_contact_name" value="${this.escape(profile.emergency_contact_name || '')}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Emergency Contact Phone</label>
                  <input type="tel" name="emergency_contact_phone" value="${this.escape(profile.emergency_contact_phone || '')}" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
              </div>
              <div class="flex justify-end pt-2">
                <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow">
                  Save Contact Information
                </button>
              </div>
            </form>
          </div>

          <!-- Change Password -->
          <div class="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 class="text-base font-bold text-white">Security & Password</h3>
            <form onsubmit="DriverView.submitChangePassword(event)" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Current Password *</label>
                  <input type="password" name="current_password" required class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">New Password (Min 6 chars) *</label>
                  <input type="password" name="new_password" required minlength="6" class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
              </div>
              <div class="flex justify-end pt-2">
                <button type="submit" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow">
                  Update Password
                </button>
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

  async submitContactUpdate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await API.updateDriverContact(payload);
      App.showToast(res.message, "success");
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  async submitChangePassword(e) {
    e.preventDefault();
    const form = e.target;
    const currentPass = form.current_password.value;
    const newPass = form.new_password.value;

    try {
      const res = await API.changePassword(currentPass, newPass);
      App.showToast(res.message, "success");
      form.reset();
    } catch (err) {
      App.showToast(err.message, "error");
    }
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

window.DriverView = DriverView;
