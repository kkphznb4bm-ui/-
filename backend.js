/* «Вкус Мира»: единый слой данных для сайта и админ-панели.
   Режимы (выбираются сами):
   - firebase — если в firebase-config.js заполнены настройки: общая база Google Firestore, вход по почте и паролю;
   - server   — если сайт открыт через server/server.js;
   - demo     — во всех остальных случаях: данные хранятся только в этом браузере (как демо AVATAR). */
(function () {
  "use strict";
  const VM = (window.VM = {});
  const ROOT = (document.currentScript && document.currentScript.dataset.root) || "";
  const STATUSES = ["new", "accepted", "cooking", "ready", "delivered", "cancelled"];
  const TZ_OFFSET_MIN = 360; /* Бишкек, UTC+6 */
  const DEMO_LOGIN = "admin", DEMO_PASSWORD = "vkusmira";
  VM.DEMO_LOGIN = DEMO_LOGIN; VM.DEMO_PASSWORD = DEMO_PASSWORD;

  /* исходное меню из menu-data.js (копия до того, как сайт начнёт его менять) */
  const SEED = (() => {
    if (typeof CATS === "undefined" || typeof MENU === "undefined") return { cats: [], dishes: [] };
    const cats = JSON.parse(JSON.stringify(CATS)).map((c, i) => ({ ...c, sort: i }));
    const dishes = JSON.parse(JSON.stringify(MENU)).map((m, i) => {
      const d = { ...m, available: true, sort: i };
      if (typeof d.choices === "string") d.choices = d.choices.split(" ").map(k => CHOICE[k]);
      return d;
    });
    return { cats, dishes };
  })();

  /* ===================== общие расчёты ===================== */
  const clone = o => JSON.parse(JSON.stringify(o));
  const err = (message, status = 400) => Object.assign(new Error(message), { status });
  function resolveItem(menu, key, qty) {
    if (typeof key !== "string" || key.length > 120) return { error: "Неверная позиция заказа." };
    const [base, chs] = key.split("~");
    const i = base.lastIndexOf(":");
    const m = menu.dishes.find(d => d.id === base.slice(0, i)); const vi = +base.slice(i + 1);
    if (!m) return { error: "Одного из блюд больше нет в меню. Обновите страницу." };
    if (m.available === false) return { error: `«${m.name}» сейчас нет в наличии.` };
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
    const cat = menu.cats.find(c => c.id === m.cat);
    const full = cat && cat.prefix ? `${cat.prefix} ${m.name.charAt(0).toLowerCase()}${m.name.slice(1)}` : m.name;
    return { item: { dishId: m.id, name: full, variant: v.label, choices, price: v.price, qty: q, sum: v.price * q } };
  }
  function buildOrder(menu, b) {
    const s = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    const name = s(b.name, 80), phone = s(b.phone, 30), comment = s(b.comment, 500);
    const method = b.method === "pickup" ? "pickup" : "delivery";
    const pay = b.pay === "qr" ? "qr" : "cash";
    const address = method === "delivery" ? s(b.address, 300) : "";
    const errs = [];
    if (!name) errs.push("имя");
    if (phone.replace(/\D/g, "").length < 7) errs.push("телефон");
    if (method === "delivery" && !address) errs.push("адрес доставки");
    if (errs.length) throw err("Заполните: " + errs.join(", ") + ".");
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 60) throw err("Корзина пуста.");
    const items = [];
    for (const it of b.items) { const r = resolveItem(menu, it && it.key, it && it.qty); if (r.error) throw err(r.error, 409); items.push(r.item); }
    return { name, phone, comment: comment || null, method, pay, address: address || null, items, total: items.reduce((a, it) => a + it.sum, 0), status: "new", paid: false };
  }
  const dayKey = ms => new Date(ms + TZ_OFFSET_MIN * 60000).toISOString().slice(0, 10);
  const hourOf = ms => new Date(ms + TZ_OFFSET_MIN * 60000).getUTCHours();
  function dayStart(daysAgo = 0) {
    const local = new Date(Date.now() + TZ_OFFSET_MIN * 60000); local.setUTCHours(0, 0, 0, 0);
    return local.getTime() - TZ_OFFSET_MIN * 60000 - daysAgo * 86400000;
  }
  const isRevenue = o => o.paid && o.status !== "cancelled";
  function computeStats(all, period) {
    const card = from => { const os = all.filter(o => o.createdAt >= from); return { orders: os.filter(o => o.status !== "cancelled").length, revenue: os.filter(isRevenue).reduce((a, o) => a + o.total, 0) }; };
    const cards = { today: card(dayStart(0)), week: card(dayStart(6)), month: card(dayStart(29)), total: card(0) };
    const days = period === "day" ? 1 : period === "month" ? 30 : 7;
    const from = dayStart(days - 1); const os = all.filter(o => o.createdAt >= from);
    let series;
    if (period === "day") {
      series = Array.from({ length: 24 }, (_, h) => ({ key: String(h).padStart(2, "0") + ":00", orders: 0, revenue: 0 }));
      for (const o of os) { const x = series[hourOf(o.createdAt)]; if (o.status !== "cancelled") x.orders++; if (isRevenue(o)) x.revenue += o.total; }
    } else {
      series = Array.from({ length: days }, (_, i) => ({ key: dayKey(from + i * 86400000 + 43200000), orders: 0, revenue: 0 }));
      const idx = Object.fromEntries(series.map((x, i) => [x.key, i]));
      for (const o of os) { const x = series[idx[dayKey(o.createdAt)]]; if (!x) continue; if (o.status !== "cancelled") x.orders++; if (isRevenue(o)) x.revenue += o.total; }
    }
    const paidOs = os.filter(isRevenue); const revenue = paidOs.reduce((a, o) => a + o.total, 0);
    const top = {};
    for (const o of os) { if (o.status === "cancelled") continue; for (const it of o.items) { const t = top[it.name] || (top[it.name] = { name: it.name, qty: 0, sum: 0 }); t.qty += it.qty; t.sum += it.sum; } }
    const byStatus = Object.fromEntries(STATUSES.map(st => [st, os.filter(o => o.status === st).length]));
    return { cards, period, series,
      summary: { orders: os.filter(o => o.status !== "cancelled").length, revenue, paidOrders: paidOs.length, avgCheck: paidOs.length ? Math.round(revenue / paidOs.length) : 0,
        cancelled: byStatus.cancelled, unpaid: os.filter(o => !o.paid && o.status !== "cancelled").length, byStatus },
      top: Object.values(top).sort((a, b) => b.qty - a.qty || b.sum - a.sum).slice(0, 8) };
  }
  function queryOrders(all, q) {
    let os = all.slice().sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
    const st = q.get("status");
    if (st === "active") os = os.filter(o => ["new", "accepted", "cooking", "ready"].includes(o.status));
    else if (STATUSES.includes(st)) os = os.filter(o => o.status === st);
    const d = v => /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? Date.parse(v + "T00:00:00Z") - TZ_OFFSET_MIN * 60000 : null;
    const from = d(q.get("from")), to = d(q.get("to"));
    if (from != null) os = os.filter(o => o.createdAt >= from);
    if (to != null) os = os.filter(o => o.createdAt < to + 86400000);
    const s = (q.get("q") || "").trim().toLowerCase().replace(/^#/, "");
    if (s) os = os.filter(o => String(o.id) === s || o.name.toLowerCase().includes(s) || o.phone.replace(/\D/g, "").includes(s.replace(/\D/g, "") || "§"));
    const limit = Math.min(Math.max(+q.get("limit") || 50, 1), 200), offset = Math.max(+q.get("offset") || 0, 0);
    return { orders: os.slice(offset, offset + limit), total: os.length, revenue: os.filter(isRevenue).reduce((a, o) => a + o.total, 0) };
  }
  function translit(s) {
    const map = { "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch", "ы": "y", "э": "e", "ю": "yu", "я": "ya" };
    return s.toLowerCase().split("").map(c => map[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "dish";
  }
  function dishInput(menu, b, existing) {
    const s = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    const int = v => (Number.isInteger(v) ? v : Number.isInteger(+v) && String(v).trim() !== "" ? +v : NaN);
    const name = s(b.name, 120); if (!name) throw err("Укажите название блюда.");
    const cat = s(b.cat, 40); if (!menu.cats.some(c => c.id === cat)) throw err("Выберите раздел меню.");
    const out = { name, cat, available: b.available === undefined ? (existing ? existing.available !== false : true) : !!b.available };
    const sub = s(b.sub, 60), desc = s(b.desc, 400);
    if (sub) out.sub = sub; if (desc) out.desc = desc;
    if (Array.isArray(b.variants) && b.variants.length) {
      if (b.variants.length > 12) throw err("Не больше 12 вариантов.");
      const vs = b.variants.map(v => { const l = s(v && v[0], 60), p = int(v && v[1]); if (!l) throw err("У каждого варианта должно быть название."); if (!(p >= 0 && p <= 1000000)) throw err(`Неверная цена у варианта «${l}».`); return [l, p]; });
      if (vs.length === 1) out.price = vs[0][1]; else out.variants = vs;
    } else { const p = int(b.price); if (!(p >= 0 && p <= 1000000)) throw err("Укажите цену (целое число в сомах)."); out.price = p; }
    let img = existing ? existing.img : null;
    if (b.img !== undefined) img = b.img;
    if (!img) throw err("Добавьте фото блюда.");
    if (Array.isArray(img) && (!out.variants || img.length !== out.variants.length)) img = img[0];
    out.img = img;
    if (existing && existing.choices) out.choices = existing.choices;
    return out;
  }

  /* маршруты админ-панели поверх данных в памяти (для demo и firebase) */
  function makeRouter(store) {
    return async function request(path, opts = {}) {
      const url = new URL(path, "http://x/"); const p = url.pathname.slice(1), method = opts.method || "GET", b = opts.body || {};
      if (p === "me") return { loggedIn: await store.isAdmin() };
      if (p === "login") { await store.login(b.email, b.password); return { ok: true }; }
      if (p === "logout") { await store.logout(); return { ok: true }; }
      if (!(await store.isAdmin())) throw err("Войдите заново.", 401);
      await store.ready();
      if (p === "stats") return computeStats(store.orders(), ["day", "week", "month"].includes(url.searchParams.get("period")) ? url.searchParams.get("period") : "week");
      if (p === "orders") return clone(queryOrders(store.orders(), url.searchParams));
      let m = p.match(/^orders\/(\d+)$/);
      if (m) {
        const o = store.orders().find(x => x.id === +m[1]); if (!o) throw err("Заказ не найден.", 404);
        if (method === "GET") return clone(o);
        const patch = {};
        if (b.status !== undefined) { if (!STATUSES.includes(b.status)) throw err("Неверный статус."); patch.status = b.status; if (b.status === "delivered" && b.paid === undefined) patch.paid = true; }
        if (b.paid !== undefined) patch.paid = !!b.paid;
        return clone(await store.updateOrder(o, patch));
      }
      if (p === "menu") return clone(store.menu());
      if (p === "dishes" && method === "POST") {
        const d = dishInput(store.menu(), b, null);
        d.id = translit(d.name) + "-" + Math.random().toString(16).slice(2, 8);
        d.sort = Math.max(-1, ...store.menu().dishes.filter(x => x.cat === d.cat).map(x => x.sort || 0)) + 1;
        return clone(await store.saveDish(d));
      }
      m = p.match(/^dishes\/([a-z0-9-]{1,60})$/);
      if (m) {
        const ex = store.menu().dishes.find(d => d.id === m[1]); if (!ex) throw err("Блюдо не найдено.", 404);
        if (method === "DELETE") { await store.deleteDish(ex.id); return { ok: true }; }
        if (Object.keys(b).length === 1 && "available" in b) return clone(await store.saveDish({ ...ex, available: !!b.available }));
        const d = dishInput(store.menu(), b, ex); d.id = ex.id; d.sort = ex.sort;
        return clone(await store.saveDish(d));
      }
      if (p === "upload") {
        if (typeof b.data !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(b.data)) throw err("Загрузите фото в формате JPG, PNG или WebP.");
        if (b.data.length > 700000) throw err("Фото слишком большое. Выберите другое.");
        return { img: b.data };
      }
      if (p === "password") { await store.changePassword(b.current, b.next); return { ok: true }; }
      throw err("Не найдено.", 404);
    };
  }

  /* простой источник событий */
  function emitter() { const fns = new Set(); return { on: f => (fns.add(f), () => fns.delete(f)), emit: (...a) => fns.forEach(f => { try { f(...a); } catch (e) { console.error(e); } }) }; }

  /* ===================== демо: данные в браузере ===================== */
  function demoBackend() {
    const K = { menu: "vm-demo-v1-menu", orders: "vm-demo-v1-orders", seq: "vm-demo-v1-seq" };
    const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
      set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { throw err("В браузере закончилось место для демо-данных. Удалите лишние фото."); } } };
    const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return mem[k]; } }, set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { mem[k] = v; } } };
    const mem = {};
    let menu = ls.get(K.menu, null) || clone(SEED);
    let orders = ls.get(K.orders, []);
    const menuEv = emitter(), orderEv = emitter();
    addEventListener("storage", e => {
      if (e.key === K.menu) { menu = ls.get(K.menu, null) || clone(SEED); menuEv.emit(clone(menu)); }
      if (e.key === K.orders) {
        const prev = new Map(orders.map(o => [o.id, o])); orders = ls.get(K.orders, []);
        for (const o of orders) { const was = prev.get(o.id); if (!was) orderEv.emit("order", clone(o)); else if (was.updatedAt !== o.updatedAt) orderEv.emit("order-update", clone(o)); }
      }
    });
    const saveMenu = () => { ls.set(K.menu, menu); menuEv.emit(clone(menu)); };
    const store = {
      ready: async () => {}, menu: () => menu, orders: () => orders,
      isAdmin: async () => ss.get("vm-demo-admin") === "1",
      login: async (login, pw) => { if ((login || "").trim().toLowerCase() !== DEMO_LOGIN || pw !== DEMO_PASSWORD) throw err("Неверный логин или пароль.", 401); ss.set("vm-demo-admin", "1"); },
      logout: async () => ss.set("vm-demo-admin", null),
      updateOrder: async (o, patch) => { Object.assign(o, patch, { updatedAt: Date.now() }); ls.set(K.orders, orders); orderEv.emit("order-update", clone(o)); return o; },
      saveDish: async d => { const i = menu.dishes.findIndex(x => x.id === d.id); if (i >= 0) menu.dishes[i] = d; else menu.dishes.push(d); saveMenu(); return d; },
      deleteDish: async id => { menu.dishes = menu.dishes.filter(d => d.id !== id); saveMenu(); },
      changePassword: async () => { throw err("В демо пароль не меняется. В рабочей версии пароль меняется здесь же."); },
    };
    return {
      mode: "demo",
      loadMenu: async () => clone(menu),
      onMenu: f => menuEv.on(f),
      placeOrder: async body => {
        const o = buildOrder(menu, body); const now = Date.now();
        o.id = (ls.get(K.seq, 0) || 0) + 1; o.createdAt = now; o.updatedAt = now;
        orders.push(o); ls.set(K.orders, orders); ls.set(K.seq, o.id); orderEv.emit("order", clone(o));
        return { id: o.id, total: o.total, items: o.items, createdAt: now };
      },
      admin: { request: makeRouter(store), subscribe: h => { h.open && setTimeout(h.open, 0); return orderEv.on((type, o) => h[type] && h[type](o)); }, needsLogin: true, imageMax: 700 },
    };
  }

  /* ===================== сервер (server/server.js) ===================== */
  function serverBackend() {
    const api = async (path, opts = {}) => {
      const r = await fetch(ROOT + "api/admin/" + path, { method: opts.method || "GET", credentials: "same-origin",
        headers: opts.body ? { "Content-Type": "application/json", "X-Requested-With": "fetch" } : { "X-Requested-With": "fetch" },
        body: opts.body ? JSON.stringify(opts.body) : undefined });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw err(data.error || "Ошибка сервера.", r.status);
      return data;
    };
    return {
      mode: "server",
      loadMenu: async () => { const r = await fetch(ROOT + "api/menu", { cache: "no-store" }); if (!r.ok) throw err("Меню недоступно."); return r.json(); },
      onMenu: f => { if (!window.EventSource) return () => {}; const es = new EventSource(ROOT + "api/events"); let t; es.addEventListener("menu", () => { clearTimeout(t); t = setTimeout(async () => { try { f(await (await fetch(ROOT + "api/menu", { cache: "no-store" })).json()); } catch (e) {} }, 300); }); return () => es.close(); },
      placeOrder: async body => {
        const r = await fetch(ROOT + "api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const d = await r.json().catch(() => ({})); if (!r.ok) throw err(d.error || "Не удалось отправить заказ. Попробуйте ещё раз.", r.status); return d;
      },
      admin: {
        request: (path, opts) => api(path, { ...opts, body: opts && opts.body ? (path === "login" ? { password: opts.body.password } : opts.body) : undefined }),
        subscribe: h => { const es = new EventSource(ROOT + "api/admin/events"); es.onopen = () => h.open && h.open(); es.onerror = () => h.error && h.error();
          es.addEventListener("order", e => h.order && h.order(JSON.parse(e.data))); es.addEventListener("order-update", e => h["order-update"] && h["order-update"](JSON.parse(e.data))); return () => es.close(); },
        needsLogin: false, imageMax: 1400,
      },
    };
  }

  /* ===================== Firebase (бесплатный тариф Spark) ===================== */
  const FB_VER = "10.12.2";
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(err("Не удалось загрузить Firebase.")); document.head.appendChild(s); });
  async function firebaseBackend(cfg) {
    for (const f of ["app", "auth", "firestore"]) await loadScript(`https://cdn.jsdelivr.net/npm/firebase@${FB_VER}/firebase-${f}-compat.js`);
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    const db = firebase.firestore(app), auth = firebase.auth(app);
    /* для проверки на локальном эмуляторе Firebase */
    if (cfg.emulatorHost) { db.useEmulator(cfg.emulatorHost, 8080); auth.useEmulator(`http://${cfg.emulatorHost}:9099`, { disableWarnings: true }); }
    const toMs = t => (t && t.toMillis ? t.toMillis() : typeof t === "number" ? t : Date.now());
    /* Firestore не хранит массивы в массивах: варианты [["M", 500]] сохраняем как [{label, price}] */
    const toFs = d => { const { id, ...rest } = d; if (rest.variants) rest.variants = rest.variants.map(([label, price]) => ({ label, price })); return JSON.parse(JSON.stringify(rest)); };
    const fromFs = (id, x) => { const d = { id, ...x }; if (Array.isArray(d.variants)) d.variants = d.variants.map(v => [v.label, v.price]); return d; };
    let menu = { cats: [], dishes: [] }; const menuEv = emitter();
    let gotCats = false, gotDishes = false, menuResolve; const menuReady = new Promise(r => (menuResolve = r));
    const pushMenu = () => { if (gotCats && gotDishes) { menu.cats.sort((a, b) => a.sort - b.sort); const cs = Object.fromEntries(menu.cats.map((c, i) => [c.id, i])); menu.dishes.sort((a, b) => (cs[a.cat] ?? 99) - (cs[b.cat] ?? 99) || a.sort - b.sort); menuResolve(); menuEv.emit(clone(menu)); } };
    db.collection("categories").onSnapshot(s => { menu.cats = s.docs.map(d => ({ id: d.id, ...d.data() })); gotCats = true; pushMenu(); }, e => console.error(e));
    db.collection("dishes").onSnapshot(s => { menu.dishes = s.docs.map(d => fromFs(d.id, d.data())); gotDishes = true; pushMenu(); }, e => console.error(e));

    let authResolve; const authReady = new Promise(r => (authResolve = r)); let user = null;
    auth.onAuthStateChanged(u => { user = u; authResolve(); });
    const isAdmin = async () => { await authReady; return !!user && (!cfg.adminEmail || (user.email || "").toLowerCase() === cfg.adminEmail.toLowerCase()); };

    let orders = [], ordersReady = null; const orderEv = emitter(); let unsubOrders = null;
    const docToOrder = d => { const x = d.data({ serverTimestamps: "estimate" }); return { ...x, docId: d.id, id: x.num, createdAt: toMs(x.createdAt), updatedAt: toMs(x.updatedAt) }; };
    function watchOrders() {
      if (ordersReady) return ordersReady;
      ordersReady = new Promise((resolve, reject) => {
        let first = true;
        unsubOrders = db.collection("orders").orderBy("createdAt", "desc").onSnapshot(s => {
          if (first) { orders = s.docs.map(docToOrder); first = false; resolve(); return; }
          s.docChanges().forEach(ch => {
            const o = docToOrder(ch.doc); const i = orders.findIndex(x => x.docId === o.docId);
            if (ch.type === "removed") { if (i >= 0) orders.splice(i, 1); return; }
            if (i >= 0) orders[i] = o; else orders.unshift(o);
            if (!s.metadata.hasPendingWrites) orderEv.emit(ch.type === "added" ? "order" : "order-update", clone(o));
          });
        }, e => { ordersReady = null; reject(err(e.code === "permission-denied" ? "Нет доступа к заказам. Проверьте, что вы вошли как администратор." : e.message, e.code === "permission-denied" ? 401 : 500)); });
      });
      return ordersReady;
    }
    async function seedIfEmpty() {
      await menuReady; if (menu.cats.length) return;
      const batch = db.batch();
      SEED.cats.forEach(c => { const { id, ...rest } = c; batch.set(db.collection("categories").doc(id), rest); });
      SEED.dishes.forEach(d => batch.set(db.collection("dishes").doc(d.id), toFs(d)));
      batch.set(db.doc("meta/counter"), { n: 0 }, { merge: true });
      await batch.commit();
    }
    const clean = o => JSON.parse(JSON.stringify(o));
    const store = {
      ready: async () => { await seedIfEmpty(); await watchOrders(); }, menu: () => menu, orders: () => orders, isAdmin,
      login: async (email, pw) => {
        try { await auth.signInWithEmailAndPassword((email || "").trim(), pw || ""); }
        catch (e) { throw err(/user-not-found|wrong-password|invalid-credential|invalid-email|invalid-login/.test(e.code || "") ? "Неверная почта или пароль." : e.code === "auth/too-many-requests" ? "Слишком много попыток. Подождите несколько минут." : "Не удалось войти: " + e.message, 401); }
        if (!(await isAdmin())) { await auth.signOut(); throw err("Эта почта не является администратором.", 401); }
      },
      logout: async () => { if (unsubOrders) unsubOrders(); unsubOrders = null; ordersReady = null; orders = []; await auth.signOut(); },
      updateOrder: async (o, patch) => { await db.collection("orders").doc(o.docId).update({ ...patch, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); Object.assign(o, patch, { updatedAt: Date.now() }); return o; },
      saveDish: async d => { await db.collection("dishes").doc(d.id).set(toFs(d)); return d; },
      deleteDish: async id => { await db.collection("dishes").doc(id).delete(); },
      changePassword: async (cur, next) => {
        if (typeof next !== "string" || next.length < 8) throw err("Новый пароль: минимум 8 символов.");
        try { await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, cur || "")); }
        catch (e) { throw err("Текущий пароль неверный."); }
        await user.updatePassword(next);
      },
    };
    return {
      mode: "firebase",
      loadMenu: async () => { await menuReady; if (!menu.cats.length) return clone(SEED); return clone(menu); },
      onMenu: f => menuEv.on(f),
      placeOrder: async body => {
        await menuReady; const m = menu.cats.length ? menu : SEED;
        const o = buildOrder(m, body);
        const counter = db.doc("meta/counter"); const ref = db.collection("orders").doc();
        let num;
        try {
          await db.runTransaction(async tx => {
            const c = await tx.get(counter); num = ((c.exists && c.data().n) || 0) + 1;
            tx.set(counter, { n: num });
            const now = firebase.firestore.FieldValue.serverTimestamp();
            tx.set(ref, { ...clean(o), num, createdAt: now, updatedAt: now });
          });
        } catch (e) { throw err(e.code === "permission-denied" ? "Заказ не принят: проверьте корзину и обновите страницу." : "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.", 500); }
        return { id: num, total: o.total, items: o.items, createdAt: Date.now() };
      },
      admin: { request: makeRouter(store), subscribe: h => { let off = () => {}; watchOrders().then(() => { h.open && h.open(); off = orderEv.on((type, o) => h[type] && h[type](o)); }, () => h.error && h.error()); return () => off(); }, needsLogin: true, emailLogin: true, imageMax: 700 },
    };
  }

  /* ===================== выбор режима ===================== */
  VM.init = async function () {
    const cfg = window.FIREBASE_CONFIG;
    if (cfg && cfg.apiKey && cfg.projectId) { try { Object.assign(VM, await firebaseBackend(cfg)); return VM.mode; } catch (e) { console.error(e); } }
    try {
      const r = await fetch(ROOT + "api/menu", { cache: "no-store" });
      if (r.ok && (r.headers.get("content-type") || "").includes("json")) { Object.assign(VM, serverBackend()); return VM.mode; }
    } catch (e) {}
    Object.assign(VM, demoBackend());
    return VM.mode;
  };
})();
