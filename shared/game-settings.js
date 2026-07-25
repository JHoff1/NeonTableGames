(function initializeGameSettings(global) {
  const storageKey = "neontablegames.settings";
  const defaults = Object.freeze({
    autoRevealPlayer: false,
    autoRevealPoker: true,
    haptics: false,
    sound: false,
  });

  function sanitize(value = {}) {
    return {
      autoRevealPlayer:
        typeof value.autoRevealPlayer === "boolean"
          ? value.autoRevealPlayer
          : defaults.autoRevealPlayer,
      autoRevealPoker:
        typeof value.autoRevealPoker === "boolean"
          ? value.autoRevealPoker
          : defaults.autoRevealPoker,
      haptics: typeof value.haptics === "boolean" ? value.haptics : defaults.haptics,
      sound: typeof value.sound === "boolean" ? value.sound : defaults.sound,
    };
  }

  function createSettings({ storage = global.localStorage } = {}) {
    let current = { ...defaults };
    try {
      current = sanitize(JSON.parse(storage?.getItem(storageKey) || "null") || {});
    } catch {
      current = { ...defaults };
    }

    function save() {
      try {
        storage?.setItem(storageKey, JSON.stringify(current));
      } catch {
        // Preferences remain available for the current page when storage is unavailable.
      }
    }

    return Object.freeze({
      get() {
        return { ...current };
      },
      reset() {
        current = { ...defaults };
        save();
        return this.get();
      },
      set(updates) {
        current = sanitize({ ...current, ...(updates || {}) });
        save();
        return this.get();
      },
    });
  }

  function createFeedback(settings) {
    let audioContext = null;

    function preferences() {
      return typeof settings?.get === "function" ? settings.get() : sanitize(settings);
    }

    function cue(type) {
      if (!preferences().sound) return;
      const AudioContext = global.AudioContext || global.webkitAudioContext;
      if (!AudioContext) return;
      audioContext ||= new AudioContext();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = type === "win" ? 640 : type === "deal" ? 320 : 220;
      gain.gain.setValueAtTime(0.035, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.09);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.09);
    }

    function vibrate(pattern = 18) {
      if (preferences().haptics && global.navigator?.vibrate) global.navigator.vibrate(pattern);
    }

    return Object.freeze({ cue, vibrate });
  }

  function bindSettingsDialog({ controls, dialog, onChange, store, trigger }) {
    const entries = Object.entries(controls);
    trigger.addEventListener("click", () => {
      const settings = store.get();
      entries.forEach(([name, input]) => {
        input.checked = settings[name];
      });
      dialog.showModal();
    });
    entries.forEach(([name, input]) => {
      input.addEventListener("change", (event) => {
        const settings = store.set({ [name]: event.target.checked });
        if (typeof onChange === "function") onChange(settings);
      });
    });
  }

  const api = {
    bindSettingsDialog,
    createFeedback,
    createSettings,
    defaults,
    sanitize,
    storageKey,
  };
  global.NeonTableSettings = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
