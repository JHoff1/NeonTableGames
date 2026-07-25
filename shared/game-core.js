(function initializeGameCore(global) {
  const suits = [
    { name: "spades", symbol: "&spades;", color: "black" },
    { name: "hearts", symbol: "&hearts;", color: "red" },
    { name: "diamonds", symbol: "&diams;", color: "red" },
    { name: "clubs", symbol: "&clubs;", color: "black" },
  ];

  const ranks = [
    { label: "A", blackjackValue: 11, baccaratValue: 1 },
    { label: "2", blackjackValue: 2, baccaratValue: 2 },
    { label: "3", blackjackValue: 3, baccaratValue: 3 },
    { label: "4", blackjackValue: 4, baccaratValue: 4 },
    { label: "5", blackjackValue: 5, baccaratValue: 5 },
    { label: "6", blackjackValue: 6, baccaratValue: 6 },
    { label: "7", blackjackValue: 7, baccaratValue: 7 },
    { label: "8", blackjackValue: 8, baccaratValue: 8 },
    { label: "9", blackjackValue: 9, baccaratValue: 9 },
    { label: "10", blackjackValue: 10, baccaratValue: 0 },
    { label: "J", blackjackValue: 10, baccaratValue: 0 },
    { label: "Q", blackjackValue: 10, baccaratValue: 0 },
    { label: "K", blackjackValue: 10, baccaratValue: 0 },
  ];

  const phases = Object.freeze({
    BETTING: "betting",
    DEALING: "dealing",
    PLAYING: "playing",
    REVEALING: "revealing",
    SETTLED: "settled",
  });

  function createCard(label, suitName, game = "blackjack") {
    const rank = ranks.find((item) => item.label === label);
    const suit = suits.find((item) => item.name === suitName);
    if (!rank || !suit) throw new Error(`Unknown card: ${label} of ${suitName}`);

    return {
      ...rank,
      value: game === "baccarat" ? rank.baccaratValue : rank.blackjackValue,
      suit: suit.symbol,
      suitName: suit.name,
      color: suit.color,
    };
  }

  function secureRandomIndex(maxExclusive) {
    const cryptoApi = global.crypto;
    if (!cryptoApi?.getRandomValues) {
      return Math.floor(Math.random() * maxExclusive);
    }

    const range = 0x100000000;
    const limit = range - (range % maxExclusive);
    const values = new Uint32Array(1);
    do {
      cryptoApi.getRandomValues(values);
    } while (values[0] >= limit);
    return values[0] % maxExclusive;
  }

  function createSeededRandom(seed) {
    let hash = 2166136261;
    for (const character of String(seed)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return function seededRandom() {
      hash += 0x6d2b79f5;
      let value = hash;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(cards, { random } = {}) {
    const shuffled = [...cards];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = random ? Math.floor(random() * (index + 1)) : secureRandomIndex(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function buildShoe(deckCount = 1, game = "blackjack", { seed } = {}) {
    const shoe = [];
    for (let deckIndex = 0; deckIndex < deckCount; deckIndex += 1) {
      suits.forEach((suit) => {
        ranks.forEach((rank) => {
          shoe.push(createCard(rank.label, suit.name, game));
        });
      });
    }
    return shuffle(shoe, {
      random:
        seed === undefined || seed === null || seed === "" ? undefined : createSeededRandom(seed),
    });
  }

  function replaySeed(location = global.location) {
    try {
      return new URLSearchParams(location?.search || "").get("seed") || "";
    } catch {
      return "";
    }
  }

  function removeQueryParam(name, location = global.location) {
    const url = new URL(location.href);
    url.searchParams.delete(name);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function setupSeedDebugIndicator(seed = replaySeed()) {
    if (!seed || !global.document?.body) return null;
    const indicator = global.document.createElement("aside");
    const label = global.document.createElement("span");
    const copy = global.document.createElement("button");
    indicator.className = "seed-debug";
    indicator.setAttribute("aria-label", "Debug game seed");
    label.textContent = `Seed: ${seed}`;
    copy.type = "button";
    copy.textContent = "Copy";
    copy.setAttribute("aria-label", `Copy debug seed ${seed}`);
    copy.addEventListener("click", async () => {
      try {
        await global.navigator.clipboard.writeText(seed);
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Copy failed";
      }
      global.setTimeout(() => {
        copy.textContent = "Copy";
      }, 1400);
    });
    indicator.append(label, copy);
    global.document.body.append(indicator);
    return indicator;
  }

  function setupCrossTabSync({ isActive, key }) {
    let dialog = null;

    function showConflict() {
      if (!dialog) {
        dialog = global.document.createElement("dialog");
        dialog.className = "game-dialog cross-tab-dialog";
        const content = global.document.createElement("div");
        const heading = global.document.createElement("h2");
        const message = global.document.createElement("p");
        const reload = global.document.createElement("button");
        heading.textContent = "Game Updated in Another Tab";
        message.textContent =
          "This tab has an active wager or round. Load the newer saved game before continuing.";
        reload.type = "button";
        reload.className = "primary";
        reload.textContent = "Load Newer Game";
        reload.addEventListener("click", () => global.location.reload());
        content.append(heading, message, reload);
        dialog.append(content);
        dialog.addEventListener("cancel", (event) => event.preventDefault());
        global.document.body.append(dialog);
      }
      if (!dialog.open) dialog.showModal();
    }

    global.addEventListener("storage", (event) => {
      if (event.key !== key || event.newValue === event.oldValue) return;
      if (isActive()) showConflict();
      else global.location.reload();
    });

    return { showConflict };
  }

  function createShoeBuilder(deckCount = 1, game = "blackjack", { seed = replaySeed() } = {}) {
    let shoeIndex = 0;
    return function nextShoe() {
      const shoeSeed = seed ? `${seed}:${shoeIndex}` : undefined;
      shoeIndex += 1;
      return buildShoe(deckCount, game, { seed: shoeSeed });
    };
  }

  function money(value, { forceCents = false } = {}) {
    const rounded = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.0001;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: forceCents || hasCents ? 2 : 0,
      maximumFractionDigits: forceCents || hasCents ? 2 : 0,
    }).format(rounded);
  }

  function readStoredNumber(key, fallback, { minimum = 0, storage = global.localStorage } = {}) {
    try {
      const storedValue = storage?.getItem(key);
      if (storedValue === null || storedValue === undefined) return fallback;
      const value = Number(storedValue);
      return Number.isFinite(value) && value >= minimum ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStoredNumber(key, value, { storage = global.localStorage } = {}) {
    try {
      storage?.setItem(key, String(value));
      return true;
    } catch {
      return false;
    }
  }

  function createGameStorage(
    key,
    {
      defaults = {},
      migrate,
      sanitize = (value) => value,
      storage = global.localStorage,
      version = 1,
    } = {},
  ) {
    function normalize(value) {
      const sanitized = sanitize({ ...defaults, ...(value || {}) });
      return { ...defaults, ...(sanitized || {}) };
    }

    function write(data) {
      try {
        storage?.setItem(
          key,
          JSON.stringify({
            data: normalize(data),
            version,
          }),
        );
        return true;
      } catch {
        return false;
      }
    }

    function read() {
      try {
        const record = JSON.parse(storage?.getItem(key) || "null");
        if (record?.version === version && record.data && typeof record.data === "object") {
          return normalize(record.data);
        }
      } catch {
        // Invalid or unavailable storage falls through to migration/defaults.
      }

      const migrated = normalize(typeof migrate === "function" ? migrate(storage) : defaults);
      write(migrated);
      return migrated;
    }

    return Object.freeze({ key, read, version, write });
  }

  function renderCard(card, { hidden = false } = {}) {
    const article = global.document.createElement("article");
    article.className = hidden ? "card back" : `card ${card.color === "red" ? "red" : ""}`;
    article.setAttribute(
      "aria-label",
      hidden ? "Hidden card" : `${card.label} of ${card.suitName}`,
    );

    if (!hidden) {
      article.innerHTML = `
        <span class="rank top">${card.label}</span>
        <span class="suit">${card.suit}</span>
        <span class="rank bottom">${card.label}</span>
      `;
    }
    return article;
  }

  function setupTooltips(buttons = global.document.querySelectorAll("[data-tooltip]")) {
    const tooltip = global.document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    global.document.body.append(tooltip);

    function hide() {
      tooltip.classList.remove("visible");
      tooltip.hidden = true;
    }

    function show(button) {
      tooltip.textContent = button.dataset.tooltip;
      tooltip.hidden = false;
      tooltip.classList.add("visible");

      const buttonRect = button.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const margin = 10;
      const left = Math.min(
        Math.max(margin, buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2),
        global.innerWidth - tooltipRect.width - margin,
      );
      const top = Math.max(margin, buttonRect.top + global.scrollY - tooltipRect.height - 12);
      const arrowLeft = buttonRect.left + buttonRect.width / 2 - left;

      tooltip.style.left = `${left + global.scrollX}px`;
      tooltip.style.top = `${top}px`;
      tooltip.style.setProperty("--arrow-left", `${arrowLeft}px`);
    }

    const supportsHover = global.matchMedia("(hover: hover) and (pointer: fine)").matches;
    [...buttons].forEach((button) => {
      if (supportsHover) {
        button.addEventListener("mouseenter", () => show(button));
        button.addEventListener("mouseleave", hide);
      }
      button.addEventListener("focus", () => show(button));
      button.addEventListener("blur", hide);
    });

    global.addEventListener("resize", hide);
    global.addEventListener("scroll", hide, { passive: true });
    return { hide, show, tooltip };
  }

  const api = {
    buildShoe,
    createSeededRandom,
    createShoeBuilder,
    createGameStorage,
    createCard,
    money,
    phases,
    ranks,
    readStoredNumber,
    removeQueryParam,
    replaySeed,
    renderCard,
    setupTooltips,
    setupSeedDebugIndicator,
    setupCrossTabSync,
    shuffle,
    suits,
    writeStoredNumber,
  };

  global.NeonTableCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
