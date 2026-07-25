import "../../shared/error-monitoring.js";
import "../../shared/game-core.js";
import "../../shared/game-settings.js";
import "../../shared/session-framework.js";
import "../../shared/blackjack-engine.js";
import "../../blackjack/tutorial-data.js";
import "../styles/game-system.css";
import "./blackjack-react.css";
import { createRoot } from "react-dom/client";

async function start() {
  const { BlackjackApp } = await import("./BlackjackApp");
  const root = document.querySelector("#blackjack-app");
  if (!root) throw new Error("Blackjack application root was not found.");
  createRoot(root).render(<BlackjackApp />);
}

void start();
