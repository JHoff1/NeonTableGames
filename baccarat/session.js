(function initializeBaccaratSession(global) {
  const outcomes = new Set(["player", "banker", "tie"]);
  const sessions =
    global.NeonSessionFramework ||
    (typeof module !== "undefined" && module.exports
      ? require("../shared/session-framework.js")
      : null);
  const counters = ["bankerWins", "playerWins", "rounds", "streakCount", "ties"];

  function empty(bankroll = 1000) {
    return sessions.create({
      bankroll,
      counters,
      extra: { streakResult: "" },
    });
  }

  function sanitize(session, fallbackBankroll = 1000) {
    const value = sessions.sanitize(session, {
      bankroll: fallbackBankroll,
      counters,
      extra: { streakResult: "" },
    });
    value.streakResult = outcomes.has(value.streakResult) ? value.streakResult : "";
    return value;
  }

  function record(session, outcome, bankroll) {
    const current = sanitize(session, bankroll);
    const next = sessions.record(current, {
      bankroll,
      increments: {
        bankerWins: outcome === "banker" ? 1 : 0,
        playerWins: outcome === "player" ? 1 : 0,
        rounds: 1,
        ties: outcome === "tie" ? 1 : 0,
      },
    });
    if (current.streakResult === outcome) {
      next.streakCount += 1;
    } else {
      next.streakResult = outcome;
      next.streakCount = 1;
    }
    return next;
  }

  function summary(session, currentFunds) {
    const value = sanitize(session, currentFunds);
    const decidedRounds = value.playerWins + value.bankerWins;
    return {
      ...value,
      bankerRate: decidedRounds ? value.bankerWins / decidedRounds : 0,
      playerRate: decidedRounds ? value.playerWins / decidedRounds : 0,
      profit: sessions.profit(value, currentFunds),
      tieRate: value.rounds ? value.ties / value.rounds : 0,
    };
  }

  function createBigRoad(history, rows = 6) {
    const cells = [];
    let leadingTies = 0;
    let previous = null;

    history.forEach((outcome) => {
      if (outcome === "tie") {
        if (previous) previous.ties += 1;
        else leadingTies += 1;
        return;
      }
      if (!outcomes.has(outcome)) return;

      let row = 0;
      let column = 0;
      if (previous) {
        if (previous.outcome === outcome) {
          const belowIsOccupied = cells.some(
            (cell) => cell.column === previous.column && cell.row === previous.row + 1,
          );
          if (previous.row < rows - 1 && !belowIsOccupied) {
            row = previous.row + 1;
            column = previous.column;
          } else {
            row = previous.row;
            column = previous.column + 1;
            while (cells.some((cell) => cell.column === column && cell.row === row)) column += 1;
          }
        } else {
          column = Math.max(...cells.map((cell) => cell.column)) + 1;
        }
      }

      previous = { column, outcome, row, ties: cells.length ? 0 : leadingTies };
      leadingTies = 0;
      cells.push(previous);
    });

    return { cells, leadingTies };
  }

  const api = { createBigRoad, empty, outcomes, record, sanitize, summary };
  global.NeonBaccaratSession = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
