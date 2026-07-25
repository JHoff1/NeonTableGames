(function initializeBaccaratTutorials(global) {
  global.NeonBaccaratTutorials = Object.freeze([
    {
      betType: "player",
      cards: [
        ["4", "hearts"],
        ["3", "clubs"],
        ["5", "spades"],
        ["4", "diamonds"],
      ],
      intro:
        "Start with a Player bet. Both sides receive two cards, and a natural 8 or 9 ends the round immediately.",
      result: "Player wins 9 to 7 with a natural 9. No third cards are drawn.",
    },
    {
      betType: "banker",
      cards: [
        ["2", "hearts"],
        ["A", "clubs"],
        ["2", "spades"],
        ["2", "diamonds"],
        ["2", "clubs"],
        ["6", "spades"],
      ],
      intro:
        "Now bet Banker. The Player draws automatically on 4, then the Banker decision uses the Player's third card.",
      result: "Banker wins 9 to 6. Banker bets pay 0.95 to 1 because a 5% commission is applied.",
    },
    {
      betType: "tie",
      cards: [
        ["3", "hearts"],
        ["4", "clubs"],
        ["4", "spades"],
        ["3", "diamonds"],
      ],
      intro: "Finish with a Tie bet. A Tie wins only when both final totals match.",
      result: "The round ties at 7. The Tie bet pays 8 to 1; Player and Banker bets would push.",
    },
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
