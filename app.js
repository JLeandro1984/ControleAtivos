import { APP_CONFIG } from "./js/config.js";
import { getQuotes, getHistory, setRuntimeApiToken, getRuntimeApiToken, validateApiToken, getTickerSuggestions, tickerExists } from "./js/api.js";
import {
  loadWorkspaceState,
  saveWorkspaceState
} from "./js/storage.js";
import {
  createAlert,
  evaluateAlerts,
  rearmAlert,
  toggleAlertEnabled,
  removeAlert,
  prependHistory,
  findArmedAlertsByTicker,
  requestBrowserNotifications,
  notifyTriggeredAlert,
  getActiveAlertsCount,
  playAlertSound
} from "./js/alerts.js";
import {
  getDomRefs,
  renderQuotesTable,
  renderFavoritesList,
  renderAlertsList,
  renderHistoryList,
  updateAlertTickerOptions,
  setLoading,
  renderSummary,
  renderDataStatus,
  showToast,
  applyTheme,
  applyCompactMode,
  setCompactButtonState,
  renderTokenStatus,
  updateSortDirectionButton,
  renderWatchlistOptions,
  renderTickerSuggestions,
  hideTickerSuggestions,
  openChartModal,
  closeChartModal,
  setChartSubtitle,
  setPeriodActiveButton,
  periodLabel
} from "./js/ui.js";
import { renderChart, chartSummaryHTML } from "./js/charts.js";

const refs = getDomRefs();
const persisted = loadWorkspaceState();

const state = {
  workspace: persisted.workspace,
  settings: persisted.settings,
  quotesByTicker: new Map(),
  tickerSuggestionItems: [],
  tickerSuggestionIndex: -1,
  tickerSuggestionQuery: "",
  apiStatus: "idle",
  lastUpdateAt: null,
  isFetching: false,
  refreshTimer: null,
  selectedChartTicker: null,
  selectedChartPeriod: "1mo"
};

function normalizeTicker(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function resetTickerSuggestionsState() {
  state.tickerSuggestionItems = [];
  state.tickerSuggestionIndex = -1;
  state.tickerSuggestionQuery = "";
  hideTickerSuggestions(refs);
}

function renderTickerSuggestionsState() {
  renderTickerSuggestions(
    refs,
    state.tickerSuggestionItems,
    (selectedTicker) => {
      refs.tickerInput.value = selectedTicker;
      resetTickerSuggestionsState();
      refs.tickerInput.focus();
    },
    state.tickerSuggestionIndex,
    state.tickerSuggestionQuery
  );
}

function ensureSettingsConsistency() {
  if (!APP_CONFIG.refreshIntervals.includes(Number(state.settings.refreshInterval))) {
    state.settings.refreshInterval = APP_CONFIG.defaultRefreshInterval;
  }

  if (!["ticker", "price", "changePercent"].includes(state.settings.sortBy)) {
    state.settings.sortBy = "ticker";
  }

  if (!["asc", "desc"].includes(state.settings.sortDirection)) {
    state.settings.sortDirection = "asc";
  }

  if (!["manual", "alphabetical"].includes(state.settings.favoritesOrderMode)) {
    state.settings.favoritesOrderMode = "manual";
  }

  if (typeof state.settings.compactMode !== "boolean") {
    state.settings.compactMode = false;
  }

  if (!state.settings.activeWatchlistId) {
    state.settings.activeWatchlistId = "default";
  }
}

function ensureWorkspaceConsistency() {
  if (!state.workspace || !Array.isArray(state.workspace.watchlists) || !state.workspace.watchlists.length) {
    state.workspace = {
      watchlists: [{ id: "default", name: "Principal", favorites: [], alerts: [], alertHistory: [] }]
    };
  }

  state.workspace.watchlists = state.workspace.watchlists.map((item, index) => ({
    id: item.id || `list-${index + 1}`,
    name: item.name || `Watchlist ${index + 1}`,
    favorites: Array.isArray(item.favorites) ? item.favorites : [],
    alerts: Array.isArray(item.alerts) ? item.alerts : [],
    alertHistory: Array.isArray(item.alertHistory) ? item.alertHistory : []
  }));

  if (!state.workspace.watchlists.some((w) => w.id === state.settings.activeWatchlistId)) {
    state.settings.activeWatchlistId = state.workspace.watchlists[0].id;
  }
}

function getActiveWatchlist() {
  const watchlist = state.workspace.watchlists.find((w) => w.id === state.settings.activeWatchlistId);
  return watchlist || state.workspace.watchlists[0];
}

function updateActiveWatchlist(updater) {
  const active = getActiveWatchlist();
  state.workspace.watchlists = state.workspace.watchlists.map((watchlist) => {
    if (watchlist.id !== active.id) {
      return watchlist;
    }

    return updater({ ...watchlist });
  });
}

function getOrderedFavorites() {
  const list = [...getActiveWatchlist().favorites];
  if (state.settings.favoritesOrderMode === "alphabetical") {
    return list.sort((a, b) => a.localeCompare(b));
  }
  return list;
}

function getVisibleQuotes() {
  const tickers = getOrderedFavorites();
  let list = tickers
    .map((ticker) => state.quotesByTicker.get(ticker) || createUnavailableQuote(ticker))
    .filter(Boolean);

  const armedByTicker = findArmedAlertsByTicker(getActiveWatchlist().alerts);

  if (state.settings.filterAlertedOnly) {
    list = list.filter((q) => (armedByTicker.get(q.ticker) || []).length > 0);
  }

  const factor = state.settings.sortDirection === "asc" ? 1 : -1;
  const key = state.settings.sortBy;

  list.sort((a, b) => {
    if (a.isPlaceholder && !b.isPlaceholder) {
      return 1;
    }

    if (!a.isPlaceholder && b.isPlaceholder) {
      return -1;
    }

    if (key === "ticker") {
      return a.ticker.localeCompare(b.ticker) * factor;
    }

    if (key === "price") {
      return (a.price - b.price) * factor;
    }

    return (a.changePercent - b.changePercent) * factor;
  });

  return list;
}

function createUnavailableQuote(ticker) {
  return {
    ticker,
    name: "Cotacao indisponivel",
    price: null,
    change: null,
    changePercent: null,
    dayHigh: null,
    dayLow: null,
    volume: null,
    marketTime: null,
    isPlaceholder: true
  };
}

function getMarketHighlight(quotes) {
  const marketQuotes = quotes.filter((quote) => !quote.isPlaceholder && Number.isFinite(quote.changePercent));

  if (!marketQuotes.length) {
    return {
      text: "Sem dados",
      best: null,
      worst: null
    };
  }

  let best = marketQuotes[0];
  let worst = marketQuotes[0];

  marketQuotes.forEach((q) => {
    if (q.changePercent > best.changePercent) {
      best = q;
    }
    if (q.changePercent < worst.changePercent) {
      worst = q;
    }
  });

  const text = `Alta ${best.ticker} (${best.changePercent.toFixed(2)}%) | Baixa ${worst.ticker} (${worst.changePercent.toFixed(2)}%)`;

  return {
    text,
    best,
    worst
  };
}

function persistState() {
  saveWorkspaceState({
    workspace: state.workspace,
    settings: state.settings
  });
}

function rerenderAll() {
  const activeWatchlist = getActiveWatchlist();
  const orderedFavorites = getOrderedFavorites();
  const armedByTicker = findArmedAlertsByTicker(activeWatchlist.alerts);
  const visibleQuotes = getVisibleQuotes();
  const market = getMarketHighlight(visibleQuotes.length ? visibleQuotes : Array.from(state.quotesByTicker.values()));

  renderWatchlistOptions(refs, state.workspace.watchlists, activeWatchlist.id);

  renderQuotesTable({
    quotes: visibleQuotes,
    alertsByTicker: armedByTicker,
    refs,
    onOpenChart: handleOpenChart,
    onRemoveFavorite: handleRemoveFavorite,
    best: market.best,
    worst: market.worst
  });

  renderFavoritesList({
    favorites: orderedFavorites,
    refs,
    orderMode: state.settings.favoritesOrderMode,
    onRemove: handleRemoveFavorite,
    onMoveUp: moveFavoriteUp,
    onMoveDown: moveFavoriteDown
  });

  renderAlertsList({
    alerts: activeWatchlist.alerts,
    refs,
    onToggleEnabled: handleToggleAlertEnabled,
    onRearm: handleRearmAlert,
    onDelete: handleDeleteAlert
  });

  renderHistoryList({
    history: activeWatchlist.alertHistory,
    refs
  });

  updateAlertTickerOptions(refs, orderedFavorites, refs.alertTicker.value);

  renderSummary({
    refs,
    favoritesCount: activeWatchlist.favorites.length,
    activeAlertsCount: getActiveAlertsCount(activeWatchlist.alerts),
    lastUpdate: state.lastUpdateAt,
    highlightText: `${activeWatchlist.name} | ${market.text}`
  });

  renderDataStatus(refs, state.apiStatus);
}

function restartAutoRefresh() {
  if (state.refreshTimer) {
    window.clearInterval(state.refreshTimer);
  }

  state.refreshTimer = window.setInterval(() => {
    void refreshQuotes();
  }, Number(state.settings.refreshInterval) * 1000);
}

async function refreshQuotes({ silent = false } = {}) {
  if (state.isFetching) {
    return;
  }

  const activeWatchlist = getActiveWatchlist();
  if (!activeWatchlist.favorites.length) {
    state.quotesByTicker.clear();
    state.apiStatus = "idle";
    state.lastUpdateAt = Date.now();
    rerenderAll();
    return;
  }

  state.isFetching = true;
  if (!silent) {
    setLoading(refs, true);
  }

  try {
    const quotes = await getQuotes(activeWatchlist.favorites);
    state.quotesByTicker = new Map(quotes.map((q) => [q.ticker, q]));
    state.apiStatus = "ok";
    state.lastUpdateAt = Date.now();

    const evaluation = evaluateAlerts(activeWatchlist.alerts, state.quotesByTicker);

    updateActiveWatchlist((watchlist) => ({
      ...watchlist,
      alerts: evaluation.nextAlerts,
      alertHistory: evaluation.fired.length
        ? prependHistory(watchlist.alertHistory, evaluation.fired)
        : watchlist.alertHistory
    }));

    const nextWatchlist = getActiveWatchlist();

    if (evaluation.fired.length) {
      evaluation.fired.forEach((item) => {
        notifyTriggeredAlert(item);

        const sourceAlert = nextWatchlist.alerts.find((a) => a.id === item.alertId);
        if (sourceAlert?.soundEnabled) {
          playAlertSound();
        }

        showToast(refs, `Alerta disparado: ${item.ticker}`, `Preco atual ${item.triggeredPrice.toFixed(2)}`);
      });
    }

    persistState();
    rerenderAll();
  } catch (error) {
    const message = String(error?.message || "");
    const isUnauthorized = message.includes("401");
    state.apiStatus = isUnauthorized ? "unauthorized" : "error";
    rerenderAll();

    showToast(
      refs,
      isUnauthorized ? "API requer token" : "Erro ao atualizar",
      isUnauthorized
        ? "A brapi retornou 401 para este ticker/plano. Configure apiToken em js/config.js para obter cotacoes reais."
        : "Nao foi possivel obter dados da API. Mantendo os ultimos valores validos em tela."
    );
    console.error(error);
  } finally {
    state.isFetching = false;
    setLoading(refs, false);
  }
}

async function handleAddFavorite(event) {
  event.preventDefault();
  const ticker = normalizeTicker(refs.tickerInput.value);

  if (!ticker) {
    showToast(refs, "Ticker invalido", "Digite um ticker valido para adicionar.");
    return;
  }

  const activeWatchlist = getActiveWatchlist();

  if (activeWatchlist.favorites.includes(ticker)) {
    showToast(refs, "Ja existe", `${ticker} ja esta nos favoritos.`);
    return;
  }

  let exists;
  try {
    exists = await tickerExists(ticker);
  } catch {
    showToast(refs, "Falha na validacao", "Nao foi possivel validar o ticker agora. Verifique sua conexao e tente novamente.");
    return;
  }

  if (!exists) {
    showToast(refs, "Ativo nao encontrado", `${ticker} nao existe na lista de ativos disponiveis.`);
    return;
  }

  updateActiveWatchlist((watchlist) => ({
    ...watchlist,
    favorites: [...watchlist.favorites, ticker]
  }));
  refs.tickerInput.value = "";
  resetTickerSuggestionsState();
  persistState();
  rerenderAll();
  showToast(refs, "Favorito adicionado", `${ticker} entrou no monitoramento.`);
  void refreshQuotes();
}

const updateTickerSuggestions = debounce(async () => {
  const query = normalizeTicker(refs.tickerInput.value);

  if (query.length < 2) {
    resetTickerSuggestionsState();
    return;
  }

  try {
    const suggestions = await getTickerSuggestions(query, 8);

    // Evita aplicar sugestoes antigas se o usuario continuou digitando.
    if (normalizeTicker(refs.tickerInput.value) !== query) {
      return;
    }

    state.tickerSuggestionItems = suggestions;
    state.tickerSuggestionIndex = -1;
    state.tickerSuggestionQuery = query;
    renderTickerSuggestionsState();
  } catch {
    resetTickerSuggestionsState();
  }
}, 220);

function handleRemoveFavorite(ticker) {
  updateActiveWatchlist((watchlist) => ({
    ...watchlist,
    favorites: watchlist.favorites.filter((t) => t !== ticker),
    alerts: watchlist.alerts.filter((a) => a.ticker !== ticker)
  }));
  state.quotesByTicker.delete(ticker);
  persistState();
  rerenderAll();
  showToast(refs, "Favorito removido", `${ticker} foi removido.`);
}

function moveFavoriteUp(index) {
  const current = getActiveWatchlist().favorites;
  if (index <= 0 || index >= current.length) {
    return;
  }

  const nextFavorites = [...current];
  [nextFavorites[index - 1], nextFavorites[index]] = [nextFavorites[index], nextFavorites[index - 1]];

  updateActiveWatchlist((watchlist) => ({
    ...watchlist,
    favorites: nextFavorites
  }));
  persistState();
  rerenderAll();
}

function moveFavoriteDown(index) {
  const current = getActiveWatchlist().favorites;
  if (index < 0 || index >= current.length - 1) {
    return;
  }

  const nextFavorites = [...current];
  [nextFavorites[index], nextFavorites[index + 1]] = [nextFavorites[index + 1], nextFavorites[index]];

  updateActiveWatchlist((watchlist) => ({
    ...watchlist,
    favorites: nextFavorites
  }));
  persistState();
  rerenderAll();
}

function handleCreateAlert(event) {
  event.preventDefault();

  const ticker = normalizeTicker(refs.alertTicker.value);
  const type = refs.alertType.value;
  const targetPrice = Number(refs.alertPrice.value);
  const soundEnabled = refs.alertSound.checked;

  if (!ticker || !Number.isFinite(targetPrice) || targetPrice <= 0) {
    showToast(refs, "Alerta invalido", "Preencha ticker e valor alvo corretamente.");
    return;
  }

  const alert = createAlert({
    ticker,
    type,
    targetPrice,
    soundEnabled
  });

  updateActiveWatchlist((watchlist) => ({
    ...watchlist,
    alerts: [alert, ...watchlist.alerts]
  }));
  refs.alertPrice.value = "";
  persistState();
  rerenderAll();
  showToast(refs, "Alerta criado", `${ticker} sera monitorado a partir de agora.`);
}

function handleToggleAlertEnabled(id) {
  updateActiveWatchlist((watchlist) => ({
    ...watchlist,
    alerts: toggleAlertEnabled(watchlist.alerts, id)
  }));
  persistState();
  rerenderAll();
}

function handleRearmAlert(id) {
  updateActiveWatchlist((watchlist) => ({
    ...watchlist,
    alerts: rearmAlert(watchlist.alerts, id)
  }));
  persistState();
  rerenderAll();
}

function handleDeleteAlert(id) {
  updateActiveWatchlist((watchlist) => ({
    ...watchlist,
    alerts: removeAlert(watchlist.alerts, id)
  }));
  persistState();
  rerenderAll();
}

async function handleSaveToken() {
  const token = String(refs.apiTokenInput.value || "").trim();
  if (!token) {
    showToast(refs, "Token invalido", "Informe um token valido para consultar cotacoes reais.");
    return;
  }

  refs.tokenSaveBtn.disabled = true;
  const previousLabel = refs.tokenSaveBtn.textContent;
  refs.tokenSaveBtn.textContent = "Validando...";

  const validation = await validateApiToken(token);

  refs.tokenSaveBtn.disabled = false;
  refs.tokenSaveBtn.textContent = previousLabel;

  if (!validation.ok) {
    renderTokenStatus(refs, "", "Falha na validacao do token.");
    showToast(refs, "Token invalido", "Nao foi possivel validar seu token. Confira e tente novamente.");
    return;
  }

  setRuntimeApiToken(token);
  renderTokenStatus(refs, token, "Token validado e salvo localmente.");
  state.apiStatus = "idle";
  rerenderAll();
  showToast(refs, "Token salvo", "Token configurado localmente. Atualizando cotacoes...");
  void refreshQuotes();
}

function handleClearToken() {
  setRuntimeApiToken("");
  refs.apiTokenInput.value = "";
  refs.apiTokenInput.type = "password";
  refs.tokenVisibilityBtn.textContent = "Mostrar";
  renderTokenStatus(refs, "");
  state.apiStatus = "idle";
  rerenderAll();
  showToast(refs, "Token removido", "Token local removido. Alguns tickers podem exigir autenticacao.");
  void refreshQuotes();
}

function focusTokenInput() {
  refs.apiTokenInput.focus();
  refs.apiTokenInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function handleAddWatchlist() {
  const name = window.prompt("Nome da nova watchlist:", "Nova watchlist");
  if (!name) {
    return;
  }

  const watchlist = {
    id: crypto.randomUUID(),
    name: name.trim() || "Nova watchlist",
    favorites: [],
    alerts: [],
    alertHistory: []
  };

  state.workspace.watchlists = [...state.workspace.watchlists, watchlist];
  state.settings.activeWatchlistId = watchlist.id;
  state.quotesByTicker.clear();
  persistState();
  rerenderAll();
  void refreshQuotes();
}

function handleRemoveWatchlist() {
  if (state.workspace.watchlists.length <= 1) {
    showToast(refs, "Operacao bloqueada", "Mantenha ao menos uma watchlist ativa.");
    return;
  }

  const active = getActiveWatchlist();
  const confirmed = window.confirm(`Excluir watchlist ${active.name}?`);
  if (!confirmed) {
    return;
  }

  state.workspace.watchlists = state.workspace.watchlists.filter((w) => w.id !== active.id);
  state.settings.activeWatchlistId = state.workspace.watchlists[0].id;
  state.quotesByTicker.clear();
  persistState();
  rerenderAll();
  void refreshQuotes();
}

function exportWorkspaceSnapshot() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace: state.workspace,
    settings: state.settings
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `b3-monitor-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast(refs, "Backup exportado", "Arquivo JSON gerado com sucesso.");
}

async function importWorkspaceSnapshot(file) {
  if (!file) {
    return;
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);

    if (!parsed.workspace || !Array.isArray(parsed.workspace.watchlists)) {
      throw new Error("Estrutura invalida");
    }

    state.workspace = parsed.workspace;
    state.settings = {
      ...state.settings,
      ...(parsed.settings || {})
    };

    ensureSettingsConsistency();
    ensureWorkspaceConsistency();
    applyTheme(state.settings.theme);
    applyCompactMode(state.settings.compactMode);
    setCompactButtonState(refs, state.settings.compactMode);

    state.quotesByTicker.clear();
    persistState();
    syncControls();
    rerenderAll();
    await refreshQuotes();
    showToast(refs, "Backup importado", "Dados restaurados com sucesso.");
  } catch {
    showToast(refs, "Falha na importacao", "Arquivo invalido ou corrompido.");
  }
}

async function handleOpenChart(ticker) {
  state.selectedChartTicker = ticker;
  state.selectedChartPeriod = "1mo";
  openChartModal(refs, ticker);
  await loadChartData();
}

async function loadChartData() {
  const ticker = state.selectedChartTicker;

  if (!ticker) {
    return;
  }

  const quote = state.quotesByTicker.get(ticker) || {
    ticker,
    price: 0,
    changePercent: 0
  };

  setPeriodActiveButton(refs, state.selectedChartPeriod);
  setChartSubtitle(refs, `Carregando periodo ${periodLabel(state.selectedChartPeriod)}...`);

  const history = await getHistory(ticker, state.selectedChartPeriod, quote.price);
  const periodText = periodLabel(state.selectedChartPeriod);

  renderChart({
    canvas: refs.chartCanvas,
    ticker,
    series: history.series,
    periodLabel: periodText,
    theme: state.settings.theme
  });

  setChartSubtitle(refs, `${ticker} | ${periodText}`);
  refs.chartSummary.innerHTML = chartSummaryHTML({
    quote,
    source: history.source,
    periodLabel: periodText,
    points: history.series.length
  });
}

function bindEvents() {
  refs.tickerForm.addEventListener("submit", handleAddFavorite);
  refs.tickerInput.addEventListener("input", () => {
    refs.tickerInput.value = normalizeTicker(refs.tickerInput.value);
    void updateTickerSuggestions();
  });
  refs.tickerInput.addEventListener("keydown", (event) => {
    const hasSuggestions = state.tickerSuggestionItems.length > 0;

    if (event.key === "ArrowDown" && hasSuggestions) {
      event.preventDefault();
      state.tickerSuggestionIndex = Math.min(
        state.tickerSuggestionIndex + 1,
        state.tickerSuggestionItems.length - 1
      );
      renderTickerSuggestionsState();
      return;
    }

    if (event.key === "ArrowUp" && hasSuggestions) {
      event.preventDefault();
      state.tickerSuggestionIndex = Math.max(state.tickerSuggestionIndex - 1, 0);
      renderTickerSuggestionsState();
      return;
    }

    if (event.key === "Enter" && hasSuggestions && state.tickerSuggestionIndex >= 0) {
      event.preventDefault();
      const selected = state.tickerSuggestionItems[state.tickerSuggestionIndex];
      if (selected) {
        refs.tickerInput.value = selected.ticker;
        resetTickerSuggestionsState();
      }
      return;
    }

    if (event.key === "Escape") {
      resetTickerSuggestionsState();
    }
  });
  refs.tickerInput.addEventListener("blur", () => {
    window.setTimeout(() => resetTickerSuggestionsState(), 120);
  });
  refs.tickerInput.addEventListener("focus", () => {
    if (normalizeTicker(refs.tickerInput.value).length >= 2) {
      void updateTickerSuggestions();
    }
  });
  refs.alertForm.addEventListener("submit", handleCreateAlert);
  refs.manualRefreshBtn.addEventListener("click", () => {
    void refreshQuotes();
  });

  refs.refreshInterval.addEventListener("change", () => {
    state.settings.refreshInterval = Number(refs.refreshInterval.value);
    persistState();
    restartAutoRefresh();
    showToast(refs, "Intervalo atualizado", `Atualizacao automatica em ${state.settings.refreshInterval}s.`);
  });

  refs.sortBy.addEventListener("change", () => {
    state.settings.sortBy = refs.sortBy.value;
    persistState();
    rerenderAll();
  });

  refs.sortDirectionBtn.addEventListener("click", () => {
    state.settings.sortDirection = state.settings.sortDirection === "asc" ? "desc" : "asc";
    updateSortDirectionButton(refs, state.settings.sortDirection);
    persistState();
    rerenderAll();
  });

  refs.filterAlerted.addEventListener("change", () => {
    state.settings.filterAlertedOnly = refs.filterAlerted.checked;
    persistState();
    rerenderAll();
  });

  refs.favoritesOrderMode.addEventListener("change", () => {
    state.settings.favoritesOrderMode = refs.favoritesOrderMode.value;
    persistState();
    rerenderAll();
  });

  refs.notificationsBtn.addEventListener("click", async () => {
    const status = await requestBrowserNotifications();
    if (status === "granted") {
      showToast(refs, "Notificacoes ativas", "Permissao concedida com sucesso.");
      return;
    }

    if (status === "unsupported") {
      showToast(refs, "Navegador sem suporte", "Notification API nao disponivel neste navegador.");
      return;
    }

    showToast(refs, "Permissao negada", "Voce pode habilitar novamente nas configuracoes do navegador.");
  });

  refs.themeToggle.addEventListener("click", () => {
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    applyTheme(state.settings.theme);
    persistState();

    if (!refs.chartModal.classList.contains("hidden") && state.selectedChartTicker) {
      void loadChartData();
    }
  });

  refs.compactToggle.addEventListener("click", () => {
    state.settings.compactMode = !state.settings.compactMode;
    applyCompactMode(state.settings.compactMode);
    setCompactButtonState(refs, state.settings.compactMode);
    persistState();
  });

  refs.exportBtn.addEventListener("click", exportWorkspaceSnapshot);
  refs.importBtn.addEventListener("click", () => refs.importFile.click());
  refs.importFile.addEventListener("change", async (event) => {
    await importWorkspaceSnapshot(event.target.files[0]);
    refs.importFile.value = "";
  });

  refs.watchlistSelect.addEventListener("change", () => {
    state.settings.activeWatchlistId = refs.watchlistSelect.value;
    state.quotesByTicker.clear();
    persistState();
    rerenderAll();
    void refreshQuotes();
  });

  refs.watchlistAddBtn.addEventListener("click", handleAddWatchlist);
  refs.watchlistRemoveBtn.addEventListener("click", handleRemoveWatchlist);

  refs.tokenSaveBtn.addEventListener("click", handleSaveToken);
  refs.tokenClearBtn.addEventListener("click", handleClearToken);
  refs.tokenVisibilityBtn.addEventListener("click", () => {
    const show = refs.apiTokenInput.type === "password";
    refs.apiTokenInput.type = show ? "text" : "password";
    refs.tokenVisibilityBtn.textContent = show ? "Ocultar" : "Mostrar";
  });
  refs.apiTokenInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void handleSaveToken();
  });

  refs.dataStatusBanner.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='set-token']");
    if (!button) {
      return;
    }

    focusTokenInput();
  });

  refs.chartClose.addEventListener("click", () => {
    closeChartModal(refs);
  });

  refs.chartModal.addEventListener("click", (event) => {
    if (event.target === refs.chartModal) {
      closeChartModal(refs);
    }
  });

  refs.periodButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-period]");
    if (!button) {
      return;
    }

    state.selectedChartPeriod = button.dataset.period;
    void loadChartData();
  });

}

function syncControls() {
  const existingToken = getRuntimeApiToken();
  refs.refreshInterval.value = String(state.settings.refreshInterval);
  refs.sortBy.value = state.settings.sortBy;
  refs.filterAlerted.checked = Boolean(state.settings.filterAlertedOnly);
  refs.favoritesOrderMode.value = state.settings.favoritesOrderMode;
  refs.apiTokenInput.value = existingToken;
  refs.apiTokenInput.type = "password";
  refs.tokenVisibilityBtn.textContent = "Mostrar";
  renderTokenStatus(refs, existingToken);
  updateSortDirectionButton(refs, state.settings.sortDirection);
  applyCompactMode(state.settings.compactMode);
  setCompactButtonState(refs, state.settings.compactMode);
}

async function bootstrap() {
  ensureSettingsConsistency();
  ensureWorkspaceConsistency();
  applyTheme(state.settings.theme);
  syncControls();
  bindEvents();
  rerenderAll();
  restartAutoRefresh();
  await refreshQuotes();
}

void bootstrap();
