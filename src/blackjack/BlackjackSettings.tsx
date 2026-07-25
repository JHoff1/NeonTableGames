import type { BlackjackController } from "./BlackjackController";
import type { BlackjackState } from "./types";
import { GameDialog } from "../shared/GameDialog";

export function BlackjackSettings({
  controller,
  onClose,
  open,
  state,
}: {
  controller: BlackjackController;
  onClose(): void;
  open: boolean;
  state: BlackjackState;
}) {
  const hapticsSupported = typeof navigator.vibrate === "function";
  return (
    <GameDialog id="blackjack-settings-dialog" onClose={onClose} open={open} title="Game Settings">
      <label className="setting-row">
        <span>
          <strong>Sound</strong>
          <small>Play subtle card and result cues in every game.</small>
        </span>
        <input
          checked={state.settings.sound}
          id="blackjack-setting-sound"
          onChange={(event) => controller.setSetting("sound", event.target.checked)}
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
          checked={hapticsSupported && state.settings.haptics}
          disabled={!hapticsSupported}
          id="blackjack-setting-haptics"
          onChange={(event) => controller.setSetting("haptics", event.target.checked)}
          type="checkbox"
        />
      </label>
      <button className="primary dialog-done" onClick={onClose} type="button">
        Done
      </button>
    </GameDialog>
  );
}
