(function initializeErrorMonitoring(global) {
  const endpoint = "/.netlify/functions/client-error";
  const productionHosts = new Set(["neontablegames.com", "www.neontablegames.com"]);
  const reportLimit = 5;
  let reportCount = 0;

  function scrub(value, maximum = 320) {
    return String(value || "")
      .replace(/[?&][^\s#]*/g, "")
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
      .replace(/\s+/g, " ")
      .slice(0, maximum);
  }

  function safeAsset(value) {
    try {
      const url = new URL(value, global.location.href);
      return url.origin === global.location.origin ? url.pathname : url.hostname;
    } catch {
      return "unknown";
    }
  }

  function report(payload) {
    if (!productionHosts.has(global.location.hostname) || reportCount >= reportLimit) return;
    reportCount += 1;
    const body = JSON.stringify({
      ...payload,
      page: global.location.pathname,
      timestamp: new Date().toISOString(),
    });
    global
      .fetch(endpoint, {
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
      })
      .catch(() => {});
  }

  if (typeof global.addEventListener === "function") {
    global.addEventListener(
      "error",
      (event) => {
        const target = event.target;
        if (target && target !== global && ["IMG", "LINK", "SCRIPT"].includes(target.tagName)) {
          report({
            asset: safeAsset(target.currentSrc || target.src || target.href),
            type: "asset",
          });
          return;
        }
        report({
          column: Number(event.colno) || 0,
          line: Number(event.lineno) || 0,
          message: scrub(event.message),
          source: safeAsset(event.filename),
          type: "javascript",
        });
      },
      true,
    );

    global.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason instanceof Error ? event.reason.message : event.reason;
      report({ message: scrub(reason), type: "promise" });
    });
  }

  const api = { safeAsset, scrub };
  global.NeonErrorMonitoring = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
