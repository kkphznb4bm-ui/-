/* Сервер кафе «Вкус Мира»: сайт, заказы, меню и админ-панель.
   Без внешних зависимостей: нужен только Node.js 22.5+ (встроенный SQLite).
   Запуск: node server/server.js   (порт — переменная PORT, по умолчанию 3000) */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { DatabaseSync } = require("node:sqlite");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const PORT = +process.env.PORT || 3000;
/* часовой пояс для статистики «за сегодня»: Бишкек UTC+6 */
const TZ_OFFSET_MIN = process.env.TZ_OFFSET_MIN != null ? +process.env.TZ_OFFSET_MIN : 360;
const SESSION_DAYS = 7;
const STATUSES = ["new", "accepted", "cooking", "ready", "delivered", "cancelled"];

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ===================== База данных ===================== */
const db = new DatabaseSync(path.join(DATA_DIR, "cafe.db"));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, prefix TEXT, layout TEXT, img TEXT, note TEXT, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY, cat TEXT NOT NULL REFERENCES categories(id), sub TEXT, name TEXT NOT NULL, description TEXT,
  img TEXT, price INTEGER, variants TEXT, choices TEXT, available INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new', paid INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL, phone TEXT NOT NULL, method TEXT NOT NULL, address TEXT, pay TEXT NOT NULL, comment TEXT,
  items TEXT NOT NULL, total INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status);
`);

const getSetting = k => { const r = db.prepare("SELECT value FROM settings WHERE key = ?").get(k); return r ? r.value : null; };
const setSetting = (k, v) => db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(k, v);

/* первый запуск: меню из menu-data.js */
if (!db.prepare("SELECT COUNT(*) n FROM categories").get().n) {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "menu-data.js"), "utf8"), ctx);
  const now = Date.now();
  const insC = db.prepare("INSERT INTO categories (id, name, prefix, layout, img, note, sort) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const insD = db.prepare(`INSERT INTO dishes (id, cat, sub, name, description, img, price, variants, choices, available, sort, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`);
  db.exec("BEGIN");
  ctx.CATS.forEach((c, i) => insC.run(c.id, c.name, c.prefix || null, c.layout || null, c.img || null, c.note || null, i));
  ctx.MENU.forEach((m, i) => {
    const choices = typeof m.choices === "string" ? m.choices.split(" ").map(k => ctx.CHOICE[k]) : null;
    insD.run(m.id, m.cat, m.sub || null, m.name, m.desc || null, JSON.stringify(m.img), m.variants ? null : m.price,
      m.variants ? JSON.stringify(m.variants) : null, choices ? JSON.stringify(choices) : null, i, now, now);
  });
  db.exec("COMMIT");
  console.log(`База создана: ${ctx.CATS.length} разделов, ${ctx.MENU.length} блюд.`);
}

/* пароль администратора */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(pw, salt, 64).toString("hex");
}
function checkPassword(pw, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex"), b = crypto.scryptSync(String(pw), salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
if (!getSetting("admin_password")) {
  let pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    pw = crypto.randomBytes(9).toString("base64url");
    fs.writeFileSync(path.join(DATA_DIR, "admin-password.txt"), pw + "\n", { mode: 0o600 });
    console.log(`\nПароль администратора: ${pw}\n(сохранён в ${path.join(DATA_DIR, "admin-password.txt")}; смените его в админ-панели)\n`);
  }
  setSetting("admin_password", hashPassword(pw));
}

/* ===================== Меню ===================== */
const parseJSON = (s, d = null) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };
function dishOut(r) {
  const d = { id: r.id, cat: r.cat, name: r.name, img: parseJSON(r.img, r.img), available: !!r.available, sort: r.sort };
  if (r.sub) d.sub = r.sub;
  if (r.description) d.desc = r.description;
  if (r.variants) d.variants = parseJSON(r.variants); else d.price = r.price;
  if (r.choices) d.choices = parseJSON(r.choices);
  return d;
}
function catOut(r) {
  const c = { id: r.id, name: r.name };
  for (const k of ["prefix", "layout", "img", "note"]) if (r[k]) c[k] = r[k];
  return c;
}
function getMenu() {
  const cats = db.prepare("SELECT * FROM categories ORDER BY sort, rowid").all().map(catOut);
  const dishes = db.prepare("SELECT d.* FROM dishes d JOIN categories c ON c.id = d.cat ORDER BY c.sort, d.sort, d.rowid").all().map(dishOut);
  return { cats, dishes };
}
const dishById = id => { const r = db.prepare("SELECT * FROM dishes WHERE id = ?").get(id); return r ? dishOut(r) : null; };
const catById = id => db.prepare("SELECT * FROM categories WHERE id = ?").get(id);

/* разбор позиции корзины: "id:вариант~выборы" — как на сайте */
function resolveItem(key, qty) {
  if (typeof key !== "string" || key.length > 120) return { error: "Неверная позиция заказа." };
  const [base, chs] = key.split("~");
  const i = base.lastIndexOf(":");
  const m = dishById(base.slice(0, i)); const vi = +base.slice(i + 1);
  if (!m) return { error: "Одного из блюд больше нет в меню. Обновите страницу." };
  if (!m.available) return { error: `«${m.name}» сейчас нет в наличии.` };
  const vs = m.variants ? m.variants.map(([label, price]) => ({ label, price })) : [{ label: "", price: m.price }];
  const v = Number.isInteger(vi) ? vs[vi] : null;
  if (!v) return { error: "Неверный вариант блюда." };
  let choices = [];
  if (m.choices) {
    const ch = (chs || "").split(".").map(Number);
    if (ch.length !== m.choices.length || ch.some((c, j) => !(Number.isInteger(c) && c >= 0 && c < m.choices[j].list.length))) return { error: "Неверный выбор в комбо." };
    choices = m.choices.map((c, j) => `${c.label}: ${c.list[ch[j]]}`);
  } else if (chs) return { error: "Неверная позиция заказа." };
  const q = Math.floor(qty);
  if (!(q >= 1 && q <= 99)) return { error: "Неверное количество." };
  const cat = catById(m.cat);
  const full = cat && cat.prefix ? `${cat.prefix} ${m.name.charAt(0).toLowerCase()}${m.name.slice(1)}` : m.name;
  return { item: { dishId: m.id, name: full, variant: v.label, choices, price: v.price, qty: q, sum: v.price * q } };
}

/* ===================== Заказы и статистика ===================== */
function orderOut(r) {
  return { id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, status: r.status, paid: !!r.paid, name: r.name, phone: r.phone,
    method: r.method, address: r.address, pay: r.pay, comment: r.comment, items: parseJSON(r.items, []), total: r.total };
}
const dayKey = ms => new Date(ms + TZ_OFFSET_MIN * 60000).toISOString().slice(0, 10);
const hourOf = ms => new Date(ms + TZ_OFFSET_MIN * 60000).getUTCHours();
/* начало суток (местное время) n дней назад, в мс */
function dayStart(daysAgo = 0) {
  const local = new Date(Date.now() + TZ_OFFSET_MIN * 60000);
  local.setUTCHours(0, 0, 0, 0);
  return local.getTime() - TZ_OFFSET_MIN * 60000 - daysAgo * 86400000;
}
const isRevenue = o => o.paid && o.status !== "cancelled";

function stats(period) {
  const all = db.prepare("SELECT id, created_at, status, paid, total, items FROM orders").all();
  const t0 = dayStart(0), w0 = dayStart(6), m0 = dayStart(29);
  const card = from => {
    const os = all.filter(o => o.created_at >= from);
    return { orders: os.filter(o => o.status !== "cancelled").length, revenue: os.filter(isRevenue).reduce((a, o) => a + o.total, 0) };
  };
  const cards = { today: card(t0), week: card(w0), month: card(m0),
    total: { orders: all.filter(o => o.status !== "cancelled").length, revenue: all.filter(isRevenue).reduce((a, o) => a + o.total, 0) } };

  const days = period === "day" ? 1 : period === "month" ? 30 : 7;
  const from = dayStart(days - 1);
  const os = all.filter(o => o.created_at >= from);
  let series;
  if (period === "day") {
    series = Array.from({ length: 24 }, (_, h) => ({ key: String(h).padStart(2, "0") + ":00", orders: 0, revenue: 0 }));
    for (const o of os) { const s = series[hourOf(o.created_at)]; if (o.status !== "cancelled") s.orders++; if (isRevenue(o)) s.revenue += o.total; }
  } else {
    series = Array.from({ length: days }, (_, i) => ({ key: dayKey(from + i * 86400000 + 43200000), orders: 0, revenue: 0 }));
    const idx = Object.fromEntries(series.map((s, i) => [s.key, i]));
    for (const o of os) { const s = series[idx[dayKey(o.created_at)]]; if (!s) continue; if (o.status !== "cancelled") s.orders++; if (isRevenue(o)) s.revenue += o.total; }
  }
  const paidOs = os.filter(isRevenue);
  const revenue = paidOs.reduce((a, o) => a + o.total, 0);
  const top = {};
  for (const o of os) {
    if (o.status === "cancelled") continue;
    for (const it of parseJSON(o.items, [])) {
      const t = top[it.name] || (top[it.name] = { name: it.name, qty: 0, sum: 0 });
      t.qty += it.qty; t.sum += it.sum;
    }
  }
  const byStatus = Object.fromEntries(STATUSES.map(s => [s, os.filter(o => o.status === s).length]));
  return {
    cards, period, series,
    summary: { orders: os.filter(o => o.status !== "cancelled").length, revenue, paidOrders: paidOs.length,
      avgCheck: paidOs.length ? Math.round(revenue / paidOs.length) : 0, cancelled: byStatus.cancelled,
      unpaid: os.filter(o => !o.paid && o.status !== "cancelled").length, byStatus },
    top: Object.values(top).sort((a, b) => b.qty - a.qty || b.sum - a.sum).slice(0, 8),
  };
}

/* ===================== Живые события (SSE) ===================== */
const adminStreams = new Set(), publicStreams = new Set();
function sse(res, set) {
  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.write("retry: 3000\n\n");
  set.add(res);
  res.on("close", () => set.delete(res));
}
function broadcast(set, type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const r of set) r.write(msg);
}
setInterval(() => { for (const r of [...adminStreams, ...publicStreams]) r.write(": ping\n\n"); }, 25000).unref();

/* ===================== HTTP-помощники ===================== */
const send = (res, code, obj, headers = {}) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(body);
};
const fail = (res, code, error) => send(res, code, { error });
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > limit) { reject(Object.assign(new Error("Слишком большой запрос."), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch { reject(Object.assign(new Error("Неверный формат запроса."), { code: 400 })); } });
    req.on("error", reject);
  });
}
const cookies = req => Object.fromEntries((req.headers.cookie || "").split(";").map(c => c.trim().split("=")).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
const clientIp = req => (process.env.TRUST_PROXY ? (req.headers["x-forwarded-for"] || "").split(",")[0].trim() : "") || req.socket.remoteAddress || "?";
const isHttps = req => process.env.COOKIE_SECURE === "1" || req.headers["x-forwarded-proto"] === "https";

/* простое ограничение частоты: не больше max событий за окно */
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now(); const b = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (b.length >= max) { buckets.set(key, b); return true; }
  b.push(now); buckets.set(key, b); return false;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (!b.some(t => now - t < 3600000)) buckets.delete(k); }, 600000).unref();

function sessionOk(req) {
  const t = cookies(req).vm_admin;
  if (!t || t.length !== 64) return false;
  const r = db.prepare("SELECT expires FROM sessions WHERE token = ?").get(t);
  return !!r && r.expires > Date.now();
}
const sessionCookie = (req, token, maxAge) => `vm_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(req) ? "; Secure" : ""}`;

/* ===================== Проверка данных ===================== */
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = v => (Number.isInteger(v) ? v : Number.isInteger(+v) && String(v).trim() !== "" ? +v : NaN);
function cleanImg(v) {
  if (typeof v !== "string" || !v) return null;
  if (/^img\/[a-z0-9-]+$/i.test(v) || /^uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(v)) return v;
  return null;
}
function dishInput(b, existing) {
  const name = str(b.name, 120); if (!name) return { error: "Укажите название блюда." };
  const cat = str(b.cat, 40); if (!catById(cat)) return { error: "Выберите раздел меню." };
  const sub = str(b.sub, 60) || null;
  const desc = str(b.desc, 400) || null;
  let price = null, variants = null;
  if (Array.isArray(b.variants) && b.variants.length) {
    if (b.variants.length > 12) return { error: "Не больше 12 вариантов." };
    variants = [];
    for (const v of b.variants) {
      const label = str(v && v[0], 60); const p = int(v && v[1]);
      if (!label) return { error: "У каждого варианта должно быть название." };
      if (!(p >= 0 && p <= 1000000)) return { error: `Неверная цена у варианта «${label}».` };
      variants.push([label, p]);
    }
    if (variants.length === 1 && !b.keepSingleVariant) { price = variants[0][1]; variants = null; }
  } else {
    price = int(b.price);
    if (!(price >= 0 && price <= 1000000)) return { error: "Укажите цену (целое число в сомах)." };
  }
  let img = existing ? existing.img : null;
  if (b.img !== undefined) {
    const imgs = Array.isArray(b.img) ? b.img.map(cleanImg) : [cleanImg(b.img)];
    if (imgs.some(x => !x)) return { error: "Неверное фото." };
    img = Array.isArray(b.img) ? imgs : imgs[0];
  }
  if (!img) return { error: "Добавьте фото блюда." };
  if (Array.isArray(img) && (!variants || img.length !== variants.length)) img = img[0];
  return { value: { name, cat, sub, desc, price, variants, img, available: b.available === undefined ? (existing ? existing.available : true) : !!b.available } };
}

function translit(s) {
  const map = { "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch", "ы": "y", "э": "e", "ю": "yu", "я": "ya" };
  return s.toLowerCase().split("").map(c => map[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "dish";
}

/* ===================== Маршруты API ===================== */
async function api(req, res, url) {
  const p = url.pathname, method = req.method;

  /* ---- публичные ---- */
  if (p === "/api/menu" && method === "GET") return send(res, 200, getMenu());
  if (p === "/api/events" && method === "GET") return sse(res, publicStreams);

  if (p === "/api/orders" && method === "POST") {
    if (limited("order:" + clientIp(req), 8, 10 * 60000)) return fail(res, 429, "Слишком много заказов подряд. Подождите несколько минут или напишите нам в WhatsApp.");
    const b = await readBody(req, 32 * 1024);
    const name = str(b.name, 80), phone = str(b.phone, 30), comment = str(b.comment, 500);
    const method_ = b.method === "pickup" ? "pickup" : "delivery";
    const pay = b.pay === "qr" ? "qr" : "cash";
    const address = method_ === "delivery" ? str(b.address, 300) : "";
    const errs = [];
    if (!name) errs.push("имя");
    if (phone.replace(/\D/g, "").length < 7) errs.push("телефон");
    if (method_ === "delivery" && !address) errs.push("адрес доставки");
    if (errs.length) return fail(res, 400, "Заполните: " + errs.join(", ") + ".");
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 60) return fail(res, 400, "Корзина пуста.");
    const items = [];
    for (const it of b.items) {
      const r = resolveItem(it && it.key, it && it.qty);
      if (r.error) return fail(res, 409, r.error);
      items.push(r.item);
    }
    const total = items.reduce((a, it) => a + it.sum, 0);
    const now = Date.now();
    const info = db.prepare(`INSERT INTO orders (created_at, updated_at, status, paid, name, phone, method, address, pay, comment, items, total)
      VALUES (?, ?, 'new', 0, ?, ?, ?, ?, ?, ?, ?, ?)`).run(now, now, name, phone, method_, address || null, pay, comment || null, JSON.stringify(items), total);
    const order = orderOut(db.prepare("SELECT * FROM orders WHERE id = ?").get(info.lastInsertRowid));
    broadcast(adminStreams, "order", order);
    return send(res, 201, { id: order.id, total, items, createdAt: now });
  }

  /* ---- вход администратора ---- */
  if (p === "/api/admin/login" && method === "POST") {
    const ip = clientIp(req);
    if (limited("login:" + ip, 6, 10 * 60000)) return fail(res, 429, "Слишком много попыток входа. Подождите 10 минут.");
    const b = await readBody(req, 4096);
    if (!checkPassword(b.password, getSetting("admin_password"))) return fail(res, 401, "Неверный пароль.");
    buckets.delete("login:" + ip);
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
    db.prepare("INSERT INTO sessions (token, expires) VALUES (?, ?)").run(token, Date.now() + SESSION_DAYS * 86400000);
    return send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(req, token, SESSION_DAYS * 86400) });
  }
  if (p === "/api/admin/logout" && method === "POST") {
    const t = cookies(req).vm_admin; if (t) db.prepare("DELETE FROM sessions WHERE token = ?").run(t);
    return send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(req, "", 0) });
  }
  if (p === "/api/admin/me" && method === "GET") return send(res, 200, { loggedIn: sessionOk(req) });

  /* ---- дальше только для администратора ---- */
  if (!p.startsWith("/api/admin/")) return fail(res, 404, "Не найдено.");
  if (!sessionOk(req)) return fail(res, 401, "Войдите заново.");
  if (method !== "GET" && req.headers["x-requested-with"] !== "fetch") return fail(res, 403, "Запрос отклонён.");

  if (p === "/api/admin/events" && method === "GET") return sse(res, adminStreams);
  if (p === "/api/admin/stats" && method === "GET") {
    const period = ["day", "week", "month"].includes(url.searchParams.get("period")) ? url.searchParams.get("period") : "week";
    return send(res, 200, stats(period));
  }

  if (p === "/api/admin/orders" && method === "GET") {
    const q = url.searchParams; const where = [], args = [];
    const status = q.get("status");
    if (status === "active") where.push("status IN ('new','accepted','cooking','ready')");
    else if (STATUSES.includes(status)) { where.push("status = ?"); args.push(status); }
    const from = q.get("from"), to = q.get("to");
    if (/^\d{4}-\d{2}-\d{2}$/.test(from || "")) { where.push("created_at >= ?"); args.push(Date.parse(from + "T00:00:00Z") - TZ_OFFSET_MIN * 60000); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to || "")) { where.push("created_at < ?"); args.push(Date.parse(to + "T00:00:00Z") - TZ_OFFSET_MIN * 60000 + 86400000); }
    const search = str(q.get("q"), 60);
    if (search) {
      const n = search.replace(/^#/, "");
      if (/^\d+$/.test(n)) { where.push("(id = ? OR replace(replace(replace(phone,' ',''),'+',''),'-','') LIKE ?)"); args.push(+n, `%${n}%`); }
      else { where.push("(name LIKE ? OR phone LIKE ?)"); args.push(`%${search}%`, `%${search}%`); }
    }
    const w = where.length ? "WHERE " + where.join(" AND ") : "";
    const limit = Math.min(Math.max(+q.get("limit") || 50, 1), 200), offset = Math.max(+q.get("offset") || 0, 0);
    const rows = db.prepare(`SELECT * FROM orders ${w} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset).map(orderOut);
    const agg = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN paid = 1 AND status != 'cancelled' THEN total END), 0) rev FROM orders ${w}`).get(...args);
    return send(res, 200, { orders: rows, total: agg.n, revenue: agg.rev });
  }
  let m = p.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (m) {
    const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(+m[1]);
    if (!row) return fail(res, 404, "Заказ не найден.");
    if (method === "GET") return send(res, 200, orderOut(row));
    if (method === "PATCH") {
      const b = await readBody(req, 4096);
      let status = row.status, paid = row.paid;
      if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return fail(res, 400, "Неверный статус."); status = b.status; if (status === "delivered" && b.paid === undefined) paid = 1; }
      if (b.paid !== undefined) paid = b.paid ? 1 : 0;
      db.prepare("UPDATE orders SET status = ?, paid = ?, updated_at = ? WHERE id = ?").run(status, paid, Date.now(), row.id);
      const order = orderOut(db.prepare("SELECT * FROM orders WHERE id = ?").get(row.id));
      broadcast(adminStreams, "order-update", order);
      return send(res, 200, order);
    }
  }

  if (p === "/api/admin/menu" && method === "GET") return send(res, 200, getMenu());
  if (p === "/api/admin/dishes" && method === "POST") {
    const b = await readBody(req, 16 * 1024);
    const r = dishInput(b, null); if (r.error) return fail(res, 400, r.error);
    const v = r.value; const now = Date.now();
    const id = translit(v.name) + "-" + crypto.randomBytes(3).toString("hex");
    const sort = (db.prepare("SELECT MAX(sort) s FROM dishes WHERE cat = ?").get(v.cat).s ?? -1) + 1;
    db.prepare(`INSERT INTO dishes (id, cat, sub, name, description, img, price, variants, choices, available, sort, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`).run(id, v.cat, v.sub, v.name, v.desc, JSON.stringify(v.img), v.price, v.variants ? JSON.stringify(v.variants) : null, v.available ? 1 : 0, sort, now, now);
    broadcast(publicStreams, "menu", { at: now });
    return send(res, 201, dishById(id));
  }
  m = p.match(/^\/api\/admin\/dishes\/([a-z0-9-]{1,60})$/);
  if (m) {
    const existing = dishById(m[1]);
    if (!existing) return fail(res, 404, "Блюдо не найдено.");
    if (method === "PATCH") {
      const b = await readBody(req, 16 * 1024);
      /* быстрый переключатель «в наличии» */
      if (Object.keys(b).length === 1 && "available" in b) {
        db.prepare("UPDATE dishes SET available = ?, updated_at = ? WHERE id = ?").run(b.available ? 1 : 0, Date.now(), existing.id);
      } else {
        const r = dishInput({ ...b, keepSingleVariant: false }, existing); if (r.error) return fail(res, 400, r.error);
        const v = r.value;
        db.prepare(`UPDATE dishes SET cat = ?, sub = ?, name = ?, description = ?, img = ?, price = ?, variants = ?, available = ?, updated_at = ? WHERE id = ?`)
          .run(v.cat, v.sub, v.name, v.desc, JSON.stringify(v.img), v.price, v.variants ? JSON.stringify(v.variants) : null, v.available ? 1 : 0, Date.now(), existing.id);
      }
      broadcast(publicStreams, "menu", { at: Date.now() });
      return send(res, 200, dishById(existing.id));
    }
    if (method === "DELETE") {
      db.prepare("DELETE FROM dishes WHERE id = ?").run(existing.id);
      broadcast(publicStreams, "menu", { at: Date.now() });
      return send(res, 200, { ok: true });
    }
  }

  if (p === "/api/admin/upload" && method === "POST") {
    const b = await readBody(req, 9 * 1024 * 1024);
    const mm = typeof b.data === "string" && b.data.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!mm) return fail(res, 400, "Загрузите фото в формате JPG, PNG или WebP.");
    const buf = Buffer.from(mm[2], "base64");
    if (buf.length > 6 * 1024 * 1024) return fail(res, 413, "Фото больше 6 МБ.");
    const sig = buf.subarray(0, 12);
    const ext = sig[0] === 0xff && sig[1] === 0xd8 ? "jpg" : sig.toString("hex", 0, 8) === "89504e470d0a1a0a" ? "png" : sig.toString("ascii", 0, 4) === "RIFF" && sig.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
    if (!ext) return fail(res, 400, "Файл не похож на фото.");
    const name = crypto.randomBytes(12).toString("hex") + "." + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    return send(res, 201, { img: "uploads/" + name });
  }

  if (p === "/api/admin/password" && method === "POST") {
    const b = await readBody(req, 4096);
    if (!checkPassword(b.current, getSetting("admin_password"))) return fail(res, 400, "Текущий пароль неверный.");
    if (typeof b.next !== "string" || b.next.length < 8 || b.next.length > 200) return fail(res, 400, "Новый пароль: минимум 8 символов.");
    setSetting("admin_password", hashPassword(b.next));
    const t = cookies(req).vm_admin;
    db.prepare("DELETE FROM sessions WHERE token != ?").run(t);
    try { fs.unlinkSync(path.join(DATA_DIR, "admin-password.txt")); } catch {}
    return send(res, 200, { ok: true });
  }

  return fail(res, 404, "Не найдено.");
}

/* ===================== Статические файлы ===================== */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
function serveFile(res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Не найдено"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" });
    fs.createReadStream(file).pipe(res);
  });
}
function staticRoute(req, res, url) {
  let p; try { p = decodeURIComponent(url.pathname); } catch { p = "/"; }
  if (p === "/" || p === "/index.html") return serveFile(res, path.join(ROOT, "index.html"), "no-cache");
  if (["/menu-data.js", "/backend.js", "/firebase-config.js"].includes(p)) return serveFile(res, path.join(ROOT, p.slice(1)), "no-cache");
  if (p === "/admin") { res.writeHead(301, { Location: "/admin/" }); return res.end(); }
  if (p === "/admin/") return serveFile(res, path.join(ROOT, "admin", "index.html"), "no-store");
  const roots = [["/img/", path.join(ROOT, "img"), "public, max-age=86400"], ["/uploads/", UPLOAD_DIR, "public, max-age=31536000, immutable"], ["/admin/", path.join(ROOT, "admin"), "no-cache"]];
  for (const [prefix, dir, cache] of roots) {
    if (p.startsWith(prefix)) {
      const file = path.resolve(dir, "." + p.slice(prefix.length - 1));
      if (!file.startsWith(dir + path.sep)) break;
      return serveFile(res, file, cache);
    }
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Не найдено");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  res.setHeader("Referrer-Policy", "same-origin");
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD") return fail(res, 405, "Метод не поддерживается.");
    staticRoute(req, res, url);
  } catch (e) {
    if (e && e.code && Number.isInteger(e.code)) return fail(res, e.code, e.message);
    console.error(e);
    if (!res.headersSent) fail(res, 500, "Ошибка сервера. Попробуйте ещё раз.");
  }
});
server.listen(PORT, () => console.log(`«Вкус Мира» работает: http://localhost:${PORT}  ·  админ-панель: http://localhost:${PORT}/admin/`));
