import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { joinRoom } from "@/lib/rooms.functions";
import { lastName, rememberName, saveSeat } from "@/lib/session";

export const Route = createFileRoute("/")({
  validateSearch: z.object({ code: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Card Night — Join a room" },
      { name: "description", content: "Enter a room code to play Uno and chat with friends." },
      { property: "og:title", content: "Card Night — Join a room" },
      { property: "og:description", content: "Enter a room code to play Uno and chat with friends." },
    ],
  }),
  component: Index,
});

function Index() {
  const { code: initial } = Route.useSearch();
  const nav = useNavigate();
  const [code, setCode] = useState(initial ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(lastName()), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await joinRoom({ data: { code: code.toUpperCase(), name } });
      rememberName(name);
      saveSeat(r.code, { token: r.token, playerId: r.playerId, name });
      nav({ to: "/room/$code", params: { code: r.code } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-8 flex gap-2">
        {(["bg-uno-red", "bg-uno-yellow", "bg-uno-green", "bg-uno-blue"] as const).map((c, i) => (
          <div key={c} className={`${c} h-20 w-14 rounded-xl border-4 border-foreground shadow-card`} style={{ transform: `rotate(${(i - 1.5) * 8}deg)` }} />
        ))}
      </div>
      <h1 className="font-display text-5xl text-primary">Join a room</h1>
      <p className="mt-3 text-muted-foreground">Got a code from a friend? Pop it in below.</p>
      <form onSubmit={submit} className="mt-8 w-full space-y-3">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" maxLength={8} required
          className="w-full rounded-2xl border-2 border-border bg-card px-5 py-4 text-center font-display text-3xl tracking-[0.3em] outline-none focus:border-primary" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24} required
          className="w-full rounded-2xl border-2 border-border bg-card px-5 py-3 text-center text-lg outline-none focus:border-primary" />
        <button disabled={busy} className="w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground shadow-card transition active:translate-y-1 disabled:opacity-60">
          {busy ? "Joining…" : "Join"}
        </button>
      </form>
    </main>
  );
}
