const test = require("node:test");
const assert = require("node:assert/strict");
const settings = require("../../shared/game-settings.js");

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("shared settings persist sanitized preferences", () => {
  const storage = memoryStorage();
  const first = settings.createSettings({ storage });
  first.set({ autoRevealPlayer: true, haptics: true, sound: true });

  const restored = settings.createSettings({ storage });
  assert.deepEqual(restored.get(), {
    autoRevealPlayer: true,
    autoRevealPoker: true,
    haptics: true,
    sound: true,
  });
});

test("shared settings recover from invalid storage", () => {
  const storage = memoryStorage({ [settings.storageKey]: "not-json" });
  assert.deepEqual(settings.createSettings({ storage }).get(), settings.defaults);
});
