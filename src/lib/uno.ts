// Pure Uno rules engine. Server is the only caller that mutates state.
export type Color = "red" | "yellow" | "green" | "blue";
export type Value =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "reverse" | "draw2" | "wild" | "wild4";
export interface Card { id: string; color: Color | "wild"; value: Value }

export interface UnoState {
  deck: Card[];
  discard: Card[];
  hands: Record<string, Card[]>;
  order: string[];
  turn: number;
  direction: 1 | -1;
  currentColor: Color;
  winner: string | null;
  log: string;
}

export const COLORS: Color[] = ["red", "yellow", "green", "blue"];

export function buildDeck(): Card[] {
  const cards: Card[] = [];
  let n = 0;
  for (const color of COLORS) {
    cards.push({ id: `c${n++}`, color, value: "0" });
    for (const v of ["1","2","3","4","5","6","7","8","9","skip","reverse","draw2"] as Value[]) {
      cards.push({ id: `c${n++}`, color, value: v });
      cards.push({ id: `c${n++}`, color, value: v });
    }
  }
  for (let i = 0; i < 4; i++) {
    cards.push({ id: `c${n++}`, color: "wild", value: "wild" });
    cards.push({ id: `c${n++}`, color: "wild", value: "wild4" });
  }
  return cards;
}

export function shuffle<T>(arr: T[], rand = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function startGame(playerIds: string[], rand = Math.random): UnoState {
  if (playerIds.length < 2) throw new Error("Need at least 2 players");
  const deck = shuffle(buildDeck(), rand);
  const hands: Record<string, Card[]> = {};
  for (const p of playerIds) hands[p] = deck.splice(0, 7);
  // First discard must be a number card
  let idx = deck.findIndex((c) => /^\d$/.test(c.value));
  const first = deck.splice(idx, 1)[0];
  return {
    deck, discard: [first], hands, order: [...playerIds], turn: 0, direction: 1,
    currentColor: first.color as Color, winner: null, log: "Game started",
  };
}

export function canPlay(card: Card, s: UnoState): boolean {
  const top = s.discard[s.discard.length - 1];
  if (card.color === "wild") return true;
  return card.color === s.currentColor || card.value === top.value;
}

function next(s: UnoState, steps = 1) {
  const n = s.order.length;
  return (((s.turn + s.direction * steps) % n) + n) % n;
}

function draw(s: UnoState, pid: string, count: number) {
  for (let i = 0; i < count; i++) {
    if (s.deck.length === 0) {
      const top = s.discard.pop()!;
      s.deck = shuffle(s.discard);
      s.discard = [top];
      if (s.deck.length === 0) return;
    }
    s.hands[pid].push(s.deck.pop()!);
  }
}

export function playCard(prev: UnoState, pid: string, cardId: string, chosen?: Color): UnoState {
  const s: UnoState = structuredClone(prev);
  if (s.winner) throw new Error("Game over");
  if (s.order[s.turn] !== pid) throw new Error("Not your turn");
  const hand = s.hands[pid];
  const i = hand.findIndex((c) => c.id === cardId);
  if (i < 0) throw new Error("Card not in hand");
  const card = hand[i];
  if (!canPlay(card, s)) throw new Error("Can't play that card");
  if (card.color === "wild" && !chosen) throw new Error("Choose a color");
  hand.splice(i, 1);
  s.discard.push(card);
  s.currentColor = card.color === "wild" ? chosen! : card.color;
  if (hand.length === 0) {
    s.winner = pid;
    s.log = "wins!";
    return s;
  }
  const two = s.order.length === 2;
  switch (card.value) {
    case "skip": s.turn = next(s, 2); break;
    case "reverse":
      s.direction = (s.direction * -1) as 1 | -1;
      s.turn = two ? s.turn : next(s, 1);
      break;
    case "draw2": draw(s, s.order[next(s)], 2); s.turn = next(s, 2); break;
    case "wild4": draw(s, s.order[next(s)], 4); s.turn = next(s, 2); break;
    default: s.turn = next(s, 1);
  }
  s.log = `played ${card.color === "wild" ? chosen : card.color} ${card.value}`;
  return s;
}

export function drawCard(prev: UnoState, pid: string): UnoState {
  const s: UnoState = structuredClone(prev);
  if (s.winner) throw new Error("Game over");
  if (s.order[s.turn] !== pid) throw new Error("Not your turn");
  draw(s, pid, 1);
  s.turn = next(s, 1);
  s.log = "drew a card";
  return s;
}
