'use strict';
var KOJOStore = (function () {
  var memory = {};
  var available = false;
  try {
    var probe = '__kojo_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    available = true;
  } catch (e) {
    available = false;
  }
  return {
    isAvailable: function () {
      return available;
    },
    get: function (key) {
      try {
        if (available) {
          var v = window.localStorage.getItem(key);
          if (v !== null) return v;
        }
      } catch (e) {}
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    },
    set: function (key, value) {
      memory[key] = String(value);
      try {
        if (available) window.localStorage.setItem(key, String(value));
      } catch (e) {}
    },
    remove: function (key) {
      delete memory[key];
      try {
        if (available) window.localStorage.removeItem(key);
      } catch (e) {}
    }
  };
})();

function kojoToday() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

var KOJOState = (function () {
  var THEME_KEY = 'kojo-theme';
  var AUTH_KEY = 'kojo-auth';
  var USER_KEY = 'kojo-current-user';
  var SYNC_PREFIX = 'kojo-cloud';
  var NOTES_PREFIX = 'kojo_notes_';
  var PHOTO_PREFIX = 'kojo_photo_';
  var RECIPES_PREFIX = 'kojo_recipes_';
  var REMINDERS_PREFIX = 'kojo_reminders_';

  function keyOf(account, clId, date) {
    var d = date || kojoToday();
    return 'checklist_' + d + '_' + account + '_' + clId;
  }

  function syncKey() {
    return SYNC_PREFIX;
  }

  function cleanOldDates(keep) {
    try {
      var remove = [];
      for (var i = 0; i < window.localStorage.length; i++) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf('checklist_') === 0) {
          var datePart = k.split('_')[1];
          if (datePart && datePart !== keep) remove.push(k);
        }
      }
      for (var j = 0; j < remove.length; j++) window.localStorage.removeItem(remove[j]);
    } catch (e) {}
  }

  return {
    getTheme: function () {
      return KOJOStore.get(THEME_KEY);
    },
    setTheme: function (theme) {
      KOJOStore.set(THEME_KEY, theme);
    },
    setAuth: function (value) {
      KOJOStore.set(AUTH_KEY, value ? '1' : '0');
    },
    isAuth: function () {
      return KOJOStore.get(AUTH_KEY) === '1';
    },
    getCurrentUser: function () {
      return KOJOStore.get(USER_KEY);
    },
    setCurrentUser: function (login) {
      KOJOStore.set(USER_KEY, login);
    },
    getChecklist: function (clId, account, date) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      var raw = KOJOStore.get(keyOf(acc, clId, date));
      if (!raw) return null;
      try {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      } catch (e) {}
      return null;
    },
    saveChecklist: function (clId, arr, account, date) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      KOJOStore.set(keyOf(acc, clId, date), JSON.stringify(arr));
    },
    clearChecklist: function (clId, account, date) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      KOJOStore.remove(keyOf(acc, clId, date));
    },
    getCloudDoc: function () {
      var raw = KOJOStore.get(syncKey());
      if (!raw) return null;
      try {
        var obj = JSON.parse(raw);
        if (obj && obj.date && obj.users) return obj;
      } catch (e) {}
      return null;
    },
    saveCloudDoc: function (doc) {
      KOJOStore.set(syncKey(), JSON.stringify(doc));
    },
    cleanOldDates: function (keep) {
      cleanOldDates(keep);
    },
    getNotes: function (account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      return KOJOStore.get(NOTES_PREFIX + acc) || '';
    },
    setNotes: function (text, account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      KOJOStore.set(NOTES_PREFIX + acc, text);
    },
    getPhoto: function (account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      return KOJOStore.get(PHOTO_PREFIX + acc) || '';
    },
    setPhoto: function (dataUrl, account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      KOJOStore.set(PHOTO_PREFIX + acc, dataUrl);
    },
    getRecipes: function (account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      var raw = KOJOStore.get(RECIPES_PREFIX + acc);
      if (!raw) return [];
      try {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      } catch (e) {}
      return [];
    },
    setRecipes: function (arr, account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      KOJOStore.set(RECIPES_PREFIX + acc, JSON.stringify(Array.isArray(arr) ? arr : []));
    },
    getReminders: function (account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      var raw = KOJOStore.get(REMINDERS_PREFIX + acc);
      if (!raw) return {};
      try {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') return obj;
      } catch (e) {}
      return {};
    },
    setReminders: function (obj, account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      KOJOStore.set(REMINDERS_PREFIX + acc, JSON.stringify(obj || {}));
    },
    exportData: function (clIds, account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      var out = { account: acc, date: kojoToday(), checklists: {} };
      for (var i = 0; i < clIds.length; i++) {
        var id = clIds[i];
        out.checklists[id] = KOJOState.getChecklist(id, acc) || [];
      }
      return out;
    },
    importData: function (payload, clIds, account) {
      var acc = account || KOJOState.getCurrentUser() || 'kojo';
      var applied = [];
      for (var i = 0; i < clIds.length; i++) {
        var id = clIds[i];
        if (payload && payload.checklists && Array.isArray(payload.checklists[id])) {
          KOJOState.saveChecklist(id, payload.checklists[id], acc);
          applied.push(id);
        }
      }
      return applied;
    }
  };
})();
