'use strict';

// === НАСТРОЙКИ ОБЛАЧНОЙ СИНХРОНИЗАЦИИ (jsonblob.com) ===
// Бесплатное хранилище без ключей и регистрации: зашитый ID «облака» уже
// создан, каждое устройство автоматически работает с ним. Записи становятся
// видны сразу после PUT — никаких задержек консистентности.
var KOJO_SYNC_DEFAULTS = {
  enabled: true,
  binId: '019fe258-7de6-7a69-9f0d-ad75ff01de5c',
  masterKey: ''
};

var KOJOCloud = (function () {
  var BASE = 'https://jsonblob.com/api/jsonBlob/';
  var SETTINGS_KEY = 'kojo-sync-settings';
  var LOG_KEY = 'kojo-sync-log';
  var lastSync = { ok: null, error: '', at: '' };

  function markSync(ok, error) {
    lastSync.ok = ok;
    lastSync.error = error || '';
    lastSync.at = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  function getLastSync() {
    return lastSync;
  }

  function addLog(ok, msg) {
    try {
      var log = [];
      var raw = KOJOStore.get(LOG_KEY);
      if (raw) { try { log = JSON.parse(raw) || []; } catch (e) { log = []; } }
      log.push({
        t: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ok: !!ok,
        msg: String(msg || '')
      });
      if (log.length > 20) log = log.slice(log.length - 20);
      KOJOStore.set(LOG_KEY, JSON.stringify(log));
    } catch (e) {}
  }

  function getLog() {
    try {
      var raw = KOJOStore.get(LOG_KEY);
      return raw ? (JSON.parse(raw) || []) : [];
    } catch (e) { return []; }
  }

  function clearLog() {
    try { KOJOStore.remove(LOG_KEY); } catch (e) {}
  }

  function getSettings() {
    var s = { binId: '', masterKey: '' };
    try {
      var raw = KOJOStore.get(SETTINGS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.binId) {
          s.binId = parsed.binId;
          s.masterKey = parsed.masterKey || '';
        }
      }
    } catch (e) {}
    // Если пользователь ничего не менял — берём встроенный общий блоб
    if (!s.binId && KOJO_SYNC_DEFAULTS.binId) s.binId = KOJO_SYNC_DEFAULTS.binId;
    if (!s.masterKey && KOJO_SYNC_DEFAULTS.masterKey) s.masterKey = KOJO_SYNC_DEFAULTS.masterKey;
    return s;
  }

  function saveSettings(binId, masterKey) {
    try { KOJOStore.set(SETTINGS_KEY, JSON.stringify({ binId: binId, masterKey: masterKey || '' })); } catch (e) {}
  }

  function isConfigured() {
    return !!(getSettings().binId);
  }

  function get(cb) {
    var s = getSettings();
    if (!s.binId) { cb && cb(null, 'не настроено'); return; }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE + s.binId, true);
    xhr.timeout = 15000;
    xhr.onload = function () {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          var body = JSON.parse(xhr.responseText);
          var record = body && body.record !== undefined ? body.record : body;
          markSync(true, '');
          addLog(true, 'чтение');
          cb && cb(record, null);
        } else {
          markSync(false, 'HTTP ' + xhr.status);
          addLog(false, 'чтение HTTP ' + xhr.status);
          cb && cb(null, 'HTTP ' + xhr.status);
        }
      } catch (e) {
        markSync(false, 'ошибка ответа');
        addLog(false, 'чтение: ошибка ответа');
        cb && cb(null, 'ошибка ответа');
      }
    };
    xhr.onerror = function () { markSync(false, 'сеть недоступна'); addLog(false, 'чтение: сеть недоступна'); cb && cb(null, 'сеть недоступна'); };
    xhr.ontimeout = function () { markSync(false, 'таймаут'); addLog(false, 'чтение: таймаут'); cb && cb(null, 'таймаут'); };
    xhr.send();
  }

  function set(payload, cb) {
    var s = getSettings();
    if (!s.binId) { cb && cb(null, 'не настроено'); return; }
    var finish = function (status, text) {
      if (status >= 200 && status < 300) {
        markSync(true, '');
        addLog(true, 'запись');
        try {
          cb && cb(JSON.parse(text), null);
        } catch (e) { cb && cb({}, null); }
      } else if (status === 404) {
        // Блоб удалён или ещё не создан — создаём новый и пишем в него
        markSync(false, 'облако удалено (404)');
        addLog(false, 'запись: блоб 404 — создаю заново');
        createBin(payload, function (id) {
          if (id) {
            markSync(true, '');
            addLog(true, 'создан новый блоб + запись');
            cb && cb({}, null);
          } else {
            markSync(false, 'не удалось создать блоб');
            addLog(false, 'создание блоба не удалось');
            cb && cb(null, 'не удалось создать блоб');
          }
        });
      } else {
        markSync(false, 'HTTP ' + status);
        addLog(false, 'запись HTTP ' + status);
        cb && cb(null, 'HTTP ' + status);
      }
    };
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', BASE + s.binId, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;
    xhr.onload = function () {
      try { finish(xhr.status, xhr.responseText); } catch (e) { cb && cb(null, 'ошибка ответа'); }
    };
    xhr.onerror = function () { markSync(false, 'сеть недоступна'); addLog(false, 'запись: сеть недоступна'); cb && cb(null, 'сеть недоступна'); };
    xhr.ontimeout = function () { markSync(false, 'таймаут'); addLog(false, 'запись: таймаут'); cb && cb(null, 'таймаут'); };
    xhr.send(JSON.stringify(payload));
  }

  function createBin(initial, cb) {
    var s = getSettings();
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://jsonblob.com/api/jsonBlob', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 20000;
    xhr.onload = function () {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          var loc = xhr.getResponseHeader('Location') || '';
          var parts = loc.split('/');
          var id = parts[parts.length - 1];
          if (id) {
            saveSettings(id, s.masterKey || '');
            addLog(true, 'создан новый блоб: ' + id.slice(0, 8) + '…');
            cb && cb(id);
          } else { addLog(false, 'создание: ID не в ответе'); cb && cb(null); }
        } else { addLog(false, 'создание HTTP ' + xhr.status); cb && cb(null); }
      } catch (e) { addLog(false, 'создание: ошибка'); cb && cb(null); }
    };
    xhr.onerror = function () { addLog(false, 'создание: сеть недоступна'); cb && cb(null); };
    xhr.ontimeout = function () { addLog(false, 'создание: таймаут'); cb && cb(null); };
    xhr.send(JSON.stringify(initial));
  }

  return {
    getSettings: getSettings,
    saveSettings: saveSettings,
    isConfigured: isConfigured,
    get: get,
    set: set,
    createBin: createBin,
    getLastSync: getLastSync,
    getLog: getLog,
    clearLog: clearLog
  };
})();
