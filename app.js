// app.js – Main routing and view coordination for FAFB LP (Exposed globally)
const appRoot = document.getElementById("app-root");
const navButtons = document.querySelectorAll(".nav-btn");
const topBarTitle = document.getElementById("top-bar-title");

// Sidebar toggle for mobile
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarOverlay = document.getElementById("sidebar-overlay");

function openSidebar() {
  if (sidebar) sidebar.classList.add("open");
  if (sidebarOverlay) sidebarOverlay.classList.add("active");
}

function closeSidebar() {
  if (sidebar) sidebar.classList.remove("open");
  if (sidebarOverlay) sidebarOverlay.classList.remove("active");
}

if (sidebarToggle && !sidebarToggle.dataset.bound) {
  sidebarToggle.dataset.bound = "true";
  sidebarToggle.addEventListener("click", () => {
    if (sidebar && sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });
}

if (sidebarOverlay && !sidebarOverlay.dataset.bound) {
  sidebarOverlay.dataset.bound = "true";
  sidebarOverlay.addEventListener("click", closeSidebar);
}

// View title mapping
const viewTitles = {
  dashboard: "Dashboard",
  members: "Members",
  organizations: "Organizations",
  ministries: "Ministries",
  pledges: "Pledges",
};

// Global navigation helper
async function navigateToView(viewName, tabName = null, filterId = null) {
  if (!appRoot) return;

  // Update nav button active states
  navButtons.forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update top bar title
  if (topBarTitle) {
    topBarTitle.textContent = viewTitles[viewName] || viewName;
  }

  // Close sidebar on mobile after navigation
  closeSidebar();

  // Clear container
  appRoot.innerHTML = '<div class="loader">Loading view...</div>';

  try {
    switch (viewName) {
      case "dashboard":
        if (window.renderDashboardView) {
          await window.renderDashboardView(appRoot, navigateToView);
        }
        break;
      case "members":
        if (window.renderMembersView) {
          await window.renderMembersView(appRoot, filterId);
        }
        break;
      case "organizations":
        if (window.renderOrganizationsView) {
          await window.renderOrganizationsView(appRoot);
        }
        break;
      case "ministries":
        if (window.renderMinistriesView) {
          await window.renderMinistriesView(appRoot);
        }
        break;
      case "pledges":
        if (window.renderPledgesView) {
          await window.renderPledgesView(appRoot);
          if (tabName) {
            const tabBtn = appRoot.querySelector(`.pledge-tab-btn[data-tab="${tabName}"]`);
            if (tabBtn) tabBtn.click();
          }
        }
        break;
      default:
        appRoot.innerHTML = `<div class="card"><h2>404</h2><p>View "${viewName}" not found.</p></div>`;
    }
  } catch (error) {
    console.error("Navigation error:", error);
    appRoot.innerHTML = `
      <div class="card error-card" style="max-width: 600px; margin: 2rem auto; text-align: center; padding: 2rem;">
        <h2 style="color: #e53e3e; margin-bottom: 0.5rem;">⚠️ Something went wrong</h2>
        <p style="color: #555; margin-bottom: 1.5rem; word-break: break-word;">${error.message || 'An error occurred while loading this section.'}</p>
        <button id="retry-btn" class="btn-primary" style="padding: 10px 24px;">Retry</button>
      </div>
    `;
    appRoot.querySelector("#retry-btn")?.addEventListener("click", () => navigateToView(viewName, tabName));
  }
}

// Expose navigation globally so sub-views can call it
window.navigateToView = navigateToView;

// Bind sidebar navigation links
navButtons.forEach(btn => {
  if (btn.dataset.view && !btn.dataset.bound) {
    btn.dataset.bound = "true";
    btn.addEventListener("click", () => {
      navigateToView(btn.dataset.view);
    });
  }
});

// Setup default seed data if DB is completely empty (helps user experience first time)
async function seedDefaultData() {
  if (!window.OrganizationDB) return;
  try {
    const organizations = await window.OrganizationDB.getAll();
    if (organizations.length === 0) {
      await window.OrganizationDB.add({
        id: "organization-1",
        name: "Davao First Born Fellowship",
        leaderId: "",
        description: "Primary fellowship team based in Davao City."
      });
      await window.OrganizationDB.add({
        id: "organization-2",
        name: "Manila Assembly Organization",
        leaderId: "",
        description: "Metropolitan Manila FAFB LP cell organization."
      });
    }
  } catch (e) {
    console.warn("Seeding skipped:", e);
  }
}

// Initial initialization
function initApp() {
  const isAuthenticated = sessionStorage.getItem("fafb_auth") === "true" || localStorage.getItem("fafb_auth") === "true";
  if (isAuthenticated) {
    seedDefaultData().catch(() => {});
    navigateToView("dashboard");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
