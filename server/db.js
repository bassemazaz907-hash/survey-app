import "dotenv/config";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import pg from "pg";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const SETTINGS_FILE = path.join(DATA_DIR, "local_settings.json");
const RESPONSES_FILE = path.join(DATA_DIR, "local_responses.json");

function ensureDataDirSync() {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
  }
}
ensureDataDirSync();

export const isPg = /^postgres/.test(process.env.DATABASE_URL || "");

pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1114, (v) => v);
pg.types.setTypeParser(1184, (v) => v);

let _pool = null;
let _db = null;

export async function getPool() {
  if (!_pool && process.env.DATABASE_URL) {
    try {
      if (isPg) {
        _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      } else {
        _pool = mysql.createPool({
          uri: process.env.DATABASE_URL,
          multipleStatements: true,
          dateStrings: true,
        });
      }
    } catch (e) {
      console.warn("[Database] Connection pool failed, using local storage:", e.message);
      _pool = null;
    }
  }
  return _pool;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = await getPool();
      if (pool) {
        _db = isPg ? drizzlePg(pool, { schema, mode: "default" }) : drizzleMysql(pool, { schema, mode: "default" });
      }
    } catch (e) {
      _db = null;
    }
  }
  return _db;
}

export async function insertReturnId(tx, table, values) {
  if (isPg) {
    const [row] = await tx.insert(table).values(values).returning({ id: table.id });
    return row.id;
  }
  const result = await tx.insert(table).values(values);
  return result[0].insertId;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS survey_app_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  \`key\` VARCHAR(100) NOT NULL UNIQUE,
  value MEDIUMTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS survey_app_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120),
  customer_mobile VARCHAR(30),
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS survey_app_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  response_id INT NOT NULL,
  question VARCHAR(30) NOT NULL,
  rating VARCHAR(10) NOT NULL,
  CONSTRAINT fk_sa_rating_response FOREIGN KEY (response_id) REFERENCES survey_app_responses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const SCHEMA_SQL_PG = `
CREATE TABLE IF NOT EXISTS survey_app_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT
);

CREATE TABLE IF NOT EXISTS survey_app_responses (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(120),
  customer_mobile VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_app_ratings (
  id SERIAL PRIMARY KEY,
  response_id INTEGER NOT NULL,
  question VARCHAR(30) NOT NULL,
  rating VARCHAR(10) NOT NULL,
  CONSTRAINT fk_sa_rating_response FOREIGN KEY (response_id) REFERENCES survey_app_responses(id) ON DELETE CASCADE
);
`;

export async function initSchema() {
  const pool = await getPool();
  if (!pool) return;
  try {
    await pool.query(isPg ? SCHEMA_SQL_PG : SCHEMA_SQL);
    await migrateResponseColumns(pool);
  } catch (e) {
    console.warn("[Database Init] Warning:", e.message);
  }
}

async function migrateResponseColumns(pool) {
  try {
    if (isPg) {
      await pool.query(
        "ALTER TABLE survey_app_responses ADD COLUMN IF NOT EXISTS customer_name VARCHAR(120), ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(30)"
      );
      return;
    }
    const [cols] = await pool.query("SHOW COLUMNS FROM survey_app_responses");
    const names = new Set(cols.map((c) => c.Field));
    if (!names.has("customer_name")) {
      await pool.query("ALTER TABLE survey_app_responses ADD COLUMN customer_name VARCHAR(120)");
    }
    if (!names.has("customer_mobile")) {
      await pool.query("ALTER TABLE survey_app_responses ADD COLUMN customer_mobile VARCHAR(30)");
    }
    const [stCols] = await pool.query("SHOW COLUMNS FROM survey_app_settings");
    const valCol = stCols.find((c) => c.Field === "value");
    if (valCol && valCol.Type && !/mediumtext|longtext/i.test(valCol.Type)) {
      await pool.query("ALTER TABLE survey_app_settings MODIFY COLUMN value MEDIUMTEXT");
    }
  } catch (e) {
    console.warn("[Database] ترحيل الأعمدة فشل:", e.message);
  }
}

// Local File Store Helpers
async function readLocalSettings() {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

async function writeLocalSettings(data) {
  try {
    ensureDataDirSync();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

export async function getSetting(key, defaultValue = null) {
  try {
    const db = await getDb();
    if (db) {
      const rows = await db
        .select()
        .from(schema.surveyAppSettings)
        .where(eq(schema.surveyAppSettings.key, key))
        .limit(1);
      if (rows.length > 0 && rows[0].value !== null) return rows[0].value;
    }
  } catch (e) {}
  
  // Fallback to local settings file
  const local = await readLocalSettings();
  return local[key] !== undefined ? local[key] : defaultValue;
}

export async function setSetting(key, value) {
  // Always save to local file for resilience
  const local = await readLocalSettings();
  local[key] = value;
  await writeLocalSettings(local);

  try {
    const db = await getDb();
    if (db) {
      if (isPg) {
        await db
          .insert(schema.surveyAppSettings)
          .values({ key, value })
          .onConflictDoUpdate({ target: schema.surveyAppSettings.key, set: { value } });
      } else {
        await db
          .insert(schema.surveyAppSettings)
          .values({ key, value })
          .onDuplicateKeyUpdate({ set: { value } });
      }
    }
  } catch (e) {
    console.warn("[Database setSetting] Warning:", e.message);
  }
}

export async function getAppSettings() {
  const [title, themeRaw, logoBrand, logoBg, logoIcon, lang, mode, contentRaw, surveyUrl] = await Promise.all([
    getSetting("title"),
    getSetting("theme"),
    getSetting("logo_brand"),
    getSetting("logo_bg"),
    getSetting("logo_icon"),
    getSetting("lang"),
    getSetting("mode"),
    getSetting("content"),
    getSetting("survey_url"),
  ]);
  let theme = null;
  if (themeRaw) {
    try {
      theme = JSON.parse(themeRaw);
    } catch {
      theme = null;
    }
  }
  let content = null;
  if (contentRaw) {
    try {
      content = JSON.parse(contentRaw);
    } catch {
      content = null;
    }
  }
  return {
    title: title || null,
    theme,
    logos: { brand: logoBrand || "", bg: logoBg || "", icon: logoIcon || "" },
    lang: lang || null,
    mode: mode || null,
    content: content && typeof content === "object" ? content : null,
    surveyUrl: surveyUrl || null,
  };
}

export async function saveAppSettings({ title, theme, logos, lang, mode, content, surveyUrl } = {}) {
  if (title !== undefined) await setSetting("title", title);
  if (theme !== undefined) await setSetting("theme", JSON.stringify(theme));
  if (logos !== undefined) {
    if (logos.brand !== undefined) await setSetting("logo_brand", logos.brand);
    if (logos.bg !== undefined) await setSetting("logo_bg", logos.bg);
    if (logos.icon !== undefined) await setSetting("logo_icon", logos.icon);
  }
  if (lang !== undefined) await setSetting("lang", lang);
  if (mode !== undefined) await setSetting("mode", mode);
  if (content !== undefined) await setSetting("content", JSON.stringify(content));
  if (surveyUrl !== undefined) await setSetting("survey_url", surveyUrl);
}

// Local Responses Store Helpers
export async function readLocalResponses() {
  try {
    const raw = await fs.readFile(RESPONSES_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export async function saveLocalResponse(resp) {
  const list = await readLocalResponses();
  resp.id = list.length > 0 ? (Math.max(...list.map(r => r.id || 0)) + 1) : 1;
  resp.createdAt = new Date().toISOString();
  list.unshift(resp);
  ensureDataDirSync();
  await fs.writeFile(RESPONSES_FILE, JSON.stringify(list, null, 2), "utf8");
  return resp.id;
}

export async function deleteLocalResponse(id) {
  const list = await readLocalResponses();
  const filtered = list.filter(r => r.id !== Number(id));
  ensureDataDirSync();
  await fs.writeFile(RESPONSES_FILE, JSON.stringify(filtered, null, 2), "utf8");
}
