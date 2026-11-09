import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Color, UnoState } from "./uno";

const name = z.string().trim().min(1).max(24);
const code = z.string().trim().min(4).max(8);
const token = z.string().min(10).max(100);

export const createRoom = createServerFn({ method: "POST" })
  .validator(z.object({ name }))
  .handler(async ({ data }) => {
    const { insertRoom, addPlayer } = await import("./rooms.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const room = await insertRoom(false);
    const p = await addPlayer(room.id, data.name);
    await supabaseAdmin.from("rooms").update({ host_player_id: p.playerId }).eq("id", room.id);
    return { code: room.code, ...p };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .validator(z.object({ name, code }))
  .handler(async ({ data }) => {
    const { loadRoom, addPlayer } = await import("./rooms.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const room = await loadRoom(data.code);
    if (room.status !== "lobby") throw new Error("Game already started");
    const p = await addPlayer(room.id, data.name);
    // Rooms made through the API have no host until the first person joins.
    if (!room.host_player_id) {
      await supabaseAdmin.from("rooms").update({ host_player_id: p.playerId }).eq("id", room.id).is("host_player_id", null);
    }
    return { code: room.code, ...p };
  });

export const getRoom = createServerFn({ method: "POST" })
  .validator(z.object({ code, token }))
  .handler(async ({ data }) => {
    const { auth } = await import("./rooms.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { room, me } = await auth(data.code, data.token);
    const [{ data: players }, { data: messages }] = await Promise.all([
      supabaseAdmin.from("players").select("id,name,created_at").eq("room_id", room.id).order("created_at"),
      supabaseAdmin.from("messages").select("id,player_name,body,created_at").eq("room_id", room.id).order("created_at", { ascending: false }).limit(100),
    ]);
    const g = room.game as unknown as UnoState | null;
    return {
      code: room.code,
      status: room.status,
      hostId: room.host_player_id,
      meId: me.id,
      players: (players ?? []).map((p) => ({ id: p.id, name: p.name, cards: g?.hands[p.id]?.length ?? 0 })),
      messages: (messages ?? []).reverse(),
      game: g
        ? {
            hand: g.hands[me.id] ?? [],
            top: g.discard[g.discard.length - 1],
            currentColor: g.currentColor,
            turnId: g.order[g.turn],
            direction: g.direction,
            winner: g.winner,
            log: g.log,
            deckCount: g.deck.length,
          }
        : null,
    };
  });

export const startRoomGame = createServerFn({ method: "POST" })
  .validator(z.object({ code, token }))
  .handler(async ({ data }) => {
    const { auth } = await import("./rooms.server");
    const { startGame } = await import("./uno");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { room, me } = await auth(data.code, data.token);
    if (room.host_player_id !== me.id) throw new Error("Only the host can start");
    const { data: players } = await supabaseAdmin.from("players").select("id").eq("room_id", room.id).order("created_at");
    const game = startGame((players ?? []).map((p) => p.id));
    await supabaseAdmin.from("rooms").update({ status: "playing", game: game as never }).eq("id", room.id);
    return { ok: true };
  });

export const unoAction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code, token,
      action: z.enum(["play", "draw"]),
      cardId: z.string().max(10).optional(),
      color: z.enum(["red", "yellow", "green", "blue"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { auth } = await import("./rooms.server");
    const { playCard, drawCard } = await import("./uno");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { room, me } = await auth(data.code, data.token);
    const g = room.game as unknown as UnoState | null;
    if (!g) throw new Error("No game running");
    const nextState =
      data.action === "play"
        ? playCard(g, me.id, data.cardId ?? "", data.color as Color | undefined)
        : drawCard(g, me.id);
    nextState.log = `${me.name} ${nextState.log}`;
    await supabaseAdmin
      .from("rooms")
      .update({ game: nextState as never, status: nextState.winner ? "finished" : "playing" })
      .eq("id", room.id);
    return { ok: true };
  });

export const backToLobby = createServerFn({ method: "POST" })
  .validator(z.object({ code, token }))
  .handler(async ({ data }) => {
    const { auth } = await import("./rooms.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { room, me } = await auth(data.code, data.token);
    if (room.host_player_id !== me.id) throw new Error("Only the host can do that");
    await supabaseAdmin.from("rooms").update({ status: "lobby", game: null }).eq("id", room.id);
    return { ok: true };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .validator(z.object({ code, token, body: z.string().trim().min(1).max(500) }))
  .handler(async ({ data }) => {
    const { auth } = await import("./rooms.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { room, me } = await auth(data.code, data.token);
    await supabaseAdmin.from("messages").insert({ room_id: room.id, player_name: me.name, body: data.body });
    return { ok: true };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .validator(z.object({ label: z.string().trim().min(1).max(60) }))
  .handler(async ({ data }) => {
    const { randomToken, sha256 } = await import("./rooms.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = `gk_${randomToken(24)}`;
    const { error } = await supabaseAdmin.from("api_keys").insert({ label: data.label, key_hash: await sha256(key) });
    if (error) throw new Error(error.message);
    return { key };
  });
