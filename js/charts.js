let chartInstance = null;

function currency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function dateLabel(dateObj) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(dateObj);
}

export function renderChart({ canvas, ticker, series, periodLabel, theme }) {
  if (!canvas) {
    return;
  }

  const labels = series.map((point) => dateLabel(point.x));
  const data = series.map((point) => point.y);

  if (chartInstance) {
    chartInstance.destroy();
  }

  const axisColor = theme === "light" ? "#415569" : "#9db2c7";
  const lineColor = theme === "light" ? "#0a8e70" : "#27d6ad";

  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${ticker} - ${periodLabel}`,
          data,
          borderColor: lineColor,
          backgroundColor: "rgba(39, 214, 173, 0.15)",
          borderWidth: 2.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.26
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: axisColor,
            font: {
              family: "DM Sans",
              weight: "600"
            }
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              return ` ${currency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: axisColor,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 7
          },
          grid: {
            color: "rgba(157, 178, 199, 0.13)"
          }
        },
        y: {
          ticks: {
            color: axisColor,
            callback(value) {
              return currency(value);
            }
          },
          grid: {
            color: "rgba(157, 178, 199, 0.13)"
          }
        }
      }
    }
  });
}

export function chartSummaryHTML({ quote, source, periodLabel, points }) {
  return `
    <div>
      <p>Origem dos dados</p>
      <strong>${source === "api" ? "brapi" : "fallback mock"}</strong>
    </div>
    <div>
      <p>Periodo</p>
      <strong>${periodLabel}</strong>
    </div>
    <div>
      <p>Preco atual</p>
      <strong>${currency(quote.price)}</strong>
    </div>
    <div>
      <p>Variacao dia</p>
      <strong class="${quote.change >= 0 ? "pos" : "neg"}">${quote.changePercent.toFixed(2)}%</strong>
    </div>
    <div>
      <p>Pontos plotados</p>
      <strong>${points}</strong>
    </div>
  `;
}
