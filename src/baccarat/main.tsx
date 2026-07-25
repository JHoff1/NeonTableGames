import React from "react";
import ReactDOM from "react-dom/client";
import "../../shared/game-core.js";
import "../../shared/game-settings.js";
import "../../shared/session-framework.js";
import "../../shared/baccarat-engine.js";
import "../../baccarat/session.js";
import "../../baccarat/tutorial-data.js";
import "../../shared/error-monitoring.js";
import "../styles/game-system.css";
import "./baccarat-react.css";
import { BaccaratApp } from "./BaccaratApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BaccaratApp />
  </React.StrictMode>,
);
