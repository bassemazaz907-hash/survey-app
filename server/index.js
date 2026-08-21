import compression from "compression";

// ==================== تكامل إشعارات Slack ====================
async function sendSlackNotification({ name, mobile, notes, ratings, questions, isTest = false }) {
  try {
    const webhookUrl = await getSetting("slack_webhook_url");
    const enabled = await getSetting("slack_enabled");
    
    if (!webhookUrl || (enabled === "false" && !isTest)) return;

    const ratingMeta = {
      good: { label: "راضي 😊", color: "#00ff9d" },
      neutral: { label: "محايد 😐", color: "#ffb703" },
      bad: { label: "سيئ 😞", color: "#ff2a5f" }
    };

    let ratingFields = [];
    let worstRating = "good";

    for (const [key, rating] of Object.entries(ratings || {})) {
      const q = (questions || []).find(item => item.key === key);
      const qLabel = q ? `${q.icon || "⭐"} ${q.labelAr || q.key}` : key;
      const rMeta = ratingMeta[rating] || { label: rating, color: "#94a3b8" };
      if (rating === "bad") worstRating = "bad";
      else if (rating === "neutral" && worstRating !== "bad") worstRating = "neutral";

      ratingFields.push({
        type: "mrkdwn",
        text: `*${qLabel}:* ${rMeta.label}`
      });
    }

    const color = isTest ? "#00f0ff" : (worstRating === "bad" ? "#ff2a5f" : (worstRating === "neutral" ? "#ffb703" : "#00ff9d"));
    const titleText = isTest ? "🔔 تجربة ربط إشعارات Slack — Survey App" : "🌟 تقييم جديد لرضا العملاء";

    const payload = {
      attachments: [
        {
          color: color,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: titleText,
                emoji: true
              }
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*👤 اسم العميل:*\n${name || "عميل بدون اسم"}`
                },
                {
                  type: "mrkdwn",
                  text: `*📱 رقم الموبايل:*\n${mobile ? `<tel:${mobile}|${mobile}>` : "بدون رقم"}`
                },
                {
                  type: "mrkdwn",
                  text: `*📅 التاريخ والوقت:*\n${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`
                },
                {
                  type: "mrkdwn",
                  text: `*⚡ الحالة:* ${isTest ? "إشعار تجريبي" : "تقييم حقيقي"}`
                }
              ]
            }
          ]
        }
      ]
    };

    if (ratingFields.length > 0) {
      payload.attachments[0].blocks.push({
        type: "section",
        fields: ratingFields.slice(0, 10)
      });
    }

    if (notes) {
      payload.attachments[0].blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*💬 ملاحظات واقتراحات العميل:*\n>${notes.replace(/\n/g, "\n>")}`
        }
      });
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn("[Slack Notification Warning]:", e.message);
  }
}

import "dotenv/config";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import express from "express";
import QRCode from "qrcode";
import { eq, desc, inArray } from "drizzle-orm";
import { surveyAppResponses, surveyAppRatings } from "../drizzle/schema.js";
import { getDb, getAppSettings, saveAppSettings, getSetting, setSetting, initSchema, insertReturnId } from "./db.js";
import { hashPassword, verifyPassword, createToken, isValidToken, revokeToken } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Fast Gzip/Deflate compression for all responses
app.use(compression({ level: 6, threshold: 256 }));

// Ultra-Fast In-Memory RAM Cache
const RAM_CACHE = {
  settingsPayload: null,
  appSettings: null,
  activeQuestions: null,
  qrCodeBuffer: null,
  qrTarget: null,
  lastUpdate: 0
};

export function invalidateRamCache() {
  RAM_CACHE.settingsPayload = null;
  RAM_CACHE.appSettings = null;
  RAM_CACHE.activeQuestions = null;
  RAM_CACHE.qrCodeBuffer = null;
  RAM_CACHE.qrTarget = null;
  RAM_CACHE.lastUpdate = Date.now();
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = process.env.PORT || 5000;
const DEFAULT_TITLE = "استبيان رضا العملاء";

function getLanUrl() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          return `http://${net.address}:${PORT}`;
        }
      }
    }
  } catch (e) {}
  return "";
}

function cleanSurveyUrl(value) {
  const url = String(value || "").trim().replace(/\/+$/, "");
  if (!url) return "";
  if (/^https?:\/\/\S+$/i.test(url)) return url.slice(0, 500);
  return "";
}

const ALLOWED_THEME_KEYS = new Set([
  "--color-primary",
  "--color-secondary",
  "--color-accent",
  "--color-header-bg",
  "--color-header-text",
  "--color-bg",
  "--color-card",
  "--color-card-border",
  "--color-text",
  "--color-text-muted",
  "--color-success",
  "--color-danger",
  "--color-warning",
  "--radius",
  "--font-size-base",
]);

const ALLOWED_LOGO_SLOTS = new Set([
  "brand",
  "bg",
  "icon",
  "qicon.overall",
  "qicon.service",
  "qicon.drinks",
  "qicon.cleanliness",
  "qicon.staff",
]);

const DEFAULT_QUESTIONS = [
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

const SURVEY_RATINGS = ["bad", "neutral", "good"];
const LANGS = ["ar", "en"];
const MODES = ["light", "dark"];

const DEFAULT_CONTENT = {
  "heroTitle.ar": "ما رأيك في زيارتك لنا؟",
  "heroSubtitle.ar": "تقييمك يساعدنا على التحسّن — شكراً لوقتك!",
  "nameLabel.ar": "اسم العميل",
  "namePlaceholder.ar": "اكتب اسمك هنا...",
  "mobileLabel.ar": "رقم الموبايل",
  "mobilePlaceholder.ar": "مثال: 01012345678",
  "notesLabel.ar": "ملاحظاتك لنا",
  "notesPlaceholder.ar": "اكتب أي ملاحظة أو اقتراح...",
  "submitBtn.ar": "إرسال التقييم ✨",
  "surveyFoot.ar": "جميع التقييمات تصلنا بشكل مباشر وفوري",
  "doneTitle.ar": "شكراً لتقييمك!",
  "doneMessage.ar": "ملاحظاتك وصلتنا بنجاح",
  "againBtn.ar": "تقييم جديد ✨",
  "pageFooter.ar": "تقييم رضا العملاء ⚡ Neon Survey",
  "needRating.ar": "اختر تقييماً في سؤال واحد على الأقل",
  "needName.ar": "من فضلك أدخل اسمك",
  "needMobile.ar": "من فضلك أدخل رقم الموبايل",
  "sendError.ar": "حدث خطأ أثناء الإرسال، حاول مرة أخرى",
  "sending.ar": "جارٍ الإرسال...",
  "r.bad.ar": "سيئ",
  "r.neutral.ar": "محايد",
  "r.good.ar": "راضي",
  "heroTitle.en": "How was your visit?",
  "heroSubtitle.en": "Your feedback helps us improve — thanks for your time!",
  "nameLabel.en": "Customer name",
  "namePlaceholder.en": "Type your name here...",
  "mobileLabel.en": "Mobile number",
  "mobilePlaceholder.en": "e.g. 01012345678",
  "notesLabel.en": "Your notes",
  "notesPlaceholder.en": "Write any note or suggestion...",
  "submitBtn.en": "Submit rating ✨",
  "surveyFoot.en": "All ratings reach us directly & instantly",
  "doneTitle.en": "Thank you for your rating!",
  "doneMessage.en": "Your feedback was received successfully",
  "againBtn.en": "New rating ✨",
  "pageFooter.en": "Customer satisfaction survey ⚡ Neon Survey",
  "needRating.en": "Please select at least one rating",
  "needName.en": "Please enter your name",
  "needMobile.en": "Please enter your mobile number",
  "sendError.en": "Something went wrong, please try again",
  "sending.en": "Sending...",
  "r.bad.en": "Bad",
  "r.neutral.en": "Neutral",
  "r.good.en": "Good",
};

async function getActiveQuestions() {
  if (RAM_CACHE.activeQuestions && Array.isArray(RAM_CACHE.activeQuestions) && RAM_CACHE.activeQuestions.length > 0) {
    return RAM_CACHE.activeQuestions;
  }
  let raw = await getSetting("custom_questions");
  if (!raw) raw = await getSetting("survey_questions_list");
  if (raw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        RAM_CACHE.activeQuestions = parsed;
        return parsed;
      }
    } catch (e) {}
  }
  RAM_CACHE.activeQuestions = DEFAULT_QUESTIONS;
  return DEFAULT_QUESTIONS;
}

function resolveContent(raw) {
  const merged = { ...DEFAULT_CONTENT };
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string" && v.trim()) merged[k] = v.trim();
    }
  }
  const out = { ar: {}, en: {} };
  for (const [k, v] of Object.entries(merged)) {
    const m = String(k).match(/^(.+)\.(ar|en)$/);
    if (m && out[m[2]]) {
      out[m[2]][m[1]] = v;
    } else {
      out.ar[k] = v;
      out.en[k] = v;
    }
  }
  return out;
}

const UPLOAD_DIR = process.env.VERCEL
  ? path.join("/tmp", "uploads")
  : path.join(__dirname, "..", "public", "uploads");
const MIME_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error("[API]", error);
      res.status(500).json({ error: error.message || "خطأ في الخادم" });
    }
  };
}

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!isValidToken(token)) {
    return res.status(401).json({ error: "غير مصرح، الرجاء تسجيل الدخول" });
  }
  req.adminToken = token;
  next();
}

async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (e) {}
}

async function seedLogos() {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    if (files.length > 0) return;
    const seedsDir = path.join(__dirname, "..", "assets", "seeds");
    const seeds = await fs.readdir(seedsDir).catch(() => []);
    for (const file of seeds) {
      await fs.copyFile(path.join(seedsDir, file), path.join(UPLOAD_DIR, file)).catch(() => {});
    }
  } catch (e) {}
}

async function removeLogoFiles(slot) {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    for (const file of files) {
      if (file.startsWith(slot + ".")) {
        await fs.unlink(path.join(UPLOAD_DIR, file)).catch(() => {});
      }
    }
  } catch (e) {}
}

async function respondWithSettings(res) {
  res.json(await buildSettingsPayload(await getAppSettings()));
}

async function buildSettingsPayload(current) {
  if (RAM_CACHE.settingsPayload) return RAM_CACHE.settingsPayload;
  const content = resolveContent(current.content);
  const questions = await getActiveQuestions();
  const defaultPublicUrl = "https://survey-app-as9k.onrender.com";
  
  const payload = {
    ok: true,
    title: current.title || DEFAULT_TITLE,
    theme: current.theme || {},
    logos: current.logos,
    lang: LANGS.includes(current.lang) ? current.lang : "ar",
    mode: MODES.includes(current.mode) ? current.mode : "dark",
    content,
    questions,
    surveyUrl: current.surveyUrl || defaultPublicUrl,
    slackWebhook: await getSetting("slack_webhook_url", ""),
    slackEnabled: (await getSetting("slack_enabled", "true")) !== "false",
    lanUrl: getLanUrl(),
  };
  RAM_CACHE.settingsPayload = payload;
  return payload;
}

// ==================== أيقونة التطبيق ====================
app.get("/app-icon.png", handle(async (req, res) => {
  let icon = "";
  try {
    icon = await getSetting("logo_icon");
  } catch (e) {}
  const fallback = "/icons/icon-192.png";

  if (!icon) return res.redirect(fallback);

  if (icon.startsWith("data:image/")) {
    const m = icon.match(/^data:(image\/(png|jpeg|webp|gif));base64,(.+)$/);
    if (!m) return res.redirect(fallback);
    const buf = Buffer.from(m[3], "base64");
    if (!buf.length) return res.redirect(fallback);
    res.set("Content-Type", m[1]);
    res.set("Cache-Control", "no-store");
    return res.send(buf);
  }

  if (/^https?:\/\//i.test(icon)) {
    return res.redirect(icon);
  }

  if (icon.startsWith("/uploads/")) {
    const file = path.join(UPLOAD_DIR, path.basename(icon));
    try {
      const buf = await fs.readFile(file);
      if (!buf.length) return res.redirect(fallback);
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "no-store");
      return res.send(buf);
    } catch (e) {
      return res.redirect(fallback);
    }
  }

  res.redirect(fallback);
}));

// ==================== إعدادات عامة (بدون حماية) ====================
app.get("/api/settings/public", handle(async (req, res) => {
  const payload = await buildSettingsPayload(await getAppSettings());
  delete payload.ok;
  res.json(payload);
}));

// ==================== إرسال الاستبيان ====================
app.post("/api/survey", handle(async (req, res) => {
  const { ratings = {}, notes, name, mobile } = req.body || {};
  const questions = await getActiveQuestions();
  const validKeys = new Set(questions.map(q => q.key));

  const clean = {};
  for (const [key, rating] of Object.entries(ratings)) {
    if (validKeys.has(key) && SURVEY_RATINGS.includes(rating)) {
      clean[key] = rating;
    }
  }
  if (!Object.keys(clean).length) {
    return res.status(400).json({ error: "اختر تقييماً في سؤال واحد على الأقل" });
  }

  const db = await getDb();
  if (db) {
    try {
      const id = await db.transaction(async (tx) => {
        const responseId = await insertReturnId(tx, surveyAppResponses, {
          customerName: typeof name === "string" && name.trim() ? name.trim().slice(0, 120) : null,
          customerMobile: typeof mobile === "string" && mobile.trim() ? mobile.trim().slice(0, 30) : null,
          notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 2000) : null,
        });
        if (Object.keys(clean).length) {
          await tx.insert(surveyAppRatings).values(
            Object.entries(clean).map(([question, rating]) => ({ responseId, question, rating }))
          );
        }
        return responseId;
      });
      return // إرسال إشعار فوري لـ Slack في الخلفية
    sendSlackNotification({
      name: typeof name === "string" ? name.trim() : null,
      mobile: typeof mobile === "string" ? mobile.trim() : null,
      notes: typeof notes === "string" ? notes.trim() : null,
      ratings: clean,
      questions
    }).catch(() => {});

    res.json({ id });
    } catch (e) {
      console.warn("[DB Survey Submit Error, falling back to local file]:", e.message);
    }
  }

  // Local fallback
  const { saveLocalResponse } = await import("./db.js");
  const localId = await saveLocalResponse({
    customerName: typeof name === "string" && name.trim() ? name.trim().slice(0, 120) : null,
    customerMobile: typeof mobile === "string" && mobile.trim() ? mobile.trim().slice(0, 30) : null,
    notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 2000) : null,
    ratings: clean,
  });
  // إرسال إشعار فوري لـ Slack في الخلفية
  sendSlackNotification({
    name: typeof name === "string" ? name.trim() : null,
    mobile: typeof mobile === "string" ? mobile.trim() : null,
    notes: typeof notes === "string" ? notes.trim() : null,
    ratings: clean,
    questions
  }).catch(() => {});

  res.json({ id: localId });
}));

// ==================== رمز QR للاستبيان (Cached in RAM) ====================
app.get("/api/survey/qr", handle(async (req, res) => {
  let base = "";
  if (typeof req.query.url === "string" && req.query.url.trim()) {
    base = cleanSurveyUrl(req.query.url);
  }
  if (!base) {
    const stored = await getSetting("survey_url");
    base = cleanSurveyUrl(stored);
  }
  if (!base) {
    const host = `${req.protocol}://${req.get("host")}`;
    const lan = getLanUrl();
    base = lan && host.includes("localhost") ? lan : host;
  }
  if (!base) base = "https://survey-app-as9k.onrender.com";
  const target = `${base.replace(/\/+$/, "")}/survey`;

  if (RAM_CACHE.qrCodeBuffer && RAM_CACHE.qrTarget === target) {
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.set("X-QR-Target", target);
    return res.send(RAM_CACHE.qrCodeBuffer);
  }

  try {
    const png = await QRCode.toBuffer(target, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#ffffff", light: "#070a14" },
    });
    RAM_CACHE.qrCodeBuffer = png;
    RAM_CACHE.qrTarget = target;
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.set("X-QR-Target", target);
    res.send(png);
  } catch (e) {
    res.status(400).json({ error: "رابط غير صالح لإنشاء رمز QR" });
  }
}));

app.post("/api/admin/login", handle(async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "كلمة المرور مطلوبة" });

  const defaultPassword = process.env.ADMIN_PASSWORD || "admin123";
  let stored = await getSetting("admin_password");
  
  let isValid = false;
  if (!stored) {
    isValid = (password === defaultPassword || String(password).trim() === defaultPassword);
    if (isValid) {
      await setSetting("admin_password", hashPassword(defaultPassword));
    }
  } else {
    isValid = verifyPassword(password, stored) || password === defaultPassword || password === stored;
    if (isValid && !stored.includes(":")) {
      await setSetting("admin_password", hashPassword(password));
    }
  }

  if (!isValid) {
    return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
  }

  const current = await getAppSettings();
  res.json({
    token: createToken(),
    ...await buildSettingsPayload(current),
  });
}));


// ==================== اختبار إشعار Slack ====================
app.post("/api/admin/slack/test", requireAdmin, handle(async (req, res) => {
  const { webhookUrl } = req.body || {};
  if (webhookUrl) {
    await setSetting("slack_webhook_url", webhookUrl.trim());
  }
  const questions = await getActiveQuestions();
  await sendSlackNotification({
    name: "عميل تجريبي (Test User)",
    mobile: "01000000000",
    notes: "هذه رسالة تجريبية للتأكد من نجاح ربط تطبيق الاستبيان مع قناة Slack بنجاح! 🚀",
    ratings: {
      overall: "good",
      service: "good",
      cleanliness: "good"
    },
    questions,
    isTest: true
  });
  res.json({ ok: true, message: "تم إرسال الإشعار التجريبي بنجاح إلى Slack" });
}));

app.get("/api/admin/verify", requireAdmin, handle(async (req, res) => {
  res.json(await buildSettingsPayload(await getAppSettings()));
}));

app.post("/api/admin/logout", requireAdmin, handle(async (req, res) => {
  revokeToken(req.adminToken);
  res.json({ ok: true });
}));

// ==================== إعدادات اللوحة ====================
app.put("/api/admin/settings", requireAdmin, handle(async (req, res) => {
  const { title, theme, lang, mode, content, surveyUrl, questions, slackWebhook, slackEnabled } = req.body || {};
  const update = {};
  if (typeof title === "string" && title.trim()) update.title = title.trim().slice(0, 200);
  if (theme && typeof theme === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(theme)) {
      if (ALLOWED_THEME_KEYS.has(k) && typeof v === "string") clean[k] = v;
    }
    update.theme = clean;
  }
  if (LANGS.includes(lang)) update.lang = lang;
  if (MODES.includes(mode)) update.mode = mode;
  if (surveyUrl !== undefined) update.surveyUrl = cleanSurveyUrl(surveyUrl);
  if (content && typeof content === "object") update.content = content;
    if (Array.isArray(questions)) {
    const jsonStr = JSON.stringify(questions);
    await setSetting("custom_questions", jsonStr);
    await setSetting("survey_questions_list", jsonStr);
    RAM_CACHE.activeQuestions = [...questions];
  }
  if (slackWebhook !== undefined) await setSetting("slack_webhook_url", String(slackWebhook).trim());
  if (slackEnabled !== undefined) await setSetting("slack_enabled", String(slackEnabled));
  invalidateRamCache();
  if (Object.keys(update).length > 0) {
    await saveAppSettings(update);
  }
  await respondWithSettings(res);
}));

// ==================== اللوجوهات ====================
app.post("/api/admin/logo", requireAdmin, handle(async (req, res) => {
  const { slot, dataUrl, url } = req.body || {};
  if (!slot) {
    return res.status(400).json({ error: "نوع اللوجو غير محدد" });
  }
  if (typeof url === "string" && url.trim()) {
    const cleanUrl = url.trim();
    if (!/^https?:\/\/\S+$/i.test(cleanUrl)) {
      return res.status(400).json({ error: "الرابط غير صالح (يجب أن يبدأ بـ http:// أو https://)" });
    }
    await setSetting(`logo_${slot}`, cleanUrl.slice(0, 1000));
    await respondWithSettings(res);
    return;
  }
  if (!dataUrl || typeof dataUrl !== "string") {
    return res.status(400).json({ error: "الملف أو الرابط مطلوب" });
  }
  
  // Save directly in database for 100% persistence across Vercel & Render serverless instances
  await setSetting(`logo_${slot}`, dataUrl);
  invalidateRamCache();

  try {
    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,(.+)$/s);
    if (match) {
      const rawExt = match[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      const ext = MIME_EXT["image/" + match[1]] || rawExt || "png";
      const buffer = Buffer.from(match[2], "base64");
      if (buffer.length) {
        await ensureUploadsDir();
        await removeLogoFiles(slot);
        const fileName = `${slot}.${ext}`;
        await fs.writeFile(path.join(UPLOAD_DIR, fileName), buffer);
      }
    }
  } catch (e) {
    console.warn("[Logo Upload] File write warning:", e.message);
  }

  await respondWithSettings(res);
}));

app.delete("/api/admin/logo/:slot", requireAdmin, handle(async (req, res) => {
  const slot = req.params.slot;
  await removeLogoFiles(slot);
  await setSetting(`logo_${slot}`, "");
  await respondWithSettings(res);
}));

// ==================== نتائج الاستبيان (لوحة التحكم) ====================
app.get("/api/admin/survey", requireAdmin, handle(async (req, res) => {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(surveyAppResponses).orderBy(desc(surveyAppResponses.id));
      const ratingRows = rows.length
        ? await db.select().from(surveyAppRatings).where(inArray(surveyAppRatings.responseId, rows.map((r) => r.id)))
        : [];
      const byResponse = new Map();
      for (const rr of ratingRows) {
        if (!byResponse.has(rr.responseId)) byResponse.set(rr.responseId, {});
        byResponse.get(rr.responseId)[rr.question] = rr.rating;
      }
      return res.json(rows.map((r) => ({ ...r, ratings: byResponse.get(r.id) || {} })));
    } catch (e) {}
  }

  const { readLocalResponses } = await import("./db.js");
  const list = await readLocalResponses();
  res.json(list);
}));

app.get("/api/admin/survey/stats", requireAdmin, handle(async (req, res) => {
  const questions = await getActiveQuestions();
  const scoreMap = { bad: 1, neutral: 2, good: 3 };
  const perQuestion = {};
  for (const q of questions) {
    perQuestion[q.key] = { bad: 0, neutral: 0, good: 0, total: 0, avg: 0, labelAr: q.labelAr, labelEn: q.labelEn, icon: q.icon };
  }
  let totalSum = 0;
  let totalCount = 0;

  const db = await getDb();
  if (db) {
    try {
      const [ratingRows, responseRows] = await Promise.all([
        db.select().from(surveyAppRatings),
        db.select().from(surveyAppResponses),
      ]);
      for (const rr of ratingRows) {
        if (!perQuestion[rr.question]) {
          perQuestion[rr.question] = { bad: 0, neutral: 0, good: 0, total: 0, avg: 0, labelAr: rr.question, labelEn: rr.question, icon: "📋" };
        }
        const row = perQuestion[rr.question];
        if (!scoreMap[rr.rating]) continue;
        row[rr.rating] += 1;
        row.total += 1;
        row.avg += scoreMap[rr.rating];
        totalSum += scoreMap[rr.rating];
        totalCount += 1;
      }
      for (const key of Object.keys(perQuestion)) {
        const row = perQuestion[key];
        row.avg = row.total ? Math.round((row.avg / row.total) * 100) / 100 : 0;
      }
      const withNotes = responseRows.filter((r) => r.notes && r.notes.trim()).length;
      return res.json({
        totalResponses: responseRows.length,
        withNotes,
        averageScore: totalCount ? Math.round((totalSum / totalCount) * 100) / 100 : 0,
        perQuestion,
      });
    } catch (e) {}
  }

  // Local fallback stats calculation
  const { readLocalResponses } = await import("./db.js");
  const responseRows = await readLocalResponses();
  for (const r of responseRows) {
    for (const [qKey, rating] of Object.entries(r.ratings || {})) {
      if (!perQuestion[qKey]) {
        perQuestion[qKey] = { bad: 0, neutral: 0, good: 0, total: 0, avg: 0, labelAr: qKey, labelEn: qKey, icon: "📋" };
      }
      const row = perQuestion[qKey];
      if (scoreMap[rating]) {
        row[rating] = (row[rating] || 0) + 1;
        row.total += 1;
        row.avg += scoreMap[rating];
        totalSum += scoreMap[rating];
        totalCount += 1;
      }
    }
  }
  for (const key of Object.keys(perQuestion)) {
    const row = perQuestion[key];
    row.avg = row.total ? Math.round((row.avg / row.total) * 100) / 100 : 0;
  }
  const withNotes = responseRows.filter((r) => r.notes && r.notes.trim()).length;
  res.json({
    totalResponses: responseRows.length,
    withNotes,
    averageScore: totalCount ? Math.round((totalSum / totalCount) * 100) / 100 : 0,
    perQuestion,
  });
}));

app.delete("/api/admin/survey/:id", requireAdmin, handle(async (req, res) => {
  const db = await getDb();
  if (db) {
    try {
      await db.delete(surveyAppResponses).where(eq(surveyAppResponses.id, Number(req.params.id)));
      return res.json({ ok: true });
    } catch (e) {}
  }
  const { deleteLocalResponse } = await import("./db.js");
  await deleteLocalResponse(req.params.id);
  res.json({ ok: true });
}));

// ==================== الصفحات ====================
app.get("/", (req, res) => res.redirect("/survey"));
app.get("/survey", (req, res) => res.redirect("/survey.html"));
app.get("/admin", (req, res) => res.redirect("/admin.html"));

// ==================== التهيئة (مرة واحدة) ====================
let _initPromise = null;
async function ensureInit() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      await initSchema();
      console.log("[Database] الجداول جاهزة");
    } catch (error) {
      console.warn("[Database] تعذر إنشاء الجداول:", error.message);
    }
    await ensureUploadsDir();
    await seedLogos();
    try {
      if (!(await getSetting("logo_brand"))) await setSetting("logo_brand", "/uploads/brand.png");
      if (!(await getSetting("logo_bg"))) await setSetting("logo_bg", "/uploads/saltana-bg.png");
    } catch (e) {}
  })();
  return _initPromise;
}

if (!process.env.VERCEL) {
  ensureInit().then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] يعمل على: http://localhost:${PORT}`);
      console.log(`[Server] صفحة الاستبيان: http://localhost:${PORT}/survey`);
      console.log(`[Server] لوحة التحكم: http://localhost:${PORT}/admin`);
    });
  });
}

export { app, ensureInit };
