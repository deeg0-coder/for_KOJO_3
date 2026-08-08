'use strict';

if (!Element.prototype.closest) {
  Element.prototype.closest = function (sel) {
    var el = this;
    while (el) {
      if (el.matches(sel)) return el;
      el = el.parentElement;
    }
    return null;
  };
}
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

window.onerror = function (msg, url, line) {
  try { console.warn('KOJO Error:', msg, 'at line', line); } catch (e) {}
  return true;
};

function safeScroll() {
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  catch (e) { try { window.scrollTo(0, 0); } catch (e2) {} }
}

var D = KOJO_DATA;
var $ = function (id) { return document.getElementById(id); };
var SECTION_LABELS = { checklists: 'Чек-листы', ifs: 'Что делать если', important: 'Важное', rules: 'История и Философия' };

// === ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ===
function currentUser() { return KOJOState.getCurrentUser(); }
function currentAccount() { return kojoAccountByLogin(currentUser()); }
function isAdmin() { var a = currentAccount(); return !!(a && a.role === 'admin'); }

// === ВХОД (выбор учётной записи) ===

function utf8Bytes(str) {
  var out = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 128) { out.push(c); }
    else if (c < 2048) { out.push(192 | (c >> 6), 128 | (c & 63)); }
    else { out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
  }
  return out;
}

function sha256Hex(str) {
  var msg = utf8Bytes(str);
  var bitLen = msg.length * 8;
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  var hi = Math.floor(bitLen / 4294967296);
  var lo = bitLen >>> 0;
  msg.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255);
  msg.push((lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  var w = [];
  for (var i = 0; i < msg.length; i += 64) {
    var j;
    for (j = 0; j < 16; j++) {
      var o = i + j * 4;
      w[j] = ((msg[o] << 24) | (msg[o + 1] << 16) | (msg[o + 2] << 8) | msg[o + 3]) >>> 0;
    }
    for (j = 16; j < 64; j++) {
      var s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      var s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (j = 0; j < 64; j++) {
      var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      var ch = (e & f) ^ (~e & g);
      var temp1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  var hex = '';
  for (var k = 0; k < 8; k++) {
    var v = H[k].toString(16);
    while (v.length < 8) v = '0' + v;
    hex += v;
  }
  return hex;
}

function isAuthenticated() {
  return KOJOState.isAuth();
}

function showLoginScreen() {
  var ls = $('login-screen');
  var app = document.querySelector('.app');
  if (ls) ls.classList.add('visible');
  if (app) app.classList.add('locked');
  renderAccountPicker();
}

function renderAccountPicker() {
  var box = $('account-picker');
  if (!box) return;
  var html = '<div class="account-picker-label">Выбери свой аккаунт</div>';
  html += '<div class="account-picker-grid">';
  for (var i = 0; i < KOJO_ACCOUNTS.length; i++) {
    var acc = KOJO_ACCOUNTS[i];
    html += '<button type="button" class="account-chip" data-account="' + acc.login + '">';
    html += '<span class="account-chip-name">' + acc.login + '</span>';
    html += '<span class="account-chip-role">' + KOJO_ROLE_LABELS[acc.role] + '</span>';
    html += '</button>';
  }
  html += '</div>';
  html += '<input type="hidden" id="selected-account" value="" />';
  box.innerHTML = html;
}

function hideLoginScreen() {
  var ls = $('login-screen');
  var app = document.querySelector('.app');
  if (ls) ls.classList.remove('visible');
  if (app) app.classList.remove('locked');
}

function tryLogin(login, pass) {
  var acc = kojoAccountByLogin(login);
  if (acc && sha256Hex(pass) === acc.passHash) {
    var remember = $('login-remember');
    KOJOState.setAuth(!!(!remember || remember.checked));
    KOJOState.setCurrentUser(login);
    hideLoginScreen();
    initApp();
    return true;
  }
  return false;
}

function submitLogin() {
  var loginEl = $('login-user');
  var passEl = $('login-pass');
  var errEl = $('login-error');
  var selEl = $('selected-account');
  var login = (loginEl && loginEl.value.trim()) || (selEl && selEl.value) || '';
  var pass = passEl ? passEl.value : '';
  if (tryLogin(login, pass)) {
    if (errEl) errEl.textContent = '';
    if (passEl) passEl.value = '';
    if (loginEl) loginEl.value = '';
    showToast('🔓 Добро пожаловать, ' + login + '!', 'success');
    return;
  }
  if (errEl) errEl.textContent = 'Неверный аккаунт или пароль';
  if (passEl) { passEl.value = ''; passEl.focus(); }
  var card = $('login-card');
  if (card) {
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  }
}

function logout() {
  try { stopCloudSyncPolling(); } catch (e) {}
  try { KOJOState.setAuth(false); } catch (e) {}
  try { goHome(); } catch (e) {}
  var pu = $('login-user'); if (pu) pu.value = '';
  showLoginScreen();
}

function checklistIds() {
  var ids = [];
  for (var key in D.topics) {
    if (D.topics[key].type === 'checklist') ids.push(D.topics[key].clId);
  }
  return ids;
}

function topicByClId(clId) {
  for (var key in D.topics) {
    if (D.topics[key].type === 'checklist' && D.topics[key].clId === clId) return D.topics[key];
  }
  return null;
}

var CL_IDS = checklistIds();

var APP_VERSION = 16;

function appVersionMarker() {
  var el = $('app-version-marker');
  if (el) el.textContent = 'v' + APP_VERSION;
}

// === ТЕМА ===
function getTheme() {
  if (document.body.classList.contains('red')) return 'red';
  if (document.body.classList.contains('dark')) return 'dark';
  return 'light';
}

function setMetaTheme(color) {
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', color);
}

function setTheme(theme) {
  document.body.classList.remove('dark', 'red');
  var btn = document.querySelector('.theme-toggle');
  if (theme === 'dark') {
    document.body.classList.add('dark');
    if (btn) btn.textContent = '☀️';
    setMetaTheme('#18181b');
  } else if (theme === 'red') {
    document.body.classList.add('red');
    if (btn) btn.textContent = '🌑';
    setMetaTheme('#1a0a0a');
  } else {
    if (btn) btn.textContent = '🌙';
    setMetaTheme('#ffffff');
  }
  try { KOJOState.setTheme(theme); } catch (e) {}
}

function toggleTheme() {
  var current = getTheme();
  var next = current === 'light' ? 'dark' : current === 'dark' ? 'red' : 'light';
  setTheme(next);
}

// === РЕНДЕР: ГЛАВНЫЙ ЭКРАН ===
// === ВИДЖЕТ ГРАФИКА НА ГЛАВНОМ ЭКРАНЕ ===
function schedHomeWeekStart() {
  var d = new Date();
  var dow = d.getDay(); // 0=вс
  var off = (dow === 0) ? -6 : 1 - dow;
  var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + off);
  return monday;
}

function schedHomeWidgetHtml() {
  var s = schedRawData();
  var me = currentUser();
  var t = schedTodayParts();
  var monday = schedHomeWeekStart();
  var staffList = [];
  for (var i = 0; i < KOJO_ACCOUNTS.length; i++) {
    if (KOJO_ACCOUNTS[i].role === 'staff') staffList.push(KOJO_ACCOUNTS[i].login);
  }
  var rows = isAdmin() ? staffList : [me];
  var hasShifts = s.shifts && s.shifts.length > 0;
  var wdNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  var html = '<section class="section sched-home-section">';
  html += '<div class="section-header">';
  html += '<h2>📅 График смен</h2>';
  html += '<span class="see-all" data-action="show-section" data-section="schedule">все →</span>';
  html += '</div>';

  if (!hasShifts) {
    html += '<div class="sched-home-empty">Смены ещё не назначены — зайди в раздел «График смен» (у администратора: ➕ Смена, 💰 Ставки).</div>';
    html += '</section>';
    return html;
  }

  html += '<div class="sched-home">';
  html += '<div class="sched-home-head">';
  html += '<span class="sched-home-who">Сотрудник</span>';
  for (var d = 0; d < 7; d++) {
    var wd = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + d);
    var isToday = (wd.getFullYear() === t.y && wd.getMonth() + 1 === t.m && wd.getDate() === t.d);
    html += '<span class="sched-home-day' + (isToday ? ' today' : '') + '">' + wdNames[d] + ' ' + wd.getDate() + '</span>';
  }
  html += '<span class="sched-home-h">Ч</span>';
  html += '</div>';

  for (var r = 0; r < rows.length; r++) {
    var login = rows[r];
    var weekHours = 0;
    html += '<div class="sched-home-row">';
    html += '<span class="sched-home-who">' + (login === me ? '<b>' + login + '</b>' : login) + '</span>';
    for (var d2 = 0; d2 < 7; d2++) {
      var wd2 = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + d2);
      var dayKey = schedMonthKey(wd2.getFullYear(), wd2.getMonth() + 1) + '-' + (wd2.getDate() < 10 ? '0' : '') + wd2.getDate();
      var sid = schedCellFor(login, dayKey);
      var sh = sid ? schedShiftById(sid) : null;
      if (sh && sh.hours) weekHours += sh.hours;
      var shIdx = sid ? schedShiftIndex(sid) : 0;
      html += '<span class="sched-home-cell' + (sh ? ' filled' : '') + '">' +
        (sh ? '<span class="sched-chip" style="background:' + SCHED_SHIFT_COLORS[shIdx % SCHED_SHIFT_COLORS.length] + '">' + sh.short + '</span>' : '') +
        '</span>';
    }
    html += '<span class="sched-home-h">' + weekHours + '</span>';
    html += '</div>';
  }

  // Сводка за месяц (1–15 / 16–31)
  html += '<div class="sched-home-sum">';
  if (isAdmin()) {
    var g = { first: 0, second: 0, total: 0, salary: 0 };
    for (var b = 0; b < staffList.length; b++) {
      var hv = schedEmployeeHours(staffList[b], t.y, t.m);
      var sal = schedSalaryDirect(staffList[b], t.y, t.m);
      g.first += hv.first; g.second += hv.second; g.total += hv.total; g.salary += sal.salary;
    }
    html += 'Все сотрудники: 1–15: ' + g.first + ' ч · 16–31: ' + g.second + ' ч · всего ' + g.total + ' ч';
    if (g.salary > 0) html += ' · ЗП ≈ ' + numFmt2(g.salary);
  } else {
    var myv = schedEmployeeHours(me, t.y, t.m);
    var mysal = schedSalaryDirect(me, t.y, t.m);
    html += 'Мои часы: 1–15: ' + myv.first + ' · 16–31: ' + myv.second + ' · всего ' + myv.total + ' ч';
    if (mysal.salary > 0) html += ' · моя ЗП ≈ ' + numFmt2(mysal.salary);
  }
  html += '</div>';
  html += '</div>';
  html += '</section>';
  return html;
}

function schedSalaryDirect(login, y, m) {
  var s = schedRawData();
  var rate = parseFloat(s.rates[login]) || 0;
  var v = schedEmployeeHours(login, y, m);
  return { rate: rate, total: v.total, salary: Math.round(v.total * rate * 100) / 100 };
}

function renderHome() {
  var homeEl = $('home-screen');
  if (!homeEl) return;

  var userWrap = $('current-user-name');
  if (userWrap) {
    var acc = currentAccount();
    userWrap.textContent = currentUser() || '';
    var roleEl = $('current-user-role');
    if (roleEl) roleEl.textContent = acc ? (KOJO_ROLE_LABELS[acc.role]) : '';
    userWrap.style.display = 'block';
  }
  updateHeaderAdminButtons();
  appVersionMarker();

  var h = D.home;
  var html = '';

  html += '<section class="hero">';
  html += '<h1 class="hero-title">' + h.heroTitle + '</h1>';
  html += '<p class="hero-sub">' + h.heroSub + '</p>';

  html += '<div class="quick-actions">';
  for (var i = 0; i < h.quickActions.length; i++) {
    var qa = h.quickActions[i];
    html += '<button class="quick-action' + (qa.primary ? ' primary' : '') + '" data-action="' + qa.action + '">';
    html += '<span class="emoji">' + qa.emoji + '</span> ' + qa.label;
    html += '</button>';
  }
  html += '</div>';

  html += '<div class="search">';
  html += '<span class="search-icon">🔍</span>';
  html += '<input id="search" placeholder="' + h.searchPlaceholder + '" />';
  html += '<button class="clear-btn" id="clear-search" data-action="clear-search" aria-label="Очистить поиск">✕</button>';
  html += '<div class="search-results-count" id="search-count"></div>';
  html += '<div class="search-suggestions" id="search-suggestions"></div>';
  html += '</div>';

  html += '<div class="chips">';
  for (var c = 0; c < h.chips.length; c++) {
    html += '<span class="chip" data-suggest="' + h.chips[c].suggest + '">' + h.chips[c].label + '</span>';
  }
  html += '</div>';
  html += '</section>';

  html += reminderStripHtml();

  html += schedHomeWidgetHtml();

  html += '<section class="section">';
  html += '<div class="quick-checklist-access">';
  for (var q = 0; q < h.quickChecklists.length; q++) {
    var qc = h.quickChecklists[q];
    html += '<div class="quick-checklist-btn" data-action="open-checklist" data-checklist="' + qc.cl + '">';
    html += '<span class="icon">' + qc.icon + '</span>';
    html += qc.label;
    html += '<span class="progress-mini" id="' + qc.cl + '-mini">0/0</span>';
    html += '</div>';
  }
  html += '</div>';
  html += '</section>';

  html += '<section class="section">';
  html += '<div class="section-header">';
  html += '<h2>Разделы</h2>';
  html += '<span class="see-all" data-action="scroll-to-sections">все разделы →</span>';
  html += '</div>';
  html += '<div class="grid">';
  for (var t = 0; t < h.tiles.length; t++) {
    var tile = h.tiles[t];
    if (tile.type === 'section') {
      html += '<article class="tile" data-action="show-section" data-section="' + tile.section + '">';
    } else {
      html += '<article class="tile" data-action="open-topic" data-topic="' + tile.topic + '" data-parent="home">';
    }
    html += '<span class="tile-icon">' + tile.icon + '</span>';
    html += '<p class="tile-title">' + tile.title + '</p>';
    html += '<p class="tile-text">' + tile.text + '</p>';
    if (tile.badge) html += '<span class="tile-badge" id="checklists-badge">0%</span>';
    html += '</article>';
  }
  if (isAdmin()) {
    html += '<article class="tile tile-admin" data-action="show-control">';
    html += '<span class="tile-icon">📊</span>';
    html += '<p class="tile-title">Контроль</p>';
    html += '<p class="tile-text">Что и кто выполнил сегодня по всем аккаунтам.</p>';
    html += '</article>';
  }
  html += '<article class="tile" data-action="show-section" data-section="schedule">';
  html += '<span class="tile-icon">📅</span>';
  html += '<p class="tile-title">График смен</p>';
  html += '<p class="tile-text">Смены по дням, часы и оплата.</p>';
  html += '</article>';
  html += '</div>';
  html += '</section>';

  homeEl.innerHTML = html;
}

// === РЕНДЕР: РАЗДЕЛ ===
function renderSection(id) {
  var box = $('section-screen');
  if (!box) return;

  if (id === 'control') { renderControlSection(box); box.classList.add('active'); return; }
  if (id === 'schedule') { renderScheduleSection(box); box.classList.add('active'); return; }

  var sec = null;
  for (var i = 0; i < D.sections.length; i++) {
    if (D.sections[i].id === id) { sec = D.sections[i]; break; }
  }
  if (!sec) return;

  var html = '';
  html += '<div class="back" data-back>';
  html += '<div class="back-icon">←</div><span>На главный экран</span>';
  html += '</div>';
  html += '<div class="screen-box">';
  html += '<h1 class="screen-title">' + sec.icon + ' ' + sec.screenTitle + '</h1>';
  html += '<p class="screen-sub">' + sec.sub + '</p>';

  if (id === 'checklists') {
    html += '<div class="checklist-stats" id="checklist-stats">';
    html += '<div class="stat-card"><div class="stat-value done" id="stat-done">0</div><div class="stat-label">Выполнено</div></div>';
    html += '<div class="stat-card"><div class="stat-value pending" id="stat-pending">0</div><div class="stat-label">Осталось</div></div>';
    html += '<div class="stat-card"><div class="stat-value" id="stat-total">0</div><div class="stat-label">Всего пунктов</div></div>';
    html += '</div>';
  }

  html += '<div class="list">';
  for (var j = 0; j < sec.items.length; j++) {
    var it = sec.items[j];
    html += '<button class="item-link" data-open-topic="' + it.id + '">';
    html += '<span class="link-icon">' + it.icon + '</span>';
    html += it.title;
    html += '<span class="link-arrow">→</span>';
    html += '</button>';
  }
  html += '</div>';
  html += '</div>';

  box.innerHTML = html;
  box.classList.add('active');
}

// === РЕНДЕР: ТЕМА ===
function renderTopic(key, parent) {
  var box = $('topic-screen');
  if (!box) return;
  var topic = D.topics[key];
  if (!topic) return;
  if (!parent) parent = topic.back || 'home';
  var backLabel = 'На главный экран';
  for (var i = 0; i < D.sections.length; i++) {
    if (D.sections[i].id === parent) { backLabel = D.sections[i].backLabel; break; }
  }

  var html = '';
  html += '<div class="back" data-back-topic="' + parent + '">';
  html += '<div class="back-icon">←</div><span>' + backLabel + '</span>';
  html += '</div>';
  html += '<div class="screen-box">';

  if (topic.type === 'checklist') {
    var clId = topic.clId;
    var state = KOJOState.getChecklist(clId);
    html += '<div class="checklist-header">';
    html += '<h1 class="screen-title">' + topic.icon + ' ' + topic.title + '</h1>';
    html += '<div class="checklist-progress">';
    html += '<span><span id="' + clId + '-progress">0</span>/<span id="' + clId + '-total">0</span></span>';
    html += '<div class="progress-bar"><div class="progress-bar-fill" id="' + clId + '-progress-bar"></div></div>';
    html += '<button class="reset-btn" data-action="reset-checklist" data-checklist="' + clId + '">✕ Сбросить</button>';
    html += '</div>';
    html += '</div>';
    html += '<p class="screen-sub">' + topic.sub + '</p>';
    html += '<ul class="checklist">';

    var idx = 0;
    for (var n = 0; n < topic.items.length; n++) {
      var it = topic.items[n];
      if (it.label) {
        html += '<li class="checklist-item checklist-section-label"><span>' + it.label + '</span></li>';
        continue;
      }
      var checked = state && state[idx] === true;
      html += '<li class="checklist-item' + (checked ? ' completed' : '') + '">';
      html += '<label class="checklist-label">';
      html += '<input type="checkbox" class="checklist-checkbox" data-checklist="' + clId + '"' + (checked ? ' checked' : '') + '>';
      html += '<span class="checklist-text">' + it.text + '</span>';
      html += '</label>';
      if (it.hint) html += '<div class="step-text">' + it.hint + '</div>';
      html += '</li>';
      idx++;
    }
    html += '</ul>';
  } else if (topic.type === 'steps') {
    html += '<h1 class="screen-title">' + topic.icon + ' ' + topic.title + '</h1>';
    html += '<p class="screen-sub">' + topic.sub + '</p>';
    html += '<ol class="steps">';
    for (var s = 0; s < topic.steps.length; s++) {
      var st = topic.steps[s];
      html += '<li><strong>' + st.title + '</strong><div class="step-text">' + st.text + '</div></li>';
    }
    html += '</ol>';
  } else if (topic.type === 'article') {
    html += '<h1 class="screen-title">' + topic.icon + ' ' + topic.title + '</h1>';
    html += '<p class="screen-sub">' + topic.sub + '</p>';
    html += '<div class="step-text">' + topic.body + '</div>';
  } else if (topic.type === 'calc') {
    html += '<h1 class="screen-title">' + topic.icon + ' ' + topic.title + '</h1>';
    html += '<p class="screen-sub">' + topic.sub + '</p>';
    html += '<div class="calc-wrap" id="order-calc">';
    for (var r = 0; r < D.calc.length; r++) {
      var row = D.calc[r];
      if (row.section) {
        html += '<div class="calc-section">' + row.section + '</div>';
        continue;
      }
      html += '<div class="calc-row">';
      html += '<label>' + row.label + '</label>';
      html += '<input type="number" class="calc-input" id="stock-' + row.key + '" value="0" min="0" data-calc="' + row.key + '" data-norm="' + row.norm + '" />';
      html += '<span class="calc-note">норма: ' + row.norm + ' ' + row.unit + ' → заказать: <strong id="order-' + row.key + '">' + row.norm + '</strong></span>';
      html += '</div>';
    }
    html += '</div>';
    html += '<div class="calc-actions">';
    html += '<button class="calc-copy-btn" data-action="copy-order">📋 Копировать заявку</button>';
    html += '<span class="calc-hint">Скопирует все позиции с количеством к заказу</span>';
    html += '</div>';
    html += '<p class="calc-footnote">Нормы рассчитаны на 3 дня до следующей поставки. Уточни нормы у управляющей.</p>';
  }

  html += '</div>';

  box.innerHTML = html;
  box.classList.add('active');

  if (topic.type === 'checklist') {
    updateProgress(topic.clId);
  }
}

// === КОНТРОЛЬ (только для администраторов) ===
function userProgressCount(login) {
  var total = 0;
  var done = 0;
  for (var i = 0; i < CL_IDS.length; i++) {
    var clId = CL_IDS[i];
    var topic = topicByClId(clId);
    if (!topic) continue;
    var state = KOJOState.getChecklist(clId, login);
    var idx = 0;
    for (var j = 0; j < topic.items.length; j++) {
      var it = topic.items[j];
      if (it.label) continue;
      total++;
      if (state && state[idx] === true) done++;
      idx++;
    }
  }
  return { done: done, total: total };
}

var CONTROL_LEVELS = [
  { clId: 'open', icon: '☀️', label: 'Открытие' },
  { clId: 'close', icon: '🌙', label: 'Закрытие' },
  { clId: 'general', icon: '🧹', label: 'Генуборка' }
];

function checklistProgressCount(login, clId) {
  var topic = topicByClId(clId);
  if (!topic) return { done: 0, total: 0 };
  var state = KOJOState.getChecklist(clId, login);
  var idx = 0;
  var total = 0;
  var done = 0;
  for (var j = 0; j < topic.items.length; j++) {
    var it = topic.items[j];
    if (it.label) continue;
    total++;
    if (state && state[idx] === true) done++;
    idx++;
  }
  return { done: done, total: total };
}

function renderControlSection(box) {
  var today = kojoToday();
  var html = '<div class="back" data-back>';
  html += '<div class="back-icon">←</div><span>На главный экран</span>';
  html += '</div>';
  html += '<div class="screen-box">';
  html += '<h1 class="screen-title">📊 Контроль</h1>';
  html += '<p class="screen-sub">Открытие, закрытие и генеральная уборка за сегодня (' + today + ') по каждому аккаунту.</p>';

  html += '<div class="control-syncline">';
  html += '<span id="control-sync-status">Синхронизация: …</span>';
  html += '<button class="reset-btn" data-action="sync-now">🔄 Обновить из облака</button>';
  html += '<button class="reset-btn" data-action="open-sync-settings">⚙️ Синхронизация</button>';
  html += '</div>';

  var totals = { open: { done: 0, total: 0 }, close: { done: 0, total: 0 }, general: { done: 0, total: 0 } };

  for (var i = 0; i < KOJO_ACCOUNTS.length; i++) {
    var acc = KOJO_ACCOUNTS[i];
    html += '<div class="control-account">';
    html += '<div class="control-account-head">';
    html += '<div class="control-name' + (acc.role === 'admin' ? ' admin' : '') + '">' + acc.login + '</div>';
    html += '<div class="control-role">' + KOJO_ROLE_LABELS[acc.role] + '</div>';
    html += '</div>';
    html += '<div class="control-bars">';
    for (var k = 0; k < CONTROL_LEVELS.length; k++) {
      var lvl = CONTROL_LEVELS[k];
      var p = checklistProgressCount(acc.login, lvl.clId);
      totals[lvl.clId].done += p.done;
      totals[lvl.clId].total += p.total;
      var pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
      var cls = pct === 100 ? ' good' : (pct > 0 ? ' mid' : '');
      html += '<div class="control-bar">';
      html += '<div class="control-bar-top">';
      html += '<span>' + lvl.icon + ' ' + lvl.label + '</span>';
      html += '<span class="control-count' + cls + '"><strong>' + p.done + '</strong>/' + p.total + '</span>';
      html += '</div>';
      html += '<div class="progress-bar"><div class="progress-bar-fill' + cls + '" style="width:' + pct + '%"></div></div>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';
  }

  html += '<div class="control-total-wrap">';
  html += '<span class="muted">Итого по всем аккаунтам</span>';
  for (var t = 0; t < CONTROL_LEVELS.length; t++) {
    var lvl2 = CONTROL_LEVELS[t];
    var tt = totals[lvl2.clId];
    html += '<span>' + lvl2.icon + ' ' + tt.done + '/' + tt.total + ' (' + (tt.total > 0 ? Math.round((tt.done / tt.total) * 100) : 0) + '%)</span>';
  }
  html += '</div>';

  html += '<p class="screen-sub small">Каждый новый день прогресс всех аккаунтов автоматически обнуляется.</p>';
  html += '</div>';

  box.innerHTML = html;
  box.classList.add('active');
  updateControlStatus();
}

// === ГРАФИК СМЕН ===
var SCHED_VIEW = { y: null, m: null }; // 1-based month
var SCHED_SHIFT_COLORS = ['#e8f4fd', '#e9f9ec', '#fdf3e3', '#fdeef1', '#efedfd', '#eafaf6', '#fef9e7'];

function schedMonthKey(y, m) {
  return y + '-' + (m < 10 ? '0' : '') + m;
}

function schedTodayParts() {
  var d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

function schedGetViewMonth() {
  var t = schedTodayParts();
  if (!SCHED_VIEW.y || !SCHED_VIEW.m) { SCHED_VIEW.y = t.y; SCHED_VIEW.m = t.m; }
  return SCHED_VIEW;
}

function schedRawData() {
  var s = KOJOState.getSchedule();
  if (!s) s = { ts: 0, shifts: [], rates: {}, cells: {} };
  if (!s.shifts) s.shifts = [];
  if (!s.rates) s.rates = {};
  if (!s.cells) s.cells = {};
  return s;
}

function schedShiftById(id) {
  var s = schedRawData();
  for (var i = 0; i < s.shifts.length; i++) {
    if (s.shifts[i].id === id) return s.shifts[i];
  }
  return null;
}

function schedDaysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function schedWeekdayOf(y, m, d) {
  var names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var wd = new Date(y, m - 1, d).getDay();
  return names[wd === 0 ? 6 : wd - 1];
}

function schedCellFor(login, dayKey) {
  var s = schedRawData();
  var cells = s.cells[dayKey];
  return cells ? cells[login] : null;
}

function schedSetCell(login, dayKey, shiftId) {
  var s = schedRawData();
  if (!s.cells[dayKey]) s.cells[dayKey] = {};
  if (shiftId) s.cells[dayKey][login] = shiftId;
  else delete s.cells[dayKey][login];
  KOJOState.saveSchedule(s);
  scheduleCloudPush();
}

function schedEmployeeHours(login, y, m) {
  var s = schedRawData();
  var total = 0, first = 0, second = 0;
  var days = schedDaysInMonth(y, m);
  var month = schedMonthKey(y, m);
  for (var d = 1; d <= days; d++) {
    var dayKey = month + '-' + (d < 10 ? '0' : '') + d;
    var sid = schedCellFor(login, dayKey);
    if (!sid) continue;
    var sh = schedShiftById(sid);
    if (!sh || !sh.hours) continue;
    total += sh.hours;
    if (d <= 15) first += sh.hours; else second += sh.hours;
  }
  return { total: total, first: first, second: second };
}

function schedSalary(login) {
  var s = schedRawData();
  var rate = parseFloat(s.rates[login]) || 0;
  var v = schedEmployeeHours(login, schedGetViewMonth().y, schedGetViewMonth().m);
  return { rate: rate, total: v.total, salary: Math.round(v.total * rate * 100) / 100 };
}

function renderScheduleSection(box) {
  var v = schedGetViewMonth();
  var monthKey = schedMonthKey(v.y, v.m);
  var days = schedDaysInMonth(v.y, v.m);
  var me = currentUser();
  var staffList = [];
  for (var i = 0; i < KOJO_ACCOUNTS.length; i++) {
    if (KOJO_ACCOUNTS[i].role === 'staff') staffList.push(KOJO_ACCOUNTS[i].login);
  }
  var s = schedRawData();

  var html = '';
  html += '<div class="back" data-back>';
  html += '<div class="back-icon">←</div><span>На главный экран</span>';
  html += '</div>';
  html += '<div class="screen-box">';
  html += '<h1 class="screen-title">📅 График смен</h1>';
  html += '<p class="screen-sub">Смены по дням месяца · оплата = часы × ставка · ' + monthKey + '</p>';

  html += '<div class="sched-nav">';
  html += '<button class="reset-btn" data-action="sched-prev">◀</button>';
  html += '<span class="sched-month-label">' + monthKey + '</span>';
  html += '<button class="reset-btn" data-action="sched-next">▶</button>';
  html += '</div>';

  if (isAdmin()) {
    html += '<div class="sched-admin-actions">';
    html += '<button class="reset-btn" data-action="sched-add-shift">➕ Смена</button>';
    html += '<button class="reset-btn" data-action="sched-set-rate">💰 Ставки</button>';
    html += '<button class="reset-btn" data-action="sync-now">🔄 Синхронизация</button>';
    html += '</div>';
  }

  html += '<div class="sched-wrap">';
  html += '<table class="sched-table">';
  html += '<thead><tr><th class="sched-name-col">Сотрудник</th>';
  var today = kojoToday();
  for (var d = 1; d <= days; d++) {
    var dk = monthKey + '-' + (d < 10 ? '0' : '') + d;
    var isToday = dk === today;
    html += '<th class="sched-day' + (isToday ? ' today' : '') + '"><span class="sched-wd">' + schedWeekdayOf(v.y, v.m, d) + '</span><span class="sched-dnum">' + d + '</span></th>';
  }
  html += '<th class="sched-sum-col">Ч</th></tr></thead>';
  html += '<tbody>';

  for (var a = 0; a < staffList.length; a++) {
    var login = staffList[a];
    var hrs = schedEmployeeHours(login, v.y, v.m);
    html += '<tr>';
    html += '<td class="sched-name-col"><span class="sched-name">' + login + '</span></td>';
    var rowHtml = '';
    for (var dd = 1; dd <= days; dd++) {
      var dKey2 = monthKey + '-' + (dd < 10 ? '0' : '') + dd;
      var sid = schedCellFor(login, dKey2);
      var sh = sid ? schedShiftById(sid) : null;
      var cls = sh ? ' filled' : '';
      var shIdx = sid ? schedShiftIndex(sid) : 0;
      var chip = sh ? '<span class="sched-chip" style="background:' + SCHED_SHIFT_COLORS[shIdx % SCHED_SHIFT_COLORS.length] + '">' + sh.short + '</span>' : '';
      if (isAdmin()) {
        rowHtml += '<td data-action="sched-pick" data-login="' + encodeURIComponent(login) + '" data-day="' + dKey2 + '" class="sched-day' + cls + '">' + chip + '</td>';
      } else {
        rowHtml += '<td class="sched-day' + cls + '">' + chip + '</td>';
      }
    }
    html += rowHtml;
    html += '<td class="sched-sum-col">' + hrs.total + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table>';
  html += '</div>';

  html += '<div class="sched-report">';
  if (isAdmin()) {
    html += '<div class="sched-report-title">Сводка по сотрудникам (1–15 / 16–31, ставка, ЗП)</div>';
    var grand = { first: 0, second: 0, total: 0, salary: 0 };
    html += '<table class="sched-summary"><thead><tr><th>Сотрудник</th><th>1–15 ч</th><th>16–31 ч</th><th>Всего ч</th><th>Ставка/ч</th><th>ЗП</th></tr></thead><tbody>';
    for (var b = 0; b < staffList.length; b++) {
      var lg = staffList[b];
      var hv = schedEmployeeHours(lg, v.y, v.m);
      var sal = schedSalary(lg);
      grand.first += hv.first;
      grand.second += hv.second;
      grand.total += hv.total;
      grand.salary += sal.salary;
      html += '<tr><td>' + lg + '</td><td>' + hv.first + '</td><td>' + hv.second + '</td><td>' + hv.total + '</td><td>' + numFmt2(sal.rate) + '</td><td class="money">' + numFmt2(sal.salary) + '</td></tr>';
    }
    html += '<tr class="sched-grand"><td>Итого</td><td class="money">' + grand.first + '</td><td class="money">' + grand.second + '</td><td class="money">' + grand.total + '</td><td>—</td><td class="money">' + numFmt2(grand.salary) + '</td></tr>';
    html += '</tbody></table>';
  } else {
    html += '<div class="sched-report-title">Мои часы и оплата</div>';
    var my = schedEmployeeHours(me, v.y, v.m);
    var mySal = schedSalary(me);
    html += '<table class="sched-summary"><tbody>';
    html += '<tr><td>Часы 1–15</td><td class="money">' + my.first + '</td></tr>';
    html += '<tr><td>Часы 16–31</td><td class="money">' + my.second + '</td></tr>';
    html += '<tr><td>Всего часов</td><td class="money">' + my.total + '</td></tr>';
    html += '<tr><td>Моя ставка/ч</td><td class="money">' + numFmt2(mySal.rate) + '</td></tr>';
    html += '<tr><td>Моя ЗП за месяц</td><td class="money">' + numFmt2(mySal.salary) + '</td></tr>';
    html += '</tbody></table>';
  }
  html += '</div>';

  html += '</div>';
  box.innerHTML = html;
}

function schedShiftIndex(sid) {
  var s = schedRawData();
  for (var i = 0; i < s.shifts.length; i++) {
    if (s.shifts[i].id === sid) return i;
  }
  return 0;
}

function schedAddShift() {
  var name = prompt('Название смены (например: Утро, Вечер):', 'Смена');
  if (!name) return;
  var hrs = prompt('Часов в смене:', '8');
  var h = parseInt(hrs, 10);
  if (isNaN(h) || h < 0) h = 8;
  var s = schedRawData();
  var id = 'sh' + Date.now();
  var short = (name.trim() || 'С').slice(0, 2);
  s.shifts.push({ id: id, name: name.trim(), short: short, hours: h });
  KOJOState.saveSchedule(s);
  scheduleCloudPush();
  renderScheduleSection($('section-screen'));
}

function schedSetRate() {
  var s = schedRawData();
  var lines = [];
  for (var i = 0; i < KOJO_ACCOUNTS.length; i++) {
    var a = KOJO_ACCOUNTS[i];
    if (a.role !== 'staff') continue;
    lines.push(a.login + ': ' + (s.rates[a.login] !== undefined ? s.rates[a.login] : '0'));
  }
  var input = prompt('Ставки за час для сотрудников (ставка: логин — только для админа).\n\nФормат: логин = число\n\n' + lines.join('\n'), lines.join('\n'));
  if (!input) return;
  var newRates = {};
  var rows = input.split('\n');
  for (var r = 0; r < rows.length; r++) {
    var m = rows[r].match(/^\s*([^:=]+?)\s*[:=]\s*([\d.,]+)/);
    if (m) {
      var rate = parseFloat(m[2].replace(',', '.'));
      if (!isNaN(rate)) newRates[m[1].trim()] = rate;
    }
  }
  var s2 = schedRawData();
  s2.rates = newRates;
  KOJOState.saveSchedule(s2);
  scheduleCloudPush();
  renderScheduleSection($('section-screen'));
}

function schedCheckShiftBtn(login, dayKey) {
  var s = schedRawData();
  var html = '<div class="sched-pick-head">Выбрать смену: <b>' + login + '</b>, ' + dayKey + '</div>';
  for (var i = 0; i < s.shifts.length; i++) {
    var sh = s.shifts[i];
    html += '<button class="sched-pick-btn" data-action="sched-set" data-login="' + encodeURIComponent(login) + '" data-day="' + dayKey + '" data-shift="' + sh.id + '" style="background:' + SCHED_SHIFT_COLORS[i % SCHED_SHIFT_COLORS.length] + '">' + sh.short + ' ' + sh.name + ' (' + sh.hours + ' ч)</button>';
  }
  html += '<button class="sched-pick-btn" data-action="sched-clear" data-login="' + encodeURIComponent(login) + '" data-day="' + dayKey + '">✕ Убрать смену</button>';
  html += '<button class="sched-pick-btn" data-action="sched-close-pick">Закрыть</button>';
  return html;
}

function schedScheduleData() { return schedRawData(); }

function numFmt2(n) {
  if (n === undefined || n === null || isNaN(n)) return '—';
  var v = Math.round(n * 100) / 100;
  return String(v);
}

function updateControlStatus() {
  var el = $('control-sync-status');
  if (!el) return;
  if (KOJOCloud.isConfigured()) {
    var ls = KOJOCloud.getLastSync();
    if (ls.ok === true) {
      el.textContent = '☁️ Синхронизация включена · обновлено в ' + ls.at;
    } else if (ls.ok === false) {
      el.textContent = '☁️ Синхронизация включена · ошибка: ' + (ls.error || 'неизвестно');
    } else {
      el.textContent = '☁️ Синхронизация включена · ожидание первой синхронизации…';
    }
  } else {
    el.textContent = '⚠️ Облачная синхронизация не настроена — работает локально на этом устройстве';
  }
}

function showSyncSettingsModal() {
  var s = KOJOCloud.getSettings();
  var ls = KOJOCloud.getLastSync();
  var html = '<div style="display:grid;gap:10px;padding:4px 0">';
  html += '<p style="font-size:13px;color:var(--muted);margin:0">Все устройства автоматически используют одно общее облако (JSONBlob). Данные каждого аккаунта обновляются на всех устройствах автоматически (интервал подстраивается под лимиты облака) и сразу после отметки пунктов.</p>';
  html += '<div style="font-size:13px;background:var(--bg-soft);border:1px solid var(--border);border-radius:12px;padding:10px 12px">';
  html += 'Облако: <b>' + (s.binId ? s.binId.slice(0, 8) + '…' : 'не настроено') + '</b>';
  if (ls.ok === true) html += '<br>✅ Последняя синхронизация: ' + ls.at;
  else if (ls.ok === false) html += '<br>⚠️ Последняя синхронизация: ошибка (' + (ls.error || '?') + ') · ' + ls.at;
  else html += '<br>⏳ Синхронизация ещё не выполнялась';
  html += '</div>';
  html += '<button class="login-btn" data-action="test-connection">🔌 Проверить связь с облаком</button>';
  html += '<p id="sync-test-result" style="font-size:13px;color:var(--muted);margin:0"></p>';
  html += '<div class="profile-label">Журнал синхронизации</div>';
  html += '<div id="sync-log" style="font-size:12px;max-height:170px;overflow-y:auto;background:var(--bg-soft);border:1px solid var(--border);border-radius:12px;padding:8px 10px">' + syncLogHtml() + '</div>';
  html += '</div>';
  var content = $('sync-modal-content');
  if (content) content.innerHTML = html;
  var modal = $('sync-modal');
  if (modal) modal.classList.add('visible');
}

function syncLogHtml() {
  var log = KOJOCloud.getLog();
  if (!log.length) return '<span style="color:var(--muted)">Пока пусто — журнал ведётся с этой версии.</span>';
  var out = [];
  for (var i = log.length - 1; i >= 0; i--) {
    var e = log[i];
    out.push('<div>' + (e.ok ? '✅' : '❌') + ' <b>' + e.t + '</b> ' + e.msg + '</div>');
  }
  return out.join('');
}

function closeSyncSettingsFromForm() {
  var bin = $('sync-bin');
  var key = $('sync-key');
  if (!bin || !key) return;
  KOJOCloud.saveSettings(bin.value.trim(), key.value.trim());
  closeSyncModal();
  showToast('⚙️ Настройки синхронизации сохранены', 'success');
  startCloudSyncPolling();
  syncAllFromCloud(function () {
    var box = $('section-screen');
    if (box && box.classList.contains('active') && box.querySelector('.screen-title')) {
      var title = box.querySelector('.screen-title').textContent;
      if (title.indexOf('Контроль') !== -1) renderSection('control');
    }
  });
}

function autoCreateBin() {
  var key = $('sync-key');
  if (!key) return;
  var masterKey = key.value.trim();
  if (!masterKey) {
    showToast('⚠️ Сначала вставьте X-Master-Key', 'warning');
    return;
  }
  KOJOCloud.saveSettings('', masterKey);
  KOJOCloud.createBin({ date: kojoToday(), users: {} }, function (binId) {
    if (binId) {
      closeSyncModal();
      showToast('✨ Bin создан и подключён!', 'success');
      startCloudSyncPolling();
      syncAllFromCloud(function () {
        var box = $('section-screen');
        if (box && box.classList.contains('active') && box.querySelector('.screen-title')) {
          var title = box.querySelector('.screen-title').textContent;
          if (title.indexOf('Контроль') !== -1) renderSection('control');
        }
      });
    } else {
      showToast('⚠️ Не удалось создать Bin — проверьте Master Key', 'error');
    }
  });
}

function closeSyncModal() {
  var modal = $('sync-modal');
  if (modal) modal.classList.remove('visible');
}

function runConnectionTest() {
  var out = $('sync-test-result');
  if (!out) return;
  out.textContent = '⏳ Проверяем…';
  var t0 = Date.now();
  KOJOCloud.get(function (doc, err) {
    if (err) { out.textContent = '❌ Ошибка чтения bin: ' + err; return; }
    if (!doc || typeof doc !== 'object') { out.textContent = '❌ Бин пуст или не содержит данных'; return; }
    var probe = '__probe__';
    doc.users = doc.users || {};
    doc.users[probe] = ['ok'];
    KOJOCloud.set(doc, function (res, err2) {
      if (err2) { out.textContent = '❌ Ошибка записи в bin: ' + err2; return; }
      // jsonbin может отдавать чтение с небольшой задержкой — пробуем несколько раз
      var tries = 0;
      var tryRead = function () {
        KOJOCloud.get(function (doc2, err3) {
          if (err3 || !doc2 || !doc2.users || !doc2.users[probe]) {
            tries++;
            if (tries < 5) { setTimeout(tryRead, 400); return; }
            out.textContent = '❌ Запись не прочиталась обратно' + (err3 ? ' (' + err3 + ')' : '');
            return;
          }
          delete doc2.users[probe];
          KOJOCloud.set(doc2, function (res4, err4) {
            out.textContent = '✅ Связь с облаком есть: запись + чтение за ' + (Date.now() - t0) + ' мс';
          });
        });
      };
      tryRead();
    });
  });
}

// === ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ ===
var syncTimer = null;
var cloudSyncing = false;
var cloudTimer = null;
var cloudDirty = true;

function pushCloud(cb, freshDoc) {
  var user = currentUser();
  if (!user || !KOJOCloud.isConfigured()) { if (cb) cb(); return; }
  var today = kojoToday();
  var doc = { date: today, users: {} };
  var finishPush = function (cloud, ok) {
    if (!ok) { updateHeaderSyncBadge(); if (cb) cb(); return; }
    if (cloud && cloud.date === today && cloud.users) doc.users = cloud.users;
    doc.users[user] = {};
    var tsMap = {};
    for (var i = 0; i < CL_IDS.length; i++) {
      var clId = CL_IDS[i];
      var arr = KOJOState.getChecklist(clId, user);
      if (arr) {
        doc.users[user][clId] = arr;
      } else {
        // нет локальных данных (сброс или ещё не отмечали) — убираем запись,
        // чтобы облако не «оживало» после сброса чек-листа
        delete doc.users[user][clId];
      }
      var lts = KOJOState.getChecklistTs(clId, user);
      if (lts > 0) tsMap[clId] = lts;
    }
    var hasTs = false;
    for (var k in tsMap) { if (tsMap.hasOwnProperty(k)) { hasTs = true; break; } }
    if (hasTs) doc.users[user].ts = tsMap;
    var meta = {};
    var metaTs = {};
    var nt = KOJOState.getNotes(user);
    var noteTs = KOJOState.getNotesTs(user);
    if (nt !== '' || noteTs > 0) { meta.notes = nt || ''; if (noteTs > 0) metaTs.notes = noteTs; }
    var ph = KOJOState.getPhoto(user);
    var photoTs = KOJOState.getPhotoTs(user);
    if (ph) { meta.photo = ph; if (photoTs > 0) metaTs.photo = photoTs; }
    var rc = KOJOState.getRecipes(user);
    var recipesTs = KOJOState.getRecipesTs(user);
    if (rc && rc.length) { meta.recipes = rc; if (recipesTs > 0) metaTs.recipes = recipesTs; }
    if (Object.keys(meta).length) {
      if (Object.keys(metaTs).length) meta.ts = metaTs;
      doc.users[user].meta = meta;
    }
    // График смен — общий документ для всех аккаунтов: новее всех
    if (cloud && cloud.schedule && typeof cloud.schedule === 'object') {
      var lS = KOJOState.getSchedule();
      var schedTs = lS && lS.ts ? lS.ts : 0;
      if (schedTs > (cloud.schedule.ts || 0)) {
        doc.schedule = { ts: lS.ts, shifts: lS.shifts || [], rates: lS.rates || {}, cells: lS.cells || {} };
      } else {
        doc.schedule = cloud.schedule;
      }
    } else {
      var localS = KOJOState.getSchedule();
      if (localS && localS.ts) doc.schedule = localS;
    }
    KOJOState.saveCloudDoc(doc);
    KOJOCloud.set(doc, function (res, err2) {
      if (!err2) cloudDirty = false;
      updateHeaderSyncBadge();
      if (res) { if (console) console.log('KOJO sync ok'); }
      if (cb) cb();
    });
  };
  // Свежий документ уже есть (из цикла опроса) — пишем на его основе.
  // ВАЖНО: перед записью всегда нужна актуальная копия bin, иначе можно
  // стереть данные других устройств. Если свежей копии нет — читаем заново;
  // при ошибке чтения НИЧЕГО не пишем.
  if (freshDoc && typeof freshDoc === 'object' && freshDoc.date === today && freshDoc.users) {
    finishPush(freshDoc, true);
  } else {
    KOJOCloud.get(function (cloud, err) {
      finishPush(cloud, !err);
    });
  }
}

function scheduleCloudPush() {
  cloudDirty = true;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(pushCloud, 800);
}

function syncAllFromCloud(cb) {
  if (cloudSyncing) {
    if (cb) cb();
    return;
  }
  cloudSyncing = true;
  var finished = function () {
    cloudSyncing = false;
    refreshAllViews();
    updateHeaderSyncBadge();
    if (cb) cb();
  };
  KOJOCloud.get(function (doc, err) {
    try {
      // ОШИБКА (сеть/сервер/таймаут): НЕ пишем в bin ничего — чужие данные
      // остаются целыми. Просто ждём следующего цикла опроса.
      if (err) { finished(); return; }
      var today = kojoToday();
      if (!doc || !doc.users) {
        // Облако пустое или ещё не создано — безопасно начать с чистого документа.
        var prevSched = (doc && doc.schedule) ? doc.schedule : null;
        doc = { date: today, users: {} };
        if (prevSched) doc.schedule = prevSched;
        KOJOState.saveCloudDoc(doc);
        KOJOCloud.set(doc, function (res, err2) { finished(); });
      } else if (doc.date !== today) {
        if (doc.date < today) {
          // Наступил новый день — начинаем с чистого документа (график сохраняем).
          var keepSched = (doc && typeof doc.schedule === 'object') ? doc.schedule : null;
          doc = { date: today, users: {} };
          if (keepSched) doc.schedule = keepSched;
          KOJOState.saveCloudDoc(doc);
          KOJOCloud.set(doc, function (res, err2) { finished(); });
        } else {
          // Дата в облаке позже (устройство с другим часовым поясом/календарём) —
          // данные не трогаем и не пишем, чтобы ничего не потерять.
          finished();
        }
      } else {
        // переносим облачные данные в локальное хранилище для каждого аккаунта,
        // НО не затираем более свежие локальные данные (merge по таймстампам):
        // локальные правки, которые ещё не успели уйти в облако, должны выжить
        // после перезагрузки страницы.
        var mergeNeeded = false;
        for (var user in doc.users) {
          var u = doc.users[user];
          if (!u) continue;
          var cloudTs = (u && typeof u.ts === 'object') ? u.ts : {};
          for (var clId in u) {
            if (!Array.isArray(u[clId])) continue;
            var cTs = cloudTs[clId] || 0;
            var lTs = KOJOState.getChecklistTs(clId, user);
            var local = KOJOState.getChecklist(clId, user);
            if (local !== null && lTs > cTs) {
              // локальные данные новее — оставляем их и запланируем пуш
              mergeNeeded = true;
              continue;
            }
            KOJOState.saveChecklistKeepTs(clId, u[clId], cTs, user);
          }
          var cloudMetaTs = (u.meta && typeof u.meta.ts === 'object') ? u.meta.ts : {};
          if (u.meta) {
            var m = u.meta;
            if (m.notes !== undefined) {
              if (KOJOState.getNotesTs(user) <= (cloudMetaTs.notes || 0)) {
                if (m.notes !== KOJOState.getNotes(user)) KOJOState.setNotesKeepTs(m.notes, cloudMetaTs.notes || 0, user);
              } else { mergeNeeded = true; }
            }
            if (m.photo) {
              if (KOJOState.getPhotoTs(user) <= (cloudMetaTs.photo || 0)) {
                if (m.photo !== KOJOState.getPhoto(user)) KOJOState.setPhotoKeepTs(m.photo, cloudMetaTs.photo || 0, user);
              } else { mergeNeeded = true; }
            }
            if (Array.isArray(m.recipes)) {
              if (KOJOState.getRecipesTs(user) <= (cloudMetaTs.recipes || 0)) {
                if (JSON.stringify(m.recipes) !== JSON.stringify(KOJOState.getRecipes(user))) KOJOState.setRecipesKeepTs(m.recipes, cloudMetaTs.recipes || 0, user);
              } else { mergeNeeded = true; }
            }
          }
        }
        // === ГРАФИК СМЕН ===
        var cloudSched = doc.schedule;
        var localSched = KOJOState.getSchedule();
        var lSchedTs = localSched && localSched.ts ? localSched.ts : 0;
        if (cloudSched && typeof cloudSched === 'object' && cloudSched.ts) {
          if (lSchedTs >= cloudSched.ts && lSchedTs > 0) {
            mergeNeeded = true;
          } else {
            KOJOState.saveSchedule({
              ts: cloudSched.ts,
              shifts: cloudSched.shifts ? cloudSched.shifts.slice() : [],
              rates: cloudSched.rates ? JSON.parse(JSON.stringify(cloudSched.rates)) : {},
              cells: cloudSched.cells ? JSON.parse(JSON.stringify(cloudSched.cells)) : {}
            });
          }
        } else if (localSched && lSchedTs > 0) {
          mergeNeeded = true;
        }
        KOJOState.saveCloudDoc(doc);
        try { KOJOState.cleanOldDates(today); } catch (e) {}
        // Записываем обратно ТОЛЬКО если что-то изменилось локально
        // (иначе лишний запрос и риск обнуления чужих данных).
        if (cloudDirty || mergeNeeded) { pushCloud(finished, doc); } else { finished(); }
      }
    } catch (e) { finished(); }
  });
}

var cloudTimer = null;
var cloudSyncDelayMs = 60000;              // базовый интервал опроса облака
var cloudSyncDelayMinMs = 60000;           // минимум
var cloudSyncDelayMaxMs = 600000;          // максимум (при ошибках/лимитах)

function startCloudSyncPolling() {
  stopCloudSyncPolling();
  if (!KOJOCloud.isConfigured()) return;
  // Адаптивный интервал: при ошибках (в т.ч. HTTP 429 — лимит запросов) замедляемся,
  // при успехе возвращаемся к базовому. Это защищает от упора в лимит JSONBlob.
  var tick = function () {
    if (!isAuthenticated() || !currentUser()) { cloudTimer = setTimeout(tick, cloudSyncDelayMinMs); return; }
    var delay = cloudSyncDelayMs;
    syncAllFromCloud(function () {
      var ls = KOJOCloud.getLastSync();
      if (!ls || ls.ok === true) {
        cloudSyncDelayMs = cloudSyncDelayMinMs;
        delay = cloudSyncDelayMinMs;
      } else {
        var err = String(ls.error || '');
        cloudSyncDelayMs = Math.min(cloudSyncDelayMaxMs, Math.max(cloudSyncDelayMs * 2, cloudSyncDelayMinMs));
        delay = cloudSyncDelayMs;
        if (err.indexOf('429') !== -1 || err.indexOf('лимит') !== -1) {
          showToast('⚠️ Слишком частые запросы к облаку — синхронизация замедлена', 'warning');
        }
      }
      var box = $('section-screen');
      if (box && box.classList.contains('active')) {
        var titleEl = box.querySelector('.screen-title');
        var title = titleEl ? titleEl.textContent : '';
        if (title.indexOf('Контроль') !== -1) renderSection('control');
        if (title.indexOf('График') !== -1) renderSection('schedule');
      }
      cloudTimer = setTimeout(tick, delay);
    });
  };
  cloudTimer = setTimeout(tick, 2000);
}

function stopCloudSyncPolling() {
  if (cloudTimer) {
    clearTimeout(cloudTimer);
    cloudTimer = null;
  }
}

// === НАВИГАЦИЯ ===
function hideAllScreens() {
  var homeEl = $('home-screen');
  var sec = $('section-screen');
  var topic = $('topic-screen');
  if (homeEl) homeEl.classList.add('hidden');
  if (sec) sec.classList.remove('active');
  if (topic) topic.classList.remove('active');
}

function showSection(id) {
  if (!screensExists()) return;
  if (id === 'control' && !isAdmin()) return;
  var sec = null;
  for (var i = 0; i < D.sections.length; i++) {
    if (D.sections[i].id === id) { sec = D.sections[i]; break; }
  }
  if (id !== 'control' && !sec) return;
  hideAllScreens();
  renderSection(id);
  if (id === 'checklists') {
    updateStats();
  }
  if (id === 'control') {
    syncAllFromCloud(function () {
      var box = $('section-screen');
      if (box && box.classList.contains('active') && id === 'control') {
        renderSection('control');
      }
    });
  }
  if (id === 'schedule') {
    syncAllFromCloud(function () {
      var box = $('section-screen');
      if (box && box.classList.contains('active') && id === 'schedule') {
        renderSection('schedule');
      }
    });
  }
  safeScroll();
}

function goHome() {
  if (!screensExists()) return;
  hideAllScreens();
  var homeEl = $('home-screen');
  if (homeEl) homeEl.classList.remove('hidden');
  updateAllMiniProgress();
  updateChecklistsBadge();
  safeScroll();
}

function openTopic(key, parent) {
  if (!screensExists()) return;
  var topic = D.topics[key];
  if (!topic) return;
  hideAllScreens();
  renderTopic(key, parent);
  safeScroll();
}

function goBackToSection(sectionKey) {
  if (!screensExists()) return;
  if (sectionKey === 'home') {
    goHome();
    return;
  }
  showSection(sectionKey);
}

function screensExists() {
  return $('home-screen') && $('section-screen') && $('topic-screen');
}

// === ЧЕК-ЛИСТЫ ===
function getChecklistStats(clId) {
  var topic = topicByClId(clId);
  if (!topic) return { done: 0, total: 0 };
  var total = 0;
  var done = 0;
  var state = KOJOState.getChecklist(clId);
  var idx = 0;
  for (var i = 0; i < topic.items.length; i++) {
    var it = topic.items[i];
    if (it.label) continue;
    total++;
    if (state && state[idx] === true) done++;
    idx++;
  }
  return { done: done, total: total };
}

function updateProgress(clId) {
  var box = $('topic-screen');
  if (!box) return;
  var items = box.querySelectorAll('.checklist-checkbox[data-checklist="' + clId + '"]');
  var checked = box.querySelectorAll('.checklist-checkbox[data-checklist="' + clId + '"]:checked');
  var total = items.length;
  var done = checked.length;

  var progressSpan = $(clId + '-progress');
  var totalSpan = $(clId + '-total');
  var progressBar = $(clId + '-progress-bar');

  if (progressSpan) progressSpan.textContent = done;
  if (totalSpan) totalSpan.textContent = total;
  if (progressBar) {
    progressBar.style.width = total > 0 ? ((done / total) * 100) + '%' : '0%';
  }

  for (var i = 0; i < items.length; i++) {
    var li = items[i].closest('.checklist-item');
    if (li) li.classList.toggle('completed', items[i].checked);
  }

  saveChecklistState(clId);
  updateMiniProgress(clId);
  updateChecklistsBadge();
  updateStats();
  scheduleCloudPush();

  if (done === total && total > 0) {
    showToast('✅ Чек-лист выполнен!', 'success');
  }
}

function saveChecklistState(clId) {
  var box = $('topic-screen');
  if (!box) return;
  var items = box.querySelectorAll('.checklist-checkbox[data-checklist="' + clId + '"]');
  var state = [];
  for (var i = 0; i < items.length; i++) {
    state.push(items[i].checked);
  }
  KOJOState.saveChecklist(clId, state);
}

function resetChecklist(clId) {
  if (!window.confirm('Сбросить все пункты чек-листа?')) return;
  KOJOState.clearChecklist(clId);
  var box = $('topic-screen');
  if (box) {
    var items = box.querySelectorAll('.checklist-checkbox[data-checklist="' + clId + '"]');
    for (var i = 0; i < items.length; i++) {
      items[i].checked = false;
      var li = items[i].closest('.checklist-item');
      if (li) li.classList.remove('completed');
    }
  }
  updateProgress(clId);
  scheduleCloudPush();
  showToast('🔄 Чек-лист сброшен', 'warning');
}

function resetAllChecklists() {
  if (!window.confirm('Сбросить прогресс всех чек-листов за сегодня?')) return;
  for (var i = 0; i < CL_IDS.length; i++) {
    KOJOState.clearChecklist(CL_IDS[i]);
  }
  var box = $('topic-screen');
  if (box) {
    var items = box.querySelectorAll('.checklist-checkbox');
    for (var j = 0; j < items.length; j++) {
      items[j].checked = false;
      var li = items[j].closest('.checklist-item');
      if (li) li.classList.remove('completed');
    }
  }
  for (var k = 0; k < CL_IDS.length; k++) {
    updateProgress(CL_IDS[k]);
  }
  scheduleCloudPush();
  showToast('🔄 Все чек-листы сброшены', 'warning');
}

function updateMiniProgress(clId) {
  var stats = getChecklistStats(clId);
  var mini = $(clId + '-mini');
  if (mini) mini.textContent = stats.done + '/' + stats.total;
}

function updateAllMiniProgress() {
  var quick = D.home.quickChecklists;
  for (var i = 0; i < quick.length; i++) {
    updateMiniProgress(quick[i].cl);
  }
}

function updateChecklistsBadge() {
  var total = 0;
  var done = 0;
  for (var i = 0; i < CL_IDS.length; i++) {
    var s = getChecklistStats(CL_IDS[i]);
    total += s.total;
    done += s.done;
  }
  var badge = $('checklists-badge');
  if (badge) badge.textContent = total > 0 ? Math.round((done / total) * 100) + '%' : '0%';
}

function updateStats() {
  var total = 0;
  var done = 0;
  for (var i = 0; i < CL_IDS.length; i++) {
    var s = getChecklistStats(CL_IDS[i]);
    total += s.total;
    done += s.done;
  }
  var statDone = $('stat-done');
  var statPending = $('stat-pending');
  var statTotal = $('stat-total');
  if (statDone) statDone.textContent = done;
  if (statPending) statPending.textContent = total - done;
  if (statTotal) statTotal.textContent = total;
}

function updateHeaderUserBadge() {
  refreshAvatar();
  updateHeaderAdminButtons();
}

// === ПРОФИЛЬ ===
function notesKeyFor(user) {
  return 'kojo_notes_' + user;
}

function photoKeyFor(user) {
  return 'kojo_photo_' + user;
}

function refreshAvatar() {
  var user = currentUser();
  var photo = user ? KOJOState.getPhoto(user) : '';
  var av = $('header-avatar');
  if (av) {
    if (photo) {
      av.style.backgroundImage = 'url(' + photo + ')';
      av.textContent = '';
    } else {
      av.style.backgroundImage = '';
      av.textContent = user ? user.charAt(0) : '👤';
    }
  }
  var pav = $('profile-avatar');
  if (pav) {
    if (photo) {
      pav.style.backgroundImage = 'url(' + photo + ')';
      pav.textContent = '';
    } else {
      pav.style.backgroundImage = '';
      pav.textContent = user ? user.charAt(0) : '👤';
    }
  }
}

function showProfileModal() {
  var modal = $('profile-modal');
  if (!modal) return;
  var user = currentUser();
  var acc = currentAccount();
  var nameEl = $('profile-name');
  if (nameEl) nameEl.textContent = user || '';
  var roleEl = $('profile-role');
  if (roleEl) roleEl.textContent = acc ? KOJO_ROLE_LABELS[acc.role] : '';
  var meta = $('profile-meta');
  if (meta) meta.textContent = 'Сегодня: ' + kojoToday() + ' · версия ' + APP_VERSION;
  var notesEl = $('profile-notes');
  if (notesEl) notesEl.value = user ? (KOJOState.getNotes(user) || '') : '';
  var savedEl = $('notes-saved');
  if (savedEl) savedEl.classList.remove('visible');
  renderRecipes();
  refreshAvatar();
  updateHeaderAdminButtons();
  modal.classList.add('visible');
}

function closeProfileModal() {
  saveProfileNotes();
  var modal = $('profile-modal');
  if (modal) modal.classList.remove('visible');
}

function saveProfileNotes() {
  var user = currentUser();
  var notesEl = $('profile-notes');
  if (!user || !notesEl) return;
  KOJOState.setNotes(notesEl.value, user);
  var savedEl = $('notes-saved');
  if (savedEl) {
    savedEl.textContent = '💾 Сохранено ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    savedEl.classList.add('visible');
  }
  scheduleCloudPush();
}

// === КНИГА РЕЦЕПТОВ ===
var recipeEditingId = null;

function recipeSortKey(r) { return (r.fav ? '0' : '1') + (r.name || '').toLowerCase(); }

function formatRatio(ratio) {
  var n = parseFloat(ratio);
  if (!n || n <= 0) return '';
  return (Math.round(n * 10) / 10) + '';
}

function renderRecipes() {
  var list = $('recipes-list');
  if (!list) return;
  var user = currentUser();
  var recipes = user ? KOJOState.getRecipes(user) : [];
  if (!recipes.length) {
    list.innerHTML = '<div class="recipe-empty">Пока нет рецептов — добавьте свой, сохранится и синхронизируется через облако.</div>';
    return;
  }
  recipes.sort(function (a, b) {
    var ka = recipeSortKey(a), kb = recipeSortKey(b);
    return ka < kb ? -1 : (ka > kb ? 1 : 0);
  });
  var html = '';
  for (var i = 0; i < recipes.length; i++) {
    var r = recipes[i];
    var parts = [];
    if (r.ratio) parts.push('1:' + formatRatio(r.ratio));
    if (dose > 0) parts.push(dose + ' г');
    if (water > 0) parts.push(water + ' мл');
    if (r.temp) parts.push(r.temp + '°C');
    if (r.time) parts.push(r.time);
    if (r.grind) parts.push(r.grind);
    parts.push(r.method === 'aeropress' ? '☕ Аэропресс' : '🫗 Воронка');
    html += '<div class="recipe-card">';
    html += '<div class="recipe-card-head">';
    html += '<button class="recipe-fav-btn' + (r.fav ? ' on' : '') + '" data-action="toggle-recipe-fav" data-id="' + r.id + '" aria-label="Избранное">' + (r.fav ? '★' : '☆') + '</button>';
    html += '<span class="recipe-card-name">' + (r.name || 'Без названия') + '</span>';
    html += '</div>';
    html += '<div class="recipe-card-meta">' + parts.join(' · ') + '</div>';
    html += '<div class="recipe-card-actions">';
    html += '<button class="recipe-run-btn" data-action="open-brew" data-id="' + r.id + '">⏱ Заварить</button>';
    html += '<button class="recipe-edit-btn" data-action="open-recipe" data-id="' + r.id + '">✏️</button>';
    html += '</div>';
    html += '</div>';
  }
  list.innerHTML = html;
}

function recipeById(recipes, id) { for (var i = 0; i < recipes.length; i++) { if (recipes[i].id === id) return recipes[i]; } return null; }
function recipeGenId() { return 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1000); }

function openRecipeEditor(id) {
  var modal = $('recipe-modal');
  if (!modal) return;
  var user = currentUser();
  var recipes = user ? KOJOState.getRecipes(user) : [];
  var r = id ? recipeById(recipes, id) : null;
  recipeEditingId = id || null;
  var nameEl = $('recipe-name');
  var methodEl = $('recipe-method');
  var doseEl = $('recipe-dose');
  var waterEl = $('recipe-water');
  var ratioEl = $('recipe-ratio');
  var ratioDisp = $('recipe-ratio-display');
  var tempEl = $('recipe-temp');
  var timeEl = $('recipe-time');
  var grindEl = $('recipe-grind');
  var stepsEl = $('recipe-steps');
  var favEl = $('recipe-fav');
  if (r) {
    nameEl.value = r.name || '';
    methodEl.value = r.method || 'v60';
    doseEl.value = r.dose != null ? r.dose : '';
    waterEl.value = r.water != null ? r.water : '';
    ratioEl.value = r.ratio != null ? r.ratio : '';
    tempEl.value = r.temp != null ? r.temp : '';
    timeEl.value = r.time || '';
    grindEl.value = r.grind || '';
    stepsEl.value = r.steps || '';
    favEl.checked = !!r.fav;
  } else {
    methodEl.value = 'aeropress';
    doseEl.value = '16';
    ratioEl.value = '15';
    waterEl.value = '240';
    tempEl.value = '';
    timeEl.value = '';
    grindEl.value = '';
    stepsEl.value = '';
    favEl.checked = false;
    updateRecipeRatioDisplay();
  }
  var title = $('recipe-modal-title');
  if (title) title.textContent = r ? '📖 Рецепт: ' + (r.name || 'без названия') : '📖 Новый рецепт';
  var del = $('recipe-delete-btn');
  if (del) del.style.display = r ? 'inline-block' : 'none';
  modal.classList.add('visible');
}

function closeRecipeModal() {
  var modal = $('recipe-modal');
  if (modal) modal.classList.remove('visible');
  recipeEditingId = null;
}

function recipeVal(el) {
  if (!el) return null;
  var v = String(el.value || '').trim();
  return v === '' ? null : v;
}

function saveRecipeFromForm() {
  var user = currentUser();
  if (!user) { showToast('⚠️ Нет аккаунта', 'warning'); return; }
  var name = recipeVal($('recipe-name'));
  var method = recipeVal($('recipe-method')) || 'v60';
  var dose = parseFloat(String($('recipe-dose').value || '').replace(',', '.'));
  var water = parseFloat(String($('recipe-water').value || '').replace(',', '.'));
  var ratio = parseFloat(String($('recipe-ratio').value || '').replace(',', '.'));
  var temp = parseFloat(String($('recipe-temp').value || '').replace(',', '.'));
  var time = recipeVal($('recipe-time'));
  var grind = recipeVal($('recipe-grind'));
  var steps = recipeVal($('recipe-steps'));
  var fav = $('recipe-fav').checked;
  if (!name) { showToast('Назовите рецепт', 'warning'); return; }
  if (!(dose > 0) && !(water > 0)) { showToast('Укажите дозу или воду', 'warning'); return; }
  if (!(dose > 0)) { dose = +(Math.round(water / (ratio > 0 ? ratio : 15) * 10) / 10); }
  if (!(water > 0)) { water = Math.round(dose * (ratio > 0 ? ratio : 15)); }
  if (!(ratio > 0)) { ratio = +((water / dose).toFixed(1)); }
  var recipes = KOJOState.getRecipes(user);
  if (recipeEditingId) {
    var found = recipeById(recipes, recipeEditingId);
    if (found) {
      found.name = name; found.method = method; found.dose = dose; found.water = water;
      found.ratio = ratio; found.temp = isNaN(temp) ? null : temp; found.time = time;
      found.grind = grind; found.steps = steps; found.fav = fav;
    }
  } else {
    recipes.push({ id: recipeGenId(), name: name, method: method, dose: dose, water: water, ratio: ratio, temp: isNaN(temp) ? null : temp, time: time, grind: grind, steps: steps, fav: fav });
  }
  KOJOState.setRecipes(recipes, user);
  renderRecipes();
  closeRecipeModal();
  scheduleCloudPush();
  showToast('💾 Рецепт сохранён', 'success');
}

function deleteRecipeFromForm() {
  var user = currentUser();
  if (!user || !recipeEditingId) return;
  if (!window.confirm('Удалить рецепт?')) return;
  var list = KOJOState.getRecipes(user).filter(function (r) { return r.id !== recipeEditingId; });
  KOJOState.setRecipes(list, user);
  renderRecipes();
  closeRecipeModal();
  scheduleCloudPush();
  showToast('🗑 Рецепт удалён', 'warning');
}

function toggleRecipeFav(id) {
  var user = currentUser();
  if (!user || !id) return;
  var list = KOJOState.getRecipes(user);
  var r = recipeById(list, id);
  if (r) { r.fav = !r.fav; }
  KOJOState.setRecipes(list, user);
  renderRecipes();
  scheduleCloudPush();
}

function recalcRecipeWater() {
  var dose = parseFloat(String($('recipe-dose').value || '').replace(',', '.'));
  var ratio = parseFloat(String($('recipe-ratio').value || '').replace(',', '.'));
  if (dose > 0 && ratio > 0) {
    $('recipe-water').value = Math.round(dose * ratio);
  }
  updateRecipeRatioDisplay();
}

function recalcRecipeRatio() {
  var dose = parseFloat(String($('recipe-dose').value || '').replace(',', '.'));
  var water = parseFloat(String($('recipe-water').value || '').replace(',', '.'));
  if (dose > 0 && water > 0) {
    $('recipe-ratio').value = +(water / dose).toFixed(1);
  }
  updateRecipeRatioDisplay();
}

function updateRecipeRatioDisplay() {
  var el = $('recipe-ratio-display');
  var ratio = parseFloat(String($('recipe-ratio').value || '').replace(',', '.'));
  if (el) el.textContent = ratio > 0 ? formatRatio(ratio) : '—';
}

// === ТАЙМЕР ЗАВАРИВАНИЯ ===
var brew = { recipe: null, steps: [], idx: -1, running: false, startedAt: 0, elapsed: 0, total: 0, tick: null, manualIdx: -1 };

function formatBrewTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

function parseRecipeTimeMMSS(str) {
  if (!str) return 0;
  var m = String(str).trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (m) return (+m[1]) * 60 + (+m[2]);
  var s = String(str).trim().match(/^(\d{1,4})\s*с(?:ек)?\.?$/i);
  if (s) return +s[1];
  return 0;
}

// Шаги рецепта: каждая строка = шаг. Время шага в конце строки:
// (00:45) или (00:45-01:30) или (45с). Без времени — шаг ждёт кнопки «Следующий».
function parseBrewSteps(recipe) {
  var steps = [];
  var lines = String(recipe.steps || '').split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var start = null;
    var end = null;
    var m = line.match(/\((\d{1,3}):([0-5]\d)(?:-(\d{1,3}):([0-5]\d))?\)/);
    if (m) {
      start = (+m[1]) * 60 + (+m[2]);
      end = m[3] != null ? (+m[3]) * 60 + (+m[4]) : start;
    } else {
      var s = line.match(/\((\d{1,4})\s*с(?:ек)?\.?\s*\)/i);
      if (s) { start = +s[1]; end = start; }
    }
    steps.push({
      text: line.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(),
      start: start,
      end: end
    });
  }
  var cursor = 0;
  for (var j = 0; j < steps.length; j++) {
    var st = steps[j];
    if (st.start == null) {
      st.start = cursor;
      st.auto = false;
    } else {
      cursor = st.start;
      st.auto = true;
    }
    if (st.end == null || st.end < st.start) st.end = st.start;
    cursor = Math.max(cursor, st.end);
  }
  var total = parseRecipeTimeMMSS(recipe.time);
  if (total > 0) {
    if (cursor >= total && steps.length && steps[steps.length - 1].end > 0) total = Math.max(total, steps[steps.length - 1].end);
  } else {
    total = Math.max(cursor, 60);
  }
  return { steps: steps, total: total };
}

function openBrewTimer(id) {
  var user = currentUser();
  if (!user) return;
  var recipes = KOJOState.getRecipes(user);
  var r = recipeById(recipes, id);
  if (!r) { showToast('⚠️ Рецепт не найден', 'warning'); return; }
  brewReset(true);
  brew.recipe = r;
  var parsed = parseBrewSteps(r);
  brew.steps = parsed.steps;
  brew.total = parsed.total;
  brew.idx = -1;
  var title = $('brew-title');
  if (title) title.textContent = '⏱ ' + (r.name || 'Заваривание');
  var totalEl = $('brew-total');
  if (totalEl) totalEl.textContent = formatBrewTime(brew.total);
  renderBrewSteps();
  var modal = $('brew-modal');
  if (modal) modal.classList.add('visible');
}

function renderBrewSteps() {
  var list = $('brew-steps');
  if (!list) return;
  var html = '';
  for (var i = 0; i < brew.steps.length; i++) {
    var st = brew.steps[i];
    var cls = 'brew-step';
    if (brew.idx === -1 || i < brew.idx) cls += ' upcoming';
    if (i === brew.idx) cls += ' active';
    if (i < brew.idx) cls = 'brew-step done';
    html += '<li class="' + cls + '" id="brew-step-' + i + '">';
    html += '<span class="brew-step-text">' + (st.text || '—') + '</span>';
    html += '<span class="brew-step-time">' + formatBrewTime(st.start) + '</span>';
    html += '</li>';
  }
  list.innerHTML = html;
}

function brewBeep(pulses) {
  try {
    var ctx = window.__kojoAudio || (window.__kojoAudio = new (window.AudioContext || window.webkitAudioContext)());
    var t0 = ctx.currentTime;
    for (var i = 0; i < pulses; i++) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.28);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.28 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.28 + 0.16);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0 + i * 0.28);
      osc.stop(t0 + i * 0.28 + 0.18);
    }
  } catch (e) {}
}

function brewVibrate() {
  try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) {}
}

function brewTick() {
  if (!brew.running) return;
  brew.elapsed = (Date.now() - brew.startedAt) / 1000;
  var el = $('brew-elapsed');
  if (el) el.textContent = formatBrewTime(brew.elapsed);
  var bar = $('brew-bar-fill');
  if (bar) bar.style.width = Math.min(100, (brew.elapsed / brew.total) * 100) + '%';
  for (var i = 0; i < brew.steps.length; i++) {
    var st = brew.steps[i];
    if (st.auto && st.start != null && brew.elapsed >= st.start && i > brew.idx) {
      brew.idx = i;
      renderBrewSteps();
      brewBeep(1);
      brewVibrate();
      var cur = $('brew-step-' + i);
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
      showToast('➡️ ' + (st.text || 'Шаг ' + (i + 1)), 'success');
    }
  }
  if (brew.elapsed >= brew.total) {
    finishBrew();
  }
}

function finishBrew() {
  brew.running = false;
  if (brew.tick) { clearInterval(brew.tick); brew.tick = null; }
  brewBeep(3);
  brewVibrate();
  var el = $('brew-elapsed');
  if (el) el.textContent = formatBrewTime(brew.total);
  var btn = $('brew-toggle-btn');
  if (btn) btn.textContent = '▶️ Заново';
  var bar = $('brew-bar-fill');
  if (bar) bar.style.width = '100%';
  showToast('⏱ Заваривание готово!', 'success');
}

function brewToggle() {
  var btn = $('brew-toggle-btn');
  if (!brew.running) {
    if (brew.elapsed >= brew.total) brew.elapsed = 0;
    brew.startedAt = Date.now() - brew.elapsed * 1000;
    brew.running = true;
    if (btn) btn.textContent = '⏸ Пауза';
    if (brew.tick) clearInterval(brew.tick);
    brew.tick = setInterval(brewTick, 250);
    brewBeep(1);
  } else {
    brew.running = false;
    if (brew.tick) { clearInterval(brew.tick); brew.tick = null; }
    if (btn) btn.textContent = '▶️ Продолжить';
  }
}

function brewReset(quiet) {
  brew.running = false;
  if (brew.tick) { clearInterval(brew.tick); brew.tick = null; }
  brew.elapsed = 0;
  brew.idx = -1;
  var el = $('brew-elapsed');
  if (el) el.textContent = formatBrewTime(0);
  var bar = $('brew-bar-fill');
  if (bar) bar.style.width = '0%';
  var btn = $('brew-toggle-btn');
  if (btn) btn.textContent = '▶️ Старт';
  renderBrewSteps();
  if (!quiet) showToast('↺ Таймер сброшен', 'warning');
}

function closeBrewModal() {
  if (brew.running && !window.confirm('Остановить таймер и закрыть?')) return;
  var modal = $('brew-modal');
  if (modal) modal.classList.remove('visible');
  brewReset(true);
}

// === НАПОМИНАНИЯ ===
var REMIND_IDS = ['open', 'close', 'general'];
var REMIND_LABELS = { open: '☀️ Открытие', close: '🌙 Закрытие', general: '🧹 Генеральная уборка' };
var REMIND_ICONS = { open: '☀️', close: '🌙', general: '🧹' };

function remindConfig() {
  var user = currentUser();
  return user ? KOJOState.getReminders(user) : {};
}

function remindDueIds(nowMin) {
  var conf = remindConfig();
  var out = [];
  var now = nowMin != null ? nowMin : new Date().getHours() * 60 + new Date().getMinutes();
  for (var i = 0; i < REMIND_IDS.length; i++) {
    var id = REMIND_IDS[i];
    var item = conf[id];
    if (!item || !item.enabled || !item.time) continue;
    var t = String(item.time).match(/^(\d{1,2}):(\d{2})$/);
    if (!t) continue;
    var mins = (+t[1]) * 60 + (+t[2]);
    if (now >= mins) out.push(id);
  }
  return out;
}

function isRemindedToday(clId) {
  try { return KOJOStore.get('kojo_rem_' + clId + '_' + kojoToday()) === '1'; } catch (e) { return false; }
}

function markRemindedToday(clId) {
  try { KOJOStore.set('kojo_rem_' + clId + '_' + kojoToday(), '1'); } catch (e) {}
}

function notifyReminder(clId) {
  var user = currentUser();
  if (!user) return;
  var p = checklistProgressCount(user, clId);
  if (!(p.total > 0)) return;
  if (p.done >= p.total) return;
  if (isRemindedToday(clId)) return;
  var label = REMIND_LABELS[clId] || clId;
  showToast('⏰ ' + label + ': чек-лист ещё не выполнен', 'warning');
  brewBeep(2);
  brewVibrate();
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('KOJO Guide', { body: label + ' ещё не выполнен. Откройте чек-лист.', icon: 'icons/icon-192.png', tag: 'kojo-remind-' + clId });
    }
  } catch (e) {}
  markRemindedToday(clId);
}

function checkReminders() {
  if (!isAuthenticated() || !currentUser()) return;
  var due = remindDueIds();
  for (var i = 0; i < due.length; i++) notifyReminder(due[i]);
  renderReminderStrip();
}

function reminderStripHtml() {
  var user = currentUser();
  if (!user) return '';
  var due = remindDueIds();
  if (!due.length) return '';
  var html = '<div class="home-reminder">';
  for (var i = 0; i < due.length; i++) {
    var clId = due[i];
    var p = checklistProgressCount(user, clId);
    if (!(p.total > 0) || p.done >= p.total) continue;
    if (isRemindedToday(clId)) continue;
    html += '<button class="home-reminder-btn" data-action="open-checklist" data-checklist="' + clId + '">';
    html += '<span><b>' + REMIND_LABELS[clId] + '</b> — осталось пунктов: ' + (p.total - p.done) + '</span>';
    html += '<span>→</span>';
    html += '</button>';
  }
  html += '</div>';
  return html === '<div class="home-reminder"></div>' ? '' : html;
}

function renderReminderStrip() {
  var homeEl = $('home-screen');
  if (!homeEl) return;
  var strip = reminderStripHtml();
  if (strip) {
    var box = homeEl.querySelector('.home-reminder');
    if (box) { box.outerHTML = strip; return; }
    var hero = homeEl.querySelector('.hero');
    if (hero) hero.insertAdjacentHTML('afterend', strip);
  } else {
    var box2 = homeEl.querySelector('.home-reminder');
    if (box2) box2.remove();
  }
}

function renderRemindModal() {
  var conf = remindConfig();
  for (var i = 0; i < REMIND_IDS.length; i++) {
    var id = REMIND_IDS[i];
    var item = conf[id] || {};
    var timeEl = document.querySelector('.remind-time[data-remind="' + id + '"]');
    var cbEl = document.querySelector('.remind-toggle input[data-remind="' + id + '"]');
    if (timeEl) timeEl.value = item.time || '';
    if (cbEl) cbEl.checked = !!item.enabled;
  }
  var modal = $('remind-modal');
  if (modal) modal.classList.add('visible');
}

function saveRemindersFromForm() {
  var user = currentUser();
  if (!user) return;
  var conf = {};
  for (var i = 0; i < REMIND_IDS.length; i++) {
    var id = REMIND_IDS[i];
    var timeEl = document.querySelector('.remind-time[data-remind="' + id + '"]');
    var cbEl = document.querySelector('.remind-toggle input[data-remind="' + id + '"]');
    conf[id] = { enabled: !!(cbEl && cbEl.checked), time: (timeEl && timeEl.value) || '' };
  }
  KOJOState.setReminders(conf, user);
  var modal = $('remind-modal');
  if (modal) modal.classList.remove('visible');
  checkReminders();
  showToast('🔔 Напоминания сохранены', 'success');
}

function requestNotifyPermission() {
  try {
    if (typeof Notification === 'undefined') {
      showToast('⚠️ Уведомления не поддерживаются этим браузером', 'warning');
      return;
    }
    Notification.requestPermission().then(function (res) {
      if (res === 'granted') showToast('🔔 Уведомления разрешены', 'success');
      else showToast('⚠️ Уведомления не разрешены', 'warning');
    });
  } catch (e) {
    showToast('⚠️ Не удалось запросить доступ к уведомлениям', 'warning');
  }
}

function handlePhotoFile(file) {
  var user = currentUser();
  if (!file || !user) return;
  if (file.size > 4 * 1024 * 1024) {
    showToast('⚠️ Фото слишком большое (до 4 МБ)', 'warning');
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    var img = new Image();
    img.onload = function () {
      var MAX = 256;
      var w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        var k = Math.min(MAX / w, MAX / h);
        w = Math.round(w * k);
        h = Math.round(h * k);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var dataUrl;
      try { dataUrl = canvas.toDataURL('image/jpeg', 0.82); } catch (e) { dataUrl = reader.result; }
      if (dataUrl.length > 220000) {
        try { dataUrl = canvas.toDataURL('image/jpeg', 0.6); } catch (e) {}
      }
      KOJOState.setPhoto(dataUrl, user);
      refreshAvatar();
      showToast('📷 Фото профиля обновлено', 'success');
    };
    img.onerror = function () {
      showToast('⚠️ Не удалось прочитать изображение', 'warning');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function updateHeaderAdminButtons() {
  var cnt = $('btn-control');
  if (cnt) cnt.style.display = isAdmin() ? '' : 'none';
}

function updateHeaderSyncBadge() {
  var badge = $('sync-badge');
  if (!badge) return;
  if (!KOJOCloud.isConfigured()) {
    badge.textContent = '☁️';
    badge.title = 'Синхронизация не настроена';
    return;
  }
  var ls = KOJOCloud.getLastSync();
  if (ls.ok === false) {
    badge.textContent = '⚠️';
    badge.title = 'Ошибка синхронизации: ' + (ls.error || 'неизвестно') + ' (последняя попытка ' + ls.at + ')';
  } else if (ls.ok === true) {
    badge.textContent = '☁️';
    badge.title = 'Синхронизация активна · обновлено в ' + ls.at;
  }
}

function refreshAllViews() {
  try {
    updateAllMiniProgress();
    updateChecklistsBadge();
    updateStats();
    var topic = $('topic-screen');
    if (topic && topic.classList.contains('active')) {
      var visible = topic.querySelector('.checklist-checkbox');
      if (visible) {
        var cl = visible.getAttribute('data-checklist');
        if (cl) {
          var tKey = null;
          for (var k in D.topics) {
            if (D.topics[k].type === 'checklist' && D.topics[k].clId === cl) { tKey = k; break; }
          }
          if (tKey) renderTopic(tKey, 'checklists');
        }
      }
    }
  } catch (e) {}
}

// === ПОИСК ===
var searchableItems = null;

function buildSearchIndex() {
  var arr = [];
  for (var i = 0; i < D.sections.length; i++) {
    var sec = D.sections[i];
    for (var j = 0; j < sec.items.length; j++) {
      var it = sec.items[j];
      arr.push({ id: it.id, icon: it.icon, text: it.title, section: SECTION_LABELS[sec.id] || sec.screenTitle });
    }
  }
  arr.push({ id: 'order-request', icon: '📋', text: 'Написание заявки (расчёт остатков)', section: 'Чек-листы' });
  return arr;
}

function simpleSearch(items, query) {
  var q = query.toLowerCase().trim();
  if (!q) return items;
  var res = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item.text.toLowerCase().indexOf(q) !== -1 || item.section.toLowerCase().indexOf(q) !== -1) {
      res.push(item);
    }
  }
  return res;
}

var selectedSuggestionIndex = -1;

function closeSuggestions() {
  var el = $('search-suggestions');
  if (!el) return;
  el.classList.remove('visible');
  el.innerHTML = '';
  selectedSuggestionIndex = -1;
}

function renderSuggestions(matches) {
  var el = $('search-suggestions');
  if (!el) return;
  if (matches.length === 0) {
    closeSuggestions();
    return;
  }
  var html = '';
  for (var i = 0; i < matches.length; i++) {
    var item = matches[i];
    html += '<div class="suggestion-item" data-index="' + i + '" data-id="' + item.id + '" data-action="navigate-search">';
    html += '<span class="sug-icon">' + item.icon + '</span>';
    html += '<span>' + item.text + '</span>';
    html += '<span class="sug-section">' + item.section + '</span>';
    html += '</div>';
  }
  el.innerHTML = html;
  el.classList.add('visible');
  selectedSuggestionIndex = -1;
}

function navigateToSearchResult(id) {
  if (!searchableItems) searchableItems = buildSearchIndex();
  var item = null;
  for (var i = 0; i < searchableItems.length; i++) {
    if (searchableItems[i].id === id) { item = searchableItems[i]; break; }
  }
  if (!item) return;
  closeSuggestions();

  var sectionMap = { 'Чек-листы': 'checklists', 'Что делать если': 'ifs', 'Важное': 'important', 'История и Философия': 'rules' };
  var sectionKey = sectionMap[item.section] || 'checklists';
  openTopic(id, sectionKey);
}

function clearSearch() {
  var input = $('search');
  var count = $('search-count');
  if (!input || !count) return;
  input.value = '';
  closeSuggestions();
  count.style.display = 'none';
  var links = document.querySelectorAll('.item-link');
  for (var i = 0; i < links.length; i++) {
    links[i].style.display = '';
  }
  input.focus();
}

function onChipClick(key) {
  var chips = document.querySelectorAll('.chip[data-suggest]');
  for (var i = 0; i < chips.length; i++) {
    chips[i].classList.remove('active');
  }
  var activeChip = document.querySelector('.chip[data-suggest="' + key + '"]');
  if (activeChip) activeChip.classList.add('active');
  var map = {
    'open-shift': function () { openTopic('open-coffee-shop', 'checklists'); },
    'close-shift': function () { openTopic('close-coffee-shop', 'checklists'); },
    'steam-wand': function () { openTopic('steam-wand-cleaning', 'checklists'); },
    'va-e1': function () { openTopic('va-e1-cleaning', 'checklists'); },
    'largo': function () { openTopic('largo-cleaning', 'checklists'); },
    'philosophy': function () { openTopic('rules-philosophy', 'rules'); },
    'history': function () { openTopic('rules-history', 'rules'); }
  };
  if (map[key]) map[key]();
  setTimeout(function () { if (activeChip) activeChip.classList.remove('active'); }, 500);
}

// === БЫСТРЫЕ ДЕЙСТВИЯ ===
function quickStartShift() {
  openTopic('open-coffee-shop', 'checklists');
  showToast('🚀 Открываем чек-лист открытия смены', 'info');
}

function quickEndShift() {
  openTopic('close-coffee-shop', 'checklists');
  showToast('🏁 Открываем чек-лист закрытия смены', 'info');
}

function quickChecklist() {
  showSection('checklists');
  showToast('✅ Чек-листы кофейни', 'info');
}

function quickSearch() {
  var input = $('search');
  if (input) input.focus();
  showToast('🔍 Введите запрос для поиска', 'info');
}

function openChecklist(id) {
  var map = {
    'open': 'open-coffee-shop',
    'close': 'close-coffee-shop',
    'general': 'general-cleaning'
  };
  if (map[id]) openTopic(map[id], 'checklists');
}

// === КАЛЬКУЛЯТОР ===
function calcOrder(key, norm) {
  var input = $('stock-' + key);
  if (!input) return;
  var val = parseInt(input.value, 10) || 0;
  var order = Math.max(0, norm - val);
  var out = $('order-' + key);
  if (out) out.textContent = order;
}

function copyOrderToClipboard() {
  var lines = [];
  for (var i = 0; i < D.calc.length; i++) {
    var row = D.calc[i];
    if (row.section) continue;
    var stock = 0;
    var input = $('stock-' + row.key);
    if (input) stock = parseInt(input.value, 10) || 0;
    var order = Math.max(0, row.norm - stock);
    if (order > 0) lines.push(row.short + ': ' + order + ' ' + row.unit);
  }
  if (lines.length === 0) {
    showToast('⚠️ Нет позиций для заказа', 'warning');
    return;
  }
  lines.unshift('📋 Заявка на поставку:');
  var text = lines.join('\n');
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ Заявка скопирована в буфер обмена', 'success');
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  } catch (e) {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  try {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('✅ Заявка скопирована в буфер обмена', 'success');
  } catch (e) {
    showToast('⚠️ Не удалось скопировать', 'error');
  }
}

// === TOAST ===
function showToast(message, type) {
  var container = $('toast-container');
  if (!container) return;
  type = type || '';
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 2500);
}

// === СТАТИСТИКА + ЭКСПОРТ/ИМПОРТ ===
// === СЛУШАТЕЛИ ===
function setupSearchListeners() {
  var input = $('search');
  if (!input) return;
  input.addEventListener('input', function () {
    try {
      var q = input.value.toLowerCase().trim();
      var clearBtn = $('clear-search');
      if (clearBtn) clearBtn.classList.toggle('visible', q.length > 0);

      if (!q) {
        closeSuggestions();
        var count = $('search-count');
        if (count) count.style.display = 'none';
        var links = document.querySelectorAll('.item-link');
        for (var i = 0; i < links.length; i++) links[i].style.display = '';
        return;
      }

      if (!searchableItems) searchableItems = buildSearchIndex();
      var matches = simpleSearch(searchableItems, q);
      var count2 = $('search-count');
      if (count2) {
        count2.textContent = 'Найдено: ' + matches.length + ' из ' + searchableItems.length;
        count2.style.display = 'block';
      }
      renderSuggestions(matches);

      var links2 = document.querySelectorAll('.item-link');
      for (var j = 0; j < links2.length; j++) {
        var text = links2[j].innerText.toLowerCase();
        links2[j].style.display = text.indexOf(q) !== -1 ? '' : 'none';
      }
    } catch (e) { console.error('KOJO search input:', e); }
  });

  input.addEventListener('keydown', function (e) {
    try {
      var el = $('search-suggestions');
      if (!el) return;
      var items = el.querySelectorAll('.suggestion-item');
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, items.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        var id = items[selectedSuggestionIndex].getAttribute('data-id');
        navigateToSearchResult(id);
        return;
      } else {
        return;
      }

      for (var i = 0; i < items.length; i++) {
        if (i === selectedSuggestionIndex) items[i].classList.add('highlighted');
        else items[i].classList.remove('highlighted');
      }
      if (selectedSuggestionIndex >= 0 && items[selectedSuggestionIndex]) {
        try { items[selectedSuggestionIndex].scrollIntoView({ block: 'nearest' }); } catch (e2) {}
      }
    } catch (e) { console.error('KOJO search keydown:', e); }
  });
}

document.addEventListener('click', function (e) {
  try {
    if (!e.target.closest) return;
    if (!e.target.closest('.search')) closeSuggestions();

    var target = e.target.closest('[data-action], [data-open-topic], [data-back], [data-back-topic], .theme-toggle, .chip[data-suggest], .account-chip');
    if (!target) return;

    var action = target.getAttribute('data-action');

    if (target.classList.contains('account-chip')) {
      e.preventDefault();
      var accLogin = target.getAttribute('data-account');
      var selected = $('selected-account');
      if (selected) selected.value = accLogin;
      var loginEl = $('login-user');
      if (loginEl) loginEl.value = accLogin;
      var chips = document.querySelectorAll('.account-chip');
      for (var ci = 0; ci < chips.length; ci++) chips[ci].classList.remove('active');
      target.classList.add('active');
      return;
    }

    if (target.classList.contains('theme-toggle') || action === 'toggle-theme') {
      e.preventDefault();
      toggleTheme();
      return;
    }
    if (action === 'show-stats' || action === 'reset-all' || action === 'close-modal' ||
        action === 'export-progress' || action === 'import-progress') {
      e.preventDefault();
      return;
    }
    if (action === 'show-profile') {
      e.preventDefault();
      showProfileModal();
      return;
    }
    if (action === 'close-profile') {
      e.preventDefault();
      closeProfileModal();
      return;
    }
    if (action === 'show-control') {
      e.preventDefault();
      syncAllFromCloud(function () {
        showSection('control');
      });
      return;
    }
    if (action === 'open-sync-settings') {
      e.preventDefault();
      closeProfileModal();
      showSyncSettingsModal();
      return;
    }
    if (action === 'add-recipe') {
      e.preventDefault();
      openRecipeEditor(null);
      return;
    }
    if (action === 'open-recipe') {
      e.preventDefault();
      openRecipeEditor(target.getAttribute('data-id'));
      return;
    }
    if (action === 'close-recipe') {
      e.preventDefault();
      closeRecipeModal();
      return;
    }
    if (action === 'save-recipe') {
      e.preventDefault();
      saveRecipeFromForm();
      return;
    }
    if (action === 'delete-recipe') {
      e.preventDefault();
      deleteRecipeFromForm();
      return;
    }
    if (action === 'toggle-recipe-fav') {
      e.preventDefault();
      e.stopPropagation();
      toggleRecipeFav(target.getAttribute('data-id'));
      return;
    }
    if (action === 'open-brew') {
      e.preventDefault();
      openBrewTimer(target.getAttribute('data-id'));
      return;
    }
    if (action === 'brew-toggle') {
      e.preventDefault();
      brewToggle();
      return;
    }
    if (action === 'brew-reset') {
      e.preventDefault();
      brewReset(false);
      return;
    }
    if (action === 'show-reminders') {
      e.preventDefault();
      closeProfileModal();
      renderRemindModal();
      return;
    }
    if (action === 'close-reminders') {
      e.preventDefault();
      var rmodal2 = $('remind-modal');
      if (rmodal2) rmodal2.classList.remove('visible');
      return;
    }
    if (action === 'save-reminders') {
      e.preventDefault();
      saveRemindersFromForm();
      return;
    }
    if (action === 'request-notify') {
      e.preventDefault();
      requestNotifyPermission();
      return;
    }
    if (action === 'save-sync-settings') {
      e.preventDefault();
      closeSyncSettingsFromForm();
      return;
    }
    if (action === 'auto-create-bin') {
      e.preventDefault();
      autoCreateBin();
      return;
    }
    if (action === 'test-connection') {
      e.preventDefault();
      runConnectionTest();
      return;
    }
    if (action === 'sync-now') {
      e.preventDefault();
      syncAllFromCloud(function () {
        var box = $('section-screen');
        if (box && box.classList.contains('active') && box.querySelector('.screen-title')) {
          var title = box.querySelector('.screen-title').textContent;
          if (title.indexOf('Контроль') !== -1) renderSection('control');
          if (title.indexOf('График') !== -1) renderScheduleSection(box);
        }
        showToast('🔄 Данные обновлены', 'success');
      });
      return;
    }
    if (action === 'sched-prev' || action === 'sched-next') {
      e.preventDefault();
      var vm = schedGetViewMonth();
      if (action === 'sched-prev') {
        vm.m--;
        if (vm.m < 1) { vm.m = 12; vm.y--; }
      } else {
        vm.m++;
        if (vm.m > 12) { vm.m = 1; vm.y++; }
      }
      var boxS = $('section-screen');
      if (boxS) renderScheduleSection(boxS);
      return;
    }
    if (action === 'sched-pick') {
      e.preventDefault();
      var loginPick = decodeURIComponent(target.getAttribute('data-login') || '');
      var dayPick = target.getAttribute('data-day') || '';
      var pickBox = $('section-screen');
      if (pickBox) {
        var old = pickBox.querySelector('.sched-picker');
        if (old) old.remove();
        var div = document.createElement('div');
        div.className = 'sched-picker';
        div.innerHTML = schedCheckShiftBtn(loginPick, dayPick);
        pickBox.appendChild(div);
      }
      return;
    }
    if (action === 'sched-set') {
      e.preventDefault();
      var lg = decodeURIComponent(target.getAttribute('data-login') || '');
      var dy = target.getAttribute('data-day') || '';
      var shId = target.getAttribute('data-shift') || '';
      schedSetCell(lg, dy, shId);
      var boxT = $('section-screen');
      if (boxT) renderScheduleSection(boxT);
      showToast('✔️ Смена назначена', 'success');
      return;
    }
    if (action === 'sched-clear') {
      e.preventDefault();
      var lgC = decodeURIComponent(target.getAttribute('data-login') || '');
      var dyC = target.getAttribute('data-day') || '';
      schedSetCell(lgC, dyC, null);
      var boxC = $('section-screen');
      if (boxC) renderScheduleSection(boxC);
      return;
    }
    if (action === 'sched-close-pick') {
      e.preventDefault();
      var pb = $('section-screen');
      if (pb) {
        var oldP = pb.querySelector('.sched-picker');
        if (oldP) oldP.remove();
      }
      return;
    }
    if (action === 'sched-add-shift') {
      e.preventDefault();
      schedAddShift();
      return;
    }
    if (action === 'sched-set-rate') {
      e.preventDefault();
      schedSetRate();
      return;
    }
    if (action === 'logout') {
      e.preventDefault();
      logout();
      return;
    }
    if (action === 'quick-start-shift') {
      e.preventDefault();
      quickStartShift();
      return;
    }
    if (action === 'quick-end-shift') {
      e.preventDefault();
      quickEndShift();
      return;
    }
    if (action === 'quick-checklist') {
      e.preventDefault();
      quickChecklist();
      return;
    }
    if (action === 'quick-search') {
      e.preventDefault();
      quickSearch();
      return;
    }
    if (action === 'clear-search') {
      e.preventDefault();
      clearSearch();
      return;
    }
    if (action === 'open-checklist') {
      e.preventDefault();
      openChecklist(target.getAttribute('data-checklist'));
      return;
    }
    if (action === 'scroll-to-sections') {
      e.preventDefault();
      var grid = document.querySelector('.grid');
      if (grid) {
        try { grid.scrollIntoView({ behavior: 'smooth' }); } catch (e3) { grid.scrollIntoView(); }
      }
      return;
    }
    if (action === 'show-section') {
      e.preventDefault();
      showSection(target.getAttribute('data-section'));
      return;
    }
    if (action === 'open-topic' || target.hasAttribute('data-open-topic')) {
      e.preventDefault();
      var topic = target.getAttribute('data-topic') || target.getAttribute('data-open-topic');
      var parent = target.getAttribute('data-parent');
      openTopic(topic, parent);
      return;
    }
    if (target.hasAttribute('data-back')) {
      e.preventDefault();
      goHome();
      return;
    }
    if (target.hasAttribute('data-back-topic')) {
      e.preventDefault();
      goBackToSection(target.getAttribute('data-back-topic'));
      return;
    }
    if (action === 'reset-checklist') {
      e.preventDefault();
      resetChecklist(target.getAttribute('data-checklist'));
      return;
    }
    if (action === 'reset-all') {
      e.preventDefault();
      resetAllChecklists();
      return;
    }
    if (action === 'close-modal') {
      e.preventDefault();
      return;
    }
    if (action === 'close-sync-modal') {
      e.preventDefault();
      closeSyncModal();
      return;
    }
    if (action === 'export-progress' || action === 'import-progress') {
      e.preventDefault();
      return;
    }
    if (action === 'copy-order') {
      e.preventDefault();
      copyOrderToClipboard();
      return;
    }
    if (action === 'link-to-topic') {
      e.preventDefault();
      openTopic(target.getAttribute('data-topic'), target.getAttribute('data-parent'));
      return;
    }
    if (action === 'navigate-search') {
      e.preventDefault();
      var sid = target.getAttribute('data-id');
      if (sid) navigateToSearchResult(sid);
      return;
    }
    if (target.classList.contains('chip') && target.getAttribute('data-suggest')) {
      e.preventDefault();
      onChipClick(target.getAttribute('data-suggest'));
      return;
    }
    if (action === 'install-app') {
      e.preventDefault();
      installPwa();
      return;
    }
    if (action === 'dismiss-install') {
      e.preventDefault();
      hideInstallBanner();
      return;
    }
  } catch (err) {
    console.error('KOJO click handler:', err);
  }
});

document.addEventListener('change', function (e) {
  try {
    if (e.target && e.target.classList && e.target.classList.contains('checklist-checkbox') && e.target.getAttribute('data-checklist')) {
      updateProgress(e.target.getAttribute('data-checklist'));
    }
  } catch (err) { console.error('KOJO change:', err); }
});

document.addEventListener('input', function (e) {
  try {
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-calc')) {
      var key = e.target.getAttribute('data-calc');
      var norm = parseInt(e.target.getAttribute('data-norm'), 10) || 0;
      calcOrder(key, norm);
    }
  } catch (err) { console.error('KOJO input:', err); }
});

document.addEventListener('keydown', function (e) {
  try {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      var inp = $('search');
      if (inp) inp.focus();
    }
    if (e.key === 'Escape') {
      var bmodal = $('brew-modal');
      if (bmodal && bmodal.classList.contains('visible')) {
        closeBrewModal();
        return;
      }
      var rmodal = $('recipe-modal');
      if (rmodal && rmodal.classList.contains('visible')) {
        closeRecipeModal();
        return;
      }
      var emodal = $('remind-modal');
      if (emodal && emodal.classList.contains('visible')) {
        emodal.classList.remove('visible');
        return;
      }
      var pmodal = $('profile-modal');
        if (pmodal && pmodal.classList.contains('visible')) {
          closeProfileModal();
        } else {
          var syncModal = $('sync-modal');
          if (syncModal && syncModal.classList.contains('visible')) {
            closeSyncModal();
          } else if (document.querySelector('.screen.active')) {
            goHome();
          }
        }
      }
  } catch (err) { console.error('KOJO keyboard:', err); }
});

// === PWA ===
var deferredPrompt = null;

function showInstallBanner() {
  var banner = $('install-banner');
  if (banner) banner.classList.add('visible');
}

function hideInstallBanner() {
  var banner = $('install-banner');
  if (banner) banner.classList.remove('visible');
  try { KOJOStore.set('kojo-install-dismissed', '1'); } catch (e) {}
}

function installPwa() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  hideInstallBanner();
}

function registerServiceWorker() {
  try {
    var proto = window.location.protocol;
    var host = window.location.hostname;
    if ((proto === 'https:' || host === 'localhost' || host === '127.0.0.1') && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('KOJO SW register:', err);
      });
    }
  } catch (e) {}
}

function setupInstallBanner() {
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    try {
      if (KOJOStore.get('kojo-install-dismissed') !== '1') showInstallBanner();
    } catch (e2) {}
  });
}

// === ИНИЦИАЛИЗАЦИЯ ===
function initApp() {
  try {
    if (!isAuthenticated() || !currentUser()) {
      showLoginScreen();
      return;
    }
    hideLoginScreen();

    var savedTheme = KOJOState.getTheme();
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'red')) {
      setTheme(savedTheme);
    } else {
      setTheme('light');
    }

    try { KOJOState.cleanOldDates(kojoToday()); } catch (e) {}
    renderHome();
    updateAllMiniProgress();
    updateChecklistsBadge();
    updateStats();
    refreshAvatar();
    updateHeaderAdminButtons();
    scheduleCloudPush();
    syncAllFromCloud(function () {
      renderHome();
      updateAllMiniProgress();
      updateChecklistsBadge();
      updateStats();
      updateHeaderAdminButtons();
    });
    startCloudSyncPolling();

    setupSearchListeners();
    setupInstallBanner();

    var smodal = $('sync-modal');
    if (smodal) {
      smodal.addEventListener('click', function (e) {
        if (e.target === e.currentTarget) closeSyncModal();
      });
    }
    var pmodal = $('profile-modal');
    if (pmodal) {
      pmodal.addEventListener('click', function (e) {
        if (e.target === e.currentTarget) closeProfileModal();
      });
    }
    var photoFile = $('photo-file');
    if (photoFile) {
      photoFile.addEventListener('change', function () {
        if (photoFile.files && photoFile.files.length > 0) {
          handlePhotoFile(photoFile.files[0]);
          photoFile.value = '';
        }
      });
    }
    var notesEl2 = $('profile-notes');
    if (notesEl2) {
      notesEl2.addEventListener('input', function () {
        saveProfileNotes();
      });
    }
    var rmodal = $('recipe-modal');
    if (rmodal) {
      rmodal.addEventListener('click', function (e) {
        if (e.target === e.currentTarget) closeRecipeModal();
      });
    }
    var rdose = $('recipe-dose');
    var rwater = $('recipe-water');
    var rratio = $('recipe-ratio');
    if (rdose) {
      rdose.addEventListener('input', function () { recalcRecipeWater(); recalcRecipeRatio(); });
      rdose.addEventListener('blur', function () { recalcRecipeRatio(); });
    }
    if (rwater) {
      rwater.addEventListener('input', function () { recalcRecipeRatio(); });
    }
    if (rratio) {
      rratio.addEventListener('input', function () { recalcRecipeWater(); });
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && isAuthenticated() && currentUser()) {
        syncAllFromCloud(function () {
          var box = $('section-screen');
          if (box && box.classList.contains('active')) {
            var titleEl = box.querySelector('.screen-title');
            var title = titleEl ? titleEl.textContent : '';
            if (title.indexOf('Контроль') !== -1) renderSection('control');
          }
        });
      }
    });

    registerServiceWorker();

    console.log('💡 KOJO Guide: Используйте Ctrl+K для поиска, Escape для выхода');
  } catch (e) {
    console.error('KOJO init:', e);
  }
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
} catch (e) {
  console.error('KOJO boot:', e);
}

var loginFormEl = $('login-form');
if (loginFormEl) {
  loginFormEl.addEventListener('submit', function (e) {
    e.preventDefault();
    submitLogin();
  });
}