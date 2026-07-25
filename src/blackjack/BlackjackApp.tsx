import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { GameShell } from "../shared/GameShell";
import { BlackjackController } from "./BlackjackController";
import { BlackjackControls } from "./BlackjackControls";
import { BlackjackSession } from "./BlackjackSession";
import { BlackjackSettings } from "./BlackjackSettings";
import { BlackjackTable } from "./BlackjackTable";
import { BlackjackTutorial } from "./BlackjackTutorial";

export function BlackjackApp() {
  const controller = useMemo(() => new BlackjackController(), []);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeHand = state.hands[state.activeHand];
  const hiddenDealer = state.dealer.length > 1 && !state.revealDealer;
  const dealerTotal = hiddenDealer
    ? String(state.dealer[0]?.value || 0)
    : state.dealer.length
      ? controller.handLabel(state.dealer)
      : "0";

  useEffect(() => controller.attachBrowserFeatures(), [controller]);

  const session = <BlackjackSession controller={controller} state={state} />;
  const controls = <BlackjackControls controller={controller} state={state} />;

  return (
    <>
      <GameShell
        controls={controls}
        eyebrow="Blackjack"
        gameId="blackjack"
        onNewGame={() => controller.newGame()}
        onOpenSettings={() => setSettingsOpen(true)}
        rulesHref="../blackjack-rules/index.html"
        session={session}
        status={[
          { id: "bankroll", label: "Bankroll", value: controller.money(state.bankroll) },
          { id: "bet", label: "Bet", value: controller.money(controller.tableBet()) },
          { id: "shoe", label: "Cards", value: String(state.deck.length) },
          { id: "high-bankroll", label: "Best Run", value: controller.money(state.highBankroll) },
        ]}
        tutorialActive={state.tutorial.active}
      >
        <BlackjackTable
          activeHand={state.activeHand}
          betChips={state.betChips}
          dealer={state.dealer}
          dealerTotal={dealerTotal}
          handLabel={(cards) => controller.handLabel(cards)}
          hands={state.hands}
          message={state.message}
          phase={state.phase}
          playerTotal={activeHand ? controller.handLabel(activeHand.cards) : "0"}
          revealDealer={state.revealDealer}
          tutorial={
            <BlackjackTutorial
              controller={controller}
              total={window.NeonBlackjackTutorials.length}
              tutorial={state.tutorial}
            />
          }
          tutorialActive={state.tutorial.active}
        />
      </GameShell>
      <BlackjackSettings
        controller={controller}
        onClose={() => setSettingsOpen(false)}
        open={settingsOpen}
        state={state}
      />
    </>
  );
}
