(function initializeSessionFramework(global) {
  function validNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function create({ bankroll = 1000, counters = [], extra = {} } = {}) {
    return {
      ...Object.fromEntries(counters.map((counter) => [counter, 0])),
      ...extra,
      largestBankroll: bankroll,
      startingBankroll: bankroll,
    };
  }

  function sanitize(session, { bankroll = 1000, counters = [], extra = {} } = {}) {
    const value = session || {};
    return {
      ...Object.fromEntries(counters.map((counter) => [counter, validNumber(value[counter], 0)])),
      ...Object.fromEntries(
        Object.entries(extra).map(([key, fallback]) => [
          key,
          typeof fallback === "number"
            ? validNumber(value[key], fallback)
            : (value[key] ?? fallback),
        ]),
      ),
      largestBankroll: validNumber(value.largestBankroll, bankroll),
      startingBankroll: validNumber(value.startingBankroll, bankroll),
    };
  }

  function record(session, { bankroll, increments = {} } = {}) {
    const next = { ...session };
    Object.entries(increments).forEach(([key, amount]) => {
      next[key] = validNumber(next[key], 0) + amount;
    });
    next.largestBankroll = Math.max(validNumber(next.largestBankroll, bankroll), bankroll);
    return next;
  }

  function profit(session, currentFunds, { disabled = false } = {}) {
    if (disabled) return 0;
    return Math.round((currentFunds - session.startingBankroll) * 100) / 100;
  }

  function renderSummary(content, rows) {
    content.replaceChildren(
      ...rows.map(({ className = "", label, value }) => {
        const row = global.document.createElement("div");
        const labelElement = global.document.createElement("span");
        const valueElement = global.document.createElement("strong");
        labelElement.textContent = label;
        valueElement.textContent = value;
        if (className) valueElement.className = className;
        row.append(labelElement, valueElement);
        return row;
      }),
    );
  }

  function bindSummaryDialog({ content, dialog, getRows, trigger }) {
    trigger.addEventListener("click", () => {
      renderSummary(content, getRows());
      dialog.showModal();
    });
  }

  const api = { bindSummaryDialog, create, profit, record, renderSummary, sanitize };
  global.NeonSessionFramework = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
