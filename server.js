/**
 * HesabFlow local server
 *
 * Features:
 *   1. Power-outage resilience  — WAL + EXTRA synchronous
 *   2. First-time setup         — config.json with dynamic DB / backup paths
 *   3. Auto-backup on shutdown  — POST /api/backup-and-shutdown (online backup API)
 *
 * Distribution (2 files in same folder):
 *   hesabflow.exe         (~11 MB)
 *   better_sqlite3.node   (~0.8 MB)
 */

import express from 'express';
import { createRequire } from 'module';
import { exec } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';

// __filename / __dirname / require resolution that works across THREE modes:
//   1) Pure ESM         (dev: `node server.js`)         → derive from import.meta.url
//   2) esbuild-CJS      (production bundle before pkg)  → __filename is injected
//   3) pkg-bundled CJS  (final hesabflow.exe)           → __filename is the snapshot path
// We must NOT touch `import.meta` when CJS already provides __filename, because
// esbuild rewrites `import.meta` → `{}` and reading `.url` would crash at load.
const __thisFile = (typeof __filename !== 'undefined')
  ? __filename
  : fileURLToPath(import.meta.url);
const __thisDir  = dirname(__thisFile);

// Synchronous require — works in pure ESM AND in CJS bundles
const _require = createRequire(__thisFile);
const PORT     = 3939;

// ── App directory ──────────────────────────────────────────────────────────
// IS_PKG  → true when bundled by pkg / @yao-pkg/pkg into an .exe
// APP_DIR → real on-disk folder containing the executable (Windows-native via
//           process.execPath). In dev mode it falls back to cwd.
const IS_PKG  = typeof process.pkg !== 'undefined';
const APP_DIR = IS_PKG ? dirname(process.execPath) : process.cwd();

const CONFIG_PATH = join(APP_DIR, 'config.json');
const DIST        = join(__thisDir, 'dist');

// ── Load better-sqlite3 ────────────────────────────────────────────────────
// In a pkg bundle the native .node addon CANNOT live inside the snapshot —
// Node refuses to dlopen() a file that does not exist on the real disk.
// So we ship `better_sqlite3.node` next to `hesabflow.exe` and require it
// from there via an absolute Windows path.
let Database;
if (IS_PKG) {
  const nodePath = join(APP_DIR, 'better_sqlite3.node');
  if (!existsSync(nodePath)) {
    console.error(
      `\n[FATAL] better_sqlite3.node was not found at:\n  ${nodePath}\n\n` +
      `This file MUST be in the same folder as hesabflow.exe.\n` +
      `Extract the full HesabFlow-Windows.zip — do not move the .exe alone.\n`
    );
    process.exit(1);
  }
  // createRequire anchored at the .node path → Node loads it as a native addon
  Database = createRequire(nodePath)(nodePath);
} else {
  // Dynamic name so pkg's static analyzer does NOT pull better-sqlite3 into
  // the snapshot. This branch only runs during dev (`node server.js`).
  const bsName = ['better', 'sqlite3'].join('-');
  Database = _require(bsName);
}

// ── Runtime state ──────────────────────────────────────────────────────────
let config   = null;   // { dbPath, backupPath }
let db       = null;   // better-sqlite3 Database instance
let appReady = false;  // false → redirect every request to /setup

// ── Config helpers ─────────────────────────────────────────────────────────
function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return null; }
}

function persistConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// ── Open / init database ───────────────────────────────────────────────────
function openDb(dbFilePath) {
  db = new Database(dbFilePath);

  // ── Feature 1: power-outage resilience ──────────────────────────────────
  // WAL  → writers don't block readers; journal survives a crash mid-write.
  // EXTRA → fsync on every WAL frame AND on every checkpoint.
  //         Slower than NORMAL but guarantees zero committed-data loss on
  //         sudden power failure (the fsync ensures the OS really flushes).
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = EXTRA');
  db.pragma('foreign_keys = ON');
  db.pragma('cache_size = -20000');
  db.pragma('temp_store = MEMORY');

  console.log(`✅ Database: ${dbFilePath}`);
  appReady = true;
}

// ── Boot: try to load config and open DB right away ───────────────────────
config = loadConfig();
if (config) {
  mkdirSync(config.dbPath, { recursive: true });
  openDb(join(config.dbPath, 'database.db'));
}

// ── Timestamp helper (Persian → Gregorian fallback) ───────────────────────
function backupTimestamp() {
  try {
    const parts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const g = (t) => (parts.find(p => p.type === t)?.value ?? '00').padStart(2, '0');
    return `${g('year')}_${g('month')}_${g('day')}_${g('hour')}_${g('minute')}_${g('second')}`;
  } catch {
    const n = new Date(), p = (v) => String(v).padStart(2, '0');
    return `${n.getFullYear()}_${p(n.getMonth()+1)}_${p(n.getDate())}_${p(n.getHours())}_${p(n.getMinutes())}_${p(n.getSeconds())}`;
  }
}

// ── First-time setup HTML (served without React; plain RTL form) ───────────
function setupPageHtml() {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HesabFlow — اولین راه‌اندازی</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;
       display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#1e293b;border:1px solid #334155;border-radius:12px;
        padding:2rem;width:480px;max-width:95vw}
  h1{font-size:1.35rem;margin-bottom:.4rem;color:#f1f5f9}
  .sub{color:#94a3b8;font-size:.88rem;margin-bottom:1.5rem;line-height:1.6}
  label{display:block;font-size:.83rem;color:#94a3b8;margin-bottom:4px;margin-top:.9rem}
  input{width:100%;background:#0f172a;border:1px solid #475569;border-radius:6px;
        padding:.6rem .75rem;color:#f1f5f9;font-size:.93rem;direction:ltr}
  input:focus{outline:none;border-color:#3b82f6}
  .hint{font-size:.76rem;color:#64748b;margin-top:3px}
  button{width:100%;margin-top:1.5rem;background:#3b82f6;color:#fff;border:none;
         border-radius:6px;padding:.75rem;font-size:1rem;cursor:pointer}
  button:hover{background:#2563eb}
  button:disabled{opacity:.6;cursor:not-allowed}
  #msg{margin-top:.9rem;font-size:.88rem;color:#f87171}
</style>
</head>
<body>
<div class="card">
  <h1>اولین راه‌اندازی HesabFlow</h1>
  <p class="sub">
    مسیر ذخیره‌سازی داده و بک‌آپ را وارد کنید.<br>
    این تنظیمات در <code>config.json</code> کنار برنامه ذخیره می‌شود.
  </p>
  <form id="f">
    <label>مسیر پوشه دیتابیس</label>
    <input id="dbPath" placeholder="D:\\HesabFlow\\Data" required>
    <div class="hint">اگر پوشه وجود ندارد، ساخته می‌شود.</div>

    <label>مسیر پوشه بک‌آپ</label>
    <input id="backupPath" placeholder="D:\\HesabFlow\\Backup" required>
    <div class="hint">فایل‌های بک‌آپ با تاریخ شمسی اینجا ذخیره می‌شوند.</div>

    <button type="submit" id="btn">تأیید و شروع</button>
  </form>
  <div id="msg"></div>
</div>
<script>
document.getElementById('f').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btn');
  const msg = document.getElementById('msg');
  btn.disabled = true;
  btn.textContent = 'در حال راه‌اندازی…';
  msg.textContent = '';
  try {
    const r = await fetch('/api/save-config', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        dbPath:     document.getElementById('dbPath').value.trim(),
        backupPath: document.getElementById('backupPath').value.trim(),
      })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    window.location.href = '/';
  } catch (err) {
    msg.textContent = 'خطا: ' + err.message;
    btn.disabled = false;
    btn.textContent = 'تأیید و شروع';
  }
});
</script>
</body>
</html>`;
}

// ── Express app ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '50mb' }));
// sendBeacon sends text/plain; accept both
app.use('/api/backup-and-shutdown', express.text(), express.json({ strict: false }));

// ── Feature 2: first-time setup ───────────────────────────────────────────
app.get('/setup', (_req, res) => res.send(setupPageHtml()));

app.post('/api/save-config', (req, res) => {
  const { dbPath, backupPath } = req.body ?? {};
  if (!dbPath || !backupPath)
    return res.status(400).json({ error: 'هر دو مسیر الزامی است' });

  try {
    mkdirSync(dbPath,     { recursive: true });
    mkdirSync(backupPath, { recursive: true });
  } catch (e) {
    return res.status(400).json({ error: `ایجاد پوشه ناموفق: ${e.message}` });
  }

  const cfg = { dbPath, backupPath };
  try { persistConfig(cfg); }
  catch (e) {
    return res.status(500).json({ error: `ذخیره config.json ناموفق: ${e.message}` });
  }

  config = cfg;
  try { openDb(join(dbPath, 'database.db')); }
  catch (e) {
    return res.status(500).json({ error: `باز کردن دیتابیس ناموفق: ${e.message}` });
  }

  res.json({ ok: true });
});

// Block all non-setup routes until DB is ready
app.use((req, res, next) => {
  if (!appReady && !req.path.startsWith('/api/') && req.path !== '/setup')
    return res.redirect('/setup');
  next();
});

// ── React app ──────────────────────────────────────────────────────────────
// Inject: server-mode flag + beforeunload beacon (no frontend changes needed)
app.get('/', (_req, res) => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const inject = `<script>
window.__HESABFLOW_SERVER = true;
window.addEventListener('beforeunload', function() {
  navigator.sendBeacon('/api/backup-and-shutdown',
    new Blob(['{}'], { type: 'application/json' }));
});
</script>`;
  res.send(html.replace('<head>', '<head>' + inject));
});
app.use(express.static(DIST));

// ── DB bridge: $1,$2 named params → better-sqlite3 object ─────────────────
function toNamedParams(params) {
  if (!params || params.length === 0) return {};
  return Object.fromEntries(params.map((v, i) => [String(i + 1), v]));
}

app.post('/api/db/execute', (req, res) => {
  const { sql, params = [] } = req.body;
  try {
    const result = db.prepare(sql).run(toNamedParams(params));
    res.json({ rowsAffected: result.changes, lastInsertId: result.lastInsertRowid });
  } catch (e) {
    console.error('execute:', e.message, '\n', sql);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/db/select', (req, res) => {
  const { sql, params = [] } = req.body;
  try {
    const rows = db.prepare(sql).all(toNamedParams(params));
    res.json({ rows });
  } catch (e) {
    console.error('select:', e.message, '\n', sql);
    res.status(500).json({ error: e.message, rows: [] });
  }
});

// ── Feature 3: backup-and-shutdown ────────────────────────────────────────
app.post('/api/backup-and-shutdown', async (req, res) => {
  if (!db || !config)
    return res.status(400).json({ error: 'Database not initialised' });

  try {
    mkdirSync(config.backupPath, { recursive: true });
    const filename   = `HesabFlow_Backup_${backupTimestamp()}.db`;
    const targetPath = join(config.backupPath, filename);

    // db.backup() uses SQLite's online backup API:
    //   • copies page by page without locking the source DB
    //   • safe to call while writes are in flight
    //   • returns a Promise that resolves when backup is complete
    await db.backup(targetPath);

    console.log(`✅ Backup saved: ${targetPath}`);
    res.json({ ok: true, file: filename });

    // Give the HTTP response 300 ms to reach the browser, then exit cleanly.
    setTimeout(() => process.exit(0), 300);
  } catch (e) {
    console.error('Backup failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Config info endpoint (useful for Settings UI)
app.get('/api/config', (_req, res) =>
  res.json(config ? { ok: true, ...config } : { ok: false })
);

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  const base   = `http://localhost:${PORT}`;
  const target = appReady ? base : `${base}/setup`;
  console.log(`🚀 HesabFlow → ${target}`);
  const open =
    process.platform === 'win32' ? `start "" "${target}"` :
    process.platform === 'darwin' ? `open "${target}"` :
    `xdg-open "${target}"`;
  exec(open, err => { if (err) console.log('Open browser manually:', target); });
});
