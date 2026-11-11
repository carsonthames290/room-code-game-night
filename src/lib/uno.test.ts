import { describe, expect, it } from "vitest";
import { buildDeck, playCard, startGame, type UnoState } from "./uno";

const base = (): UnoState => ({
  deck: buildDeck().slice(0, 20),
  discard: [{ id: "t", color: "red", value: "5" }],
  hands: {
    a: [{ id: "a1", color: "red", value: "draw2" }, { id: "a2", color: "blue", value: "1" }, { id: "a3", color: "wild", value: "wild4" }],
    b: [{ id: "b1", color: "green", value: "3" }],
    c: [{ id: "c1", color: "green", value: "4" }],
  },
  order: ["a", "b", "c"], turn: 0, direction: 1, currentColor: "red", winner: null, log: "",
});

describe("uno", () => {
  it("deck has 108 cards", () => expect(buildDeck()).toHaveLength(108));
  it("deals 7 cards each", () => {
    const s = startGame(["a", "b"]);
    expect(s.hands['a']).toHaveLength(7);
  });
  it("draw2 gives next player 2 cards and skips them", () => {
    const s = playCard(base(), "a", "a1");
    expect(s.hands['b']).toHaveLength(3);
    expect(s.order[s.turn]).toBe("c");
  });
  it("rejects off-color card", () => {
    expect(() => playCard(base(), "a", "a2")).toThrow();
  });
  it("rejects playing out of turn", () => {
    expect(() => playCard(base(), "b", "b1")).toThrow("Not your turn");
  });
  it("wild sets chosen color", () => {
    const s = playCard(base(), "a", "a3", "blue");
    expect(s.currentColor).toBe("blue");
    expect(s.hands['b']).toHaveLength(5);
  });
});
