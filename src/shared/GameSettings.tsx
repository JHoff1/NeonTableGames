import { GameDialog } from "./GameDialog";

export interface SharedSettings {
  autoRevealPlayer: boolean;
  autoRevealPoker: boolean;
  haptics: boolean;
  sound: boolean;
}

export function GameSettings({
  autoRevealId,
  autoRevealLabel,
  autoRevealName,
  gameId,
  onClose,
  onSetting,
  open,
  settings,
}: {
  autoRevealId?: string;
  autoRevealLabel?: string;
  autoRevealName?: "autoRevealPlayer" | "autoRevealPoker";
  gameId: string;
  onClose(): void;
  onSetting(name: keyof SharedSettings, value: boolean): void;
  open: boolean;
  settings: SharedSettings;
}) {
  const hapticsSupported = typeof navigator.vibrate === "function";
  return (
    <GameDialog
      id={`${gameId}-settings-dialog`}
      onClose={onClose}
      open={open}
      title="Game Settings"
    >
      <label className="setting-row">
        <span>
          <strong>Sound</strong>
          <small>Play subtle card and result cues in every game.</small>
        </span>
        <input
          checked={settings.sound}
          id={`${gameId}-setting-sound`}
          onChange={(event) => onSetting("sound", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className={`setting-row ${hapticsSupported ? "" : "setting-unavailable"}`}>
        <span>
          <strong>Haptics</strong>
          <small>
            {hapticsSupported
              ? "Use brief vibration where supported."
              : "Not supported by this browser."}
          </small>
        </span>
        <input
          checked={hapticsSupported && settings.haptics}
          disabled={!hapticsSupported}
          id={`${gameId}-setting-haptics`}
          onChange={(event) => onSetting("haptics", event.target.checked)}
          type="checkbox"
        />
      </label>
      {autoRevealName && (
        <label className="setting-row">
          <span>
            <strong>{autoRevealLabel}</strong>
            <small>Finish card reveals automatically after dealing.</small>
          </span>
          <input
            checked={settings[autoRevealName]}
            id={autoRevealId}
            onChange={(event) => onSetting(autoRevealName, event.target.checked)}
            type="checkbox"
          />
        </label>
      )}
      <button className="primary dialog-done" onClick={onClose} type="button">
        Done
      </button>
    </GameDialog>
  );
}
