import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/rooms")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const { sha256, insertRoom } = await import("@/lib/rooms.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const key = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        if (!key.startsWith("gk_")) return Response.json({ error: "Missing API key" }, { status: 401, headers: cors });
        const { data: k } = await supabaseAdmin.from("api_keys").select("id").eq("key_hash", await sha256(key)).maybeSingle();
        if (!k) return Response.json({ error: "Invalid API key" }, { status: 401, headers: cors });
        const room = await insertRoom(true);
        const origin = new URL(request.url).origin;
        return Response.json(
          { code: room.code, joinUrl: `${origin}/?code=${room.code}`, note: "First person to join becomes host." },
          { status: 201, headers: cors },
        );
      },
    },
  },
});
