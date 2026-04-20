function getApiBaseCandidates() {
  const fromWindow = window.__API_BASE__;
  if (fromWindow) {
    return [fromWindow.replace(/\/$/, "")];
  }

  const fallbackHost = window.location.hostname || "localhost";
  const hostFallback = `http://${fallbackHost}:5000/api`;
  const localhostFallback = "http://localhost:5000/api";
  const loopbackFallback = "http://127.0.0.1:5000/api";
  if (window.location.protocol === "file:") {
    return [localhostFallback, loopbackFallback];
  }

  if (window.location.port === "5000") {
    return ["/api"];
  }

  return ["/api", hostFallback, localhostFallback, loopbackFallback];
}

function getStorage(key, fallback) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function notify(message, type = "info") {
  if (window.ui && typeof window.ui.notify === "function") {
    window.ui.notify(message, type);
    return;
  }
  window.alert(message);
}

function isConnectivityError(error) {
  const message = String(error && error.message ? error.message : "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("unable to connect") ||
    message.includes("load failed") ||
    message.includes("network request failed")
  );
}

function getLocalStudents() {
  return getStorage("students", []);
}

function setLocalStudents(students) {
  setStorage("students", students);
}

function getLocalAdmins() {
  const admins = getStorage("admins", []);
  if (admins.length > 0) {
    return admins;
  }

  const defaults = [
    {
      id: "ADM-001",
      name: "Campus Admin",
      email: "admin@college.edu",
      password: "Admin@123"
    }
  ];
  setStorage("admins", defaults);
  return defaults;
}

async function apiRequest(endpoint, options = {}) {
  const bases = getApiBaseCandidates();
  let lastError = null;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        lastError = new Error(payload.message || `Request failed (${response.status})`);
        continue;
      }

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    isConnectivityError(lastError)
      ? "Unable to reach backend API. Please start backend on port 5000."
      : lastError?.message ||
      "Unable to connect to backend. Start backend and open site at http://localhost:5000"
  );
}

// Toggle navbar links based on current session.
function setNavState() {
  const user = getStorage("currentUser", null);
  const admin = getStorage("currentAdmin", null);
  const navLogin = document.getElementById("nav-login");
  const navRegister = document.getElementById("nav-register");
  const navLogout = document.getElementById("nav-logout");
  const navAdmin = document.getElementById("nav-admin");
  const navMyEvents = document.getElementById("nav-myevents");

  if (navLogin) navLogin.style.display = user ? "none" : "inline-flex";
  if (navRegister) navRegister.style.display = user ? "none" : "inline-flex";
  if (navMyEvents) navMyEvents.style.display = user ? "inline-flex" : "none";
  if (navLogout) navLogout.style.display = user || admin ? "inline-flex" : "none";
  if (navAdmin) {
    navAdmin.textContent = admin ? "Dashboard" : "Admin";
    navAdmin.setAttribute(
      "href",
      admin ? "admin-dashboard.html" : "admin-login.html"
    );
  }
}

function logoutAll() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentAdmin");
  window.location.href = "index.html";
}

function attachLogout() {
  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      logoutAll();
    });
  }
}

function registerStudent(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = form.querySelector("#fullName");
    const email = form.querySelector("#email");
    const department = form.querySelector("#department");
    const password = form.querySelector("#password");
    const confirmPassword = form.querySelector("#confirmPassword");

    const isValid = [
      window.validation.validateRequired(name, "Full name is required."),
      window.validation.validateRequired(email, "Email is required."),
      window.validation.validateEmail(email),
      window.validation.validateRequired(department, "Department is required."),
      window.validation.validateRequired(password, "Password is required."),
      window.validation.validatePassword(password),
      window.validation.validateRequired(
        confirmPassword,
        "Confirm your password."
      ),
      window.validation.validateConfirmPassword(password, confirmPassword)
    ].every(Boolean);

    if (!isValid) {
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    if (window.ui && typeof window.ui.setButtonLoading === "function") {
      window.ui.setButtonLoading(submitBtn, true, "Creating...");
    }

    try {
      const result = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: name.value.trim(),
          email: email.value.trim(),
          department: department.value.trim(),
          password: password.value
        })
      });

      setStorage("currentUser", result.data);
      window.location.href = "events.html";
    } catch (error) {
      if (isConnectivityError(error)) {
        const students = getLocalStudents();
        const normalizedEmail = email.value.trim().toLowerCase();
        const exists = students.some(
          (student) => String(student.email || "").trim().toLowerCase() === normalizedEmail
        );

        if (exists) {
          notify("Student already registered.", "warning");
          return;
        }

        const created = {
          id: `STD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          fullName: name.value.trim(),
          email: email.value.trim(),
          department: department.value.trim(),
          password: password.value
        };

        students.push(created);
        setLocalStudents(students);
        setStorage("currentUser", created);
        window.location.href = "events.html";
        return;
      }

      notify(error.message || "Registration failed.", "error");
    } finally {
      if (window.ui && typeof window.ui.setButtonLoading === "function") {
        window.ui.setButtonLoading(submitBtn, false);
      }
    }
  });
}

function loginStudent(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.querySelector("#loginEmail");
    const password = form.querySelector("#loginPassword");

    const isValid = [
      window.validation.validateRequired(email, "Email is required."),
      window.validation.validateEmail(email),
      window.validation.validateRequired(password, "Password is required.")
    ].every(Boolean);

    if (!isValid) {
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    if (window.ui && typeof window.ui.setButtonLoading === "function") {
      window.ui.setButtonLoading(submitBtn, true, "Signing in...");
    }

    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.value.trim(),
          password: password.value
        })
      });

      setStorage("currentUser", result.data);
      localStorage.removeItem("currentAdmin");
      window.location.href = "events.html";
    } catch (error) {
      if (isConnectivityError(error)) {
        const students = getLocalStudents();
        const localUser = students.find(
          (student) =>
            String(student.email || "").trim().toLowerCase() === email.value.trim().toLowerCase() &&
            String(student.password || "") === password.value
        );

        if (localUser) {
          setStorage("currentUser", localUser);
          localStorage.removeItem("currentAdmin");
          window.location.href = "events.html";
          return;
        }
      }

      notify(error.message || "Invalid student credentials.", "error");
    } finally {
      if (window.ui && typeof window.ui.setButtonLoading === "function") {
        window.ui.setButtonLoading(submitBtn, false);
      }
    }
  });
}

function loginAdmin(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.querySelector("#adminEmail");
    const password = form.querySelector("#adminPassword");

    const isValid = [
      window.validation.validateRequired(email, "Email is required."),
      window.validation.validateEmail(email),
      window.validation.validateRequired(password, "Password is required.")
    ].every(Boolean);

    if (!isValid) {
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    if (window.ui && typeof window.ui.setButtonLoading === "function") {
      window.ui.setButtonLoading(submitBtn, true, "Signing in...");
    }

    try {
      const result = await apiRequest("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.value.trim(),
          password: password.value
        })
      });

      setStorage("currentAdmin", result.data);
      localStorage.removeItem("currentUser");
      window.location.href = "admin-dashboard.html";
    } catch (error) {
      if (isConnectivityError(error)) {
        const admins = getLocalAdmins();
        const localAdmin = admins.find(
          (adminUser) =>
            String(adminUser.email || "").trim().toLowerCase() === email.value.trim().toLowerCase() &&
            String(adminUser.password || "") === password.value
        );

        if (localAdmin) {
          setStorage("currentAdmin", localAdmin);
          localStorage.removeItem("currentUser");
          window.location.href = "admin-dashboard.html";
          return;
        }
      }

      notify(error.message || "Invalid admin credentials.", "error");
    } finally {
      if (window.ui && typeof window.ui.setButtonLoading === "function") {
        window.ui.setButtonLoading(submitBtn, false);
      }
    }
  });
}

window.auth = {
  registerStudent,
  loginStudent,
  loginAdmin,
  setNavState,
  attachLogout,
  getCurrentUser: function() {
    return getStorage("currentUser", null);
  },
  getCurrentAdmin: function() {
    return getStorage("currentAdmin", null);
  }
};
