
// ===== تحليلات وفلاتر الداشبورد المتقدمة =====
let currentSatFilter = "all";
let currentQuickDate = "all";

function renderAdvancedDashboard(stats, responses) {
  const total = stats.totalResponses || 0;
  const avgScore = stats.averageScore || 0;
  const satisfactionPct = total ? Math.round(((avgScore - 1) / 2) * 100) : 0;

  // 1. Render Top KPI Cards
  const kpiRow = document.getElementById("dashboardKpiRow");
  if (kpiRow) {
    let topItem = "—";
    let topItemScore = 0;
    let lowItem = "—";
    let lowItemScore = 999;

    for (const [key, qStat] of Object.entries(stats.perQuestion || {})) {
      if (qStat.total > 0) {
        if (qStat.avg > topItemScore) {
          topItemScore = qStat.avg;
          topItem = `${qStat.icon || ""} ${qStat.labelAr || key}`;
        }
        if (qStat.avg < lowItemScore) {
          lowItemScore = qStat.avg;
          lowItem = `${qStat.icon || ""} ${qStat.labelAr || key}`;
        }
      }
    }

    kpiRow.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon-box">📥</div>
        <div>
          <div class="kpi-val">${total}</div>
          <div class="kpi-label">إجمالي التقييمات</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background:rgba(0,255,157,0.12);border-color:rgba(0,255,157,0.3);box-shadow:0 0 15px rgba(0,255,157,0.2)">⭐</div>
        <div>
          <div class="kpi-val" style="color:#00ff9d">${avgScore} <span style="font-size:0.5em;color:var(--color-text-muted)">/ 3</span></div>
          <div class="kpi-label">معدل الرضا العام (${satisfactionPct}%)</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background:rgba(255,183,3,0.12);border-color:rgba(255,183,3,0.3);box-shadow:0 0 15px rgba(255,183,3,0.2)">💬</div>
        <div>
          <div class="kpi-val" style="color:#ffb703">${stats.withNotes || 0}</div>
          <div class="kpi-label">تقييمات بملاحظات</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background:rgba(139,92,246,0.12);border-color:rgba(139,92,246,0.3)">🏆</div>
        <div>
          <div class="kpi-val" style="font-size:1.15em;font-weight:800;color:#c084fc">${topItem}</div>
          <div class="kpi-label">الأعلى تقييماً (${topItemScore || 0}/3)</div>
        </div>
      </div>
    `;
  }

  // 2. Render Gauge Meter
  const gaugeEl = document.getElementById("overallGaugeContainer");
  if (gaugeEl) {
    gaugeEl.innerHTML = `
      <div class="gauge-circle" style="border-color:${satisfactionPct >= 70 ? 'rgba(0,255,157,0.4)' : (satisfactionPct >= 40 ? 'rgba(255,183,3,0.4)' : 'rgba(255,42,95,0.4)')}">
        <div class="gauge-percent" style="color:${satisfactionPct >= 70 ? '#00ff9d' : (satisfactionPct >= 40 ? '#ffb703' : '#ff2a5f')}">${satisfactionPct}%</div>
        <div class="gauge-caption">${satisfactionPct >= 80 ? 'ممتاز جداً 🌟' : (satisfactionPct >= 60 ? 'جيد جداً 👍' : (satisfactionPct >= 40 ? 'متوسط ⚠️' : 'بحاجة لتحسين 🚨'))}</div>
      </div>
    `;
  }

  // 3. Render Breakdown Bars
  const breakdownEl = document.getElementById("overallBreakdownContainer");
  if (breakdownEl) {
    let countGood = 0, countNeutral = 0, countBad = 0, totalRatingsCount = 0;
    for (const r of responses) {
      for (const rating of Object.values(r.ratings || {})) {
        if (rating === "good") countGood++;
        else if (rating === "neutral") countNeutral++;
        else if (rating === "bad") countBad++;
        totalRatingsCount++;
      }
    }

    const pctGood = totalRatingsCount ? Math.round((countGood / totalRatingsCount) * 100) : 0;
    const pctNeutral = totalRatingsCount ? Math.round((countNeutral / totalRatingsCount) * 100) : 0;
    const pctBad = totalRatingsCount ? Math.round((countBad / totalRatingsCount) * 100) : 0;

    breakdownEl.innerHTML = `
      <div class="breakdown-row">
        <div class="breakdown-info">
          <span style="color:#00ff9d">😊 راضي / ممتاز (${countGood})</span>
          <span style="color:#00ff9d">${pctGood}%</span>
        </div>
        <div class="breakdown-bar-track">
          <div class="breakdown-bar-fill" style="width:${pctGood}%;background:#00ff9d"></div>
        </div>
      </div>

      <div class="breakdown-row">
        <div class="breakdown-info">
          <span style="color:#ffb703">😐 محايد / متوسط (${countNeutral})</span>
          <span style="color:#ffb703">${pctNeutral}%</span>
        </div>
        <div class="breakdown-bar-track">
          <div class="breakdown-bar-fill" style="width:${pctNeutral}%;background:#ffb703"></div>
        </div>
      </div>

      <div class="breakdown-row">
        <div class="breakdown-info">
          <span style="color:#ff2a5f">😞 غير راضٍ / سيئ (${countBad})</span>
          <span style="color:#ff2a5f">${pctBad}%</span>
        </div>
        <div class="breakdown-bar-track">
          <div class="breakdown-bar-fill" style="width:${pctBad}%;background:#ff2a5f"></div>
        </div>
      </div>
    `;
  }
}

function renderStructuredQuestionStats(stats) {
  const container = document.getElementById("surveyQuestionStats");
  if (!container) return;
  container.innerHTML = "";

  for (const [key, row] of Object.entries(stats.perQuestion || {})) {
    if (!row) continue;
    const box = el("div", { class: "question-stat-box" });
    
    const header = el("div", { class: "q-stat-header" });
    header.appendChild(el("span", {}, [`${row.icon || "⭐"} ${row.labelAr || key}`]));
    header.appendChild(el("span", { style: "color:var(--color-primary)" }, [`${row.avg} / 3 ⭐`]));
    box.appendChild(header);

    for (const [rk, meta] of Object.entries(RATING_META)) {
      const count = row[rk] || 0;
      const pct = row.total ? Math.round((count / row.total) * 100) : 0;
      
      const bRow = el("div", { style: "margin-bottom:8px" });
      const bInfo = el("div", { style: "display:flex;justify-content:space-between;font-size:0.82em;font-weight:700;margin-bottom:3px" });
      bInfo.appendChild(el("span", { style: `color:${meta.color}` }, [`${meta.label} (${count})`]));
      bInfo.appendChild(el("span", {}, [`${pct}%`]));
      
      const bTrack = el("div", { class: "breakdown-bar-track" });
      bTrack.appendChild(el("div", { class: "breakdown-bar-fill", style: `width:${pct}%;background:${meta.color}` }));

      bRow.appendChild(bInfo);
      bRow.appendChild(bTrack);
      box.appendChild(bRow);
    }

    container.appendChild(box);
  }
}

function renderStructuredResponses(responses) {
  const container = document.getElementById("surveyResponsesList");
  const countBadge = document.getElementById("surveyResultsCountBadge");
  if (!container) return;
  container.innerHTML = "";

  if (countBadge) countBadge.textContent = `${responses.length} تقييم معروض`;

  if (!responses.length) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--color-text-muted);border-style:dashed;background:transparent">
      <div style="font-size:36px;margin-bottom:10px">🔍</div>
      <div style="font-size:1.1em;font-weight:800">لا توجد نتائج مطابقة للفلاتر المحددة</div>
      <p style="font-size:0.88em;margin-top:6px">جرب تغيير معايير البحث أو اختيار فترة زمنية أخرى</p>
    </div>`;
    return;
  }

  for (const r of responses) {
    const card = el("div", { class: "structured-response-card" });

    // Determine overall satisfaction level
    const ratings = r.ratings || {};
    const values = Object.values(ratings);
    let statusClass = "resp-status-good";
    let statusText = "راضي جداً 😊";
    if (values.includes("bad")) {
      statusClass = "resp-status-bad";
      statusText = "يحتاج متابعة 😞";
    } else if (values.includes("neutral")) {
      statusClass = "resp-status-neutral";
      statusText = "محايد 😐";
    }

    // Header
    const header = el("div", { class: "resp-header" });
    
    const userBox = el("div", { class: "resp-user-box" });
    userBox.appendChild(el("div", { class: "resp-avatar" }, ["👤"]));
    
    const info = el("div", {});
    info.appendChild(el("div", { class: "resp-name" }, [r.customerName || "عميل بدون اسم"]));
    
    const metaRow = el("div", { class: "resp-meta-row" });
    if (r.customerMobile) {
      metaRow.appendChild(el("a", { class: "resp-phone-link", href: "tel:" + r.customerMobile }, [`📱 ${r.customerMobile} (اتصال)`]));
    } else {
      metaRow.appendChild(el("span", {}, ["بدون رقم"]));
    }
    metaRow.appendChild(el("span", {}, ["•"]));
    metaRow.appendChild(el("span", {}, [`📅 ${surveyDateStr(r.createdAt)}`]));
    info.appendChild(metaRow);
    userBox.appendChild(info);
    header.appendChild(userBox);

    const rightBadges = el("div", { style: "display:flex;align-items:center;gap:8px" });
    rightBadges.appendChild(el("span", { class: `resp-status-badge ${statusClass}` }, [statusText]));
    rightBadges.appendChild(el("span", { class: "badge badge-ghost" }, [`#${r.id}`]));
    header.appendChild(rightBadges);

    card.appendChild(header);

    // Criteria Grid
    const critGrid = el("div", { class: "resp-criteria-grid" });
    for (const [qKey, rating] of Object.entries(ratings)) {
      if (!rating) continue;
      const m = RATING_META[rating] || { label: rating, color: "#fff" };
      const matched = criteriaList.find(c => c.key === qKey);
      const qLabel = matched ? `${matched.icon || "⭐"} ${matched.labelAr || matched.key}` : qKey;

      const p = el("div", { class: "criteria-pill-item" });
      p.appendChild(el("span", { class: "criteria-pill-label" }, [qLabel]));
      p.appendChild(el("span", { class: "criteria-pill-val", style: `color:${m.color}` }, [m.label]));
      critGrid.appendChild(p);
    }
    card.appendChild(critGrid);

    // Notes Quote
    if (r.notes && r.notes.trim()) {
      card.appendChild(el("div", { class: "resp-notes-quote" }, [`💬 ${r.notes}`]));
    }

    // Actions
    const actionsRow = el("div", { class: "resp-actions-row" });
    actionsRow.appendChild(el("button", { class: "btn btn-sm btn-danger", onclick: () => deleteSurveyResponse(r.id) }, ["حذف التقييم 🗑️"]));
    card.appendChild(actionsRow);

    container.appendChild(card);
  }
}

// Filter Logic Enhancement
function applySurveyFilters() {
  const q = (searchText || "").trim().toLowerCase();
  
  return allResponses.filter((r) => {
    // 1. Search Query
    if (q) {
      const name = (r.customerName || "").toLowerCase();
      const mobile = (r.customerMobile || "").toLowerCase();
      const notes = (r.notes || "").toLowerCase();
      if (!name.includes(q) && !mobile.includes(q) && !notes.includes(q)) return false;
    }

    // 2. Satisfaction Filter
    if (currentSatFilter === "good") {
      const vals = Object.values(r.ratings || {});
      if (!vals.includes("good") || vals.includes("bad")) return false;
    } else if (currentSatFilter === "neutral") {
      const vals = Object.values(r.ratings || {});
      if (!vals.includes("neutral") || vals.includes("bad")) return false;
    } else if (currentSatFilter === "bad") {
      const vals = Object.values(r.ratings || {});
      if (!vals.includes("bad")) return false;
    } else if (currentSatFilter === "notes") {
      if (!r.notes || !r.notes.trim()) return false;
    }

    // 3. Date Filters
    const d = surveyDateOnly(r.createdAt);
    if (fromDate && d && d < fromDate) return false;
    if (toDate && d && d > toDate) return false;

    // Quick Date Filter
    if (currentQuickDate === "today") {
      const today = new Date().toISOString().slice(0, 10);
      if (d !== today) return false;
    } else if (currentQuickDate === "week") {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      if (d < weekAgo) return false;
    } else if (currentQuickDate === "month") {
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      if (d < monthAgo) return false;
    }

    return true;
  });
}

function setupAdvancedFilterListeners() {
  // Sat Pills
  document.querySelectorAll("[data-filter-sat]").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("[data-filter-sat]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSatFilter = btn.dataset.filterSat;
      renderFilteredResponses();
    };
  });

  // Quick Date Pills
  document.querySelectorAll("[data-quick-date]").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("[data-quick-date]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentQuickDate = btn.dataset.quickDate;
      renderFilteredResponses();
    };
  });

  // Export CSV
  const exportBtn = document.getElementById("exportCsvBtn");
  if (exportBtn) {
    exportBtn.onclick = exportResponsesToCsv;
  }
}

function exportResponsesToCsv() {
  const filtered = applySurveyFilters();
  if (!filtered.length) {
    toast("لا توجد بيانات لتصديرها", "error", "⚠️");
    return;
  }

  let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Arabic support
  csvContent += "المعرف,اسم العميل,رقم الموبايل,التاريخ,الملاحظات,التقييمات\n";

  for (const r of filtered) {
    const ratingsStr = Object.entries(r.ratings || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");
    const line = [
      `"${r.id}"`,
      `"${(r.customerName || '').replace(/"/g, '""')}"`,
      `"${r.customerMobile || ''}"`,
      `"${surveyDateStr(r.createdAt)}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      `"${ratingsStr}"`
    ].join(",");
    csvContent += line + "\n";
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `survey_results_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("تم تصدير ملف الإكسيل بنجاح! 📊", "success", "✓");
}


let slackWebhook = "";
let slackEnabled = true;

async function saveSlackSettings() {
  const url = document.getElementById("slackWebhookInput").value.trim();
  const enabled = document.getElementById("slackEnabledSelect").value === "true";
  try {
    await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ slackWebhook: url, slackEnabled: enabled })
    });
    slackWebhook = url;
    slackEnabled = enabled;
    toast("تم حفظ إعدادات ربط Slack بنجاح", "success", "💬");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

async function testSlackNotification() {
  const url = document.getElementById("slackWebhookInput").value.trim();
  if (!url) {
    toast("من فضلك أدخل رابط الـ Webhook أولاً", "error", "⚠️");
    document.getElementById("slackWebhookInput").focus();
    return;
  }
  const btn = document.getElementById("testSlackBtn");
  btn.disabled = true;
  btn.textContent = "جارٍ الإرسال... ⏳";
  try {
    const data = await api("/api/admin/slack/test", {
      method: "POST",
      body: JSON.stringify({ webhookUrl: url })
    });
    toast(data.message || "تم إرسال الإشعار إلى Slack بنجاح! تحقق من قناتك 🎉", "success", "🔔");
  } catch (e) {
    toast(e.message || "فشل إرسال الإشعار، تأكد من صحة الرابط", "error", "⚠️");
  } finally {
    btn.disabled = false;
    btn.textContent = "إرسال إشعار تجريبي 🔔";
  }
}

let token = localStorage.getItem("surveyAdminToken") || "";
let themeDraft = {};
let logoData = { brand: "", bg: "", icon: "" };
let contentFlat = {};
let criteriaList = [];
let contentEditorLang = "ar";
let lang = "ar";
let mode = "dark";
let surveyUrl = "";
let lanUrl = "";

function surveyBaseUrl() {
  if (surveyUrl) return surveyUrl;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    if (lanUrl) return lanUrl;
  }
  return window.location.origin;
}

const THEME_COLOR_FIELDS = [
  { key: "--color-primary", label: "لون النيون الرئيسي (Primary Glow)", type: "color" },
  { key: "--color-secondary", label: "لون النيون الثانوي (Secondary)", type: "color" },
  { key: "--color-accent", label: "لون اللمسة الإضافية (Accent)", type: "color" },
  { key: "--color-header-bg", label: "لون خلفية الشريط الجانبي", type: "color" },
  { key: "--color-header-text", label: "لون نص الشريط الجانبي", type: "color" },
  { key: "--color-bg", label: "لون خلفية الصفحة", type: "color" },
  { key: "--color-text", label: "لون النص الرئيسي", type: "color" },
  { key: "--color-text-muted", label: "لون النص الثانوي", type: "color" },
  { key: "--color-success", label: "لون التقييم الممتاز (راضٍ)", type: "color" },
  { key: "--color-warning", label: "لون التقييم المتوسط (محايد)", type: "color" },
  { key: "--color-danger", label: "لون التقييم السيئ", type: "color" },
  { key: "--radius", label: "استدارة الحواف (Radius)", type: "text" },
  { key: "--font-size-base", label: "حجم الخط الأساسي", type: "text" },
];

const LOGO_SLOTS = [
  { key: "brand", label: "شعار أعلى الاستبيان (Brand Logo)", desc: "يظهر في قمة صفحة الاستبيان ويتكيف تلقائياً مع حجم البطاقة" },
  { key: "bg", label: "شعار الخلفية (Watermark Logo)", desc: "يظهر كعلامة مائية خفيفة وأنيقة في خلفية الشاشة" },
  { key: "icon", label: "أيقونة التطبيق (App Favicon)", desc: "تظهر كأيقونة في شريط المتصفح وعلى شاشة الموبايل" },
];

const RATING_META = {
  bad: { label: "سيئ", color: "var(--color-danger)" },
  neutral: { label: "محايد", color: "var(--color-warning)" },
  good: { label: "راضي", color: "var(--color-success)" },
};

const CONTENT_FIELDS = [
  { key: "heroTitle", label: "العنوان الرئيسي" },
  { key: "heroSubtitle", label: "الوصف أسفل العنوان" },
  { key: "nameLabel", label: "عنوان حقل اسم العميل" },
  { key: "namePlaceholder", label: "النص الإرشادي لاسم العميل" },
  { key: "mobileLabel", label: "عنوان حقل رقم الموبايل" },
  { key: "mobilePlaceholder", label: "النص الإرشادي لرقم الموبايل" },
  { key: "notesLabel", label: "عنوان حقل الملاحظات" },
  { key: "notesPlaceholder", label: "النص الإرشادي للملاحظات" },
  { key: "submitBtn", label: "نص زر الإرسال" },
  { key: "surveyFoot", label: "السطر أسفل النموذج" },
  { key: "doneTitle", label: "عنوان شاشة الشكر" },
  { key: "doneMessage", label: "نص شاشة الشكر" },
  { key: "againBtn", label: "نص زر تقييم جديد" },
  { key: "pageFooter", label: "نص التذييل" },
  { key: "needRating", label: "تنبيه: يجب اختيار تقييم" },
  { key: "needName", label: "تنبيه: يجب إدخال الاسم" },
  { key: "needMobile", label: "تنبيه: يجب إدخال الموبايل" },
  { key: "r.bad", label: "التقييم: سيئ" },
  { key: "r.neutral", label: "التقييم: محايد" },
  { key: "r.good", label: "التقييم: راضي" },
];

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "كلمة المرور غير صحيحة");
  }
  return data;
}

function toast(message, type = "success", icon) {
  const wrap = document.getElementById("toastWrap");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  if (icon) {
    const ic = document.createElement("span");
    ic.className = "toast-icon";
    ic.textContent = icon;
    el.appendChild(ic);
  }
  const txt = document.createElement("span");
  txt.textContent = message;
  el.appendChild(txt);
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
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

// ===== زر إظهار وإخفاء كلمة المرور =====
function setupPasswordToggle() {
  const input = document.getElementById("passwordInput");
  const btn = document.getElementById("togglePasswordBtn");
  if (!btn || !input) return;
  
  btn.onclick = function(e) {
    e.preventDefault();
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    btn.textContent = isPass ? "🙈" : "👁️";
    input.focus();
  };
}

async function login(password) {
  const data = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  token = data.token;
  localStorage.setItem("surveyAdminToken", token);
  enterAdmin(data);
}

function syncContentFrom(data) {
  contentFlat = {};
  for (const [lg, obj] of Object.entries(data.content || {})) {
    for (const [k, v] of Object.entries(obj)) {
      contentFlat[`${k}.${lg}`] = v;
    }
  }
}

function enterAdmin(data) {
  themeDraft = { ...(data.theme || {}) };
  logoData = { ...(data.logos || {}) };
  lang = data.lang || "ar";
  mode = data.mode || "dark";
  surveyUrl = data.surveyUrl || "";
  lanUrl = data.lanUrl || "";
  criteriaList = Array.isArray(data.questions) ? [...data.questions] : [];
  window.SURVEY_DEFAULT_MODE = mode;
  window.SURVEY_THEME = themeDraft;
  syncContentFrom(data);

  applyTheme(themeDraft);
  applyLogos(data.logos);
  updateModeButton();
  updateSideBrand();

  document.getElementById("loginOverlay").style.display = "none";
  document.getElementById("appShell").style.display = "flex";

  document.getElementById("projectTitleInput").value = data.title || "استبيان رضا العملاء";
  if (document.getElementById("slackWebhookInput")) {
    document.getElementById("slackWebhookInput").value = data.slackWebhook || "";
    document.getElementById("slackEnabledSelect").value = data.slackEnabled !== false ? "true" : "false";
  }
  document.getElementById("sideTitle").textContent = data.title || "استبيان رضا العملاء";
  document.getElementById("langSelect").value = lang;
  document.getElementById("modeSelect").value = mode;
  renderThemeFields();
  renderLogoManager();
  renderContentEditor();
  renderCriteriaManager();
  setupTabs();
  initFiltersOnce();
  loadSurvey();
}

function updateSideBrand() {
  const iconEl = document.getElementById("sideBrandIcon");
  if (iconEl) {
    iconEl.innerHTML = "";
    if (logoData.brand) {
      const img = document.createElement("img");
      img.src = logoData.brand;
      img.alt = "Brand Logo";
      iconEl.appendChild(img);
    } else {
      iconEl.textContent = "⚡";
    }
  }

  const loginIconEl = document.getElementById("loginBrandIcon");
  if (loginIconEl) {
    loginIconEl.innerHTML = "";
    if (logoData.brand) {
      const img = document.createElement("img");
      img.src = logoData.brand;
      img.alt = "Brand Logo";
      loginIconEl.appendChild(img);
    } else {
      loginIconEl.textContent = "⚡";
    }
  }
}

async function doLogin() {
  const input = document.getElementById("passwordInput");
  const errEl = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");
  
  errEl.style.display = "none";
  errEl.textContent = "";
  
  const val = (input.value || "").trim();
  if (!val) {
    errEl.textContent = "من فضلك أدخل كلمة المرور";
    errEl.style.display = "block";
    input.focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = "جارٍ التحقق... ⏳";

  try {
    await login(val);
  } catch (e) {
    errEl.textContent = e.message || "كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى";
    errEl.style.display = "block";
    input.focus();
  } finally {
    btn.disabled = false;
    btn.textContent = "دخول لوحة التحكم ✨";
  }
}

function showLogin() {
  document.getElementById("loginOverlay").style.display = "flex";
  document.getElementById("appShell").style.display = "none";
}

async function doLogout() {
  try {
    if (token) await api("/api/admin/logout", { method: "POST" });
  } catch (e) {}
  token = "";
  localStorage.removeItem("surveyAdminToken");
  showLogin();
  document.getElementById("passwordInput").value = "";
}

// ===== التبويبات =====
function setupTabs() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      const view = document.getElementById("view-" + tab);
      if (view) view.classList.add("active");
      if (tab === "survey") loadSurvey();
      if (tab === "criteria") renderCriteriaManager();
    });
  });
}

function initFiltersOnce() {
  if (document.getElementById("surveySearchInput")) {
    initSurveyFilters();
  setupAdvancedFilterListeners();
  }
}

// ===== إدارة بنود التقييم التفاعلية والحفظ الفوري =====
function renderCriteriaManager() {
  const container = document.getElementById("criteriaList");
  if (!container) return;
  container.innerHTML = "";

  if (!criteriaList.length) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:30px;color:var(--color-text-muted);border-style:dashed;background:transparent">
      <div style="font-size:32px;margin-bottom:8px">📋</div>
      <div style="font-weight:800;font-size:1.05em">لا توجد بنود تقييم حالياً</div>
      <p style="font-size:0.86em;margin-top:4px">أضف بنداً جديداً في الأعلى أو استعد البنود الافتراضية</p>
    </div>`;
    return;
  }

  criteriaList.forEach((item, index) => {
    const card = el("div", { class: "criteria-card" });
    
    const iconSpan = el("div", { class: "criteria-icon-box" }, [item.icon || "⭐"]);
    card.appendChild(iconSpan);

    const info = el("div", { style: "flex:1;min-width:180px" });
    info.appendChild(el("div", { class: "criteria-title" }, [item.labelAr || "بند بدون اسم"]));
    info.appendChild(el("div", { class: "criteria-sub" }, [item.labelEn || item.key]));
    card.appendChild(info);

    const actions = el("div", { class: "criteria-actions" });
    const delBtn = el("button", { class: "btn btn-sm btn-danger", onclick: () => deleteCriteria(index) }, ["حذف ✕"]);
    actions.appendChild(delBtn);
    card.appendChild(actions);

    container.appendChild(card);
  });
}

async function deleteCriteria(index) {
  const item = criteriaList[index];
  if (!confirm(`هل تريد حذف بند "${item.labelAr || item.key}" نهائياً من الاستبيان؟`)) return;
  criteriaList.splice(index, 1);
  renderCriteriaManager();
  
  // Save immediately
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ questions: criteriaList }),
    });
    criteriaList = Array.isArray(data.questions) ? [...data.questions] : criteriaList;
    try { localStorage.removeItem("surveyPublicCache"); } catch(e){}
    toast("تم حذف البند وحفظ التغييرات في الاستبيان بنجاح! 🗑️", "success", "✓");
  } catch (e) {
    toast("تم الحذف محلياً، اضغط على حفظ التغييرات 💾", "info", "💾");
  }
}

async function addCriteria() {
  const ar = document.getElementById("newCriteriaAr").value.trim();
  const en = document.getElementById("newCriteriaEn").value.trim();
  const icon = document.getElementById("newCriteriaIcon").value.trim() || "⭐";

  if (!ar) {
    toast("من فضلك اكتب اسم البند بالعربية", "error", "⚠️");
    document.getElementById("newCriteriaAr").focus();
    return;
  }

  const key = "q_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  criteriaList.push({
    key,
    labelAr: ar,
    labelEn: en || ar,
    icon,
  });

  document.getElementById("newCriteriaAr").value = "";
  document.getElementById("newCriteriaEn").value = "";
  document.getElementById("newCriteriaIcon").value = "";

  renderCriteriaManager();

  // Auto-save on add
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ questions: criteriaList }),
    });
    criteriaList = Array.isArray(data.questions) ? [...data.questions] : criteriaList;
    try { localStorage.removeItem("surveyPublicCache"); } catch(e){}
    toast("تمت إضافة البند وحفظه في الاستبيان بنجاح! ✨", "success", "✓");
  } catch (e) {
    toast("تمت إضافة البند! اضغط على حفظ التغييرات 💾", "info", "💾");
  }
}

async function saveCriteria() {
  const saveBtn = document.getElementById("saveCriteriaBtn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "جارٍ الحفظ... ⏳";
  }
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ questions: criteriaList }),
    });
    criteriaList = Array.isArray(data.questions) ? [...data.questions] : criteriaList;
    renderCriteriaManager();
    try { localStorage.removeItem("surveyPublicCache"); } catch(e){}
    toast("تم حفظ وتحديث بنود التقييم في الاستبيان بنجاح! 🚀", "success", "💾");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "حفظ التغييرات 💾";
    }
  }
}

async function resetCriteria() {
  if (!confirm("هل تريد استعادة بنود التقييم الافتراضية العشرة؟")) return;
  try {
    const defaultList = [
      { key: "overall", labelAr: "كيف تقيّم زيارتك بشكل عام؟", labelEn: "How would you rate your overall visit?", icon: "🍽️" },
      { key: "service", labelAr: "جودة الخدمة", labelEn: "Service quality", icon: "🛎️" },
      { key: "drinks", labelAr: "جودة المشروبات", labelEn: "Drink quality", icon: "☕" },
      { key: "cleanliness", labelAr: "نظافة المكان", labelEn: "Place cleanliness", icon: "✨" },
      { key: "staff", labelAr: "تعامل الموظفين", labelEn: "Staff interaction", icon: "🤝" },
      { key: "speed", labelAr: "سرعة تلبية الطلب", labelEn: "Speed of service", icon: "⏱️" },
      { key: "food", labelAr: "جودة المأكولات", labelEn: "Food quality", icon: "🍕" },
      { key: "ambiance", labelAr: "أجواء المكان والديكور", labelEn: "Ambiance & music", icon: "🎵" },
      { key: "value", labelAr: "القيمة مقابل السعر", labelEn: "Value for money", icon: "💰" },
      { key: "welcome", labelAr: "الاستقبال والترحيب", labelEn: "Reception & hospitality", icon: "👋" },
    ];
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ questions: defaultList }),
    });
    criteriaList = Array.isArray(data.questions) ? [...data.questions] : defaultList;
    renderCriteriaManager();
    try { localStorage.removeItem("surveyPublicCache"); } catch(e){}
    toast("تمت استعادة البنود الافتراضية وحفظها بنجاح", "success", "✓");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

// ===== النتائج والإحصائيات =====
let allResponses = [];
let searchText = "";
let fromDate = "";
let toDate = "";

function surveyDateStr(value) {
  if (!value) return "";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]} — ${m[4]}:${m[5]}:${m[6]}`;
  return String(value);
}

function surveyDateOnly(value) {
  if (!value) return "";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

async function loadSurvey() {
  const target = `${surveyBaseUrl().replace(/\/+$/, "")}/survey`;
  document.getElementById("surveyQrImg").src = "/api/survey/qr";
  document.getElementById("surveyQrTarget").textContent = target;
  document.getElementById("surveyUrlInput").value = surveyUrl;
  const dl = document.getElementById("surveyQrDownload");
  dl.href = "/api/survey/qr";
  dl.addEventListener("click", () => setTimeout(() => { try { dl.download = "survey-qr.png"; } catch (e) {} }, 0));
  const openBtn = document.getElementById("surveyOpenBtn");
  openBtn.href = target;
  document.getElementById("surveyWelcome").textContent = `رابط الاستبيان المباشر: ${target}`;

  try {
    const [stats, responses] = await Promise.all([
      api("/api/admin/survey/stats"),
      api("/api/admin/survey"),
    ]);
    allResponses = responses || [];
    renderAdvancedDashboard(stats, responses);
    renderStructuredQuestionStats(stats);
    renderFilteredResponses();
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

function applySurveyFilters() {
  const q = searchText.trim().toLowerCase();
  return allResponses.filter((r) => {
    if (q) {
      const name = (r.customerName || "").toLowerCase();
      const mobile = (r.customerMobile || "").toLowerCase();
      if (!name.includes(q) && !mobile.includes(q)) return false;
    }
    if (fromDate) {
      const d = surveyDateOnly(r.createdAt);
      if (d && d < fromDate) return false;
    }
    if (toDate) {
      const d = surveyDateOnly(r.createdAt);
      if (d && d > toDate) return false;
    }
    return true;
  });
}

function renderFilteredResponses() {
  const filtered = applySurveyFilters();
  const countEl = document.getElementById("surveyResultsCount");
  if (countEl) {
    countEl.textContent = `عدد النتائج المعروضة: ${filtered.length} من إجمالي ${allResponses.length}`;
  }
  renderStructuredResponses(filtered);
}

function initSurveyFilters() {
  const search = document.getElementById("surveySearchInput");
  const from = document.getElementById("surveyFromInput");
  const to = document.getElementById("surveyToInput");
  const clear = document.getElementById("surveyFilterClearBtn");
  if (!search) return;
  search.addEventListener("input", () => {
    searchText = search.value;
    renderFilteredResponses();
  });
  from.addEventListener("change", () => {
    fromDate = from.value;
    renderFilteredResponses();
  });
  to.addEventListener("change", () => {
    toDate = to.value;
    renderFilteredResponses();
  });
  clear.addEventListener("click", () => {
    search.value = "";
    from.value = "";
    to.value = "";
    searchText = "";
    fromDate = "";
    toDate = "";
    renderFilteredResponses();
  });
}

async function saveSurveyUrl() {
  const value = document.getElementById("surveyUrlInput").value.trim();
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ surveyUrl: value }),
    });
    surveyUrl = data.surveyUrl || "";
    lanUrl = data.lanUrl || "";
    document.getElementById("surveyUrlInput").value = surveyUrl;
    loadSurvey();
    toast(surveyUrl ? "تم حفظ وتحديث رابط الاستبيان" : "تم تفعيل العنوان التلقائي", "success", "🔗");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

function renderSurveyStats(stats) {
  const grid = document.getElementById("surveyStatsGrid");
  grid.innerHTML = "";
  const cards = [
    { label: "إجمالي التقييمات", value: stats.totalResponses, icon: "📥" },
    { label: "تقييمات بملاحظات", value: stats.withNotes, icon: "💬" },
    { label: "متوسط الرضا العام", value: `${stats.averageScore || 0} / 3`, icon: "⭐" },
  ];
  for (const c of cards) {
    grid.appendChild(
      el("div", { class: "stat-card" }, [
        el("div", { class: "stat-icon" }, [c.icon]),
        el("div", {}, [
          el("div", { class: "stat-value" }, [String(c.value)]),
          el("div", { class: "stat-label" }, [c.label]),
        ]),
      ])
    );
  }
}

function renderSurveyQuestionStats(stats) {
  const container = document.getElementById("surveyQuestionStats");
  container.innerHTML = "";
  for (const [key, row] of Object.entries(stats.perQuestion || {})) {
    if (!row) continue;
    const wrap = el("div", { class: "survey-question-stats" });
    const title = el("div", { class: "survey-q-header", style: "margin-bottom:8px" });
    const label = row.labelAr || key;
    title.appendChild(el("span", { class: "survey-q-label" }, [`${row.icon || "⭐"} ${label}`]));
    title.appendChild(el("span", { class: "survey-q-label", style: "opacity:.75;font-size:0.9em" }, [`متوسط: ${row.avg} / 3`]));
    wrap.appendChild(title);

    for (const [rk, meta] of Object.entries(RATING_META)) {
      const count = row[rk] || 0;
      const pct = row.total ? Math.round((count / row.total) * 100) : 0;
      const bar = el("div", { class: "survey-bar" });
      bar.appendChild(el("span", { style: `width:${pct}%;background:${meta.color};color:${meta.color}` }));
      const text = el("div", { style: "display:flex;justify-content:space-between;font-size:.84em;margin-top:4px;font-weight:700" });
      text.appendChild(el("span", {}, [`${meta.label} (${count})`]));
      text.appendChild(el("span", {}, [`${pct}%`]));
      wrap.appendChild(bar);
      wrap.appendChild(text);
    }
    container.appendChild(wrap);
  }
}

function renderSurveyResponses(responses) {
  const container = document.getElementById("surveyResponsesList");
  container.innerHTML = "";
  if (!responses.length) {
    container.appendChild(
      el("div", { class: "card", style: "background:transparent;border-style:dashed;text-align:center;padding:30px;color:var(--color-text-muted)" }, [
        "لا توجد نتائج مطابقة لبحثك",
      ])
    );
    return;
  }
  for (const r of responses) {
    const row = el("div", { class: "survey-response-card" });

    const top = el("div", { class: "survey-response-top" });
    const cust = el("div", { style: "flex:1;min-width:0" });
    const custRow = el("div", { class: "survey-response-cust" });
    const avatar = el("div", { class: "survey-response-avatar" }, ["👤"]);
    custRow.appendChild(avatar);
    const custInfo = el("div", { style: "min-width:0" });
    custInfo.appendChild(el("div", { class: "survey-response-name" }, [r.customerName || "عميل بدون اسم"]));
    const sub = el("div", { class: "survey-response-sub" });
    if (r.customerMobile) {
      sub.appendChild(el("a", { href: "tel:" + r.customerMobile, class: "survey-response-tel" }, ["📱 " + r.customerMobile]));
    } else {
      sub.appendChild(el("span", { class: "survey-response-muted" }, ["بدون رقم موبايل"]));
    }
    custInfo.appendChild(sub);
    custRow.appendChild(custInfo);
    cust.appendChild(custRow);
    top.appendChild(cust);

    const meta = el("div", {});
    meta.appendChild(el("span", { class: "survey-response-id" }, [`#${r.id}`]));
    top.appendChild(meta);
    row.appendChild(top);

    const timeBar = el("div", { class: "survey-response-timebar" }, ["📅 " + surveyDateStr(r.createdAt)]);
    row.appendChild(timeBar);

    const ratingsWrap = el("div", { class: "survey-response-ratings" });
    for (const [qKey, rating] of Object.entries(r.ratings || {})) {
      if (!rating) continue;
      const m = RATING_META[rating];
      if (!m) continue;
      const matched = criteriaList.find(c => c.key === qKey);
      const qLabel = matched ? (matched.labelAr || matched.key) : qKey;
      ratingsWrap.appendChild(
        el("span", { class: `survey-mini ${rating}` }, [
          `${qLabel}: `,
          el("span", {}, [m.label]),
        ])
      );
    }
    row.appendChild(ratingsWrap);

    if (r.notes) {
      row.appendChild(el("div", { class: "survey-response-notes" }, [`💬 ${r.notes}`]));
    }

    row.appendChild(
      el("button", { class: "btn btn-sm btn-danger survey-response-del", onclick: () => deleteSurveyResponse(r.id) }, ["حذف"])
    );
    container.appendChild(row);
  }
}

async function deleteSurveyResponse(id) {
  if (!confirm(`هل أنت متأكد من حذف التقييم رقم #${id} نهائياً؟`)) return;
  try {
    await api(`/api/admin/survey/${id}`, { method: "DELETE" });
    toast("تم حذف التقييم بنجاح", "success", "✓");
    loadSurvey();
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

// ===== إعدادات الألوان =====
function renderThemeFields() {
  const container = document.getElementById("themeFields");
  if (!container) return;
  container.innerHTML = "";
  container.style.display = "grid";
  container.style.gridTemplateColumns = "repeat(auto-fill, minmax(240px, 1fr))";
  container.style.gap = "12px";

  for (const field of THEME_COLOR_FIELDS) {
    const wrap = el("div", { class: "field" });
    wrap.appendChild(el("label", {}, [field.label]));
    const input = el("input", {
      type: field.type === "color" ? "color" : "text",
      value: themeDraft[field.key] || (field.type === "color" ? (themeMode() === "dark" ? "#00f0ff" : "#0284c7") : "18px"),
      oninput: (e) => {
        themeDraft[field.key] = e.target.value;
        applyTheme(themeDraft);
      },
    });
    wrap.appendChild(input);
    container.appendChild(wrap);
  }
}

async function saveTheme() {
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ theme: themeDraft }),
    });
    themeDraft = { ...(data.theme || {}) };
    window.SURVEY_THEME = themeDraft;
    applyTheme(themeDraft);
    renderThemeFields();
    toast("تم حفظ لوحة الألوان النيون بنجاح", "success", "🎨");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

async function resetTheme() {
  if (!confirm("استعادة درجات النيون الافتراضية؟")) return;
  try {
    await api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ theme: {} }) });
    themeDraft = {};
    window.SURVEY_THEME = themeDraft;
    applyTheme(themeDraft);
    renderThemeFields();
    toast("تمت استعادة الألوان الافتراضية", "success", "✓");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

async function saveTitle() {
  const title = document.getElementById("projectTitleInput").value.trim();
  if (!title) return;
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
    document.getElementById("projectTitleInput").value = data.title;
    document.getElementById("sideTitle").textContent = data.title;
    toast("تم حفظ عنوان الاستبيان", "success", "✓");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

async function saveLangMode() {
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({
        lang: document.getElementById("langSelect").value,
        mode: document.getElementById("modeSelect").value,
      }),
    });
    lang = data.lang || "ar";
    mode = data.mode || "dark";
    window.SURVEY_DEFAULT_MODE = mode;
    applyTheme(themeDraft);
    updateModeButton();
    toast("تم حفظ اللغة والوضع الافتراضي", "success", "🌐");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

// ===== نصوص الاستبيان =====
function renderContentEditor() {
  const container = document.getElementById("contentFields");
  if (!container) return;
  container.innerHTML = "";
  for (const f of CONTENT_FIELDS) {
    const wrap = el("div", { class: "field" });
    wrap.appendChild(el("label", {}, [f.label]));
    const input = el("input", {
      type: "text",
      value: contentFlat[`${f.key}.${contentEditorLang}`] || "",
      oninput: (e) => {
        contentFlat[`${f.key}.${contentEditorLang}`] = e.target.value;
      },
    });
    wrap.appendChild(input);
    container.appendChild(wrap);
  }
}

async function saveContent() {
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ content: contentFlat }),
    });
    syncContentFrom(data);
    renderContentEditor();
    toast("تم حفظ النصوص بنجاح", "success", "📝");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

async function resetContent() {
  if (!confirm("استعادة النصوص الافتراضية لجميع اللغات؟")) return;
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ content: {} }),
    });
    syncContentFrom(data);
    renderContentEditor();
    toast("تمت استعادة النصوص الافتراضية", "success", "✓");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

// ===== إدارة اللوجوهات =====
function renderLogoManager() {
  const container = document.getElementById("logoManager");
  if (!container) return;
  container.innerHTML = "";

  for (const slot of LOGO_SLOTS) {
    const card = el("div", { class: "card logo-custom-card" });
    
    const header = el("div", { class: "card-title", style: "margin-bottom:6px" });
    header.appendChild(el("span", {}, [slot.label]));
    card.appendChild(header);

    if (slot.desc) {
      card.appendChild(el("p", { style: "font-size:0.86em;color:var(--color-text-muted);margin-bottom:14px" }, [slot.desc]));
    }

    const body = el("div", { class: "logo-card-body" });
    
    const preview = el("div", { class: "logo-preview-box" });
    if (logoData[slot.key]) {
      const img = el("img", { src: logoData[slot.key], alt: slot.label });
      preview.appendChild(img);
    } else {
      preview.appendChild(el("span", { style: "font-size:32px" }, ["🖼️"]));
    }
    body.appendChild(preview);

    const controls = el("div", { style: "flex:1;min-width:220px;display:flex;flex-direction:column;gap:10px" });

    const fileInput = el("input", { type: "file", accept: "image/*", style: "display:none" });
    const btnRow = el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" });
    
    const uploadBtn = el("button", { class: "btn btn-sm", onclick: () => fileInput.click() }, ["رفع صورة من الجهاز 📤"]);
    const removeBtn = el("button", { class: "btn btn-sm btn-danger", onclick: () => removeLogo(slot.key) }, ["إزالة ✕"]);
    
    btnRow.appendChild(uploadBtn);
    if (logoData[slot.key]) {
      btnRow.appendChild(removeBtn);
    }
    controls.appendChild(btnRow);

    const urlRow = el("div", { style: "display:flex;gap:8px;align-items:center" });
    const urlInput = el("input", { type: "text", placeholder: "أو الصق رابط الصورة المباشر...", style: "flex:1" });
    const urlBtn = el("button", { class: "btn btn-sm btn-secondary", onclick: () => uploadLogoUrl(slot.key, urlInput.value) }, ["تطبيق"]);
    urlRow.appendChild(urlInput);
    urlRow.appendChild(urlBtn);
    controls.appendChild(urlRow);

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      toast("جارٍ رفع وتثبيت الصورة...", "info", "⏳");
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadLogo(slot.key, e.target.result);
      };
      reader.readAsDataURL(file);
    });

    body.appendChild(controls);
    card.appendChild(body);
    container.appendChild(card);
  }
}

async function uploadLogo(slot, dataUrl) {
  try {
    const data = await api("/api/admin/logo", {
      method: "POST",
      body: JSON.stringify({ slot, dataUrl }),
    });
    logoData = { ...(data.logos || {}) };
    renderLogoManager();
    updateSideBrand();
    toast("تم رفع وتحديث اللوجو بنجاح", "success", "✓");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

async function uploadLogoUrl(slot, url) {
  url = (url || "").trim();
  if (!url) return;
  try {
    const data = await api("/api/admin/logo", {
      method: "POST",
      body: JSON.stringify({ slot, url }),
    });
    logoData = { ...(data.logos || {}) };
    renderLogoManager();
    updateSideBrand();
    toast("تم تحديث رابط اللوجو", "success", "✓");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

async function removeLogo(slot) {
  if (!confirm("إزالة هذا اللوجو؟")) return;
  try {
    const data = await api(`/api/admin/logo/${slot}`, { method: "DELETE" });
    logoData = { ...(data.logos || {}) };
    renderLogoManager();
    updateSideBrand();
    toast("تمت الإزالة بنجاح", "success", "✓");
  } catch (e) {
    toast(e.message, "error", "⚠️");
  }
}

// ===== التهيئة والتشغيل المباشر =====
function init() {
  setupPasswordToggle();
  
  const pwInput = document.getElementById("passwordInput");
  if (pwInput) {
    pwInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doLogin();
      }
    });
  }

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.onclick = (e) => {
      e.preventDefault();
      doLogin();
    };
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.onclick = doLogout;

  const saveTitleBtn = document.getElementById("saveTitleBtn");
  if (saveTitleBtn) saveTitleBtn.onclick = saveTitle;

  const saveSlackBtn = document.getElementById("saveSlackBtn");
  if (saveSlackBtn) saveSlackBtn.onclick = saveSlackSettings;

  const testSlackBtn = document.getElementById("testSlackBtn");
  if (testSlackBtn) testSlackBtn.onclick = testSlackNotification;

  const saveThemeBtn = document.getElementById("saveThemeBtn");
  if (saveThemeBtn) saveThemeBtn.onclick = saveTheme;

  const resetThemeBtn = document.getElementById("resetThemeBtn");
  if (resetThemeBtn) resetThemeBtn.onclick = resetTheme;

  const saveSurveyUrlBtn = document.getElementById("saveSurveyUrlBtn");
  if (saveSurveyUrlBtn) saveSurveyUrlBtn.onclick = saveSurveyUrl;

  const saveLangModeBtn = document.getElementById("saveLangModeBtn");
  if (saveLangModeBtn) saveLangModeBtn.onclick = saveLangMode;

  const saveContentBtn = document.getElementById("saveContentBtn");
  if (saveContentBtn) saveContentBtn.onclick = saveContent;

  const resetContentBtn = document.getElementById("resetContentBtn");
  if (resetContentBtn) resetContentBtn.onclick = resetContent;

  const addCrit = document.getElementById("addCriteriaBtn");
  if (addCrit) addCrit.onclick = addCriteria;

  const saveCrit = document.getElementById("saveCriteriaBtn");
  if (saveCrit) saveCrit.onclick = saveCriteria;

  const resetCrit = document.getElementById("resetCriteriaBtn");
  if (resetCrit) resetCrit.onclick = resetCriteria;

  document.querySelectorAll("[data-clang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-clang]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      contentEditorLang = btn.dataset.clang;
      renderContentEditor();
    });
  });

  document.querySelectorAll("[data-mode-toggle]").forEach((btn) => {
    btn.addEventListener("click", toggleThemeMode);
  });

  applyTheme({});
  updateModeButton();

  if (token) {
    api("/api/admin/verify")
      .then((data) => enterAdmin(data))
      .catch(() => {
        token = "";
        localStorage.removeItem("surveyAdminToken");
        showLogin();
      });
  } else {
    showLogin();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
