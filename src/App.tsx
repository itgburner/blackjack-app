import { useState } from "react";
import "./App.css";

type Suit = "♠" | "♥" | "♦" | "♣";

type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

type GameStatus = "not-started" | "playing" | "finished";

interface CardData {
  id: string;
  rank: Rank;
  suit: Suit;
  value: number;
}

type HandData = CardData[];

interface PlayerHand {
  cards: HandData;
  bet: number;
  doubledDown: boolean;
}

interface CardProps {
  card: CardData;
  hidden?: boolean;
}

interface HandProps {
  title: string;
  hand: HandData;
  bet?: number;
  doubledDown?: boolean;
  hideFirstCard?: boolean;
  active?: boolean;
}

interface DrawResult {
  card: CardData;
  remainingDeck: CardData[];
}

interface SettlementResult {
  totalReturn: number;
  message: string;
}

const STARTING_BALANCE = 1000;
const MINIMUM_BET = 5;
const DEFAULT_BET = 25;

const suits: Suit[] = ["♠", "♥", "♦", "♣"];

const ranks: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatUSD(amount: number): string {
  return usdFormatter.format(amount);
}

function getCardValue(rank: Rank): number {
  if (rank === "A") {
    return 11;
  }

  if (rank === "J" || rank === "Q" || rank === "K") {
    return 10;
  }

  return Number(rank);
}

function createDeck(): CardData[] {
  const deck: CardData[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: crypto.randomUUID(),
        rank,
        suit,
        value: getCardValue(rank),
      });
    }
  }

  return shuffleDeck(deck);
}

function shuffleDeck(deck: CardData[]): CardData[] {
  const shuffledDeck = [...deck];

  for (
    let currentIndex = shuffledDeck.length - 1;
    currentIndex > 0;
    currentIndex--
  ) {
    const randomIndex = Math.floor(
      Math.random() * (currentIndex + 1),
    );

    [shuffledDeck[currentIndex], shuffledDeck[randomIndex]] = [
      shuffledDeck[randomIndex],
      shuffledDeck[currentIndex],
    ];
  }

  return shuffledDeck;
}

function drawCard(deck: CardData[]): DrawResult {
  if (deck.length === 0) {
    throw new Error("Cannot draw from an empty deck.");
  }

  const remainingDeck = [...deck];
  const card = remainingDeck.pop();

  if (!card) {
    throw new Error("Unable to draw a card.");
  }

  return {
    card,
    remainingDeck,
  };
}

function calculateHandValue(hand: HandData): number {
  let total = hand.reduce(
    (sum, card) => sum + card.value,
    0,
  );

  let aceCount = hand.filter(
    (card) => card.rank === "A",
  ).length;

  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount--;
  }

  return total;
}

function isBlackjack(hand: HandData): boolean {
  return (
    hand.length === 2 &&
    calculateHandValue(hand) === 21
  );
}

function canSplit(hand: HandData): boolean {
  return (
    hand.length === 2 &&
    hand[0].rank === hand[1].rank
  );
}

function PlayingCard({
  card,
  hidden = false,
}: CardProps): React.ReactElement {
  if (hidden) {
    return <div className="card hidden-card">?</div>;
  }

  const isRed =
    card.suit === "♥" || card.suit === "♦";

  return (
    <div className={`card ${isRed ? "red" : ""}`}>
      <span>{card.rank}</span>
      <span>{card.suit}</span>
    </div>
  );
}

function Hand({
  title,
  hand,
  bet,
  doubledDown = false,
  hideFirstCard = false,
  active = false,
}: HandProps): React.ReactElement {
  return (
    <section
      className={`hand ${active ? "active-hand" : ""}`}
    >
      <h2>{title}</h2>

      {bet !== undefined && (
        <p className="hand-bet">
          Bet: {formatUSD(bet)}
          {doubledDown ? " — Doubled Down" : ""}
        </p>
      )}

      <div className="cards">
        {hand.map((card, index) => (
          <PlayingCard
            key={card.id}
            card={card}
            hidden={hideFirstCard && index === 0}
          />
        ))}
      </div>

      {!hideFirstCard && (
        <p className="total">
          Total: {calculateHandValue(hand)}
        </p>
      )}
    </section>
  );
}

export default function App(): React.ReactElement {
  const [deck, setDeck] = useState<CardData[]>([]);
  const [playerHands, setPlayerHands] = useState<
    PlayerHand[]
  >([]);
  const [dealerHand, setDealerHand] =
    useState<HandData>([]);
  const [activeHandIndex, setActiveHandIndex] =
    useState(0);

  const [gameStatus, setGameStatus] =
    useState<GameStatus>("not-started");

  const [balance, setBalance] =
    useState(STARTING_BALANCE);
  const [betAmount, setBetAmount] =
    useState(DEFAULT_BET);

  const [message, setMessage] = useState(
    "Choose a wager and press Deal.",
  );

  const activePlayerHand =
    playerHands[activeHandIndex];

  const activeCards =
    activePlayerHand?.cards ?? [];

  function startGame(): void {
    if (gameStatus === "playing") {
      return;
    }

    if (betAmount < MINIMUM_BET) {
      setMessage(
        `The minimum wager is ${formatUSD(
          MINIMUM_BET,
        )}.`,
      );
      return;
    }

    if (betAmount > balance) {
      setMessage(
        "You do not have enough money for that wager.",
      );
      return;
    }

    let nextDeck = createDeck();

    const playerCardOne = drawCard(nextDeck);
    nextDeck = playerCardOne.remainingDeck;

    const dealerCardOne = drawCard(nextDeck);
    nextDeck = dealerCardOne.remainingDeck;

    const playerCardTwo = drawCard(nextDeck);
    nextDeck = playerCardTwo.remainingDeck;

    const dealerCardTwo = drawCard(nextDeck);
    nextDeck = dealerCardTwo.remainingDeck;

    const newPlayerCards: HandData = [
      playerCardOne.card,
      playerCardTwo.card,
    ];

    const newDealerHand: HandData = [
      dealerCardOne.card,
      dealerCardTwo.card,
    ];

    const newPlayerHand: PlayerHand = {
      cards: newPlayerCards,
      bet: betAmount,
      doubledDown: false,
    };

    setBalance(
      (currentBalance) =>
        currentBalance - betAmount,
    );

    setDeck(nextDeck);
    setPlayerHands([newPlayerHand]);
    setDealerHand(newDealerHand);
    setActiveHandIndex(0);

    const playerHasBlackjack =
      isBlackjack(newPlayerCards);

    const dealerHasBlackjack =
      isBlackjack(newDealerHand);

    if (
      playerHasBlackjack ||
      dealerHasBlackjack
    ) {
      settleInitialBlackjack(
        newPlayerCards,
        newDealerHand,
        betAmount,
      );
      return;
    }

    setGameStatus("playing");
    setMessage(
      "Choose Hit, Stand, Double Down, or Split.",
    );
  }

  function settleInitialBlackjack(
    playerCards: HandData,
    dealerCards: HandData,
    wager: number,
  ): void {
    const playerHasBlackjack =
      isBlackjack(playerCards);

    const dealerHasBlackjack =
      isBlackjack(dealerCards);

    setGameStatus("finished");

    if (
      playerHasBlackjack &&
      dealerHasBlackjack
    ) {
      setBalance(
        (currentBalance) =>
          currentBalance + wager,
      );

      setMessage(
        `Both have Blackjack. ${formatUSD(
          wager,
        )} was returned.`,
      );

      return;
    }

    if (playerHasBlackjack) {
      const profit = wager * 1.5;
      const totalReturn = wager + profit;

      setBalance(
        (currentBalance) =>
          currentBalance + totalReturn,
      );

      setMessage(
        `Blackjack! You won ${formatUSD(
          profit,
        )}.`,
      );

      return;
    }

    setMessage(
      `Dealer has Blackjack. You lost ${formatUSD(
        wager,
      )}.`,
    );
  }

  function hit(): void {
    if (
      gameStatus !== "playing" ||
      !activePlayerHand ||
      activePlayerHand.doubledDown
    ) {
      return;
    }

    const draw = drawCard(deck);

    const updatedHands = playerHands.map(
      (
        playerHand,
        index,
      ): PlayerHand => {
        if (index !== activeHandIndex) {
          return playerHand;
        }

        return {
          ...playerHand,
          cards: [
            ...playerHand.cards,
            draw.card,
          ],
        };
      },
    );

    setDeck(draw.remainingDeck);
    setPlayerHands(updatedHands);

    const updatedTotal = calculateHandValue(
      updatedHands[activeHandIndex].cards,
    );

    if (updatedTotal > 21) {
      setMessage(
        `Hand ${
          activeHandIndex + 1
        } busted with ${updatedTotal}.`,
      );

      moveToNextHand(
        updatedHands,
        draw.remainingDeck,
      );
      return;
    }

    if (updatedTotal === 21) {
      setMessage(
        `Hand ${
          activeHandIndex + 1
        } reached 21.`,
      );

      moveToNextHand(
        updatedHands,
        draw.remainingDeck,
      );
    }
  }

  function stand(): void {
    if (
      gameStatus !== "playing" ||
      !activePlayerHand
    ) {
      return;
    }

    moveToNextHand(playerHands, deck);
  }

  function doubleDown(): void {
    if (
      gameStatus !== "playing" ||
      !activePlayerHand ||
      activePlayerHand.cards.length !== 2 ||
      activePlayerHand.doubledDown
    ) {
      return;
    }

    if (balance < activePlayerHand.bet) {
      setMessage(
        `You need another ${formatUSD(
          activePlayerHand.bet,
        )} to double down.`,
      );
      return;
    }

    const additionalWager =
      activePlayerHand.bet;

    const draw = drawCard(deck);

    const updatedHands = playerHands.map(
      (
        playerHand,
        index,
      ): PlayerHand => {
        if (index !== activeHandIndex) {
          return playerHand;
        }

        return {
          ...playerHand,
          cards: [
            ...playerHand.cards,
            draw.card,
          ],
          bet: playerHand.bet * 2,
          doubledDown: true,
        };
      },
    );

    const doubledHand =
      updatedHands[activeHandIndex];

    const doubledTotal =
      calculateHandValue(doubledHand.cards);

    setBalance(
      (currentBalance) =>
        currentBalance - additionalWager,
    );

    setDeck(draw.remainingDeck);
    setPlayerHands(updatedHands);

    setMessage(
      `Double down: wager increased to ${formatUSD(
        doubledHand.bet,
      )}. One card was drawn. Final total: ${doubledTotal}.`,
    );

    moveToNextHand(
      updatedHands,
      draw.remainingDeck,
    );
  }

  function split(): void {
    if (
      gameStatus !== "playing" ||
      playerHands.length !== 1 ||
      !activePlayerHand ||
      !canSplit(activePlayerHand.cards)
    ) {
      return;
    }

    if (balance < activePlayerHand.bet) {
      setMessage(
        `You need another ${formatUSD(
          activePlayerHand.bet,
        )} to split.`,
      );
      return;
    }

    let nextDeck = [...deck];

    const firstDraw = drawCard(nextDeck);
    nextDeck = firstDraw.remainingDeck;

    const secondDraw = drawCard(nextDeck);
    nextDeck = secondDraw.remainingDeck;

    const firstHand: PlayerHand = {
      cards: [
        activePlayerHand.cards[0],
        firstDraw.card,
      ],
      bet: activePlayerHand.bet,
      doubledDown: false,
    };

    const secondHand: PlayerHand = {
      cards: [
        activePlayerHand.cards[1],
        secondDraw.card,
      ],
      bet: activePlayerHand.bet,
      doubledDown: false,
    };

    setBalance(
      (currentBalance) =>
        currentBalance -
        activePlayerHand.bet,
    );

    setDeck(nextDeck);
    setPlayerHands([
      firstHand,
      secondHand,
    ]);
    setActiveHandIndex(0);

    setMessage(
      `Cards split. An additional ${formatUSD(
        activePlayerHand.bet,
      )} was wagered. Playing hand 1.`,
    );
  }

  function moveToNextHand(
    currentHands: PlayerHand[],
    currentDeck: CardData[],
  ): void {
    const nextHandIndex =
      activeHandIndex + 1;

    if (
      nextHandIndex <
      currentHands.length
    ) {
      setActiveHandIndex(nextHandIndex);

      setMessage(
        `Playing hand ${
          nextHandIndex + 1
        }.`,
      );

      return;
    }

    playDealer(
      currentHands,
      currentDeck,
    );
  }

  function playDealer(
    currentPlayerHands: PlayerHand[],
    currentDeck: CardData[],
  ): void {
    let nextDeck = [...currentDeck];
    const nextDealerHand = [
      ...dealerHand,
    ];

    const playerHasPlayableHand =
      currentPlayerHands.some(
        (playerHand) =>
          calculateHandValue(
            playerHand.cards,
          ) <= 21,
      );

    if (playerHasPlayableHand) {
      while (
        calculateHandValue(
          nextDealerHand,
        ) < 17
      ) {
        const draw =
          drawCard(nextDeck);

        nextDeck =
          draw.remainingDeck;

        nextDealerHand.push(
          draw.card,
        );
      }
    }

    const settlement = settleHands(
      currentPlayerHands,
      nextDealerHand,
    );

    setDeck(nextDeck);
    setDealerHand(nextDealerHand);

    setBalance(
      (currentBalance) =>
        currentBalance +
        settlement.totalReturn,
    );

    setGameStatus("finished");
    setMessage(settlement.message);
  }

  function settleHands(
    hands: PlayerHand[],
    finalDealerHand: HandData,
  ): SettlementResult {
    const dealerTotal =
      calculateHandValue(
        finalDealerHand,
      );

    let totalReturn = 0;

    const resultMessages = hands.map(
      (
        playerHand,
        index,
      ): string => {
        const playerTotal =
          calculateHandValue(
            playerHand.cards,
          );

        const handName =
          hands.length > 1
            ? `Hand ${index + 1}`
            : "Player";

        if (playerTotal > 21) {
          return `${handName}: bust, lost ${formatUSD(
            playerHand.bet,
          )}`;
        }

        if (dealerTotal > 21) {
          const handReturn =
            playerHand.bet * 2;

          totalReturn +=
            handReturn;

          return `${handName}: dealer bust, won ${formatUSD(
            playerHand.bet,
          )}`;
        }

        if (
          playerTotal >
          dealerTotal
        ) {
          const handReturn =
            playerHand.bet * 2;

          totalReturn +=
            handReturn;

          return `${handName}: ${playerTotal} beats ${dealerTotal}, won ${formatUSD(
            playerHand.bet,
          )}`;
        }

        if (
          playerTotal ===
          dealerTotal
        ) {
          totalReturn +=
            playerHand.bet;

          return `${handName}: push, ${formatUSD(
            playerHand.bet,
          )} returned`;
        }

        return `${handName}: ${dealerTotal} beats ${playerTotal}, lost ${formatUSD(
          playerHand.bet,
        )}`;
      },
    );

    return {
      totalReturn,
      message:
        resultMessages.join(" | "),
    };
  }

  function resetBankroll(): void {
    if (gameStatus === "playing") {
      return;
    }

    setDeck([]);
    setPlayerHands([]);
    setDealerHand([]);
    setActiveHandIndex(0);
    setBalance(STARTING_BALANCE);
    setBetAmount(DEFAULT_BET);
    setGameStatus("not-started");

    setMessage(
      "Bankroll reset. Choose a wager and press Deal.",
    );
  }

  function updateBetAmount(
    value: string,
  ): void {
    const parsedValue =
      Number(value);

    if (
      !Number.isFinite(parsedValue)
    ) {
      return;
    }

    setBetAmount(
      Math.max(0, parsedValue),
    );
  }

  const dealerCardIsVisible =
    gameStatus === "finished";

  const splitAvailable =
    gameStatus === "playing" &&
    playerHands.length === 1 &&
    activePlayerHand !== undefined &&
    canSplit(activeCards);

  const doubleDownAvailable =
    gameStatus === "playing" &&
    activePlayerHand !== undefined &&
    activePlayerHand.cards.length === 2 &&
    !activePlayerHand.doubledDown;

  const canDeal =
    gameStatus !== "playing" &&
    balance >= MINIMUM_BET &&
    betAmount >= MINIMUM_BET &&
    betAmount <= balance;

  return (
    <main className="game">
      <h1>TypeScript Blackjack</h1>

      <section className="bankroll">
        <div>
          <span>Balance</span>
          <strong>
            {formatUSD(balance)}
          </strong>
        </div>

        <label>
          Wager
          <input
            type="number"
            min={MINIMUM_BET}
            max={balance}
            step="5"
            value={betAmount}
            disabled={
              gameStatus === "playing"
            }
            onChange={(event) =>
              updateBetAmount(
                event.target.value,
              )
            }
          />
        </label>

        <div className="bet-buttons">
          {[5, 10, 25, 50, 100].map(
            (amount) => (
              <button
                key={amount}
                type="button"
                disabled={
                  gameStatus ===
                    "playing" ||
                  amount > balance
                }
                onClick={() =>
                  setBetAmount(amount)
                }
              >
                {formatUSD(amount)}
              </button>
            ),
          )}
        </div>
      </section>

      <p className="message">
        {message}
      </p>

      {balance < MINIMUM_BET &&
        gameStatus !== "playing" && (
          <p className="out-of-money">
            Your balance is below the
            minimum wager.
          </p>
        )}

      {dealerHand.length > 0 && (
        <Hand
          title="Dealer"
          hand={dealerHand}
          hideFirstCard={
            !dealerCardIsVisible
          }
        />
      )}

      <div className="player-hands">
        {playerHands.map(
          (playerHand, index) => (
            <Hand
              key={
                playerHand.cards[0]
                  ?.id ?? index
              }
              title={
                playerHands.length > 1
                  ? `Player Hand ${
                      index + 1
                    }`
                  : "Player"
              }
              hand={
                playerHand.cards
              }
              bet={playerHand.bet}
              doubledDown={
                playerHand.doubledDown
              }
              active={
                gameStatus ===
                  "playing" &&
                index ===
                  activeHandIndex
              }
            />
          ),
        )}
      </div>

      <div className="controls">
        {gameStatus !== "playing" && (
          <button
            type="button"
            disabled={!canDeal}
            onClick={startGame}
          >
            {gameStatus ===
            "finished"
              ? `Deal Again — ${formatUSD(
                  betAmount,
                )}`
              : `Deal — ${formatUSD(
                  betAmount,
                )}`}
          </button>
        )}

        {gameStatus === "playing" && (
          <>
            <button
              type="button"
              onClick={hit}
            >
              Hit
            </button>

            <button
              type="button"
              onClick={stand}
            >
              Stand
            </button>

            {doubleDownAvailable && (
              <button
                type="button"
                disabled={
                  !activePlayerHand ||
                  balance <
                    activePlayerHand.bet
                }
                onClick={doubleDown}
              >
                Double Down
              </button>
            )}

            {splitAvailable && (
              <button
                type="button"
                disabled={
                  !activePlayerHand ||
                  balance <
                    activePlayerHand.bet
                }
                onClick={split}
              >
                Split
              </button>
            )}
          </>
        )}

        {gameStatus !== "playing" && (
          <button
            type="button"
            onClick={resetBankroll}
          >
            Reset Bankroll
          </button>
        )}
      </div>
    </main>
  );
}