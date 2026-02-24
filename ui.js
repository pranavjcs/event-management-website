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

initThemeToggle();

window.ui = {
  initThemeToggle
};
