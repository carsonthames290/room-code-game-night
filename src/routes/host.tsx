import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createRoom } from "@/lib/rooms.functions";
import { lastName, rememberName, saveSeat } from "@/lib/session";

export const Route = createFileRoute("/host")({
  head: () => ({
    meta: [
      { title: "Host a room — Card Night" },
      { name: "description", content: "Create a room, share the code and start a game of Uno." },
      { property: "og:title", content: "Host a room — Card Night" },
      { property: "og:description", content: "Create a room, share the code and start a game of Uno." },
    ],
  }),
  component: Host,
});

function Host() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(lastName()), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await createRoom({ data: { name } });
      rememberName(name);
      saveSeat(r.code, { token: r.token, playerId: r.playerId, name });
      nav({ to: "/room/$code", params: { code: r.code } });
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-5xl text-primary">Host a room</h1>
      <p className="mt-3 text-muted-foreground">You'll get a code to share. You start the game when everyone's in.</p>
      <div className="mt-6 rounded-2xl border-2 border-border bg-card px-5 py-3 text-left">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Game</p>
        <p className="font-display text-2xl text-uno-red">UNO</p>
      </div>
      <form onSubmit={submit} className="mt-6 w-full space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24} required
          className="w-full rounded-2xl border-2 border-border bg-card px-5 py-3 text-center text-lg outline-none focus:border-primary" />
        <button disabled={busy} className="w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground shadow-card active:translate-y-1 disabled:opacity-60">
          {busy ? "Creating…" : "Create room"}
        </button>
      </form>
    </main>
  );
}
