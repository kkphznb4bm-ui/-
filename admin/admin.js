/* Админ-панель «Вкус Мира». Все данные берутся с сервера (/api/admin/...). */
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => (n || 0).toLocaleString("ru-RU") + " сом";
const moneyHTML = n => (n || 0).toLocaleString("ru-RU") + "<span>сом</span>";
const imgSrc = name => "../" + (name.includes("/") ? name : `img/${name}.jpg`);
const firstImg = img => (Array.isArray(img) ? img[0] : img) || "";

const STATUS = { new: "Новый", accepted: "Принят", cooking: "Готовится", ready: "Готов", delivered: "Доставлен", cancelled: "Отменён" };
const NEXT = { new: ["accepted", "Принять"], accepted: ["cooking", "Готовится"], cooking: ["ready", "Готов"], ready: ["delivered", "Доставлен"] };
const stBadge = s => `<span class="st st-${s}">${STATUS[s] || s}</span>`;
const paidBadge = o => o.status === "cancelled" ? "" : `<span class="paid ${o.paid ? "yes" : "no"}">${o.paid ? "Оплачен" : "Не оплачен"}</span>`;
const fmtTime = ms => new Date(ms).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const fmtDate = ms => new Date(ms).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const whenText = ms => sameDay(ms, Date.now()) ? "сегодня, " + fmtTime(ms) : fmtDate(ms);

/* ===== запросы к серверу ===== */
async function api(path, opts = {}) {
  const r = await fetch("../api/admin/" + path, {
    method: opts.method || "GET", credentials: "same-origin",
    headers: opts.body ? { "Content-Type": "application/json", "X-Requested-With": "fetch" } : { "X-Requested-With": "fetch" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && !opts.allow401) { showLogin(); throw new Error(data.error || "Войдите заново."); }
  if (!r.ok) throw new Error(data.error || "Ошибка сервера.");
  return data;
}

function toast(title, text = "", bad = false) {
  const t = document.createElement("div");
  t.className = "toast" + (bad ? " bad" : "");
  t.innerHTML = `<b>${esc(title)}</b>${text ? esc(text) : ""}`;
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), 5000);
}
const fail = e => toast("Не получилось", e.message, true);

/* звуковой сигнал о новом заказе */
let audio;
function beep() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const now = audio.currentTime;
    [0, .18].forEach((d, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = i ? 1046 : 784; o.type = "sine";
      g.gain.setValueAtTime(.0001, now + d); g.gain.exponentialRampToValueAtTime(.25, now + d + .02); g.gain.exponentialRampToValueAtTime(.0001, now + d + .25);
      o.connect(g).connect(audio.destination); o.start(now + d); o.stop(now + d + .3);
    });
  } catch (e) {}
}
document.addEventListener("click", () => { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {} }, { once: true });

/* ===== вход и выход ===== */
function showLogin() {
  stopEvents();
  $("#appView").hidden = true; $("#loginView").hidden = false; $("#modal").hidden = true;
  setTimeout(() => $("#loginPw").focus(), 50);
}
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const pw = $("#loginPw").value; if (!pw) { $("#loginErr").textContent = "Введите пароль."; return; }
  $("#loginBtn").disabled = true; $("#loginErr").textContent = "";
  try {
    await api("login", { method: "POST", body: { password: pw }, allow401: true });
    $("#loginPw").value = ""; startApp();
  } catch (err) { $("#loginErr").textContent = err.message; }
  finally { $("#loginBtn").disabled = false; }
});
async function logout() {
  try { await api("logout", { method: "POST", body: {} }); } catch (e) {}
  showLogin();
}
$("#logoutBtn").addEventListener("click", logout);
$("#logoutBtnM").addEventListener("click", logout);

/* ===== навигация ===== */
const TITLES = { overview: "Обзор", orders: "Заказы", history: "История заказов", menu: "Меню", settings: "Настройки" };
$("#tabbar").innerHTML = $("#nav").innerHTML;
let view = "overview";
function go(v) {
  if (!TITLES[v]) v = "overview";
  view = v;
  $$("[data-view]").forEach(b => b.dataset.view === v ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  $$(".view").forEach(s => s.hidden = s.id !== "view-" + v);
  $("#viewTitle").textContent = TITLES[v];
  if (location.hash !== "#" + v) history.replaceState(null, "", "#" + v);
  ({ overview: loadOverview, orders: loadOrders, history: loadHistory, menu: loadMenu, settings: () => {} })[v]();
  window.scrollTo(0, 0);
}
document.addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (b) go(b.dataset.view); });
addEventListener("hashchange", () => { if (!$("#appView").hidden) go(location.hash.slice(1)); });

/* ===== живые события ===== */
let es = null, newCount = 0;
function setLive(on) { ["#live", "#liveM"].forEach(s => { $(s).classList.toggle("on", on); }); $("#live span").textContent = on ? "Онлайн: заказы приходят сами" : "Переподключение…"; }
function startEvents() {
  stopEvents();
  es = new EventSource("../api/admin/events");
  es.onopen = () => setLive(true);
  es.onerror = async () => {
    setLive(false);
    try { const me = await api("me", { allow401: true }); if (!me.loggedIn) showLogin(); } catch (e) {}
  };
  es.addEventListener("order", e => {
    const o = JSON.parse(e.data);
    newCount++; updateBadge(); beep();
    toast(`Новый заказ №${o.id}`, `${o.name} · ${money(o.total)}`);
    document.title = `(${newCount}) Новый заказ · Вкус Мира`;
    if (view === "orders" && matchesFilter(o)) { orders.unshift(o); renderOrders(o.id); refreshChipCounts(); }
    else if (view === "orders") refreshChipCounts();
    if (view === "overview") loadOverview();
    if (view === "history" && hOffset === 0) loadHistory();
  });
  es.addEventListener("order-update", e => {
    const o = JSON.parse(e.data);
    const i = orders.findIndex(x => x.id === o.id);
    if (i >= 0) { orders[i] = o; if (view === "orders") { if (matchesFilter(o)) renderOrders(); else { orders.splice(i, 1); renderOrders(); } } }
    if (view === "orders") refreshChipCounts();
    if (view === "overview") loadOverview();
    if (view === "history") loadHistory();
  });
}
function stopEvents() { if (es) { es.close(); es = null; } setLive(false); }
function updateBadge() { $$("#newBadge, #tabbar .badge").forEach(b => { b.hidden = !newCount; b.textContent = newCount; }); }
function clearNew() { newCount = 0; updateBadge(); document.title = "Вкус Мира · Админ-панель"; }

/* ===== обзор ===== */
let period = "week";
$("#periodSeg").addEventListener("click", e => {
  const b = e.target.closest("[data-period]"); if (!b) return;
  period = b.dataset.period;
  $$("#periodSeg button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  loadOverview();
});
async function loadOverview() {
  let s; try { s = await api("stats?period=" + period); } catch (e) { return fail(e); }
  const c = s.cards;
  $("#kpis").innerHTML = [
    ["Заказов сегодня", c.today.orders, false], ["Выручка сегодня", c.today.revenue, true],
    ["Заказов за 7 дней", c.week.orders, false], ["Выручка за 7 дней", c.week.revenue, true],
    ["Заказов за 30 дней", c.month.orders, false], ["Общая выручка", c.total.revenue, true],
  ].map(([t, v, m]) => `<div class="kpi${m ? " money" : ""}"><small>${t}</small><b>${m ? moneyHTML(v) : v.toLocaleString("ru-RU")}</b></div>`).join("");
  const u = s.summary;
  const pname = { day: "сегодня", week: "за 7 дней", month: "за 30 дней" }[period];
  $("#summary").innerHTML = [
    ["Заказов " + pname, u.orders.toLocaleString("ru-RU")], ["Выручка " + pname, money(u.revenue)],
    ["Средний чек", money(u.avgCheck)], ["Отменено", u.cancelled.toLocaleString("ru-RU")], ["Ждут оплаты", u.unpaid.toLocaleString("ru-RU")],
  ].map(([t, v]) => `<div class="sum"><small>${t}</small><b>${v}</b></div>`).join("");
  const label = k => period === "day" ? k : k.slice(8, 10) + "." + k.slice(5, 7);
  const pts = s.series.map(x => ({ label: label(x.key), rev: x.revenue, ord: x.orders }));
  $("#revCap").textContent = money(u.revenue);
  $("#ordCap").textContent = u.orders.toLocaleString("ru-RU") + " шт.";
  barChart($("#revChart"), pts.map(p => ({ label: p.label, value: p.rev })), money, "Оплаченной выручки за период пока нет");
  barChart($("#ordChart"), pts.map(p => ({ label: p.label, value: p.ord })), v => v + " шт.", "Заказов за период пока нет", true);
  const max = Math.max(1, ...s.top.map(t => t.qty));
  $("#topDishes").innerHTML = s.top.length ? s.top.map(t => `<div class="hbar"><span class="nm" title="${esc(t.name)}">${esc(t.name)}</span><span class="vl">${t.qty} шт. · ${money(t.sum)}</span><span class="tr"><i style="width:${(t.qty / max * 100).toFixed(1)}%"></i></span></div>`).join("") : `<p class="empty-note">Блюда появятся здесь после первых заказов.</p>`;
  const bs = u.byStatus, totalS = Object.values(bs).reduce((a, b) => a + b, 0);
  $("#byStatus").innerHTML = totalS ? Object.keys(STATUS).map(k => `<div class="hbar"><span class="nm">${stBadge(k)}</span><span class="vl">${bs[k]}</span><span class="tr"><i style="width:${(bs[k] / totalS * 100).toFixed(1)}%;background:var(--s-${k})"></i></span></div>`).join("") : `<p class="empty-note">Заказов за период пока нет.</p>`;
}

/* столбчатый график на SVG: один ряд, подсказка при наведении */
function niceMax(v) { if (v <= 0) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function barChart(el, data, fmt, emptyText, integer) {
  const W = el.clientWidth || 500, H = el.clientHeight || 230, L = 48, R = 6, T = 10, B = 26;
  const iw = W - L - R, ih = H - T - B, n = data.length;
  let max = niceMax(Math.max(...data.map(d => d.value)));
  if (integer) max = Math.max(4, Math.ceil(max / 4) * 4);
  const step = iw / n, bw = Math.max(2, Math.min(36, step * .62));
  const y = v => T + ih - v / max * ih;
  const ticks = [0, .25, .5, .75, 1].map(f => f * max);
  const short = v => v >= 1e6 ? (v / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + "м" : v >= 1e3 ? (v / 1e3).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + "к" : String(Math.round(v * 10) / 10);
  const every = Math.ceil(n / Math.max(1, Math.floor(iw / 44)));
  const r = 4;
  const bars = data.map((d, i) => {
    const x = L + i * step + (step - bw) / 2, h = Math.max(0, y(0) - y(d.value));
    const rr = Math.min(r, bw / 2, h);
    const path = h <= 0 ? "" : `M${x},${y(0)}V${y(0) - h + rr}Q${x},${y(0) - h} ${x + rr},${y(0) - h}H${x + bw - rr}Q${x + bw},${y(0) - h} ${x + bw},${y(0) - h + rr}V${y(0)}Z`;
    return `<path class="bar" data-i="${i}" d="${path}"/><rect class="hit" data-i="${i}" x="${L + i * step}" y="${T}" width="${step}" height="${ih}"/>`;
  }).join("");
  const empty = data.every(d => !d.value);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="График">
    <g class="grid">${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/>`).join("")}</g>
    <g class="ax">${ticks.map(t => `<text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${short(t)}</text>`).join("")}
    ${data.map((d, i) => i % every === 0 ? `<text x="${L + i * step + step / 2}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>` : "").join("")}</g>
    ${bars}
    ${empty ? `<text class="empty" x="${L + iw / 2}" y="${T + ih / 2}" text-anchor="middle">${esc(emptyText)}</text>` : ""}
  </svg><div class="tip" hidden></div>`;
  const tip = el.querySelector(".tip");
  const show = i => {
    const d = data[i]; el.querySelectorAll(".bar").forEach(b => b.classList.toggle("dim", +b.dataset.i !== i));
    tip.hidden = false; tip.innerHTML = `<b>${esc(fmt(d.value))}</b><span>${esc(d.label)}</span>`;
    const sx = el.clientWidth / W;
    tip.style.left = Math.min(Math.max((L + i * step + step / 2) * sx, 50), el.clientWidth - 50) + "px";
    tip.style.top = Math.max(y(d.value) * (el.clientHeight / H), 30) + "px";
  };
  const hide = () => { tip.hidden = true; el.querySelectorAll(".bar").forEach(b => b.classList.remove("dim")); };
  el.querySelectorAll(".hit").forEach(h => { h.addEventListener("mouseenter", () => show(+h.dataset.i)); h.addEventListener("click", () => show(+h.dataset.i)); });
  el.querySelector("svg").addEventListener("mouseleave", hide);
}
let resizeT; addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (view === "overview") loadOverview(); }, 250); });

/* ===== заказы ===== */
const FILTERS = [["active", "Активные"], ["new", "Новые"], ["accepted", "Приняты"], ["cooking", "Готовятся"], ["ready", "Готовы"], ["delivered", "Доставлены"], ["cancelled", "Отменены"], ["", "Все"]];
let orderFilter = "active", orders = [], ordersTotal = 0;
const ACTIVE = ["new", "accepted", "cooking", "ready"];
const matchesFilter = o => !orderFilter || (orderFilter === "active" ? ACTIVE.includes(o.status) : o.status === orderFilter);
$("#orderChips").innerHTML = FILTERS.map(([k, t]) => `<button class="chip" type="button" data-of="${k}" aria-pressed="${k === orderFilter}">${t}<span class="c" data-cnt="${k}"></span></button>`).join("");
$("#orderChips").addEventListener("click", e => {
  const b = e.target.closest("[data-of]"); if (!b) return;
  orderFilter = b.dataset.of;
  $$("#orderChips .chip").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  loadOrders();
});
async function refreshChipCounts() {
  try {
    const res = await Promise.all(FILTERS.map(([k]) => api(`orders?limit=1&status=${k}`)));
    res.forEach((r, i) => { const el = $(`[data-cnt="${FILTERS[i][0]}"]`); if (el) el.textContent = r.total; });
  } catch (e) {}
}
async function loadOrders(more = false) {
  clearNew();
  try {
    const r = await api(`orders?status=${orderFilter}&limit=40&offset=${more ? orders.length : 0}`);
    orders = more ? orders.concat(r.orders) : r.orders; ordersTotal = r.total;
    renderOrders(); refreshChipCounts();
  } catch (e) { fail(e); }
}
$("#ordersMore").addEventListener("click", () => loadOrders(true));
function itemsHTML(o) {
  return `<ul class="o-items">${o.items.map(it => `<li><span>${it.qty} × ${esc(it.name)}${it.variant ? ` <em>${esc(it.variant)}</em>` : ""}${it.choices && it.choices.length ? `<em>${esc(it.choices.join(", "))}</em>` : ""}</span><span class="s">${money(it.sum)}</span></li>`).join("")}</ul>`;
}
function statusControls(o) {
  const nx = NEXT[o.status];
  return `<div class="o-actions">
    ${nx ? `<button class="btn btn-wine sm" type="button" data-set="${o.id}" data-st="${nx[0]}">${nx[1]}</button>` : ""}
    <select data-status="${o.id}" aria-label="Статус заказа №${o.id}">${Object.entries(STATUS).map(([k, t]) => `<option value="${k}"${k === o.status ? " selected" : ""}>${t}</option>`).join("")}</select>
    ${o.status !== "cancelled" ? `<label class="switch"><input type="checkbox" data-paid="${o.id}"${o.paid ? " checked" : ""}><i></i>Оплачен</label>` : ""}
  </div>`;
}
function orderCard(o, fresh) {
  return `<article class="order${fresh ? " fresh" : ""}${o.status === "cancelled" ? " is-cancelled" : ""}" data-order="${o.id}">
    <div class="o-head"><b>№${o.id}<time datetime="${new Date(o.createdAt).toISOString()}">${whenText(o.createdAt)}</time></b>${stBadge(o.status)}</div>
    <div class="o-who"><strong>${esc(o.name)}</strong><a href="tel:${esc(o.phone.replace(/[^\d+]/g, ""))}">${esc(o.phone)}</a>
      <span class="muted">${o.method === "pickup" ? "Самовывоз" : "Доставка: " + esc(o.address || "")}</span></div>
    ${itemsHTML(o)}
    ${o.comment ? `<div class="o-comment">${esc(o.comment)}</div>` : ""}
    <div class="o-foot"><div class="o-total">${money(o.total)}<small>${o.pay === "qr" ? "Оплата по QR" : "Наличными"}${paidBadge(o) ? " · " + paidBadge(o) : ""}</small></div></div>
    ${statusControls(o)}
  </article>`;
}
function renderOrders(freshId) {
  $("#orderList").innerHTML = orders.length ? orders.map(o => orderCard(o, o.id === freshId)).join("")
    : `<div class="empty-big"><b>${orderFilter === "active" ? "Активных заказов нет" : "Заказов нет"}</b>Новые заказы с сайта появятся здесь сами, со звуковым сигналом.</div>`;
  $("#ordersMore").hidden = orders.length >= ordersTotal;
}
async function setOrder(id, patch) {
  try {
    const o = await api("orders/" + id, { method: "PATCH", body: patch });
    const i = orders.findIndex(x => x.id === o.id);
    if (i >= 0) { if (matchesFilter(o)) orders[i] = o; else orders.splice(i, 1); }
    if (view === "orders") { renderOrders(); refreshChipCounts(); }
    if (view === "history") loadHistory();
    if (!$("#modal").hidden && modalOrderId === o.id) openOrder(o);
    toast(`Заказ №${o.id}`, `${STATUS[o.status]}${o.status !== "cancelled" ? " · " + (o.paid ? "оплачен" : "не оплачен") : ""}`);
  } catch (e) { fail(e); }
}
document.addEventListener("click", e => { const b = e.target.closest("[data-set]"); if (b) setOrder(+b.dataset.set, { status: b.dataset.st }); });
document.addEventListener("change", e => {
  const s = e.target.closest("[data-status]"); if (s) return setOrder(+s.dataset.status, { status: s.value });
  const p = e.target.closest("[data-paid]"); if (p) return setOrder(+p.dataset.paid, { paid: p.checked });
});

/* ===== окно ===== */
let modalOrderId = null;
function openModal(title, html) {
  $("#modalTitle").textContent = title; $("#modalBody").innerHTML = html; $("#modal").hidden = false;
  const f = $("#modalBody").querySelector("input, select, textarea, button"); if (f) f.focus();
}
function closeModal() { $("#modal").hidden = true; modalOrderId = null; }
$("#modal").addEventListener("click", e => { if (e.target.closest("[data-close]")) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
function openOrder(o) {
  modalOrderId = o.id;
  openModal(`Заказ №${o.id}`, `
    <dl class="kv"><dt>Статус</dt><dd>${stBadge(o.status)} ${paidBadge(o)}</dd>
    <dt>Дата</dt><dd>${fmtDate(o.createdAt)}</dd><dt>Клиент</dt><dd>${esc(o.name)}</dd>
    <dt>Телефон</dt><dd><a href="tel:${esc(o.phone.replace(/[^\d+]/g, ""))}">${esc(o.phone)}</a></dd>
    <dt>Получение</dt><dd>${o.method === "pickup" ? "Самовывоз" : "Доставка: " + esc(o.address || "")}</dd>
    <dt>Оплата</dt><dd>${o.pay === "qr" ? "По QR-коду" : "Наличными"}</dd>
    ${o.comment ? `<dt>Комментарий</dt><dd>${esc(o.comment)}</dd>` : ""}</dl>
    ${itemsHTML(o)}
    <div class="o-foot" style="margin:12px 0"><div class="o-total">Итого: ${money(o.total)}</div></div>
    ${statusControls(o)}`);
}

/* ===== история ===== */
let hOffset = 0; const H_LIMIT = 50;
$("#hStatus").innerHTML += Object.entries(STATUS).map(([k, t]) => `<option value="${k}">${t}</option>`).join("");
let hT;
$("#histForm").addEventListener("input", () => { clearTimeout(hT); hT = setTimeout(() => { hOffset = 0; loadHistory(); }, 300); });
$("#histForm").addEventListener("submit", e => e.preventDefault());
$("#hReset").addEventListener("click", () => { $("#histForm").reset(); hOffset = 0; loadHistory(); });
let hRows = [];
async function loadHistory() {
  const q = new URLSearchParams({ q: $("#hQ").value, from: $("#hFrom").value, to: $("#hTo").value, status: $("#hStatus").value, limit: H_LIMIT, offset: hOffset });
  try {
    const r = await api("orders?" + q);
    hRows = r.orders;
    $("#hFound").textContent = `Найдено заказов: ${r.total.toLocaleString("ru-RU")} · оплаченная выручка: ${money(r.revenue)}`;
    $("#hBody").innerHTML = r.orders.length ? r.orders.map(o => `<tr data-row="${o.id}" tabindex="0"><td>${o.id}</td><td>${esc(o.name)}</td><td>${esc(o.phone)}</td><td class="num">${money(o.total)}</td><td>${fmtDate(o.createdAt)}</td><td>${stBadge(o.status)}</td><td>${paidBadge(o) || "—"}</td></tr>`).join("")
      : `<tr><td colspan="7" class="muted" style="text-align:center;padding:40px">Заказов по этим условиям нет.</td></tr>`;
    const pages = Math.max(1, Math.ceil(r.total / H_LIMIT)), page = Math.floor(hOffset / H_LIMIT) + 1;
    $("#hPager").innerHTML = pages > 1 ? `<button class="btn btn-ghost sm" type="button" data-pg="-1"${page <= 1 ? " disabled" : ""}>← Назад</button><span>Страница ${page} из ${pages}</span><button class="btn btn-ghost sm" type="button" data-pg="1"${page >= pages ? " disabled" : ""}>Вперёд →</button>` : "";
  } catch (e) { fail(e); }
}
$("#hPager").addEventListener("click", e => { const b = e.target.closest("[data-pg]"); if (!b) return; hOffset = Math.max(0, hOffset + +b.dataset.pg * H_LIMIT); loadHistory(); });
const openRow = tr => { const o = hRows.find(x => x.id === +tr.dataset.row); if (o) openOrder(o); };
$("#hBody").addEventListener("click", e => { const tr = e.target.closest("[data-row]"); if (tr) openRow(tr); });
$("#hBody").addEventListener("keydown", e => { const tr = e.target.closest("[data-row]"); if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openRow(tr); } });

/* ===== меню ===== */
let menu = { cats: [], dishes: [] };
async function loadMenu() {
  try { menu = await api("menu"); } catch (e) { return fail(e); }
  const cur = $("#mCat").value;
  $("#mCat").innerHTML = `<option value="">Все разделы</option>` + menu.cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  $("#mCat").value = cur;
  renderMenu();
}
const priceText = d => d.variants ? d.variants.map(([l, p]) => `${l} — ${money(p)}`).join(" · ") : money(d.price);
function renderMenu() {
  const q = $("#mQ").value.trim().toLowerCase(), cat = $("#mCat").value;
  const html = menu.cats.filter(c => !cat || c.id === cat).map(c => {
    const ds = menu.dishes.filter(d => d.cat === c.id && (!q || (d.name + " " + (d.desc || "")).toLowerCase().includes(q)));
    if (!ds.length) return q ? "" : `<section class="m-cat"><h3>${esc(c.name)}<span>пусто</span></h3></section>`;
    return `<section class="m-cat"><h3>${esc(c.name)}<span>${ds.length} поз.</span></h3><div class="m-list">${ds.map(d => `
      <div class="dish${d.available ? "" : " off"}">
        <img src="${esc(imgSrc(firstImg(d.img)))}" alt="" loading="lazy">
        <div class="info"><b>${esc(d.name)}</b>${d.sub || d.desc ? `<small>${esc([d.sub, d.desc].filter(Boolean).join(" · "))}</small>` : ""}<small class="pr">${esc(priceText(d))}</small></div>
        <div class="acts">
          <label class="switch" title="Есть в наличии"><input type="checkbox" data-avail="${esc(d.id)}"${d.available ? " checked" : ""}><i></i>${d.available ? "В наличии" : "Нет в наличии"}</label>
          <span style="display:flex;gap:8px">
            <button class="icon-btn" type="button" data-edit="${esc(d.id)}" aria-label="Изменить ${esc(d.name)}"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></svg></button>
            <button class="icon-btn del" type="button" data-del="${esc(d.id)}" aria-label="Удалить ${esc(d.name)}"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg></button>
          </span>
        </div>
      </div>`).join("")}</div></section>`;
  }).join("");
  $("#menuList").innerHTML = html || `<div class="empty-big"><b>Ничего не найдено</b>Измените поиск или раздел.</div>`;
}
$("#mQ").addEventListener("input", renderMenu);
$("#mCat").addEventListener("change", renderMenu);
document.addEventListener("change", async e => {
  const a = e.target.closest("[data-avail]"); if (!a) return;
  try {
    const d = await api("dishes/" + a.dataset.avail, { method: "PATCH", body: { available: a.checked } });
    const i = menu.dishes.findIndex(x => x.id === d.id); if (i >= 0) menu.dishes[i] = d;
    renderMenu(); toast(d.name, d.available ? "Снова в наличии на сайте" : "Отмечено «Нет в наличии» на сайте");
  } catch (err) { a.checked = !a.checked; fail(err); }
});
document.addEventListener("click", e => {
  const ed = e.target.closest("[data-edit]"); if (ed) return dishForm(menu.dishes.find(d => d.id === ed.dataset.edit));
  const dl = e.target.closest("[data-del]"); if (dl) return confirmDelete(menu.dishes.find(d => d.id === dl.dataset.del));
});
$("#addDish").addEventListener("click", () => dishForm(null));

function confirmDelete(d) {
  if (!d) return;
  openModal("Удалить блюдо?", `<p>«${esc(d.name)}» исчезнет из меню на сайте. Старые заказы с этим блюдом останутся в истории.</p>
    <p class="muted">Если блюда просто временно нет, лучше выключите «В наличии».</p>
    <div class="o-actions" style="margin-top:16px"><button class="btn btn-danger" type="button" id="delYes">Удалить</button><button class="btn btn-ghost" type="button" data-close>Отмена</button></div>`);
  $("#delYes").addEventListener("click", async () => {
    try { await api("dishes/" + d.id, { method: "DELETE" }); closeModal(); toast("Блюдо удалено", d.name); loadMenu(); } catch (e) { fail(e); }
  });
}

/* уменьшаем фото перед загрузкой: до 1400 px по длинной стороне, JPEG */
function shrink(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error("Выберите фото в формате JPG, PNG или WebP."));
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", .86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Не удалось прочитать фото.")); };
    img.src = url;
  });
}

function dishForm(d) {
  const isNew = !d;
  d = d || { cat: $("#mCat").value || (menu.cats[0] && menu.cats[0].id), name: "", desc: "", sub: "", price: "", available: true };
  let img = d.img || null;
  const varRow = (l = "", p = "") => `<div class="var"><input type="text" placeholder="Например: С курицей" value="${esc(l)}" aria-label="Название варианта"><input type="number" min="0" step="1" placeholder="Цена" value="${esc(p)}" aria-label="Цена варианта"><button class="icon-btn del" type="button" data-rmvar aria-label="Убрать вариант"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>`;
  openModal(isNew ? "Новое блюдо" : "Изменить блюдо", `<form class="form" id="dishForm" novalidate>
    <label>Название<input type="text" id="dName" maxlength="120" value="${esc(d.name)}" required></label>
    <div class="row2">
      <label>Раздел<select id="dCat">${menu.cats.map(c => `<option value="${esc(c.id)}"${c.id === d.cat ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label>Подраздел (необязательно)<input type="text" id="dSub" maxlength="60" value="${esc(d.sub || "")}" placeholder="Например: Поке"></label>
    </div>
    <label>Описание<textarea id="dDesc" maxlength="400" placeholder="Состав или подача">${esc(d.desc || "")}</textarea></label>
    <div class="photo"><img id="dImg" src="${img ? esc(imgSrc(firstImg(img))) : ""}" alt=""${img ? "" : " hidden"}>
      <div class="ph"><label>Фото<input type="file" id="dFile" accept="image/jpeg,image/png,image/webp"></label><small class="muted" id="dImgNote">${img ? "Выберите файл, чтобы заменить фото." : "Загрузите фото блюда."}</small></div></div>
    <div class="seg" role="group" aria-label="Цена"><button type="button" data-pm="one" aria-pressed="${!d.variants}">Одна цена</button><button type="button" data-pm="many" aria-pressed="${!!d.variants}">Несколько вариантов</button></div>
    <label id="pOne"${d.variants ? " hidden" : ""}>Цена, сом<input type="number" id="dPrice" min="0" step="1" value="${esc(d.variants ? "" : d.price)}"></label>
    <div id="pMany" class="vars"${d.variants ? "" : " hidden"}>${(d.variants || [["", ""], ["", ""]]).map(([l, p]) => varRow(l, p)).join("")}<button class="btn btn-ghost sm" type="button" id="addVar">+ Вариант</button></div>
    ${d.choices ? `<p class="muted" style="margin:0">Выбор блюд в комбо (${esc(d.choices.map(c => c.label).join(", "))}) сохраняется без изменений.</p>` : ""}
    <label class="switch"><input type="checkbox" id="dAvail"${d.available ? " checked" : ""}><i></i>В наличии</label>
    <div class="err" id="dErr" role="alert"></div>
    <div class="o-actions"><button class="btn btn-primary" type="submit" id="dSave">${isNew ? "Добавить в меню" : "Сохранить"}</button><button class="btn btn-ghost" type="button" data-close>Отмена</button></div>
  </form>`);
  const f = $("#dishForm");
  let many = !!d.variants;
  f.addEventListener("click", e => {
    const pm = e.target.closest("[data-pm]");
    if (pm) { many = pm.dataset.pm === "many"; f.querySelectorAll("[data-pm]").forEach(b => b.setAttribute("aria-pressed", String(b === pm))); $("#pOne").hidden = many; $("#pMany").hidden = !many; }
    if (e.target.closest("#addVar")) $("#addVar").insertAdjacentHTML("beforebegin", varRow());
    const rm = e.target.closest("[data-rmvar]"); if (rm && f.querySelectorAll(".var").length > 1) rm.parentElement.remove();
  });
  $("#dFile").addEventListener("change", async e => {
    const file = e.target.files[0]; if (!file) return;
    $("#dImgNote").textContent = "Загружаем фото…"; $("#dSave").disabled = true;
    try {
      const data = await shrink(file);
      const r = await api("upload", { method: "POST", body: { data } });
      img = r.img; $("#dImg").src = imgSrc(img); $("#dImg").hidden = false; $("#dImgNote").textContent = "Фото загружено.";
    } catch (err) { $("#dImgNote").textContent = err.message; }
    finally { $("#dSave").disabled = false; }
  });
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const body = { name: $("#dName").value, cat: $("#dCat").value, sub: $("#dSub").value, desc: $("#dDesc").value, available: $("#dAvail").checked };
    if (many) body.variants = [...f.querySelectorAll(".var")].map(r => { const [a, b] = r.querySelectorAll("input"); return [a.value.trim(), b.value === "" ? NaN : +b.value]; }).filter(([a, b]) => a || !isNaN(b)).map(([a, b]) => [a, isNaN(b) ? "" : b]);
    else body.price = $("#dPrice").value === "" ? "" : +$("#dPrice").value;
    if (many && !body.variants.length) { $("#dErr").textContent = "Добавьте хотя бы один вариант с ценой."; return; }
    if (img !== d.img) body.img = img;
    if (isNew) body.img = img;
    $("#dSave").disabled = true; $("#dErr").textContent = "";
    try {
      const saved = await api(isNew ? "dishes" : "dishes/" + d.id, { method: isNew ? "POST" : "PATCH", body });
      closeModal(); toast(isNew ? "Блюдо добавлено" : "Изменения сохранены", saved.name + " · уже на сайте"); loadMenu();
    } catch (err) { $("#dErr").textContent = err.message; $("#dSave").disabled = false; }
  });
}

/* ===== настройки ===== */
$("#pwForm").addEventListener("submit", async e => {
  e.preventDefault();
  const cur = $("#pwCur").value, nw = $("#pwNew").value, nw2 = $("#pwNew2").value;
  if (nw.length < 8) return $("#pwErr").textContent = "Новый пароль: минимум 8 символов.";
  if (nw !== nw2) return $("#pwErr").textContent = "Пароли не совпадают.";
  try { await api("password", { method: "POST", body: { current: cur, next: nw } }); $("#pwForm").reset(); $("#pwErr").textContent = ""; toast("Пароль изменён", "Другие устройства вышли из панели."); }
  catch (err) { $("#pwErr").textContent = err.message; }
});

/* ===== старт ===== */
function startApp() {
  $("#loginView").hidden = true; $("#appView").hidden = false;
  startEvents();
  go((location.hash || "").slice(1) || "overview");
}
(async () => {
  try { const me = await api("me", { allow401: true }); me.loggedIn ? startApp() : showLogin(); }
  catch (e) { showLogin(); $("#loginErr").textContent = "Сервер недоступен. Обновите страницу позже."; }
})();
