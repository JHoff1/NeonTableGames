(function initializeBlackjackTutorials(global) {
  const gameCore = global.NeonTableCore;

  function card(label, suitName) {
    return gameCore.createCard(label, suitName, "blackjack");
  }

  // Tutorial scenarios are deterministic mini-hands. Cards are ordered as:
  // player card 1, dealer upcard, player card 2, dealer hole card, then hit cards.
  const tutorialHands = [
    {
      instruction:
        "You have 13. The dealer shows a weak 5. Basic strategy says: Stand here and let the dealer take the risk of busting.",
      allowedAction: "stand",
      deck: [
        card("10", "hearts"),
        card("5", "clubs"),
        card("3", "spades"),
        card("10", "diamonds"),
        card("J", "clubs"),
      ],
      resultInstruction:
        "Result: you win. You stood on 13 because the dealer showed a weak 5. The dealer had 15, had to hit, drew a 10-value card, and busted.",
    },
    {
      instruction:
        "You have an Ace and a 2. This is a 'Soft 13' because the Ace can count as 1 or 11. You cannot bust by hitting. Let's take a card.",
      allowedAction: "hit",
      deck: [
        card("A", "spades"),
        card("6", "clubs"),
        card("2", "hearts"),
        card("10", "diamonds"),
        card("8", "clubs"),
        card("2", "spades"),
      ],
      afterHitInstruction:
        "Perfect! If your first two cards had totaled a hard 11 instead of a soft 13, you would have seen a 'Double Down' option. This lets you double your bet in exchange for exactly ONE more card--the ultimate offensive move when the dealer shows a weak card like a 6.",
      resultInstruction:
        "Result: you win. Your hit turned soft 13 into 21. The dealer finished at 18, so your 21 beat the dealer without needing blackjack.",
    },
    {
      instruction:
        "A pair of 8s totals 16--notoriously the worst starting hand in Blackjack. Standing usually loses, and hitting will likely bust you. Because you have a pair, your secret weapon is 'Splitting'. This separates them into two hands, turning a bad situation into two offensive positions.",
      allowedAction: "split",
      deck: [
        card("8", "hearts"),
        card("7", "clubs"),
        card("8", "spades"),
        card("10", "diamonds"),
        card("10", "clubs"),
        card("9", "hearts"),
      ],
      afterSplitInstruction:
        "Great split. Hand 1 is now 18, a strong total against the dealer's 7. Stand and move to Hand 2.",
      secondHandInstruction:
        "Hand 2 is 17. It is not flashy, but it is much better than playing one hard 16. Stand and let the dealer resolve the hand.",
      resultInstruction:
        "Result: Hand 1 wins and Hand 2 pushes. The dealer finished at 17. Your first split hand had 18, so it won. Your second split hand also had 17, so that hand tied the dealer and your bet was returned.",
    },
    {
      instruction:
        "You have hard 11 against a dealer 6. This is one of the clearest attacking spots in blackjack. Double down to double your bet and take exactly one more card.",
      allowedAction: "double",
      deck: [
        card("6", "hearts"),
        card("6", "clubs"),
        card("5", "spades"),
        card("10", "diamonds"),
        card("K", "clubs"),
        card("5", "hearts"),
      ],
      resultInstruction:
        "Result: push. Doubling on 11 was still the right play, but the dealer drew to 21 too. A push returns the doubled bet instead of winning or losing it.",
    },
    {
      instruction:
        "You have hard 16 against a dealer 10. It feels uncomfortable, but the dealer is showing strength. Basic strategy says to hit because standing loses too often.",
      allowedAction: "hit",
      deck: [
        card("10", "hearts"),
        card("10", "clubs"),
        card("6", "spades"),
        card("7", "diamonds"),
        card("3", "clubs"),
      ],
      afterHitInstruction:
        "Nice. You improved hard 16 to 19. Stand and make the dealer finish the hand.",
      resultInstruction:
        "Result: you win. Hitting hard 16 was risky, but standing against a dealer 10 loses too often. The hit made 19, which beat the dealer's 17.",
    },
    {
      instruction:
        "You have soft 18 against a dealer 9. Soft 18 looks strong, but against a strong dealer upcard it often needs improvement. Hit because the ace protects you from busting.",
      allowedAction: "hit",
      deck: [
        card("A", "spades"),
        card("9", "clubs"),
        card("7", "hearts"),
        card("7", "diamonds"),
        card("2", "clubs"),
        card("10", "spades"),
      ],
      afterHitInstruction:
        "Good hit. Soft 18 became soft 20. Stand and let the dealer play out the hand.",
      resultInstruction:
        "Result: you win. Soft 18 improved to soft 20, and the dealer busted while trying to draw from 16.",
    },
    {
      instruction:
        "You have two 10-value cards for a total of 20. Even against a weak dealer 6, do not split 10s. A made 20 is already one of the best hands you can have.",
      allowedAction: "stand",
      deck: [
        card("10", "hearts"),
        card("6", "clubs"),
        card("K", "spades"),
        card("10", "diamonds"),
        card("Q", "clubs"),
      ],
      resultInstruction:
        "Result: you win. You kept the made 20 instead of splitting 10s. The dealer busted from 16, and your strong hand was paid.",
    },
  ];

  global.NeonBlackjackTutorials = Object.freeze(tutorialHands);
})(typeof globalThis !== "undefined" ? globalThis : window);
