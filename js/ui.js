function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;
  const initial = saved || (prefersDark ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", initial);
  toggle.setAttribute("aria-pressed", initial === "dark");
  toggle.textContent = initial === "dark" ? "Light Mode" : "Dark Mode";

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    toggle.setAttribute("aria-pressed", next === "dark");
    toggle.textContent = next === "dark" ? "Light Mode" : "Dark Mode";
  });
}

function ensureToastContainer() {
  let container = document.getElementById("toast-container");
  if (container) return container;

  container = document.createElement("div");
  container.id = "toast-container";
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

function notify(message, type = "info", timeout = 3200) {
  if (!message) return;

  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = String(message);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => {
      toast.remove();
    }, 220);
  }, timeout);
}

function setButtonLoading(button, isLoading, loadingText = "Please wait...") {
  if (!button) return;

  if (isLoading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }
    button.textContent = loadingText;
    button.disabled = true;
    button.classList.add("btn-loading");
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove("btn-loading");
  }
}

function getApiBaseCandidates() {
  const fromWindow = window.__API_BASE__;
  if (fromWindow) {
    return [fromWindow.replace(/\/$/, "")];
  }

  if (window.location.port === "5000") {
    return ["/api"];
  }

  const host = window.location.hostname || "localhost";
  return ["/api", `http://${host}:5000/api`, "http://localhost:5000/api", "http://127.0.0.1:5000/api"];
}

async function updateApiStatus() {
  const label = document.getElementById("api-status-pill");
  if (!label) return;

  const bases = getApiBaseCandidates();
  let online = false;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/health`, { method: "GET" });
      if (response.ok) {
        online = true;
        break;
      }
    } catch (error) {
      // Try next base candidate.
    }
  }

  label.textContent = online ? "API: Online" : "API: Offline";
  label.classList.toggle("api-online", online);
  label.classList.toggle("api-offline", !online);
}

function initApiStatusPill() {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks) return;

  let pill = document.getElementById("api-status-pill");
  if (!pill) {
    pill = document.createElement("span");
    pill.id = "api-status-pill";
    pill.className = "api-status-pill api-offline";
    pill.textContent = "API: Checking";
    navLinks.appendChild(pill);
  }

  updateApiStatus();
}

initThemeToggle();
initApiStatusPill();

window.ui = {
  initThemeToggle,
  notify,
  setButtonLoading,
  initApiStatusPill,
  updateApiStatus
};
