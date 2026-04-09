import { PERIOD_CONFIG } from "./config.js";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("pt-BR");
const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function hasNumericValue(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

export function getDomRefs() {
  return {
    tickerForm: document.getElementById("ticker-form"),
    tickerInput: document.getElementById("ticker-input"),
    tickerSuggestions: document.getElementById("ticker-suggestions"),
    manualRefreshBtn: document.getElementById("manual-refresh"),
    compactToggle: document.getElementById("compact-toggle"),
    exportBtn: document.getElementById("export-btn"),
    importBtn: document.getElementById("import-btn"),
    importFile: document.getElementById("import-file"),
    refreshInterval: document.getElementById("refresh-interval"),
    apiTokenInput: document.getElementById("api-token-input"),
    tokenVisibilityBtn: document.getElementById("token-visibility-btn"),
    tokenSaveBtn: document.getElementById("token-save-btn"),
    tokenClearBtn: document.getElementById("token-clear-btn"),
    tokenStatusText: document.getElementById("token-status-text"),
    sortBy: document.getElementById("sort-by"),
    sortDirectionBtn: document.getElementById("sort-direction"),
    filterAlerted: document.getElementById("filter-alerted"),
    favoritesOrderMode: document.getElementById("favorites-order-mode"),
    watchlistSelect: document.getElementById("watchlist-select"),
    watchlistAddBtn: document.getElementById("watchlist-add"),
    watchlistRemoveBtn: document.getElementById("watchlist-remove"),
    dataStatusBanner: document.getElementById("data-status-banner"),
    quotesBody: document.getElementById("quotes-body"),
    quotesEmpty: document.getElementById("quotes-empty"),
    loadingOverlay: document.getElementById("loading-overlay"),
    favoritesList: document.getElementById("favorites-list"),
    favoritesEmpty: document.getElementById("favorites-empty"),
    alertForm: document.getElementById("alert-form"),
    alertTicker: document.getElementById("alert-ticker"),
    alertType: document.getElementById("alert-type"),
    alertPrice: document.getElementById("alert-price"),
    alertSound: document.getElementById("alert-sound"),
    alertsList: document.getElementById("alerts-list"),
    alertsEmpty: document.getElementById("alerts-empty"),
    historyList: document.getElementById("alerts-history"),
    historyEmpty: document.getElementById("history-empty"),
    notificationsBtn: document.getElementById("notifications-btn"),
    summaryFavorites: document.getElementById("summary-favorites"),
    summaryAlerts: document.getElementById("summary-alerts"),
    summaryLastUpdate: document.getElementById("summary-last-update"),
    summaryHighlight: document.getElementById("summary-market-highlight"),
    toastContainer: document.getElementById("toast-container"),
    themeToggle: document.getElementById("theme-toggle"),
    chartModal: document.getElementById("chart-modal"),
    chartClose: document.getElementById("chart-close"),
    chartTitle: document.getElementById("chart-title"),
    chartSubtitle: document.getElementById("chart-subtitle"),
    periodButtons: document.getElementById("period-buttons"),
    chartCanvas: document.getElementById("price-chart"),
    chartSummary: document.getElementById("chart-summary")
  };
}

export function formatCurrency(value) {
  if (!hasNumericValue(value)) {
    return "--";
  }

  return currencyFormatter.format(Number(value || 0));
}

function formatPercent(value) {
  if (!hasNumericValue(value)) {
    return "--";
  }

  return `${Number(value || 0).toFixed(2)}%`;
}

function formatVolume(value) {
  if (!hasNumericValue(value)) {
    return "--";
  }

  return numberFormatter.format(Number(value || 0));
}

function highlightLabel(quote, best, worst) {
  if (!best || !worst) {
    return "";
  }

  if (quote.ticker === best.ticker) {
    return '<span class="inline-chip top">Maior alta</span>';
  }

  if (quote.ticker === worst.ticker) {
    return '<span class="inline-chip bottom">Maior baixa</span>';
  }

  return "";
}

export function renderQuotesTable({ quotes, alertsByTicker, refs, onOpenChart, onRemoveFavorite, best, worst }) {
  refs.quotesBody.innerHTML = "";

  if (!quotes.length) {
    refs.quotesEmpty.classList.remove("hidden");
    return;
  }

  refs.quotesEmpty.classList.add("hidden");

  quotes.forEach((quote) => {
    const tr = document.createElement("tr");
    const alerts = alertsByTicker.get(quote.ticker) || [];
    const hasLiveQuote = !quote.isPlaceholder;
    const changeClass = hasNumericValue(quote.change) ? (quote.change >= 0 ? "pos" : "neg") : "";
    const changePercentClass = hasNumericValue(quote.changePercent) ? (quote.changePercent >= 0 ? "pos" : "neg") : "";

    tr.classList.toggle("row-unavailable", !hasLiveQuote);

    tr.innerHTML = `
      <td class="cell-ticker" data-label="Ticker">${quote.ticker}</td>
      <td data-label="Ativo">${quote.name} ${highlightLabel(quote, best, worst)}</td>
      <td class="cell-price" data-label="Preco">${formatCurrency(quote.price)}</td>
      <td class="${changeClass}" data-label="Variacao">${formatCurrency(quote.change)}</td>
      <td class="${changePercentClass}" data-label="Var %">${formatPercent(quote.changePercent)}</td>
      <td data-label="Max dia">${formatCurrency(quote.dayHigh)}</td>
      <td data-label="Min dia">${formatCurrency(quote.dayLow)}</td>
      <td data-label="Volume">${formatVolume(quote.volume)}</td>
      <td data-label="Alertas">${
        hasLiveQuote
          ? (alerts.length ? `<span class="badge alert">${alerts.length} armados</span>` : '<span class="badge none">sem alerta</span>')
          : '<span class="badge none">sem cotacao</span>'
      }</td>
      <td data-label="Acoes">
        <div class="fav-actions">
          <button class="btn btn-ghost btn-chart" type="button" ${hasLiveQuote ? "" : "disabled"}>Grafico</button>
          <button class="btn btn-ghost btn-remove" type="button">Remover</button>
        </div>
      </td>
    `;

    if (hasLiveQuote) {
      tr.querySelector(".btn-chart").addEventListener("click", () => onOpenChart(quote.ticker));
    }
    tr.querySelector(".btn-remove").addEventListener("click", () => onRemoveFavorite(quote.ticker));

    refs.quotesBody.appendChild(tr);
  });
}

export function renderFavoritesList({ favorites, refs, onRemove, onMoveUp, onMoveDown, orderMode }) {
  refs.favoritesList.innerHTML = "";

  if (!favorites.length) {
    refs.favoritesEmpty.classList.remove("hidden");
    return;
  }

  refs.favoritesEmpty.classList.add("hidden");

  favorites.forEach((ticker, index) => {
    const item = document.createElement("li");
    item.className = "favorites-item";

    const orderButtons = orderMode === "manual"
      ? `
      <button class="btn btn-ghost btn-up" type="button">Subir</button>
      <button class="btn btn-ghost btn-down" type="button">Descer</button>
      `
      : "";

    item.innerHTML = `
      <div class="fav-topline">
        <strong>${ticker}</strong>
        <div class="fav-actions">
          ${orderButtons}
          <button class="btn btn-ghost btn-remove" type="button">Excluir</button>
        </div>
      </div>
    `;

    item.querySelector(".btn-remove").addEventListener("click", () => onRemove(ticker));

    if (orderMode === "manual") {
      item.querySelector(".btn-up").addEventListener("click", () => onMoveUp(index));
      item.querySelector(".btn-down").addEventListener("click", () => onMoveDown(index));
    }

    refs.favoritesList.appendChild(item);
  });
}

export function updateAlertTickerOptions(refs, favorites, selected = "") {
  refs.alertTicker.innerHTML = "";

  if (!favorites.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Adicione favoritos antes";
    refs.alertTicker.appendChild(option);
    refs.alertTicker.disabled = true;
    return;
  }

  refs.alertTicker.disabled = false;

  favorites.forEach((ticker) => {
    const option = document.createElement("option");
    option.value = ticker;
    option.textContent = ticker;
    refs.alertTicker.appendChild(option);
  });

  if (selected && favorites.includes(selected)) {
    refs.alertTicker.value = selected;
  }
}

export function renderAlertsList({ alerts, refs, onToggleEnabled, onRearm, onDelete }) {
  refs.alertsList.innerHTML = "";

  if (!alerts.length) {
    refs.alertsEmpty.classList.remove("hidden");
    return;
  }

  refs.alertsEmpty.classList.add("hidden");

  alerts.forEach((alert) => {
    const item = document.createElement("li");
    item.className = "alert-item";
    const statusLabel = alert.enabled ? (alert.isArmed ? "Armado" : "Disparado") : "Pausado";
    const comparator = alert.type === "gte" ? ">=" : "<=";

    item.innerHTML = `
      <div class="alert-topline">
        <strong>${alert.ticker}</strong>
        <span class="inline-chip ${alert.isArmed ? "armed" : "triggered"}">${statusLabel}</span>
      </div>
      <div>
        Regra: preco ${comparator} ${formatCurrency(alert.targetPrice)}
      </div>
      <div class="alert-actions">
        <button class="btn btn-ghost btn-toggle" type="button">${alert.enabled ? "Pausar" : "Ativar"}</button>
        <button class="btn btn-ghost btn-rearm" type="button">Rearmar</button>
        <button class="btn btn-ghost btn-delete" type="button">Excluir</button>
      </div>
    `;

    item.querySelector(".btn-toggle").addEventListener("click", () => onToggleEnabled(alert.id));
    item.querySelector(".btn-rearm").addEventListener("click", () => onRearm(alert.id));
    item.querySelector(".btn-delete").addEventListener("click", () => onDelete(alert.id));

    refs.alertsList.appendChild(item);
  });
}

export function renderHistoryList({ history, refs }) {
  refs.historyList.innerHTML = "";

  if (!history.length) {
    refs.historyEmpty.classList.remove("hidden");
    return;
  }

  refs.historyEmpty.classList.add("hidden");

  history.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const comparator = item.type === "gte" ? ">=" : "<=";

    li.innerHTML = `
      <div class="history-topline">
        <strong>${item.ticker}</strong>
        <small>${new Date(item.triggeredAt).toLocaleString("pt-BR")}</small>
      </div>
      <div>
        Alvo ${comparator} ${formatCurrency(item.targetPrice)} | Disparo ${formatCurrency(item.triggeredPrice)}
      </div>
    `;

    refs.historyList.appendChild(li);
  });
}

export function setLoading(refs, isLoading) {
  refs.loadingOverlay.classList.toggle("hidden", !isLoading);
}

export function renderSummary({ refs, favoritesCount, activeAlertsCount, lastUpdate, highlightText }) {
  refs.summaryFavorites.textContent = String(favoritesCount);
  refs.summaryAlerts.textContent = String(activeAlertsCount);
  refs.summaryLastUpdate.textContent = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString("pt-BR")
    : "--:--:--";
  refs.summaryHighlight.textContent = highlightText || "Sem dados";
}

export function renderDataStatus(refs, status) {
  refs.dataStatusBanner.classList.remove("ok", "unauthorized", "error", "idle");

  if (status === "ok") {
    refs.dataStatusBanner.classList.add("ok");
    refs.dataStatusBanner.innerHTML = "<strong>Status dos dados</strong><p>Cotacoes reais carregadas com sucesso via API.</p>";
    return;
  }

  if (status === "unauthorized") {
    refs.dataStatusBanner.classList.add("unauthorized");
    refs.dataStatusBanner.innerHTML = `
      <strong>Status dos dados</strong>
      <p>Sem permissao para alguns tickers. Configure um token da brapi para obter cotacoes reais.</p>
      <button class="btn btn-ghost" type="button" data-action="set-token">Configurar token agora</button>
    `;
    return;
  }

  if (status === "error") {
    refs.dataStatusBanner.classList.add("error");
    refs.dataStatusBanner.innerHTML = "<strong>Status dos dados</strong><p>Falha temporaria na API/rede. Tentando novamente no proximo ciclo de atualizacao.</p>";
    return;
  }

  refs.dataStatusBanner.classList.add("idle");
  refs.dataStatusBanner.innerHTML = "<strong>Status dos dados</strong><p>Aguardando primeira atualizacao...</p>";
}

export function showToast(refs, title, description) {
  const box = document.createElement("div");
  box.className = "toast";
  box.innerHTML = `<strong>${title}</strong><p>${description}</p>`;
  refs.toastContainer.appendChild(box);

  window.setTimeout(() => {
    box.remove();
  }, 3400);
}

export function applyTheme(theme) {
  document.body.dataset.theme = theme;
}

export function applyCompactMode(isCompact) {
  document.body.classList.toggle("compact", Boolean(isCompact));
}

export function setCompactButtonState(refs, isCompact) {
  refs.compactToggle.textContent = isCompact ? "Confortavel" : "Compacto";
}

export function renderTokenStatus(refs, token, overrideMessage = "") {
  const hasToken = Boolean(String(token || "").trim());
  refs.tokenStatusText.textContent = overrideMessage || (hasToken
    ? "Token local configurado."
    : "Token local nao configurado.");
}

export function updateSortDirectionButton(refs, direction) {
  refs.sortDirectionBtn.dataset.direction = direction;
  refs.sortDirectionBtn.textContent = direction === "asc" ? "Asc" : "Desc";
}

export function renderWatchlistOptions(refs, watchlists, activeId) {
  refs.watchlistSelect.innerHTML = "";

  watchlists.forEach((watchlist) => {
    const option = document.createElement("option");
    option.value = watchlist.id;
    option.textContent = watchlist.name;
    refs.watchlistSelect.appendChild(option);
  });

  refs.watchlistSelect.value = activeId;
}

export function openChartModal(refs, ticker) {
  refs.chartModal.classList.remove("hidden");
  refs.chartTitle.textContent = `Grafico - ${ticker}`;
}

export function closeChartModal(refs) {
  refs.chartModal.classList.add("hidden");
}

export function setChartSubtitle(refs, text) {
  refs.chartSubtitle.textContent = text;
}

export function setPeriodActiveButton(refs, period) {
  const buttons = refs.periodButtons.querySelectorAll("button[data-period]");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.period === period);
  });
}

export function periodLabel(period) {
  return PERIOD_CONFIG[period]?.label || "Periodo";
}

const TYPE_LABELS = { stock: "Ações", fii: "FIIs", bdr: "BDRs", etf: "ETFs" };

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const safeText = String(text);
  const index = safeText.toUpperCase().indexOf(query.toUpperCase());
  if (index === -1) return escapeHtml(safeText);
  return (
    escapeHtml(safeText.slice(0, index)) +
    "<mark>" + escapeHtml(safeText.slice(index, index + query.length)) + "</mark>" +
    escapeHtml(safeText.slice(index + query.length))
  );
}

export function renderTickerSuggestions(refs, suggestions, onSelect, activeIndex = -1, query = "") {
  refs.tickerSuggestions.innerHTML = "";

  if (!suggestions.length) {
    refs.tickerSuggestions.classList.add("hidden");
    return;
  }

  // Group items by type maintaining original indices for keyboard nav
  const groups = new Map();
  suggestions.forEach((item, originalIndex) => {
    const label = TYPE_LABELS[item.type] || "Outros";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push({ item, originalIndex });
  });

  const showSeparators = groups.size > 1;

  groups.forEach((entries, label) => {
    if (showSeparators) {
      const sep = document.createElement("div");
      sep.className = "suggestion-separator";
      sep.textContent = label;
      refs.tickerSuggestions.appendChild(sep);
    }

    entries.forEach(({ item, originalIndex }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestion-item";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", originalIndex === activeIndex ? "true" : "false");
      if (originalIndex === activeIndex) {
        button.classList.add("active");
      }

      const priceLabel = hasNumericValue(item.price)
        ? compactCurrencyFormatter.format(Number(item.price))
        : "--";
      const changeLabel = hasNumericValue(item.changePercent)
        ? `${Number(item.changePercent) >= 0 ? "+" : ""}${Number(item.changePercent).toFixed(2)}%`
        : "--";
      const changeClass = hasNumericValue(item.changePercent)
        ? (Number(item.changePercent) >= 0 ? "pos" : "neg")
        : "";
      const typeLabel = item.type || "ativo";
      const logoUrl = item.logo || "https://icons.brapi.dev/icons/BRAPI.svg";

      button.innerHTML = `
        <div class="suggestion-layout">
          <img class="suggestion-logo" src="${logoUrl}" alt="" loading="lazy" referrerpolicy="no-referrer" />
          <div class="suggestion-content">
            <div class="suggestion-topline">
              <strong>${highlightMatch(item.ticker, query)}</strong>
              <span class="suggestion-type">${escapeHtml(typeLabel)}</span>
            </div>
            <span class="suggestion-name">${highlightMatch(item.name, query)}</span>
            <div class="suggestion-marketline">
              <span>${priceLabel}</span>
              <span class="${changeClass}">${changeLabel}</span>
            </div>
          </div>
        </div>
      `;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        onSelect(item.ticker);
      });
      refs.tickerSuggestions.appendChild(button);
    });
  });

  refs.tickerSuggestions.classList.remove("hidden");
}

export function hideTickerSuggestions(refs) {
  refs.tickerSuggestions.classList.add("hidden");
  refs.tickerSuggestions.innerHTML = "";
}
