import { APP_CONFIG, PERIOD_CONFIG } from "./config.js";

const RUNTIME_TOKEN_KEY = "b3-monitor:api-token";
let stockListCache = null;
let stockListPromise = null;

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function getRuntimeToken() {
  const localToken = localStorage.getItem(RUNTIME_TOKEN_KEY) || "";
  return localToken.trim() || APP_CONFIG.apiToken;
}

export function getRuntimeApiToken() {
  return getRuntimeToken();
}

export function setRuntimeApiToken(token) {
  const normalized = String(token || "").trim();

  if (!normalized) {
    localStorage.removeItem(RUNTIME_TOKEN_KEY);
    return;
  }

  localStorage.setItem(RUNTIME_TOKEN_KEY, normalized);
}

function withToken(params = new URLSearchParams()) {
  const token = getRuntimeToken();

  if (token) {
    params.set("token", token);
  }

  return params;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), APP_CONFIG.requestTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Falha na API (${response.status})`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildQuoteUrl(tickers, tokenOverride) {
  const params = new URLSearchParams();

  // tokenOverride undefined => usa token runtime. string vazia => forca sem token.
  if (tokenOverride === undefined) {
    withToken(params);
  } else {
    const token = String(tokenOverride || "").trim();
    if (token) {
      params.set("token", token);
    }
  }

  return `${APP_CONFIG.apiBaseUrl}/quote/${tickers}?${params.toString()}`;
}

function normalizeQuote(item) {
  const toMaybeNumber = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  return {
    ticker: item.symbol || "-",
    name: item.longName || item.shortName || "Sem nome",
    price: toMaybeNumber(item.regularMarketPrice),
    change: toMaybeNumber(item.regularMarketChange),
    changePercent: toMaybeNumber(item.regularMarketChangePercent),
    dayHigh: toMaybeNumber(item.regularMarketDayHigh),
    dayLow: toMaybeNumber(item.regularMarketDayLow),
    volume: toMaybeNumber(item.regularMarketVolume),
    marketTime: item.regularMarketTime || null,
    raw: item
  };
}

export async function getQuotes(tickers) {
  if (!tickers.length) {
    return [];
  }

  const routeTickers = tickers.join(",");

  try {
    const url = buildQuoteUrl(routeTickers);
    const payload = await fetchJson(url);
    const rows = Array.isArray(payload.results) ? payload.results : [];

    if (rows.length) {
      return rows.map(normalizeQuote);
    }
  } catch (error) {
    const isUnauthorized = String(error?.message || "").includes("401");
    if (!isUnauthorized && tickers.length === 1) {
      throw error;
    }
  }

  // Fallback granular para evitar que um ticker bloqueado derrube toda a lista.
  const normalized = [];

  for (const ticker of tickers) {
    try {
      const payload = await fetchJson(buildQuoteUrl(ticker));
      const row = Array.isArray(payload.results) ? payload.results[0] : null;
      if (row) {
        normalized.push(normalizeQuote(row));
        continue;
      }
    } catch (error) {
      const isUnauthorized = String(error?.message || "").includes("401");

      if (isUnauthorized) {
        try {
          const payload = await fetchJson(buildQuoteUrl(ticker, ""));
          const row = Array.isArray(payload.results) ? payload.results[0] : null;
          if (row) {
            normalized.push(normalizeQuote(row));
          }
        } catch {
          // Mantem ticker sem cotacao disponivel; UI exibira placeholder.
        }
      }
    }
  }

  if (!normalized.length) {
    throw new Error("Falha na API (401)");
  }

  return normalized;
}

export async function validateApiToken(token) {
  const candidate = String(token || "").trim();
  if (!candidate) {
    return {
      ok: false,
      message: "Token vazio"
    };
  }

  try {
    const url = buildQuoteUrl("RAIZ4", candidate);
    const payload = await fetchJson(url);
    const rows = Array.isArray(payload.results) ? payload.results : [];

    if (!rows.length) {
      return {
        ok: false,
        message: "Token sem retorno de dados"
      };
    }

    return {
      ok: true,
      message: "Token validado"
    };
  } catch (error) {
    return {
      ok: false,
      message: String(error?.message || "Falha na validacao")
    };
  }
}

async function loadStockList() {
  if (stockListCache) {
    return stockListCache;
  }

  if (stockListPromise) {
    return stockListPromise;
  }

  stockListPromise = (async () => {
    const payload = await fetchJson(`${APP_CONFIG.apiBaseUrl}/quote/list`);
    const stocks = Array.isArray(payload?.stocks) ? payload.stocks : [];

    stockListCache = stocks.map((item) => ({
      ticker: String(item.stock || "").toUpperCase(),
      name: String(item.name || ""),
      price: Number.isFinite(Number(item.close)) ? Number(item.close) : null,
      changePercent: Number.isFinite(Number(item.change)) ? Number(item.change) : null,
      type: String(item.type || "").toLowerCase(),
      logo: String(item.logo || "")
    })).filter((item) => item.ticker);

    return stockListCache;
  })();

  try {
    return await stockListPromise;
  } finally {
    stockListPromise = null;
  }
}

export async function getTickerSuggestions(query, limit = 8) {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  const stocks = await loadStockList();

  const startsWithTicker = [];
  const startsWithName = [];
  const includesName = [];

  for (const stock of stocks) {
    const tickerNormalized = normalizeSearchText(stock.ticker);
    const nameNormalized = normalizeSearchText(stock.name);

    if (tickerNormalized.startsWith(normalizedQuery)) {
      startsWithTicker.push(stock);
      continue;
    }

    if (nameNormalized.startsWith(normalizedQuery)) {
      startsWithName.push(stock);
      continue;
    }

    if (nameNormalized.includes(normalizedQuery)) {
      includesName.push(stock);
    }
  }

  return [...startsWithTicker, ...startsWithName, ...includesName].slice(0, limit);
}

export async function tickerExists(ticker) {
  const normalizedTicker = String(ticker || "").trim().toUpperCase();
  if (!normalizedTicker) {
    return false;
  }

  const stocks = await loadStockList();
  return stocks.some((item) => item.ticker === normalizedTicker);
}

function extractSeries(result) {
  const fromPrimary = Array.isArray(result?.historicalDataPrice) ? result.historicalDataPrice : [];
  const fromNested = Array.isArray(result?.prices) ? result.prices : [];
  const source = fromPrimary.length ? fromPrimary : fromNested;

  if (!source.length) {
    return [];
  }

  return source
    .map((entry) => {
      const ts = Number(entry.date ?? entry.timestamp ?? 0) * 1000;
      const close = Number(entry.close ?? entry.price ?? 0);
      return {
        x: Number.isFinite(ts) && ts > 0 ? new Date(ts) : null,
        y: Number.isFinite(close) ? close : null
      };
    })
    .filter((p) => p.x && p.y !== null);
}

function generateMockSeries(price) {
  const base = Number(price) || 20;
  const now = Date.now();
  const data = [];
  let rolling = base;

  for (let i = 20; i >= 0; i -= 1) {
    const noise = (Math.random() - 0.5) * 0.06;
    rolling = Math.max(0.1, rolling * (1 + noise));
    data.push({ x: new Date(now - i * 24 * 60 * 60 * 1000), y: Number(rolling.toFixed(2)) });
  }

  return data;
}

export async function getHistory(ticker, period, fallbackPrice = 0) {
  const periodConfig = PERIOD_CONFIG[period] || PERIOD_CONFIG["1mo"];
  const params = withToken(new URLSearchParams());
  params.set("range", periodConfig.range);
  params.set("interval", periodConfig.interval);

  const url = `${APP_CONFIG.apiBaseUrl}/quote/${ticker}?${params.toString()}`;

  try {
    const payload = await fetchJson(url);
    const result = Array.isArray(payload.results) ? payload.results[0] : null;
    const series = extractSeries(result);

    if (series.length) {
      return {
        source: "api",
        series
      };
    }

    return {
      source: "mock",
      series: generateMockSeries(fallbackPrice)
    };
  } catch {
    return {
      source: "mock",
      series: generateMockSeries(fallbackPrice)
    };
  }
}
