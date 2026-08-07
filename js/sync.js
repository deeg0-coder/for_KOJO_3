'use strict';

// === НАСТРОЙКИ ОБЛАЧНОЙ СИНХРОНИЗАЦИИ (jsonbin.io) ===
// Bin создан заранее; Bin ID и Master Key зашиты, поэтому каждое устройство
// синхронизируется автоматически сразу после входа — настройка не нужна.
var KOJO_SYNC_DEFAULTS = {
  enabled: true,
  binId: '6a75d369da38895dfec61877',
  masterKey: '$2a$10$m2hF9IKYOm4BwwKTjeGXX.pLSVOSiLPwY373P7uklbWhL5ln3P0Su'
};

var KOJOCloud = (function () {
  var BASE = 'https://api.jsonbin.io/v3/b/';
  var SETTINGS_KEY = 'kojo-sync-settings';

  function getSettings() {
    var s = { binId: '', masterKey: '' };
    try {
      var raw = KOJOStore.get(SETTINGS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed) { s.binId = parsed.binId || ''; s.masterKey = parsed.masterKey || ''; }
      }
    } catch (e) {}
    // Вшитые по умолчанию значения всегда приоритетны — единый общий Bin на всех устройствах
    if (KOJO_SYNC_DEFAULTS.binId) s.binId = KOJO_SYNC_DEFAULTS.binId;
    if (KOJO_SYNC_DEFAULTS.masterKey) s.masterKey = KOJO_SYNC_DEFAULTS.masterKey;
    return s;
  }

  function saveSettings(binId, masterKey) {
    try { KOJOStore.set(SETTINGS_KEY, JSON.stringify({ binId: binId, masterKey: masterKey })); } catch (e) {}
  }

  function isConfigured() {
    var s = getSettings();
    return !!(s.binId && s.masterKey);
  }

  function get(cb) {
    var s = getSettings();
    if (!isConfigured()) { cb && cb(null); return; }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE + s.binId + '/latest', true);
    xhr.setRequestHeader('X-Master-Key', s.masterKey);
    xhr.setRequestHeader('X-Bin-Meta', 'false');
    xhr.timeout = 15000;
    xhr.onload = function () {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          var body = JSON.parse(xhr.responseText);
          var record = body && body.record !== undefined ? body.record : body;
          cb && cb(record);
        } else {
          cb && cb(null);
        }
      } catch (e) { cb && cb(null); }
    };
    xhr.onerror = function () { cb && cb(null); };
    xhr.ontimeout = function () { cb && cb(null); };
    xhr.send();
  }

  function set(payload, cb) {
    var s = getSettings();
    if (!isConfigured()) { cb && cb(null); return; }
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', BASE + s.binId, true);
    xhr.setRequestHeader('X-Master-Key', s.masterKey);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Bin-Meta', 'false');
    xhr.timeout = 15000;
    xhr.onload = function () {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          cb && cb(JSON.parse(xhr.responseText));
        } else {
          cb && cb(null);
        }
      } catch (e) { cb && cb(null); }
    };
    xhr.onerror = function () { cb && cb(null); };
    xhr.ontimeout = function () { cb && cb(null); };
    xhr.send(JSON.stringify(payload));
  }

  function createBin(initial, cb) {
    var s = getSettings();
    if (!s.masterKey) { cb && cb(null); return; }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.jsonbin.io/v3/b', true);
    xhr.setRequestHeader('X-Master-Key', s.masterKey);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Bin-Meta', 'false');
    xhr.timeout = 20000;
    xhr.onload = function () {
      try {
        var body = JSON.parse(xhr.responseText);
        if (body && body.metadata && body.metadata.id) {
          saveSettings(body.metadata.id, s.masterKey);
          cb && cb(body.metadata.id);
        } else {
          cb && cb(null);
        }
      } catch (e) { cb && cb(null); }
    };
    xhr.onerror = function () { cb && cb(null); };
    xhr.ontimeout = function () { cb && cb(null); };
    xhr.send(JSON.stringify(initial));
  }

  return {
    getSettings: getSettings,
    saveSettings: saveSettings,
    isConfigured: isConfigured,
    get: get,
    set: set,
    createBin: createBin
  };
})();
