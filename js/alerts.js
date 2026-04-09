import { APP_CONFIG } from "./config.js";

export function createAlert({ ticker, type, targetPrice, soundEnabled }) {
  return {
    id: crypto.randomUUID(),
    ticker: ticker.toUpperCase(),
    type,
    targetPrice: Number(targetPrice),
    soundEnabled: Boolean(soundEnabled),
    enabled: true,
    isArmed: true,
    createdAt: Date.now(),
    lastTriggeredAt: null
  };
}

export function getActiveAlertsCount(alerts) {
  return alerts.filter((alert) => alert.enabled && alert.isArmed).length;
}

function shouldTrigger(alert, currentPrice) {
  if (!alert.enabled || !alert.isArmed) {
    return false;
  }

  if (alert.type === "gte") {
    return currentPrice >= alert.targetPrice;
  }

  return currentPrice <= alert.targetPrice;
}

function createHistoryItem(alert, quote) {
  return {
    id: crypto.randomUUID(),
    alertId: alert.id,
    ticker: alert.ticker,
    type: alert.type,
    targetPrice: alert.targetPrice,
    triggeredPrice: quote.price,
    triggeredAt: Date.now()
  };
}

export function evaluateAlerts(alerts, quotesByTicker) {
  const nextAlerts = alerts.map((item) => ({ ...item }));
  const fired = [];

  nextAlerts.forEach((alert) => {
    const quote = quotesByTicker.get(alert.ticker);

    if (!quote) {
      return;
    }

    if (shouldTrigger(alert, quote.price)) {
      alert.isArmed = false;
      alert.lastTriggeredAt = Date.now();
      fired.push(createHistoryItem(alert, quote));
    }
  });

  return {
    nextAlerts,
    fired
  };
}

export function rearmAlert(alerts, id) {
  return alerts.map((alert) => {
    if (alert.id !== id) {
      return alert;
    }

    return {
      ...alert,
      isArmed: true
    };
  });
}

export function toggleAlertEnabled(alerts, id) {
  return alerts.map((alert) => {
    if (alert.id !== id) {
      return alert;
    }

    return {
      ...alert,
      enabled: !alert.enabled
    };
  });
}

export function removeAlert(alerts, id) {
  return alerts.filter((alert) => alert.id !== id);
}

export function prependHistory(existing, firedItems) {
  if (!firedItems.length) {
    return existing;
  }

  return [...firedItems.reverse(), ...existing].slice(0, APP_CONFIG.maxTriggeredHistoryItems);
}

export function findArmedAlertsByTicker(alerts) {
  return alerts.reduce((acc, alert) => {
    if (alert.enabled && alert.isArmed) {
      const current = acc.get(alert.ticker) || [];
      current.push(alert);
      acc.set(alert.ticker, current);
    }

    return acc;
  }, new Map());
}

export function requestBrowserNotifications() {
  if (!("Notification" in window)) {
    return Promise.resolve("unsupported");
  }

  if (Notification.permission === "granted") {
    return Promise.resolve("granted");
  }

  return Notification.requestPermission();
}

export function notifyTriggeredAlert(item) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const comparator = item.type === "gte" ? ">=" : "<=";
  new Notification(`Alerta ${item.ticker}`, {
    body: `Preco ${item.triggeredPrice.toFixed(2)} | regra ${comparator} ${item.targetPrice.toFixed(2)}`
  });
}

export function playAlertSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.26);
}
