// Sri Explainer Mission Control - Desktop Client Logic
// Direct Windows Control System for Monetization, Error Radar, and Audience Traffic

const API_BASE = "https://sriexplainer.in";
let syncCountdown = 15;
let timerId = null;
let isTogglingAds = false;

// DOM Elements
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginBtn = document.getElementById("login-btn");
const btnGoogleLogin = document.getElementById("btn-google-login");

const btnRefresh = document.getElementById("btn-refresh");
const btnLogout = document.getElementById("btn-logout");
const statusBadge = document.getElementById("status-badge");
const syncTimerBadge = document.getElementById("sync-timer");

const btnMasterAds = document.getElementById("btn-master-ads");
const btnClearErrors = document.getElementById("btn-clear-errors");

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper: Format Number
function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return Number(num).toLocaleString("en-IN");
}

// Authentication Helpers
function getToken() {
  return localStorage.getItem("sri_admin_token") || "";
}

function setToken(token, user) {
  localStorage.setItem("sri_admin_token", token);
  if (user) {
    localStorage.setItem("sri_admin_user", JSON.stringify(user));
  }
}

function clearAuth() {
  localStorage.removeItem("sri_admin_token");
  localStorage.removeItem("sri_admin_user");
}

// Tab Switching
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const sections = {
    overview: document.getElementById("section-overview"),
    monetization: document.getElementById("section-monetization"),
    errors: document.getElementById("section-errors"),
    audience: document.getElementById("section-audience")
  };

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      Object.keys(sections).forEach(key => {
        if (sections[key]) {
          if (target === "overview") {
            // Overview displays all cards
            sections[key].style.display = "block";
          } else {
            sections[key].style.display = (key === target) ? "block" : "none";
          }
        }
      });
    });
  });
}

// Universal Secure Fetch (uses Electron Node.js IPC when available to completely bypass CORS / file origin limits)
async function secureFetch(url, options = {}) {
  try {
    if (window.electronAPI?.apiFetch) {
      const res = await window.electronAPI.apiFetch(url, options);
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        json: async () => res.data,
        text: async () => (typeof res.data === "string" ? res.data : JSON.stringify(res.data))
      };
    }
  } catch (e) {
    console.warn("Falling back to window.fetch:", e);
  }
  return fetch(url, options);
}

// Google Login Handler
async function handleGoogleLogin() {
  loginError.style.display = "none";
  if (btnGoogleLogin) {
    btnGoogleLogin.disabled = true;
    btnGoogleLogin.innerHTML = `<span>Connecting to Google...</span>`;
  }

  try {
    if (window.electronAPI?.loginWithGoogle) {
      const res = await window.electronAPI.loginWithGoogle();
      if (!res.success || !res.token) {
        throw new Error(res.message || "Google sign in was cancelled.");
      }

      // Fetch user details using token
      const profileRes = await secureFetch(`${API_BASE}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${res.token}` }
      });
      const profileData = await profileRes.json();
      const user = profileData.user || {};

      const role = user.role;
      if (role !== "admin" && role !== "co_admin" && user.email !== "appua26145@gmail.com") {
        throw new Error("Access denied: You do not have administrator permissions.");
      }

      setToken(res.token, user);
      loginModal.style.display = "none";
      startSync();
      fetchTelemetry();
    } else {
      // Browser or external fallback
      window.open("https://sriexplainer.in/login?fromDesktop=true", "_blank", "width=520,height=680");
      loginError.textContent = "Complete Google Sign In in the opened window, then reopen or reload this app.";
      loginError.style.display = "block";
    }
  } catch (err) {
    loginError.textContent = err.message || "Google authentication failed.";
    loginError.style.display = "block";
  } finally {
    if (btnGoogleLogin) {
      btnGoogleLogin.disabled = false;
      btnGoogleLogin.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Sign in with Google</span>
      `;
    }
  }
}

// Login Handler
async function handleLogin(e) {
  e.preventDefault();
  loginError.style.display = "none";
  loginBtn.disabled = true;
  loginBtn.textContent = "Authenticating with Mission Control...";

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  try {
    const res = await secureFetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok || !data.token) {
      throw new Error(data.message || "Invalid credentials or unauthorized.");
    }

    const role = data.user?.role;
    if (role !== "admin" && role !== "co_admin" && email !== "appua26145@gmail.com") {
      throw new Error("Access denied: You do not have administrator permissions.");
    }

    setToken(data.token, data.user);
    loginModal.style.display = "none";
    loginBtn.disabled = false;
    loginBtn.textContent = "Unlock Mission Control";

    startSync();
    fetchTelemetry();
  } catch (err) {
    loginError.textContent = err.message || "Login failed. Please check internet connection.";
    loginError.style.display = "block";
    loginBtn.disabled = false;
    loginBtn.textContent = "Unlock Mission Control";
  }
}

// Logout Handler
function handleLogout() {
  clearAuth();
  stopSync();
  loginModal.style.display = "flex";
  loginPassword.value = "";
}

// Fetch Telemetry Data
async function fetchTelemetry() {
  const token = getToken();
  if (!token) {
    loginModal.style.display = "flex";
    statusBadge.className = "badge badge-amber";
    statusBadge.textContent = "SIGN IN REQUIRED";
    return;
  }

  btnRefresh.classList.add("loading");
  btnRefresh.innerHTML = "<span>⟳ Syncing...</span>";

  try {
    const res = await secureFetch(`${API_BASE}/api/admin/control-center`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      clearAuth();
      loginModal.style.display = "flex";
      loginError.textContent = "Session expired. Please sign in again with Google.";
      loginError.style.display = "block";
      statusBadge.className = "badge badge-rose";
      statusBadge.textContent = "UNAUTHORIZED (RE-LOGIN)";
      stopSync();
      return;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText || 'Server error'}`);
    }

    const data = await res.json();
    renderDashboard(data);
    resetCountdown();
  } catch (err) {
    console.error("Telemetry sync error:", err);
    statusBadge.className = "badge badge-rose";
    statusBadge.textContent = "SYNC DISCONNECTED (" + (err.message || "Network") + ")";
  } finally {
    btnRefresh.classList.remove("loading");
    btnRefresh.innerHTML = "<span>⟳ Sync Now</span>";
  }
}

// Render Dashboard UI
function renderDashboard(data) {
  if (!data || !data.success) return;

  // 1. Health Status
  const status = data.systemStatus || data.health?.status || "OPTIMAL";
  statusBadge.className = "badge";
  if (status === "OPTIMAL") {
    statusBadge.classList.add("badge-emerald");
    statusBadge.textContent = "SYSTEM OPTIMAL";
  } else if (status === "ATTENTION") {
    statusBadge.classList.add("badge-amber");
    statusBadge.textContent = "ATTENTION REQUIRED";
  } else {
    statusBadge.classList.add("badge-rose");
    statusBadge.textContent = "CRITICAL ALERTS";
  }

  // 2. Platform Vital Metrics
  const traffic = data.traffic || {};
  document.getElementById("val-total-users").textContent = formatNumber(traffic.totalUsers);
  document.getElementById("val-users-today").textContent = `+${formatNumber(traffic.newUsersToday)} registered today`;
  document.getElementById("val-total-views").textContent = formatNumber(traffic.totalViews);
  document.getElementById("val-total-episodes").textContent = `Across ${formatNumber(traffic.totalEpisodes)} episodes`;
  document.getElementById("val-watch-hours").innerHTML = `${formatNumber(traffic.totalWatchHours)} <span style="font-size: 16px; color: var(--text-muted);">hrs</span>`;
  document.getElementById("val-subscribers").textContent = formatNumber(traffic.activeSubscribers);

  const subs = data.monetization?.subscriptions || {};
  const revenueStr = `₹${formatNumber(subs.totalRevenue || (traffic.activeSubscribers * 39))}`;
  document.getElementById("val-revenue").textContent = `${revenueStr} subscription revenue`;

  // 3. Monetization Tab
  const adsActive = data.monetization?.adsEnabled !== false;
  updateAdsToggleButton(adsActive);

  document.getElementById("val-monetization-revenue").textContent = revenueStr;
  document.getElementById("val-monetization-subscribers").textContent = formatNumber(traffic.activeSubscribers);

  // 4. Error Radar Tab
  const health = data.health || {};
  const errorsToday = health.errorsToday || 0;
  document.getElementById("tab-error-count").textContent = errorsToday;
  document.getElementById("err-today").textContent = errorsToday;
  document.getElementById("err-server").textContent = health.serverErrorsToday || 0;
  document.getElementById("err-reports").textContent = health.openReports || 0;
  document.getElementById("err-security").textContent = health.securityEventsToday || 0;

  const tbody = document.getElementById("errors-tbody");
  const recentErrors = health.recentErrors || [];
  if (recentErrors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 30px; color: var(--accent-emerald); font-weight: 600;">
          ✓ No active errors! System running with 100% health.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = recentErrors.map(err => {
      const is500 = (err.statusCode >= 500);
      const badgeClass = is500 ? "badge-rose" : "badge-amber";
      const timeStr = err.createdAt ? new Date(err.createdAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now";
      return `
        <tr>
          <td><span class="badge ${badgeClass}">${escapeHtml(err.statusCode || 500)}</span></td>
          <td class="mono" style="color: var(--accent-cyan);">${escapeHtml(err.path || err.route || "/")}</td>
          <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(err.message || "Unknown error")}</td>
          <td class="mono" style="color: var(--text-dim);">${escapeHtml(err.clientIp || "127.0.0.1")}</td>
          <td class="mono" style="color: var(--text-muted); font-size: 11px;">${timeStr}</td>
        </tr>
      `;
    }).join("");
  }

  // 5. Audience Leaderboard
  const topSeries = traffic.topSeries || [];
  const leaderboard = document.getElementById("top-series-list");
  if (topSeries.length === 0) {
    leaderboard.innerHTML = `<div style="color: var(--text-muted); padding: 16px; text-align: center;">No series data available.</div>`;
  } else {
    leaderboard.innerHTML = topSeries.map((s, idx) => {
      const rankBadge = idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`;
      const thumb = s.thumbnail || "";
      const thumbImg = thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(s.title)}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-subtle);">` : `<div style="width: 50px; height: 50px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 18px;">🎬</div>`;
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 10px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-weight: 800; font-size: 14px; width: 45px;" class="mono">${rankBadge}</span>
            ${thumbImg}
            <div>
              <div style="font-weight: 700; font-size: 14px; color: #FFF;">${escapeHtml(s.title)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Sri Explainer Original Series</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 800; color: var(--accent-cyan);">${formatNumber(s.views)}</div>
            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Stream Views</div>
          </div>
        </div>
      `;
    }).join("");
  }
}

// Master Ads Toggle
function updateAdsToggleButton(isActive) {
  if (isActive) {
    btnMasterAds.className = "toggle-pill toggle-active";
    btnMasterAds.textContent = "ADS ACTIVE";
  } else {
    btnMasterAds.className = "toggle-pill toggle-inactive";
    btnMasterAds.textContent = "ADS DISABLED";
  }
}

async function handleToggleAds() {
  if (isTogglingAds) return;
  const token = getToken();
  if (!token) return;

  const currentIsActive = btnMasterAds.classList.contains("toggle-active");
  const nextState = !currentIsActive;

  isTogglingAds = true;
  btnMasterAds.textContent = "UPDATING...";

  try {
    const res = await secureFetch(`${API_BASE}/api/admin/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ ads_enabled: nextState })
    });

    if (!res.ok) {
      throw new Error(`Failed to update ads state: HTTP ${res.status}`);
    }

    updateAdsToggleButton(nextState);
    fetchTelemetry();
  } catch (err) {
    alert(`Could not toggle ads: ${err.message}`);
    updateAdsToggleButton(currentIsActive);
  } finally {
    isTogglingAds = false;
  }
}

// Clear Error Logs
async function handleClearErrors() {
  const token = getToken();
  if (!token) return;

  const confirmed = confirm("Are you sure you want to clear all platform application error logs?");
  if (!confirmed) return;

  btnClearErrors.disabled = true;
  btnClearErrors.innerHTML = "<span>Clearing...</span>";

  try {
    const res = await secureFetch(`${API_BASE}/api/admin/health-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ action: "clear_errors" })
    });

    if (!res.ok) {
      throw new Error("Server rejected clear request.");
    }

    fetchTelemetry();
  } catch (err) {
    alert(`Failed to clear logs: ${err.message}`);
  } finally {
    btnClearErrors.disabled = false;
    btnClearErrors.innerHTML = "<span>Clear Error Logs</span>";
  }
}

// Auto-Sync Countdown
function resetCountdown() {
  syncCountdown = 15;
  syncTimerBadge.textContent = `Sync: ${syncCountdown}s`;
}

function startSync() {
  stopSync();
  resetCountdown();
  timerId = setInterval(() => {
    syncCountdown--;
    if (syncCountdown <= 0) {
      fetchTelemetry();
    } else {
      syncTimerBadge.textContent = `Sync: ${syncCountdown}s`;
    }
  }, 1000);
}

function stopSync() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  initTabs();

  loginForm.addEventListener("submit", handleLogin);
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener("click", handleGoogleLogin);
  }
  btnLogout.addEventListener("click", handleLogout);
  btnRefresh.addEventListener("click", () => {
    fetchTelemetry();
  });
  btnMasterAds.addEventListener("click", handleToggleAds);
  btnClearErrors.addEventListener("click", handleClearErrors);

  const token = getToken();
  if (!token) {
    loginModal.style.display = "flex";
  } else {
    loginModal.style.display = "none";
    startSync();
    fetchTelemetry();
  }
});
