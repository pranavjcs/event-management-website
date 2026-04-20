// Basic localStorage helpers for demo auth state.
function getStorage(key, fallback) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Seed a default admin account if none exists.
function seedAdmins() {
  const admins = getStorage("admins", []);
  if (admins.length === 0) {
    setStorage("admins", [
      {
        id: "ADM-001",
        name: "System Admin",
        email: "admin@college.edu",
        password: "Admin@123"
      }
    ]);
  }
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

// Register a student and persist to localStorage.
function registerStudent(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", (event) => {
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

    const students = getStorage("students", []);
    const exists = students.some((student) => student.email === email.value.trim());
    if (exists) {
      window.alert("Student already registered. Please login.");
      return;
    }

    const newStudent = {
      id: `STD-${Date.now()}`,
      fullName: name.value.trim(),
      email: email.value.trim(),
      department: department.value.trim(),
      password: password.value
    };

    students.push(newStudent);
    setStorage("students", students);
    setStorage("currentUser", newStudent);
    window.location.href = "events.html";
  });
}

function loginStudent(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", (event) => {
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

    const students = getStorage("students", []);
    const student = students.find(
      (item) => item.email === email.value.trim() && item.password === password.value
    );

    if (!student) {
      window.alert("Invalid student credentials.");
      return;
    }

    setStorage("currentUser", student);
    window.location.href = "events.html";
  });
}

function loginAdmin(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", (event) => {
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

    const admins = getStorage("admins", []);
    const admin = admins.find(
      (item) => item.email === email.value.trim() && item.password === password.value
    );

    if (!admin) {
      window.alert("Invalid admin credentials.");
      return;
    }

    setStorage("currentAdmin", admin);
    window.location.href = "admin-dashboard.html";
  });
}

seedAdmins();
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
