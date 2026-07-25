import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { GameSettings } from "../shared/GameSettings";
import { GameShell } from "../shared/GameShell";
import { PokerController } from "./PokerController";
import { PokerControls } from "./PokerControls";
import { PokerSession } from "./PokerSession";
import { PokerTable } from "./PokerTable";

export function PokerApp() {
  const controller = useMemo(() => new PokerController(), []);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => controller.attachBrowserFeatures(), [controller]);
  return (
    <>
      <GameShell
        controls={<PokerControls controller={controller} state={state} />}
        eyebrow="Three Card Poker"
        gameId="poker"
        onNewGame={() => controller.newGame()}
        onOpenSettings={() => setSettingsOpen(true)}
        rulesHref="../three-card-poker-rules/index.html"
        session={<PokerSession controller={controller} state={state} />}
        status={[
          { id: "poker-bankroll", label: "Bankroll", value: controller.money(state.bankroll) },
          { id: "poker-ante", label: "Ante", value: controller.money(state.ante) },
          {
            id: "poker-pair-plus",
            label: "Pair Plus",
            value: controller.money(state.pairPlus),
          },
          {
            id: "poker-high-bankroll",
            label: "Best Run",
            value: controller.money(state.highBankroll),
          },
        ]}
        tutorialActive={state.tutorial.active}
      >
        <PokerTable controller={controller} state={state} />
      </GameShell>
      <GameSettings
        autoRevealId="poker-setting-auto-reveal"
        autoRevealLabel="Auto-reveal Player cards"
        autoRevealName="autoRevealPoker"
        gameId="poker"
        onClose={() => setSettingsOpen(false)}
        onSetting={(name, value) => controller.setSetting(name, value)}
        open={settingsOpen}
        settings={state.settings}
      />
    </>
  );
}
