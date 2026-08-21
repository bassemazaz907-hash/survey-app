const THEME_DEFAULTS = {
  "--color-primary": "#00f0ff",
  "--color-secondary": "#8b5cf6",
  "--color-accent": "#ff007f",
  "--color-header-bg": "#070a14",
  "--color-header-text": "#f0f6fc",
  "--color-bg": "#060813",
  "--color-card": "rgba(13, 18, 36, 0.78)",
  "--color-card-border": "rgba(0, 240, 255, 0.22)",
  "--color-text": "#f1f5f9",
  "--color-text-muted": "#94a3b8",
  "--color-success": "#00ff9d",
  "--color-danger": "#ff2a5f",
  "--color-warning": "#ffb703",
  "--radius": "18px",
  "--font-size-base": "15px",
};

const THEME_LIGHT = {
  "--color-primary": "#0284c7",
  "--color-secondary": "#7c3aed",
  "--color-accent": "#db2777",
  "--color-header-bg": "#0f172a",
  "--color-header-text": "#ffffff",
  "--color-bg": "#f0f4f9",
  "--color-card": "rgba(255, 255, 255, 0.92)",
  "--color-card-border": "rgba(2, 132, 199, 0.25)",
  "--color-text": "#0f172a",
  "--color-text-muted": "#475569",
  "--color-success": "#16a34a",
  "--color-danger": "#e11d48",
  "--color-warning": "#d97706",
  "--radius": "18px",
  "--font-size-base": "15px",
};

const DEFAULT_LOGOS = { brand: "", bg: "", icon: "" };
let LOGOS = { ...DEFAULT_LOGOS };

function savedThemeMode() {
  const m = localStorage.getItem("surveyMode");
  return m === "dark" || m === "light" ? m : null;
}

function themeMode() {
  return savedThemeMode() || window.SURVEY_DEFAULT_MODE || "dark";
}

function applyTheme(theme) {
  const dark = themeMode() === "dark";
  const base = dark ? THEME_DEFAULTS : THEME_LIGHT;
  const custom = {};
  for (const [key, value] of Object.entries(theme || {})) {
    if (Object.prototype.hasOwnProperty.call(THEME_DEFAULTS, key) && typeof value === "string") {
      custom[key] = value;
    }
  }
  const root = document.documentElement;
  const merged = { ...base, ...custom };
  for (const [key, value] of Object.entries(merged)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute("data-mode", dark ? "dark" : "light");
  root.style.colorScheme = dark ? "dark" : "light";

  const bgLogo = document.getElementById("bgLogo");
  if (bgLogo) {
    bgLogo.style.filter = dark ? "none" : "invert(1) hue-rotate(180deg)";
  }
}

function updateModeButton() {
  const dark = themeMode() === "dark";
  document.querySelectorAll("[data-mode-toggle]").forEach((btn) => {
    btn.textContent = dark ? "☀️" : "🌙";
  });
}

function toggleThemeMode() {
  const next = themeMode() === "dark" ? "light" : "dark";
  localStorage.setItem("surveyMode", next);
  applyTheme(window.SURVEY_THEME || {});
  updateModeButton();
}

function applyLogos(logos) {
  LOGOS = { ...DEFAULT_LOGOS, ...(logos || {}) };

  const brandEl = document.getElementById("surveyBrandIcon");
  if (brandEl) {
    brandEl.classList.remove("survey-brand-icon-img");
    brandEl.innerHTML = "";
    if (LOGOS.brand) {
      brandEl.classList.add("survey-brand-icon-img");
      const img = document.createElement("img");
      img.src = LOGOS.brand;
      img.alt = "Brand Logo";
      brandEl.appendChild(img);
    } else {
      brandEl.textContent = "⭐";
    }
  }

  const bg = document.getElementById("bgLogo");
  if (bg) {
    if (LOGOS.bg) {
      bg.style.backgroundImage = `url("${LOGOS.bg}")`;
      bg.style.display = "block";
    } else {
      bg.style.backgroundImage = "none";
      bg.style.display = "none";
    }
  }

  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = LOGOS.icon || "/app-icon.png";
}
