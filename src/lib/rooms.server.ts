import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(b, (x) => chars[x % chars.length]).join("");
}

export function randomToken(bytes = 24) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function insertRoom(viaApi: boolean) {
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .insert({ code: randomCode(), created_via_api: viaApi })
      .select()
      .single();
    if (!error) return data;
  }
  throw new Error("Could not create room");
}

export async function addPlayer(roomId: string, name: string) {
  const token = randomToken();
  const { data, error } = await supabaseAdmin
    .from("players")
    .insert({ room_id: roomId, name, token })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { playerId: data.id, token };
}

export async function loadRoom(code: string) {
  const { data } = await supabaseAdmin.from("rooms").select("*").eq("code", code.toUpperCase()).maybeSingle();
  if (!data) throw new Error("Room not found");
  return data;
}

export async function auth(code: string, token: string) {
  const room = await loadRoom(code);
  const { data: me } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .eq("token", token)
    .maybeSingle();
  if (!me) throw new Error("You are not in this room");
  return { room, me };
}
