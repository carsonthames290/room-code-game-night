import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createApiKey } from "@/lib/rooms.functions";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: "API keys — Card Night" },
      { name: "description", content: "Generate an API key so another site can create Card Night rooms." },
      { property: "og:title", content: "API keys — Card Night" },
      { property: "og:description", content: "Generate an API key so another site can create Card Night rooms." },
    ],
  }),
  component: Dev,
});

function Dev() {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://your-site");
  useEffect(() => setOrigin(window.location.origin), []);

  async function gen(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await createApiKey({ data: { label } });
      setKey(r.key);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const curl = `curl -X POST ${origin}/api/public/rooms \\\n  -H "Authorization: Bearer ${key ?? "gk_..."}"`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl text-primary">API keys</h1>
      <p className="mt-2 text-muted-foreground">Let another website create rooms for you. The first person who joins a room made this way becomes the host.</p>
      <form onSubmit={gen} className="mt-6 flex gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. my-discord-bot)" required maxLength={60}
          className="flex-1 rounded-xl border-2 border-border bg-card px-4 py-2 outline-none focus:border-primary" />
        <button className="rounded-xl bg-primary px-5 font-bold text-primary-foreground">Generate</button>
      </form>
      {key && (
        <div className="mt-4 rounded-xl border-2 border-primary bg-card p-4">
          <p className="text-sm text-muted-foreground">Copy it now — it won't be shown again.</p>
          <code className="mt-2 block break-all font-mono text-primary">{key}</code>
          <button onClick={() => { navigator.clipboard.writeText(key); toast.success("Copied"); }} className="mt-3 rounded-lg bg-secondary px-3 py-1 text-sm">Copy</button>
        </div>
      )}
      <h2 className="mt-10 font-display text-xl">Create a room</h2>
      <pre className="mt-2 overflow-x-auto rounded-xl bg-card p-4 font-mono text-sm">{curl}</pre>
      <p className="mt-3 text-sm text-muted-foreground">Response:</p>
      <pre className="mt-1 overflow-x-auto rounded-xl bg-card p-4 font-mono text-sm">{`{ "code": "AB3KD", "joinUrl": "${origin}/?code=AB3KD" }`}</pre>
    </main>
  );
}
