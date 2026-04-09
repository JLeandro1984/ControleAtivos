import { STORAGE_KEYS, APP_CONFIG } from "./config.js";

function safeParse(raw, fallbackValue) {
  if (!raw) {
    return fallbackValue;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function defaultSettings() {
  return {
    theme: "dark",
    refreshInterval: APP_CONFIG.defaultRefreshInterval,
    sortBy: "ticker",
    sortDirection: "asc",
    filterAlertedOnly: false,
    favoritesOrderMode: "manual",
    compactMode: false,
    activeWatchlistId: "default"
  };
}

function defaultWorkspace() {
  return {
    watchlists: [
      {
        id: "default",
        name: "Principal",
        favorites: [],
        alerts: [],
        alertHistory: []
      }
    ]
  };
}

function migrateLegacyData() {
  const legacyFavorites = safeParse(localStorage.getItem(STORAGE_KEYS.favorites), []);
  const legacyAlerts = safeParse(localStorage.getItem(STORAGE_KEYS.alerts), []);
  const legacyHistory = safeParse(localStorage.getItem(STORAGE_KEYS.alertHistory), []);
  const settings = {
    ...defaultSettings(),
    ...safeParse(localStorage.getItem(STORAGE_KEYS.settings), {})
  };

  const workspace = {
    watchlists: [
      {
        id: "default",
        name: "Principal",
        favorites: Array.isArray(legacyFavorites) ? legacyFavorites : [],
        alerts: Array.isArray(legacyAlerts) ? legacyAlerts : [],
        alertHistory: Array.isArray(legacyHistory) ? legacyHistory : []
      }
    ]
  };

  return {
    workspace,
    settings
  };
}

export function loadWorkspaceState() {
  const workspace = safeParse(localStorage.getItem(STORAGE_KEYS.workspace), null);
  const settings = {
    ...defaultSettings(),
    ...safeParse(localStorage.getItem(STORAGE_KEYS.settings), {})
  };

  if (workspace && Array.isArray(workspace.watchlists) && workspace.watchlists.length) {
    return {
      workspace,
      settings
    };
  }

  const migrated = migrateLegacyData();
  save(STORAGE_KEYS.workspace, migrated.workspace);
  save(STORAGE_KEYS.settings, migrated.settings);

  return migrated;
}

export function saveWorkspaceState({ workspace, settings }) {
  save(STORAGE_KEYS.workspace, workspace);
  save(STORAGE_KEYS.settings, settings);
}

export function loadFavorites() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.favorites), []);
}

export function saveFavorites(favorites) {
  save(STORAGE_KEYS.favorites, favorites);
}

export function loadAlerts() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.alerts), []);
}

export function saveAlerts(alerts) {
  save(STORAGE_KEYS.alerts, alerts);
}

export function loadAlertHistory() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.alertHistory), []);
}

export function saveAlertHistory(history) {
  save(STORAGE_KEYS.alertHistory, history.slice(0, APP_CONFIG.maxTriggeredHistoryItems));
}

export function loadSettings() {
  return {
    ...defaultSettings(),
    ...safeParse(localStorage.getItem(STORAGE_KEYS.settings), {})
  };
}

export function saveSettings(settings) {
  save(STORAGE_KEYS.settings, settings);
}
