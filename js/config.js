export const APP_CONFIG = {
  apiBaseUrl: "https://brapi.dev/api",
  apiToken: "",
  requestTimeoutMs: 12000,
  defaultRefreshInterval: 60,
  refreshIntervals: [30, 60, 120],
  maxHistoryItems: 40,
  maxTriggeredHistoryItems: 80
};

export const STORAGE_KEYS = {
  favorites: "b3-monitor:favorites",
  alerts: "b3-monitor:alerts",
  alertHistory: "b3-monitor:alert-history",
  settings: "b3-monitor:settings",
  workspace: "b3-monitor:workspace"
};

export const PERIOD_CONFIG = {
  "1d": { label: "Intraday", range: "1d", interval: "5m" },
  "5d": { label: "5 Dias", range: "5d", interval: "1h" },
  "1mo": { label: "1 Mes", range: "1mo", interval: "1d" },
  "6mo": { label: "6 Meses", range: "6mo", interval: "1d" },
  "1y": { label: "1 Ano", range: "1y", interval: "1wk" }
};
