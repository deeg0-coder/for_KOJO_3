'use strict';

// === НАСТРОЙКИ ОБЛАЧНОЙ СИНХРОНИЗАЦИИ (jsonbin.io) ===
// Зарегистрируйся на https://jsonbin.io (бесплатно), скопируй "X-Master-Key".
// Bin ID и Master Key можно вставить прямо в приложении: раздел «Контроль» → «Синхронизация».
var KOJO_SYNC_DEFAULTS = {
  enabled: true,
  binId: '',
  masterKey: ''
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
    if (!s.binId) s.binId = KOJO_SYNC_DEFAULTS.binId || '';
    if (!s.masterKey) s.masterKey = KOJO_SYNC_DEFAULTS.masterKey || '';
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
