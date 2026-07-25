const allowedTypes = new Set(["asset", "javascript", "promise"]);

function text(value, maximum = 320) {
  return typeof value === "string" ? value.slice(0, maximum) : "";
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "" };
  }

  const origin = event.headers.origin || event.headers.Origin || "";
  if (
    origin &&
    !["https://neontablegames.com", "https://www.neontablegames.com"].includes(origin)
  ) {
    return { statusCode: 403, body: "" };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    if (!allowedTypes.has(payload.type)) return { statusCode: 400, body: "" };
    const report = {
      asset: text(payload.asset),
      column: Number(payload.column) || 0,
      line: Number(payload.line) || 0,
      message: text(payload.message),
      page: text(payload.page, 160),
      source: text(payload.source, 160),
      timestamp: text(payload.timestamp, 40),
      type: payload.type,
    };
    console.warn("client-error", JSON.stringify(report));
    return {
      statusCode: 202,
      headers: { "Cache-Control": "no-store" },
      body: "",
    };
  } catch {
    return { statusCode: 400, body: "" };
  }
};
