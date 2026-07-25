import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { GameSettings } from "../shared/GameSettings";
import { GameShell } from "../shared/GameShell";
import { BaccaratController } from "./BaccaratController";
import { BaccaratControls } from "./BaccaratControls";
import { BaccaratSession } from "./BaccaratSession";
import { BaccaratTable } from "./BaccaratTable";

export function BaccaratApp() {
  const controller = useMemo(() => new BaccaratController(), []);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => controller.attachBrowserFeatures(), [controller]);
  return (
    <>
      <GameShell
        controls={<BaccaratControls controller={controller} state={state} />}
        eyebrow="Mini Baccarat"
        gameId="baccarat"
        onNewGame={() => controller.newGame()}
        onOpenSettings={() => setSettingsOpen(true)}
        rulesHref="../baccarat-rules/index.html"
        session={<BaccaratSession controller={controller} />}
        status={[
          { id: "baccarat-bankroll", label: "Bankroll", value: controller.money(state.bankroll) },
          { id: "baccarat-bet", label: "Bet", value: controller.money(state.bet) },
          { id: "baccarat-shoe", label: "Cards", value: String(state.shoe.length) },
          {
            id: "baccarat-high-bankroll",
            label: "Best Run",
            value: controller.money(state.highBankroll),
          },
        ]}
        tutorialActive={state.tutorial.active}
      >
        <BaccaratTable controller={controller} state={state} />
      </GameShell>
      <GameSettings
        autoRevealId="setting-auto-reveal"
        autoRevealLabel="Auto-reveal Player cards"
        autoRevealName="autoRevealPlayer"
        gameId="baccarat"
        onClose={() => setSettingsOpen(false)}
        onSetting={(name, value) => controller.setSetting(name, value)}
        open={settingsOpen}
        settings={state.settings}
      />
    </>
  );
}
