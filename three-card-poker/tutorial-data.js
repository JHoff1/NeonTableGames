(function initializeThreeCardPokerTutorials(global) {
  global.NeonThreeCardPokerTutorials = [
    {
      action: "play",
      ante: 25,
      dealer: [
        ["J", "hearts"],
        ["8", "clubs"],
        ["5", "diamonds"],
      ],
      intro: "Q-6-4 is the exact basic-strategy boundary. Match the Ante and Play.",
      pairPlus: 0,
      player: [
        ["Q", "spades"],
        ["6", "hearts"],
        ["4", "clubs"],
      ],
      result:
        "The Dealer has only jack-high and does not qualify. Your Ante wins while Play pushes.",
    },
    {
      action: "fold",
      ante: 25,
      dealer: [
        ["K", "hearts"],
        ["9", "clubs"],
        ["5", "diamonds"],
      ],
      intro: "Q-6-3 falls just below the Q-6-4 threshold. Fold this hand.",
      pairPlus: 0,
      player: [
        ["Q", "clubs"],
        ["6", "diamonds"],
        ["3", "hearts"],
      ],
      result: "Folding avoided the additional Play wager on a hand below the strategy threshold.",
    },
    {
      action: "play",
      ante: 25,
      dealer: [
        ["K", "hearts"],
        ["9", "clubs"],
        ["5", "diamonds"],
      ],
      intro: "A pair always Plays. Pair Plus also pays independently on this hand.",
      pairPlus: 5,
      player: [
        ["8", "clubs"],
        ["8", "diamonds"],
        ["2", "hearts"],
      ],
      result: "Your pair beats the Dealer's king-high hand, and Pair Plus pays 1 to 1.",
    },
    {
      action: "play",
      ante: 25,
      dealer: [
        ["Q", "hearts"],
        ["J", "clubs"],
        ["9", "diamonds"],
      ],
      intro:
        "A straight always Plays and earns the Ante Bonus regardless of the Dealer comparison.",
      pairPlus: 5,
      player: [
        ["7", "clubs"],
        ["6", "diamonds"],
        ["5", "hearts"],
      ],
      result: "The straight wins, earns a 1 to 1 Ante Bonus, and pays Pair Plus at 6 to 1.",
    },
    {
      action: "play",
      ante: 25,
      dealer: [
        ["7", "hearts"],
        ["6", "clubs"],
        ["5", "diamonds"],
      ],
      intro: "Pair Plus is separate from Ante and Play. Continue with this pair.",
      pairPlus: 5,
      player: [
        ["4", "clubs"],
        ["4", "diamonds"],
        ["A", "hearts"],
      ],
      result: "The Dealer's straight wins the comparison, but your Pair Plus wager still pays.",
    },
    {
      action: "play",
      ante: 25,
      dealer: [
        ["Q", "hearts"],
        ["9", "clubs"],
        ["4", "diamonds"],
      ],
      intro: "Equal hand ranks and kickers produce a push. Play this qualifying queen-high hand.",
      pairPlus: 0,
      player: [
        ["Q", "clubs"],
        ["9", "diamonds"],
        ["4", "hearts"],
      ],
      result: "Both hands are Q-9-4, so Ante and Play are returned as a push.",
    },
  ];
})(typeof globalThis !== "undefined" ? globalThis : window);
