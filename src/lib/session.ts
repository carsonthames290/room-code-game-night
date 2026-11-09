export interface Seat { token: string; playerId: string; name: string }
const k = (code: string) => `cardnight:${code.toUpperCase()}`;
export const saveSeat = (code: string, s: Seat) => localStorage.setItem(k(code), JSON.stringify(s));
export const loadSeat = (code: string): Seat | null => {
  try { return JSON.parse(localStorage.getItem(k(code)) ?? "null"); } catch { return null; }
};
export const lastName = () => localStorage.getItem("cardnight:name") ?? "";
export const rememberName = (n: string) => localStorage.setItem("cardnight:name", n);
