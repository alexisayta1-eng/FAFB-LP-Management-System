// login.js - Handles authentication with Supabase and session state
function initLogin() {
  const loginContainer = document.getElementById("login-container");
  const appContainer = document.getElementById("app-container");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");
  const passwordToggle = document.getElementById("password-toggle");
  const loginPassword = document.getElementById("login-password");
  const leaderViewBtn = document.getElementById("leader-view-btn");

  if (!loginContainer || !appContainer) return;

  // Check if already authenticated
  function checkAuth() {
    const isAuthenticated = sessionStorage.getItem("fafb_auth") === "true" || localStorage.getItem("fafb_auth") === "true";
    if (isAuthenticated) {
      loginContainer.style.display = "none";
      appContainer.style.display = "block";
      if (window.navigateToView) window.navigateToView("dashboard");
    } else {
      loginContainer.style.display = "flex";
      appContainer.style.display = "none";
    }
  }

  // Handle Login Submit
  if (loginForm && !loginForm.dataset.bound) {
    loginForm.dataset.bound = "true";
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = document.getElementById("login-username").value.trim();
      const pass = document.getElementById("login-password").value.trim();
      const submitBtn = loginForm.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;
      
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in...";
      if (loginError) loginError.style.display = "none";

      try {
        const supabase = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;

        if (supabase) {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("username", user)
            .maybeSingle();

          if (error) {
            console.warn("Supabase auth error:", error.message);
            throw error;
          }

          if (data && data.password === pass) {
            if (loginError) loginError.style.display = "none";
            sessionStorage.setItem("fafb_auth", "true");
            sessionStorage.setItem("fafb_role", data.role === "admin" ? "admin" : "viewer");
            sessionStorage.setItem("fafb_user", data.username);
            
            loginContainer.style.display = "none";
            appContainer.style.display = "block";
            if (window.navigateToView) window.navigateToView("dashboard");
            
            if (window.showToast) {
              window.showToast(`Welcome, ${data.username}!`, "success");
            }
            return;
          } else {
            if (loginError) {
              loginError.textContent = "Invalid username or password";
              loginError.style.display = "block";
            }
            return;
          }
        }

        // If Supabase not configured or unreachable, use offline fallback
        if ((user === "admin" && pass === "admin") || (user === "leader" && pass === "leader")) {
          sessionStorage.setItem("fafb_auth", "true");
          sessionStorage.setItem("fafb_role", user === "admin" ? "admin" : "viewer");
          sessionStorage.setItem("fafb_user", user);

          loginContainer.style.display = "none";
          appContainer.style.display = "block";
          if (window.navigateToView) window.navigateToView("dashboard");
          if (window.showToast) window.showToast("Logged in (Offline Mode)", "info");
        } else {
          if (loginError) {
            loginError.textContent = "Invalid username or password";
            loginError.style.display = "block";
          }
        }
      } catch (err) {
        console.warn("Auth check error, testing fallback:", err);
        if ((user === "admin" && pass === "admin") || (user === "leader" && pass === "leader")) {
          sessionStorage.setItem("fafb_auth", "true");
          sessionStorage.setItem("fafb_role", user === "admin" ? "admin" : "viewer");
          sessionStorage.setItem("fafb_user", user);

          loginContainer.style.display = "none";
          appContainer.style.display = "block";
          if (window.navigateToView) window.navigateToView("dashboard");
          if (window.showToast) window.showToast("Logged in (Offline Mode)", "info");
        } else {
          if (loginError) {
            loginError.textContent = "Cannot connect to database or invalid credentials";
            loginError.style.display = "block";
          }
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Handle Leader View Button
  if (leaderViewBtn && !leaderViewBtn.dataset.bound) {
    leaderViewBtn.dataset.bound = "true";
    leaderViewBtn.addEventListener("click", () => {
      sessionStorage.setItem("fafb_auth", "true");
      sessionStorage.setItem("fafb_role", "viewer");
      sessionStorage.setItem("fafb_user", "leader");
      
      loginContainer.style.display = "none";
      appContainer.style.display = "block";
      if (window.navigateToView) window.navigateToView("dashboard");
      
      if (window.showToast) {
        window.showToast("Entering View-Only Mode", "success");
      }
    });
  }

  // Handle Password Visibility Toggle
  if (passwordToggle && loginPassword && !passwordToggle.dataset.bound) {
    passwordToggle.dataset.bound = "true";
    passwordToggle.addEventListener("click", () => {
      const type = loginPassword.getAttribute("type") === "password" ? "text" : "password";
      loginPassword.setAttribute("type", type);
      passwordToggle.innerHTML = type === "password" 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' 
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
      passwordToggle.setAttribute("aria-label", type === "password" ? "Show password" : "Hide password");
    });
  }

  // Handle Logout
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("fafb_auth");
      sessionStorage.removeItem("fafb_role");
      sessionStorage.removeItem("fafb_user");
      localStorage.removeItem("fafb_auth");
      localStorage.removeItem("fafb_role");
      localStorage.removeItem("fafb_user");
      
      appContainer.style.display = "none";
      loginContainer.style.display = "flex";
      
      if (loginForm) loginForm.reset();
      if (loginError) loginError.style.display = "none";
    });
  }

  // Initial Check
  checkAuth();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLogin);
} else {
  initLogin();
}

// Global role helper
window.isViewOnly = () => {
  return sessionStorage.getItem("fafb_role") === "viewer";
};
