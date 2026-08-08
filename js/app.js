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
var SECTION_LABELS = { checklists: 'Р§РµРє-Р»РёСЃС‚С‹', ifs: 'Р§С‚Рѕ РґРµР»Р°С‚СЊ РµСЃР»Рё', important: 'Р’Р°Р¶РЅРѕРµ', rules: 'РСЃС‚РѕСЂРёСЏ Рё Р¤РёР»РѕСЃРѕС„РёСЏ' };

// === РўР•РљРЈР©РР™ РџРћР›Р¬Р—РћР’РђРўР•Р›Р¬ ===
function currentUser() { return KOJOState.getCurrentUser(); }
function currentAccount() { return kojoAccountByLogin(currentUser()); }
function isAdmin() { var a = currentAccount(); return !!(a && a.role === 'admin'); }

// === Р’РҐРћР” (РІС‹Р±РѕСЂ СѓС‡С‘С‚РЅРѕР№ Р·Р°РїРёСЃРё) ===

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
  var html = '<div class="account-picker-label">Р’С‹Р±РµСЂРё СЃРІРѕР№ Р°РєРєР°СѓРЅС‚</div>';
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
    showToast('рџ”“ Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ, ' + login + '!', 'success');
    return;
  }
  if (errEl) errEl.textContent = 'РќРµРІРµСЂРЅС‹Р№ Р°РєРєР°СѓРЅС‚ РёР»Рё РїР°СЂРѕР»СЊ';
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

var APP_VERSION = 7;

function appVersionMarker() {
  var el = $('app-version-marker');
  if (el) el.textContent = 'v' + APP_VERSION;
}

// === РўР•РњРђ ===
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
    if (btn) btn.textContent = 'вЂпёЏ';
    setMetaTheme('#18181b');
  } else if (theme === 'red') {
    document.body.classList.add('red');
    if (btn) btn.textContent = 'рџЊ‘';
    setMetaTheme('#1a0a0a');
  } else {
    if (btn) btn.textContent = 'рџЊ™';
    setMetaTheme('#ffffff');
  }
  try { KOJOState.setTheme(theme); } catch (e) {}
}

function toggleTheme() {
  var current = getTheme();
  var next = current === 'light' ? 'dark' : current === 'dark' ? 'red' : 'light';
  setTheme(next);
}

// === Р Р•РќР”Р•Р : Р“Р›РђР’РќР«Р™ Р­РљР РђРќ ===
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
  html += '<span class="search-icon">рџ”Ќ</span>';
  html += '<input id="search" placeholder="' + h.searchPlaceholder + '" />';
  html += '<button class="clear-btn" id="clear-search" data-action="clear-search" aria-label="РћС‡РёСЃС‚РёС‚СЊ РїРѕРёСЃРє">вњ•</button>';
  html += '<div class="search-results-count" id="search-count"></div>';
  html += '<div class="search-suggestions" id="search-suggestions"></div>';
  html += '</div>';

  html += '<div class="chips">';
  for (var c = 0; c < h.chips.length; c++) {
    html += '<span class="chip" data-suggest="' + h.chips[c].suggest + '">' + h.chips[c].label + '</span>';
  }
  html += '</div>';
  html += '</section>';

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
  html += '<h2>Р Р°Р·РґРµР»С‹</h2>';
  html += '<span class="see-all" data-action="scroll-to-sections">РІСЃРµ СЂР°Р·РґРµР»С‹ в†’</span>';
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
    html += '<span class="tile-icon">рџ“Љ</span>';
    html += '<p class="tile-title">РљРѕРЅС‚СЂРѕР»СЊ</p>';
    html += '<p class="tile-text">Р§С‚Рѕ Рё РєС‚Рѕ РІС‹РїРѕР»РЅРёР» СЃРµРіРѕРґРЅСЏ РїРѕ РІСЃРµРј Р°РєРєР°СѓРЅС‚Р°Рј.</p>';
    html += '</article>';
  }
  html += '</div>';
  html += '</section>';

  homeEl.innerHTML = html;
}

// === Р Р•РќР”Р•Р : Р РђР—Р”Р•Р› ===
function renderSection(id) {
  var box = $('section-screen');
  if (!box) return;

  if (id === 'control') { renderControlSection(box); box.classList.add('active'); return; }

  var sec = null;
  for (var i = 0; i < D.sections.length; i++) {
    if (D.sections[i].id === id) { sec = D.sections[i]; break; }
  }
  if (!sec) return;

  var html = '';
  html += '<div class="back" data-back>';
  html += '<div class="back-icon">в†ђ</div><span>РќР° РіР»Р°РІРЅС‹Р№ СЌРєСЂР°РЅ</span>';
  html += '</div>';
  html += '<div class="screen-box">';
  html += '<h1 class="screen-title">' + sec.icon + ' ' + sec.screenTitle + '</h1>';
  html += '<p class="screen-sub">' + sec.sub + '</p>';

  if (id === 'checklists') {
    html += '<div class="checklist-stats" id="checklist-stats">';
    html += '<div class="stat-card"><div class="stat-value done" id="stat-done">0</div><div class="stat-label">Р’С‹РїРѕР»РЅРµРЅРѕ</div></div>';
    html += '<div class="stat-card"><div class="stat-value pending" id="stat-pending">0</div><div class="stat-label">РћСЃС‚Р°Р»РѕСЃСЊ</div></div>';
    html += '<div class="stat-card"><div class="stat-value" id="stat-total">0</div><div class="stat-label">Р’СЃРµРіРѕ РїСѓРЅРєС‚РѕРІ</div></div>';
    html += '</div>';
  }

  html += '<div class="list">';
  for (var j = 0; j < sec.items.length; j++) {
    var it = sec.items[j];
    html += '<button class="item-link" data-open-topic="' + it.id + '">';
    html += '<span class="link-icon">' + it.icon + '</span>';
    html += it.title;
    html += '<span class="link-arrow">в†’</span>';
    html += '</button>';
  }
  html += '</div>';
  html += '</div>';

  box.innerHTML = html;
  box.classList.add('active');
}

// === Р Р•РќР”Р•Р : РўР•РњРђ ===
function renderTopic(key, parent) {
  var box = $('topic-screen');
  if (!box) return;
  var topic = D.topics[key];
  if (!topic) return;
  if (!parent) parent = topic.back || 'home';
  var backLabel = 'РќР° РіР»Р°РІРЅС‹Р№ СЌРєСЂР°РЅ';
  for (var i = 0; i < D.sections.length; i++) {
    if (D.sections[i].id === parent) { backLabel = D.sections[i].backLabel; break; }
  }

  var html = '';
  html += '<div class="back" data-back-topic="' + parent + '">';
  html += '<div class="back-icon">в†ђ</div><span>' + backLabel + '</span>';
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
    html += '<button class="reset-btn" data-action="reset-checklist" data-checklist="' + clId + '">вњ• РЎР±СЂРѕСЃРёС‚СЊ</button>';
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
      html += '<span class="calc-note">РЅРѕСЂРјР°: ' + row.norm + ' ' + row.unit + ' в†’ Р·Р°РєР°Р·Р°С‚СЊ: <strong id="order-' + row.key + '">' + row.norm + '</strong></span>';
      html += '</div>';
    }
    html += '</div>';
    html += '<div class="calc-actions">';
    html += '<button class="calc-copy-btn" data-action="copy-order">рџ“‹ РљРѕРїРёСЂРѕРІР°С‚СЊ Р·Р°СЏРІРєСѓ</button>';
    html += '<span class="calc-hint">РЎРєРѕРїРёСЂСѓРµС‚ РІСЃРµ РїРѕР·РёС†РёРё СЃ РєРѕР»РёС‡РµСЃС‚РІРѕРј Рє Р·Р°РєР°Р·Сѓ</span>';
    html += '</div>';
    html += '<p class="calc-footnote">РќРѕСЂРјС‹ СЂР°СЃСЃС‡РёС‚Р°РЅС‹ РЅР° 3 РґРЅСЏ РґРѕ СЃР»РµРґСѓСЋС‰РµР№ РїРѕСЃС‚Р°РІРєРё. РЈС‚РѕС‡РЅРё РЅРѕСЂРјС‹ Сѓ СѓРїСЂР°РІР»СЏСЋС‰РµР№.</p>';
  }

  html += '</div>';

  box.innerHTML = html;
  box.classList.add('active');

  if (topic.type === 'checklist') {
    updateProgress(topic.clId);
  }
}

// === РљРћРќРўР РћР›Р¬ (С‚РѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ) ===
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
  { clId: 'open', icon: 'вЂпёЏ', label: 'РћС‚РєСЂС‹С‚РёРµ' },
  { clId: 'close', icon: 'рџЊ™', label: 'Р—Р°РєСЂС‹С‚РёРµ' },
  { clId: 'general', icon: 'рџ§№', label: 'Р“РµРЅСѓР±РѕСЂРєР°' }
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
  html += '<div class="back-icon">в†ђ</div><span>РќР° РіР»Р°РІРЅС‹Р№ СЌРєСЂР°РЅ</span>';
  html += '</div>';
  html += '<div class="screen-box">';
  html += '<h1 class="screen-title">рџ“Љ РљРѕРЅС‚СЂРѕР»СЊ</h1>';
  html += '<p class="screen-sub">РћС‚РєСЂС‹С‚РёРµ, Р·Р°РєСЂС‹С‚РёРµ Рё РіРµРЅРµСЂР°Р»СЊРЅР°СЏ СѓР±РѕСЂРєР° Р·Р° СЃРµРіРѕРґРЅСЏ (' + today + ') РїРѕ РєР°Р¶РґРѕРјСѓ Р°РєРєР°СѓРЅС‚Сѓ.</p>';

  html += '<div class="control-syncline">';
  html += '<span id="control-sync-status">РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ: вЂ¦</span>';
  html += '<button class="reset-btn" data-action="sync-now">рџ”„ РћР±РЅРѕРІРёС‚СЊ РёР· РѕР±Р»Р°РєР°</button>';
  html += '<button class="reset-btn" data-action="open-sync-settings">вљ™пёЏ РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ</button>';
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
  html += '<span class="muted">РС‚РѕРіРѕ РїРѕ РІСЃРµРј Р°РєРєР°СѓРЅС‚Р°Рј</span>';
  for (var t = 0; t < CONTROL_LEVELS.length; t++) {
    var lvl2 = CONTROL_LEVELS[t];
    var tt = totals[lvl2.clId];
    html += '<span>' + lvl2.icon + ' ' + tt.done + '/' + tt.total + ' (' + (tt.total > 0 ? Math.round((tt.done / tt.total) * 100) : 0) + '%)</span>';
  }
  html += '</div>';

  html += '<p class="screen-sub small">РљР°Р¶РґС‹Р№ РЅРѕРІС‹Р№ РґРµРЅСЊ РїСЂРѕРіСЂРµСЃСЃ РІСЃРµС… Р°РєРєР°СѓРЅС‚РѕРІ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РѕР±РЅСѓР»СЏРµС‚СЃСЏ.</p>';
  html += '</div>';

  box.innerHTML = html;
  box.classList.add('active');
  updateControlStatus();
}

function updateControlStatus() {
  var el = $('control-sync-status');
  if (!el) return;
  if (KOJOCloud.isConfigured()) {
    var ls = KOJOCloud.getLastSync();
    if (ls.ok === true) {
      el.textContent = 'вЃпёЏ РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РІРєР»СЋС‡РµРЅР° В· РѕР±РЅРѕРІР»РµРЅРѕ РІ ' + ls.at;
    } else if (ls.ok === false) {
      el.textContent = 'вЃпёЏ РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РІРєР»СЋС‡РµРЅР° В· РѕС€РёР±РєР°: ' + (ls.error || 'РЅРµРёР·РІРµСЃС‚РЅРѕ');
    } else {
      el.textContent = 'вЃпёЏ РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РІРєР»СЋС‡РµРЅР° В· РѕР¶РёРґР°РЅРёРµ РїРµСЂРІРѕР№ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРёвЂ¦';
    }
  } else {
    el.textContent = 'вљ пёЏ РћР±Р»Р°С‡РЅР°СЏ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РЅРµ РЅР°СЃС‚СЂРѕРµРЅР° вЂ” СЂР°Р±РѕС‚Р°РµС‚ Р»РѕРєР°Р»СЊРЅРѕ РЅР° СЌС‚РѕРј СѓСЃС‚СЂРѕР№СЃС‚РІРµ';
  }
}

function showSyncSettingsModal() {
  var s = KOJOCloud.getSettings();
  var html = '<div style="display:grid;gap:10px;padding:4px 0">';
  html += '<label style="font-size:13px;color:var(--muted)">Bin ID (jsonbin.io)</label>';
  html += '<input type="text" id="sync-bin" class="login-input" value="' + (s.binId || '') + '" placeholder="Р’СЃС‚Р°РІСЊС‚Рµ Bin ID" />';
  html += '<label style="font-size:13px;color:var(--muted)">X-Master-Key</label>';
  html += '<input type="text" id="sync-key" class="login-input" value="' + (s.masterKey || '') + '" placeholder="Р’СЃС‚Р°РІСЊС‚Рµ Master Key" />';
  html += '<button class="login-btn" data-action="save-sync-settings" style="margin-top:4px">РЎРѕС…СЂР°РЅРёС‚СЊ</button>';
  html += '<button class="reset-btn" data-action="auto-create-bin" style="margin-top:8px">вњЁ РЎРѕР·РґР°С‚СЊ Bin Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё (С‚РѕР»СЊРєРѕ Master Key)</button>';
  html += '<button class="reset-btn" data-action="test-connection" style="margin-top:8px">рџ”Њ РџСЂРѕРІРµСЂРєР° СЃРІСЏР·Рё СЃ РѕР±Р»Р°РєРѕРј</button>';
  html += '<p id="sync-test-result" style="font-size:13px;color:var(--muted);margin:0"></p>';
  html += '<p style="font-size:12px;color:var(--muted)">РЎС…РµРјР°: РЅР° РџР•Р Р’РћРњ СѓСЃС‚СЂРѕР№СЃС‚РІРµ РІСЃС‚Р°РІСЊС‚Рµ Master Key (jsonbin.io) Рё РЅР°Р¶РјРёС‚Рµ В«РЎРѕР·РґР°С‚СЊ BinВ» вЂ” РїРѕСЏРІРёС‚СЃСЏ Bin ID. РќР° Р’РЎР•РҐ РѕСЃС‚Р°Р»СЊРЅС‹С… СѓСЃС‚СЂРѕР№СЃС‚РІР°С… РІСЃС‚Р°РІСЊС‚Рµ СЌС‚РѕС‚ Р¶Рµ Bin ID Рё Master Key Рё РЅР°Р¶РјРёС‚Рµ В«РЎРѕС…СЂР°РЅРёС‚СЊВ». Р”Р°РЅРЅС‹Рµ РІСЃРµС… Р°РєРєР°СѓРЅС‚РѕРІ Р±СѓРґСѓС‚ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РѕР±РЅРѕРІР»СЏС‚СЊСЃСЏ РЅР° РІСЃРµС… СѓСЃС‚СЂРѕР№СЃС‚РІР°С… РєР°Р¶РґС‹Рµ 45 СЃРµРєСѓРЅРґ (РїСЂРё РІРєР»СЋС‡С‘РЅРЅРѕРј СЌРєСЂР°РЅРµ).</p>';
  html += '</div>';
  var content = $('sync-modal-content');
  if (content) content.innerHTML = html;
  var modal = $('sync-modal');
  if (modal) modal.classList.add('visible');
}

function closeSyncSettingsFromForm() {
  var bin = $('sync-bin');
  var key = $('sync-key');
  if (!bin || !key) return;
  KOJOCloud.saveSettings(bin.value.trim(), key.value.trim());
  closeSyncModal();
  showToast('вљ™пёЏ РќР°СЃС‚СЂРѕР№РєРё СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё СЃРѕС…СЂР°РЅРµРЅС‹', 'success');
  startCloudSyncPolling();
  syncAllFromCloud(function () {
    var box = $('section-screen');
    if (box && box.classList.contains('active') && box.querySelector('.screen-title')) {
      var title = box.querySelector('.screen-title').textContent;
      if (title.indexOf('РљРѕРЅС‚СЂРѕР»СЊ') !== -1) renderSection('control');
    }
  });
}

function autoCreateBin() {
  var key = $('sync-key');
  if (!key) return;
  var masterKey = key.value.trim();
  if (!masterKey) {
    showToast('вљ пёЏ РЎРЅР°С‡Р°Р»Р° РІСЃС‚Р°РІСЊС‚Рµ X-Master-Key', 'warning');
    return;
  }
  KOJOCloud.saveSettings('', masterKey);
  KOJOCloud.createBin({ date: kojoToday(), users: {} }, function (binId) {
    if (binId) {
      closeSyncModal();
      showToast('вњЁ Bin СЃРѕР·РґР°РЅ Рё РїРѕРґРєР»СЋС‡С‘РЅ!', 'success');
      startCloudSyncPolling();
      syncAllFromCloud(function () {
        var box = $('section-screen');
        if (box && box.classList.contains('active') && box.querySelector('.screen-title')) {
          var title = box.querySelector('.screen-title').textContent;
          if (title.indexOf('РљРѕРЅС‚СЂРѕР»СЊ') !== -1) renderSection('control');
        }
      });
    } else {
      showToast('вљ пёЏ РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ Bin вЂ” РїСЂРѕРІРµСЂСЊС‚Рµ Master Key', 'error');
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
  out.textContent = 'вЏі РџСЂРѕРІРµСЂСЏРµРјвЂ¦';
  var t0 = Date.now();
  KOJOCloud.get(function (doc, err) {
    if (err) { out.textContent = 'вќЊ РћС€РёР±РєР° С‡С‚РµРЅРёСЏ bin: ' + err; return; }
    if (!doc || typeof doc !== 'object') { out.textContent = 'вќЊ Р‘РёРЅ РїСѓСЃС‚ РёР»Рё РЅРµ СЃРѕРґРµСЂР¶РёС‚ РґР°РЅРЅС‹С…'; return; }
    var probe = '__probe__';
    doc.users = doc.users || {};
    doc.users[probe] = ['ok'];
    KOJOCloud.set(doc, function (res, err2) {
      if (err2) { out.textContent = 'вќЊ РћС€РёР±РєР° Р·Р°РїРёСЃРё РІ bin: ' + err2; return; }
      KOJOCloud.get(function (doc2, err3) {
        if (err3 || !doc2 || !doc2.users || !doc2.users[probe]) {
          out.textContent = 'вќЊ Р—Р°РїРёСЃСЊ РЅРµ РїСЂРѕС‡РёС‚Р°Р»Р°СЃСЊ РѕР±СЂР°С‚РЅРѕ' + (err3 ? ' (' + err3 + ')' : '');
          return;
        }
        delete doc2.users[probe];
        KOJOCloud.set(doc2, function (res4, err4) {
          out.textContent = 'вњ… РЎРІСЏР·СЊ СЃ РѕР±Р»Р°РєРѕРј РµСЃС‚СЊ: Р·Р°РїРёСЃСЊ + С‡С‚РµРЅРёРµ Р·Р° ' + (Date.now() - t0) + ' РјСЃ';
        });
      });
    });
  });
}

// === РћР‘Р›РђР§РќРђРЇ РЎРРќРҐР РћРќРР—РђР¦РРЇ ===
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
    for (var i = 0; i < CL_IDS.length; i++) {
      var clId = CL_IDS[i];
      var arr = KOJOState.getChecklist(clId, user);
      if (arr) doc.users[user][clId] = arr;
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
      // РћРЁРР‘РљРђ (СЃРµС‚СЊ/СЃРµСЂРІРµСЂ/С‚Р°Р№РјР°СѓС‚): РќР• РїРёС€РµРј РІ bin РЅРёС‡РµРіРѕ вЂ” С‡СѓР¶РёРµ РґР°РЅРЅС‹Рµ
      // РѕСЃС‚Р°СЋС‚СЃСЏ С†РµР»С‹РјРё. РџСЂРѕСЃС‚Рѕ Р¶РґС‘Рј СЃР»РµРґСѓСЋС‰РµРіРѕ С†РёРєР»Р° РѕРїСЂРѕСЃР°.
      if (err) { finished(); return; }
      var today = kojoToday();
      if (!doc || doc.date !== today || !doc.users) {
        // РќРѕРІС‹Р№ РґРµРЅСЊ РёР»Рё bin РµС‰С‘ РїСѓСЃС‚ вЂ” Р±РµР·РѕРїР°СЃРЅРѕ РЅР°С‡Р°С‚СЊ СЃ С‡РёСЃС‚РѕРіРѕ РґРѕРєСѓРјРµРЅС‚Р°.
        doc = { date: today, users: {} };
        KOJOState.saveCloudDoc(doc);
        KOJOCloud.set(doc, function (res, err2) { finished(); });
      } else {
        // РїРµСЂРµРЅРѕСЃРёРј РѕР±Р»Р°С‡РЅС‹Рµ РґР°РЅРЅС‹Рµ РІ Р»РѕРєР°Р»СЊРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ РґР»СЏ РєР°Р¶РґРѕРіРѕ Р°РєРєР°СѓРЅС‚Р°
        for (var user in doc.users) {
          var u = doc.users[user];
          if (!u) continue;
          for (var clId in u) {
            if (Array.isArray(u[clId])) KOJOState.saveChecklist(clId, u[clId], user);
          }
        }
        KOJOState.saveCloudDoc(doc);
        try { KOJOState.cleanOldDates(today); } catch (e) {}
        // Р—Р°РїРёСЃС‹РІР°РµРј РѕР±СЂР°С‚РЅРѕ РўРћР›Р¬РљРћ РµСЃР»Рё С‡С‚Рѕ-С‚Рѕ РёР·РјРµРЅРёР»РѕСЃСЊ Р»РѕРєР°Р»СЊРЅРѕ
        // (РёРЅР°С‡Рµ Р»РёС€РЅРёР№ Р·Р°РїСЂРѕСЃ Рё СЂРёСЃРє РѕР±РЅСѓР»РµРЅРёСЏ С‡СѓР¶РёС… РґР°РЅРЅС‹С…).
        if (cloudDirty) { pushCloud(finished, doc); } else { finished(); }
      }
    } catch (e) { finished(); }
  });
}

function startCloudSyncPolling() {
  stopCloudSyncPolling();
  if (!KOJOCloud.isConfigured()) return;
  cloudTimer = setInterval(function () {
    try {
      if (!isAuthenticated() || !currentUser()) return;
      syncAllFromCloud(function () {
        var box = $('section-screen');
        if (box && box.classList.contains('active')) {
          var titleEl = box.querySelector('.screen-title');
          var title = titleEl ? titleEl.textContent : '';
          if (title.indexOf('РљРѕРЅС‚СЂРѕР»СЊ') !== -1) renderSection('control');
        }
      });
    } catch (e) {}
  }, 45000);
}

function stopCloudSyncPolling() {
  if (cloudTimer) {
    clearInterval(cloudTimer);
    cloudTimer = null;
  }
}

// === РќРђР’РР“РђР¦РРЇ ===
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

// === Р§Р•Рљ-Р›РРЎРўР« ===
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
    showToast('вњ… Р§РµРє-Р»РёСЃС‚ РІС‹РїРѕР»РЅРµРЅ!', 'success');
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
  if (!window.confirm('РЎР±СЂРѕСЃРёС‚СЊ РІСЃРµ РїСѓРЅРєС‚С‹ С‡РµРє-Р»РёСЃС‚Р°?')) return;
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
  showToast('рџ”„ Р§РµРє-Р»РёСЃС‚ СЃР±СЂРѕС€РµРЅ', 'warning');
}

function resetAllChecklists() {
  if (!window.confirm('РЎР±СЂРѕСЃРёС‚СЊ РІСЃРµ С‡РµРє-Р»РёСЃС‚С‹?')) return;
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
  closeStatsModal();
  scheduleCloudPush();
  showToast('рџ”„ Р’СЃРµ С‡РµРє-Р»РёСЃС‚С‹ СЃР±СЂРѕС€РµРЅС‹', 'warning');
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
  var el = $('current-user-name');
  if (el) el.textContent = currentUser() || '';
  updateHeaderAdminButtons();
}

function updateHeaderAdminButtons() {
  var cnt = $('btn-control');
  if (cnt) cnt.style.display = isAdmin() ? '' : 'none';
}

function updateHeaderSyncBadge() {
  var badge = $('sync-badge');
  if (!badge) return;
  if (!KOJOCloud.isConfigured()) {
    badge.textContent = 'вЃпёЏ';
    badge.title = 'РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РЅРµ РЅР°СЃС‚СЂРѕРµРЅР°';
    return;
  }
  var ls = KOJOCloud.getLastSync();
  if (ls.ok === false) {
    badge.textContent = 'вљ пёЏ';
    badge.title = 'РћС€РёР±РєР° СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё: ' + (ls.error || 'РЅРµРёР·РІРµСЃС‚РЅРѕ') + ' (РїРѕСЃР»РµРґРЅСЏСЏ РїРѕРїС‹С‚РєР° ' + ls.at + ')';
  } else if (ls.ok === true) {
    badge.textContent = 'вЃпёЏ';
    badge.title = 'РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ Р°РєС‚РёРІРЅР° В· РѕР±РЅРѕРІР»РµРЅРѕ РІ ' + ls.at;
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

// === РџРћРРЎРљ ===
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
  arr.push({ id: 'order-request', icon: 'рџ“‹', text: 'РќР°РїРёСЃР°РЅРёРµ Р·Р°СЏРІРєРё (СЂР°СЃС‡С‘С‚ РѕСЃС‚Р°С‚РєРѕРІ)', section: 'Р§РµРє-Р»РёСЃС‚С‹' });
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

  var sectionMap = { 'Р§РµРє-Р»РёСЃС‚С‹': 'checklists', 'Р§С‚Рѕ РґРµР»Р°С‚СЊ РµСЃР»Рё': 'ifs', 'Р’Р°Р¶РЅРѕРµ': 'important', 'РСЃС‚РѕСЂРёСЏ Рё Р¤РёР»РѕСЃРѕС„РёСЏ': 'rules' };
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

// === Р‘Р«РЎРўР Р«Р• Р”Р•Р™РЎРўР’РРЇ ===
function quickStartShift() {
  openTopic('open-coffee-shop', 'checklists');
  showToast('рџљЂ РћС‚РєСЂС‹РІР°РµРј С‡РµРє-Р»РёСЃС‚ РѕС‚РєСЂС‹С‚РёСЏ СЃРјРµРЅС‹', 'info');
}

function quickEndShift() {
  openTopic('close-coffee-shop', 'checklists');
  showToast('рџЏЃ РћС‚РєСЂС‹РІР°РµРј С‡РµРє-Р»РёСЃС‚ Р·Р°РєСЂС‹С‚РёСЏ СЃРјРµРЅС‹', 'info');
}

function quickChecklist() {
  showSection('checklists');
  showToast('вњ… Р§РµРє-Р»РёСЃС‚С‹ РєРѕС„РµР№РЅРё', 'info');
}

function quickSearch() {
  var input = $('search');
  if (input) input.focus();
  showToast('рџ”Ќ Р’РІРµРґРёС‚Рµ Р·Р°РїСЂРѕСЃ РґР»СЏ РїРѕРёСЃРєР°', 'info');
}

function openChecklist(id) {
  var map = {
    'open': 'open-coffee-shop',
    'close': 'close-coffee-shop',
    'general': 'general-cleaning'
  };
  if (map[id]) openTopic(map[id], 'checklists');
}

// === РљРђР›Р¬РљРЈР›РЇРўРћР  ===
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
    showToast('вљ пёЏ РќРµС‚ РїРѕР·РёС†РёР№ РґР»СЏ Р·Р°РєР°Р·Р°', 'warning');
    return;
  }
  lines.unshift('рџ“‹ Р—Р°СЏРІРєР° РЅР° РїРѕСЃС‚Р°РІРєСѓ:');
  var text = lines.join('\n');
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('вњ… Р—Р°СЏРІРєР° СЃРєРѕРїРёСЂРѕРІР°РЅР° РІ Р±СѓС„РµСЂ РѕР±РјРµРЅР°', 'success');
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
    showToast('вњ… Р—Р°СЏРІРєР° СЃРєРѕРїРёСЂРѕРІР°РЅР° РІ Р±СѓС„РµСЂ РѕР±РјРµРЅР°', 'success');
  } catch (e) {
    showToast('вљ пёЏ РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ', 'error');
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

// === РЎРўРђРўРРЎРўРРљРђ + Р­РљРЎРџРћР Рў/РРњРџРћР Рў ===
function showStatsModal() {
  var html = '<div style="display:grid;gap:8px;margin:8px 0 16px">';
  var total = 0;
  var done = 0;
  for (var i = 0; i < CL_IDS.length; i++) {
    var clId = CL_IDS[i];
    var s = getChecklistStats(clId);
    total += s.total;
    done += s.done;
    if (s.total > 0) {
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">';
      html += '<span>' + (D.checklistStatsLabels[clId] || clId) + '</span>';
      html += '<span><strong>' + s.done + '</strong> / ' + s.total + '</span>';
      html += '</div>';
    }
  }
  html += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:16px;border-top:2px solid var(--border)">';
  html += '<span>Р’СЃРµРіРѕ</span><span><strong>' + done + '</strong> / ' + total + '</span>';
  html += '</div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted)">';
  html += '<span>РџСЂРѕРіСЂРµСЃСЃ</span><span>' + (total > 0 ? Math.round((done / total) * 100) : 0) + '%</span>';
  html += '</div>';
  html += '</div>';

  var content = $('stats-content');
  if (content) content.innerHTML = html;

  var modal = $('stats-modal');
  if (modal) modal.classList.add('visible');
}

function closeStatsModal() {
  var el = $('stats-modal');
  if (el) el.classList.remove('visible');
}

function exportProgress() {
  var payload = {
    app: D.appName,
    version: D.version,
    exportedAt: new Date().toISOString(),
    user: currentUser() || '',
    checklists: KOJOState.exportData(CL_IDS).checklists
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'kojo-guide-progress.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
  showToast('в¬‡пёЏ РџСЂРѕРіСЂРµСЃСЃ СЃРѕС…СЂР°РЅС‘РЅ РІ С„Р°Р№Р»', 'success');
}

function importProgressFromFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var payload = JSON.parse(reader.result);
      if (!payload || payload.app !== D.appName) {
        showToast('вљ пёЏ Р­С‚Рѕ РЅРµ С„Р°Р№Р» РїСЂРѕРіСЂРµСЃСЃР° KOJO Guide', 'error');
        return;
      }
      var applied = KOJOState.importData(payload, CL_IDS);
      if (applied.length === 0) {
        showToast('вљ пёЏ Р’ С„Р°Р№Р»Рµ РЅРµС‚ РґР°РЅРЅС‹С… С‡РµРє-Р»РёСЃС‚РѕРІ', 'warning');
        return;
      }
      refreshAllViews();
      scheduleCloudPush();
      showToast('в¬†пёЏ РџСЂРѕРіСЂРµСЃСЃ РёРјРїРѕСЂС‚РёСЂРѕРІР°РЅ (' + applied.length + ' С‡РµРє-Р»РёСЃС‚РѕРІ)', 'success');
    } catch (e) {
      console.error('KOJO import:', e);
      showToast('вљ пёЏ РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р»', 'error');
    }
  };
  reader.onerror = function () {
    showToast('вљ пёЏ РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р»', 'error');
  };
  reader.readAsText(file);
}

// === РЎР›РЈРЁРђРўР•Р›Р ===
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
        count2.textContent = 'РќР°Р№РґРµРЅРѕ: ' + matches.length + ' РёР· ' + searchableItems.length;
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
    if (action === 'show-stats') {
      e.preventDefault();
      showStatsModal();
      return;
    }
    if (action === 'show-control') {
      e.preventDefault();
      showSection('control');
      return;
    }
    if (action === 'open-sync-settings') {
      e.preventDefault();
      showSyncSettingsModal();
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
          if (title.indexOf('РљРѕРЅС‚СЂРѕР»СЊ') !== -1) renderSection('control');
        }
        showToast('рџ”„ Р”Р°РЅРЅС‹Рµ РѕР±РЅРѕРІР»РµРЅС‹', 'success');
      });
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
      closeStatsModal();
      return;
    }
    if (action === 'close-sync-modal') {
      e.preventDefault();
      closeSyncModal();
      return;
    }
    if (action === 'export-progress') {
      e.preventDefault();
      exportProgress();
      return;
    }
    if (action === 'import-progress') {
      e.preventDefault();
      var fileInput = $('import-file');
      if (fileInput) fileInput.click();
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
      var statsModal = $('stats-modal');
      if (statsModal && statsModal.classList.contains('visible')) {
        closeStatsModal();
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

// === РРќРР¦РРђР›РР—РђР¦РРЇ ===
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

    var modal = $('stats-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === e.currentTarget) closeStatsModal();
      });
    }
    var smodal = $('sync-modal');
    if (smodal) {
      smodal.addEventListener('click', function (e) {
        if (e.target === e.currentTarget) closeSyncModal();
      });
    }

    var fileInput = $('import-file');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files.length > 0) {
          importProgressFromFile(fileInput.files[0]);
          fileInput.value = '';
        }
      });
    }

    registerServiceWorker();

    console.log('рџ’Ў KOJO Guide: РСЃРїРѕР»СЊР·СѓР№С‚Рµ Ctrl+K РґР»СЏ РїРѕРёСЃРєР°, Escape РґР»СЏ РІС‹С…РѕРґР°');
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