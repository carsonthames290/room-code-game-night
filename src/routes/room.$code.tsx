import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { backToLobby, getRoom, sendMessage, startRoomGame, unoAction } from "@/lib/rooms.functions";
import { loadSeat, type Seat } from "@/lib/session";
import type { Card, Color } from "@/lib/uno";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.code} — Card Night` },
      { name: "description", content: "Play Uno and chat in this Card Night room." },
      { property: "og:title", content: `Room ${params.code} — Card Night` },
      { property: "og:description", content: "Play Uno and chat in this Card Night room." },
    ],
  }),
  component: Room,
});

const colorBg: Record<string, string> = {
  red: "bg-uno-red", yellow: "bg-uno-yellow", green: "bg-uno-green", blue: "bg-uno-blue", wild: "bg-uno-wild",
};
const label = (v: string) => ({ skip: "⊘", reverse: "⇄", draw2: "+2", wild: "★", wild4: "+4" })[v] ?? v;

function UnoCard({ card, onClick, dim, big }: { card: Card; onClick?: (() => void) | undefined; dim?: boolean; big?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={`${colorBg[card.color]} ${big ? "h-36 w-24 text-4xl" : "h-28 w-20 text-3xl"} flex shrink-0 items-center justify-center rounded-xl border-4 border-foreground font-display text-foreground shadow-card transition ${onClick ? "hover:-translate-y-3" : ""} ${dim ? "opacity-40" : ""}`}>
      <span className="flex h-3/5 w-4/5 items-center justify-center rounded-[50%] bg-foreground/90 text-background">{label(card.value)}</span>
    </button>
  );
}

function Room() {
  const { code } = Route.useParams();
  const [seat, setSeat] = useState<Seat | null | undefined>(undefined);
  useEffect(() => setSeat(loadSeat(code)), [code]);

  if (seat === undefined) return null;
  if (!seat)
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-muted-foreground">You haven't joined room {code} yet.</p>
        <Link to="/" search={{ code }} className="mt-4 inline-block rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground">Join it</Link>
      </main>
    );
  return <Game code={code} seat={seat} />;
}

function Game({ code, seat }: { code: string; seat: Seat }) {
  const qc = useQueryClient();
  const key = ["room", code];
  const { data, error } = useQuery({
    queryKey: key,
    queryFn: () => getRoom({ data: { code, token: seat.token } }),
    refetchInterval: 4000,
  });
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [wildCard, setWildCard] = useState<string | null>(null);

  useEffect(() => {
    const ch = supabase.channel(`room-${code}`)
      .on("broadcast", { event: "update" }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    chanRef.current = ch;
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: key });
      chanRef.current?.send({ type: "broadcast", event: "update", payload: {} });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (error) return <p className="p-10 text-center text-destructive">{(error as Error).message}</p>;
  if (!data) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;

  const isHost = data.hostId === data.meId;
  const g = data.game;
  const myTurn = g?.turnId === data.meId && !g.winner;
  const nameOf = (id?: string | null) => data.players.find((p) => p.id === id)?.name ?? "?";
  const t = { code, token: seat.token };

  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Room code</p>
            <button onClick={() => { navigator.clipboard.writeText(data.code); toast.success("Code copied"); }} className="font-display text-3xl tracking-widest text-primary">{data.code}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.players.map((p) => (
              <span key={p.id} className={`rounded-full px-3 py-1 text-sm ${g?.turnId === p.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {p.id === data.hostId && "👑 "}{p.name}{g ? ` · ${p.cards}` : ""}{p.id === data.meId && " (you)"}
              </span>
            ))}
          </div>
        </div>

        {!g && (
          <div className="rounded-2xl bg-card p-10 text-center">
            <p className="font-display text-2xl">Waiting in the lobby</p>
            <p className="mt-2 text-muted-foreground">{data.players.length} player{data.players.length === 1 ? "" : "s"} here. Need at least 2.</p>
            {isHost ? (
              <button disabled={data.players.length < 2} onClick={() => act(() => startRoomGame({ data: t }))}
                className="mt-6 rounded-2xl bg-primary px-8 py-3 font-display text-xl text-primary-foreground shadow-card disabled:opacity-50">Start Uno</button>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">The host ({nameOf(data.hostId)}) will start the game.</p>
            )}
          </div>
        )}

        {g && (
          <div className="rounded-2xl bg-card p-6">
            {g.winner ? (
              <div className="py-6 text-center">
                <p className="font-display text-4xl text-primary">{nameOf(g.winner)} wins!</p>
                {isHost && <button onClick={() => act(() => backToLobby({ data: t }))} className="mt-4 rounded-xl bg-primary px-6 py-2 font-bold text-primary-foreground">Back to lobby</button>}
              </div>
            ) : (
              <p className="text-center text-lg">{myTurn ? <span className="font-display text-primary">Your turn!</span> : <>Waiting for <b>{nameOf(g.turnId)}</b></>}</p>
            )}
            <div className="my-6 flex items-center justify-center gap-8">
              <button disabled={!myTurn} onClick={() => act(() => unoAction({ data: { ...t, action: "draw" } }))}
                className="flex h-36 w-24 items-center justify-center rounded-xl border-4 border-foreground bg-uno-wild font-display text-uno-red shadow-card transition enabled:hover:-translate-y-1 disabled:opacity-60">
                UNO
              </button>
              {g.top && <UnoCard card={g.top} big />}
              <div className="text-sm text-muted-foreground">
                <div className={`mb-1 h-6 w-6 rounded-full border-2 border-foreground ${colorBg[g.currentColor]}`} />
                {g.currentColor}<br />{g.log}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 pt-4">
              {g.hand.map((c) => (
                <UnoCard key={c.id} card={c} dim={!myTurn}
                  onClick={myTurn ? () => (c.color === "wild" ? setWildCard(c.id) : act(() => unoAction({ data: { ...t, action: "play", cardId: c.id } }))) : undefined} />
              ))}
            </div>
            {wildCard && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="text-sm">Pick a color:</span>
                {(["red", "yellow", "green", "blue"] as Color[]).map((col) => (
                  <button key={col} aria-label={col} onClick={() => { const id = wildCard; setWildCard(null); act(() => unoAction({ data: { ...t, action: "play", cardId: id, color: col } })); }}
                    className={`h-10 w-10 rounded-full border-4 border-foreground ${colorBg[col]}`} />
                ))}
                <button onClick={() => setWildCard(null)} className="text-sm text-muted-foreground">cancel</button>
              </div>
            )}
          </div>
        )}
      </section>
      <Chat messages={data.messages} onSend={(body) => act(() => sendMessage({ data: { ...t, body } }))} />
    </main>
  );
}

function Chat({ messages, onSend }: { messages: { id: string; player_name: string; body: string }[]; onSend: (b: string) => void }) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [messages.length]);
  return (
    <aside className="flex h-[70vh] flex-col rounded-2xl bg-card">
      <p className="border-b border-border px-4 py-3 font-display">Chat</p>
      <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
        {messages.length === 0 && <p className="text-muted-foreground">Say hi 👋</p>}
        {messages.map((m) => (
          <p key={m.id}><b className="text-primary">{m.player_name}:</b> {m.body}</p>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(text); setText(""); } }} className="flex gap-2 border-t border-border p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Message…"
          className="flex-1 rounded-xl bg-secondary px-3 py-2 outline-none" />
        <button className="rounded-xl bg-primary px-4 font-bold text-primary-foreground">Send</button>
      </form>
    </aside>
  );
}
