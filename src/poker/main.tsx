import React from "react";
import ReactDOM from "react-dom/client";
import "../../shared/game-core.js";
import "../../shared/game-settings.js";
import "../../shared/session-framework.js";
import "../../shared/three-card-poker-engine.js";
import "../../three-card-poker/tutorial-data.js";
import "../../shared/error-monitoring.js";
import "../styles/game-system.css";
import "./poker-react.css";
import { PokerApp } from "./PokerApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PokerApp />
  </React.StrictMode>,
);
