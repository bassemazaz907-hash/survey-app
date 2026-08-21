
// Instant Client Cache Hydration (0ms load)
(function hydrateInstantCache() {
  try {
    const cached = localStorage.getItem("surveyPublicCache");
    if (cached) {
      const data = JSON.parse(cached);
      if (data && data.content) {
        LANG = data.lang || "ar";
        applyTheme(data.theme);
        applyLogos(data.logos);
        renderQuestions(data.questions || []);
        applyContent(data.content);
      }
    }
  } catch (e) {}
})();

let questions = [
  { key: "overall", labelAr: "كيف تقيّم زيارتك بشكل عام؟", labelEn: "How would you rate your overall visit?", icon: "🍽️" },
  { key: "service", labelAr: "جودة الخدمة", labelEn: "Service quality", icon: "🛎️" },
  { key: "drinks", labelAr: "جودة المشروبات", labelEn: "Drink quality", icon: "☕" },
  { key: "cleanliness", labelAr: "نظافة المكان", labelEn: "Place cleanliness", icon: "✨" },
  { key: "staff", labelAr: "تعامل الموظفين", labelEn: "Staff interaction", icon: "🤝" },
];

const RATINGS = [
  { key: "bad", icon: "😞" },
  { key: "neutral", icon: "😐" },
  { key: "good", icon: "😊" },
];

const FALLBACK = {
  ar: {
    heroTitle: "ما رأيك في زيارتك لنا؟",
    heroSubtitle: "تقييمك يساعدنا على التحسّن — شكراً لوقتك!",
    nameLabel: "اسم العميل",
    namePlaceholder: "اكتب اسمك هنا...",
    mobileLabel: "رقم الموبايل",
    mobilePlaceholder: "مثال: 01012345678",
    notesLabel: "ملاحظاتك لنا",
    notesPlaceholder: "اكتب أي ملاحظة أو اقتراح...",
    submitBtn: "إرسال التقييم ✨",
    surveyFoot: "جميع التقييمات تصلنا بشكل مباشر وفوري",
    doneTitle: "شكراً لتقييمك!",
    doneMessage: "ملاحظاتك وصلتنا بنجاح",
    againBtn: "تقييم جديد ✨",
    pageFooter: "تقييم رضا العملاء ⚡ Neon Survey",
    needRating: "اختر تقييماً في سؤال واحد على الأقل",
    needName: "من فضلك أدخل اسمك",
    needMobile: "من فضلك أدخل رقم الموبايل",
    sendError: "حدث خطأ أثناء الإرسال، حاول مرة أخرى",
    sending: "جارٍ الإرسال...",
    "r.bad": "سيئ",
    "r.neutral": "محايد",
    "r.good": "راضي",
  },
  en: {
    heroTitle: "How was your visit?",
    heroSubtitle: "Your feedback helps us improve — thanks for your time!",
    nameLabel: "Customer name",
    namePlaceholder: "Type your name here...",
    mobileLabel: "Mobile number",
    mobilePlaceholder: "e.g. 01012345678",
    notesLabel: "Your notes",
    notesPlaceholder: "Write any note or suggestion...",
    submitBtn: "Submit rating ✨",
    surveyFoot: "All ratings reach us directly & instantly",
    doneTitle: "Thank you for your rating!",
    doneMessage: "Your feedback was received successfully",
    againBtn: "New rating ✨",
    pageFooter: "Customer satisfaction survey ⚡ Neon Survey",
    needRating: "Please select at least one rating",
    needName: "Please enter your name",
    needMobile: "Please enter your mobile number",
    sendError: "Something went wrong, please try again",
    sending: "Sending...",
    "r.bad": "Bad",
    "r.neutral": "Neutral",
    "r.good": "Good",
  },
};

let content = {};
let lang = "ar";
let selected = {};

function t(key) {
  const c = content[lang] || {};
  if (c[key] && String(c[key]).trim()) return c[key];
  return (FALLBACK[lang] && FALLBACK[lang][key]) || FALLBACK.ar[key] || key;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (typeof child === "string") node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function renderQuestions() {
  const container = document.getElementById("surveyQuestions");
  container.innerHTML = "";

  for (const q of questions) {
    const card = el("div", { class: "card survey-q", "data-q": q.key });
    const header = el("div", { class: "survey-q-header" });
    header.appendChild(el("span", { class: "survey-q-icon" }, [q.icon || "⭐"]));
    const labelText = lang === "ar" ? (q.labelAr || q.labelEn || q.key) : (q.labelEn || q.labelAr || q.key);
    header.appendChild(el("span", { class: "survey-q-label" }, [labelText]));
    card.appendChild(header);

    const options = el("div", { class: "survey-options" });
    for (const r of RATINGS) {
      const btn = el("button", {
        type: "button",
        class: `survey-option ${r.key}${selected[q.key] === r.key ? " active" : ""}`,
        "data-rating": r.key,
        onclick: () => selectOption(q.key, r.key),
      });
      btn.appendChild(el("span", { class: "survey-option-icon" }, [r.icon]));
      btn.appendChild(el("span", { class: "survey-option-label" }, [t("r." + r.key)]));
      options.appendChild(btn);
    }
    card.appendChild(options);
    container.appendChild(card);
  }
}

function selectOption(questionKey, ratingKey) {
  selected[questionKey] = ratingKey;
  document.querySelectorAll(`[data-q="${questionKey}"] .survey-option`).forEach((o) => {
    o.classList.toggle("active", o.dataset.rating === ratingKey);
  });
}

function applyContent() {
  document.getElementById("surveyTitle").textContent = t("heroTitle");
  document.title = t("heroTitle");
  document.getElementById("surveySubtitle").textContent = t("heroSubtitle");
  document.getElementById("surveyNameLabel").textContent = t("nameLabel");
  document.getElementById("surveyName").placeholder = t("namePlaceholder");
  document.getElementById("surveyMobileLabel").textContent = t("mobileLabel");
  document.getElementById("surveyMobile").placeholder = t("mobilePlaceholder");
  document.getElementById("surveyNotesLabel").textContent = t("notesLabel");
  document.getElementById("surveyNotes").placeholder = t("notesPlaceholder");
  document.getElementById("surveySubmitBtn").textContent = t("submitBtn");
  document.getElementById("surveyFoot").textContent = t("surveyFoot");
  document.getElementById("doneTitle").textContent = t("doneTitle");
  document.getElementById("doneMessage").textContent = t("doneMessage");
  document.getElementById("surveyAgainBtn").textContent = t("againBtn");
  document.getElementById("pageFooter").textContent = t("pageFooter");
  renderQuestions();
}

function applyLang() {
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  const langBtn = document.getElementById("langBtn");
  if (langBtn) langBtn.textContent = lang === "ar" ? "EN" : "ع";
  applyContent();
}

async function loadSettings() {
  try {
    const res = await fetch("/api/settings/public");
    const data = await res.json();
    if (data.questions && Array.isArray(data.questions)) {
      renderQuestions(data.questions);
    }
    window.SURVEY_DEFAULT_MODE = data.mode || "dark";
    window.SURVEY_THEME = data.theme || {};
    if (data.title) document.getElementById("surveyTitle").textContent = data.title;
    if (data.lang === "en") lang = "en";
    if (Array.isArray(data.questions) && data.questions.length > 0) {
      questions = data.questions;
    }
    content = data.content || {};
    applyTheme(window.SURVEY_THEME);
    applyLogos(data.logos);
    applyLang();
    updateModeButton();
  } catch (e) {
    applyTheme({});
    applyLang();
  }
}

async function submitSurvey() {
  const name = document.getElementById("surveyName").value.trim();
  const mobile = document.getElementById("surveyMobile").value.trim();
  const notes = document.getElementById("surveyNotes").value.trim();
  if (!name) {
    alert(t("needName"));
    document.getElementById("surveyName").focus();
    return;
  }
  if (!mobile) {
    alert(t("needMobile"));
    document.getElementById("surveyMobile").focus();
    return;
  }
  const ratings = {};
  let count = 0;
  for (const q of questions) {
    if (selected[q.key]) {
      ratings[q.key] = selected[q.key];
      count++;
    }
  }
  if (!count) {
    alert(t("needRating"));
    return;
  }

  const btn = document.getElementById("surveySubmitBtn");
  btn.disabled = true;
  btn.textContent = t("sending");
  try {
    const res = await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings, notes, name, mobile }),
    });
    if (!res.ok) throw new Error("fail");
    document.getElementById("surveyForm").style.display = "none";
    document.getElementById("surveyDone").style.display = "block";
  } catch (e) {
    alert(t("sendError"));
    btn.disabled = false;
    btn.textContent = t("submitBtn");
  }
}

function resetSurvey() {
  selected = {};
  document.getElementById("surveyForm").style.display = "";
  document.getElementById("surveyDone").style.display = "none";
  document.getElementById("surveyNotes").value = "";
  document.getElementById("surveyName").value = "";
  document.getElementById("surveyMobile").value = "";
  document.querySelectorAll(".survey-option").forEach((o) => o.classList.remove("active"));
}

document.getElementById("surveyForm").addEventListener("submit", (e) => {
  e.preventDefault();
  submitSurvey();
});
document.getElementById("surveyAgainBtn").addEventListener("click", resetSurvey);
document.getElementById("langBtn").addEventListener("click", () => {
  lang = lang === "ar" ? "en" : "ar";
  applyLang();
});
document.querySelectorAll("[data-mode-toggle]").forEach((btn) => {
  btn.addEventListener("click", toggleThemeMode);
});

applyTheme({});
applyLang();
loadSettings();
