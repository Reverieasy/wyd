import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type EventType = "moment" | "nudge" | "reaction" | "connection_request" | "connection_accepted";

type NotificationTarget = {
  actorId: string;
  recipientIds: string[];
  title: string;
  body: string;
  data: Record<string, string>;
  preference: "moments" | "nudges" | "reactions" | "connections";
};

const jsonHeaders = { "Content-Type": "application/json" };
const eventTypes = new Set<EventType>(["moment", "nudge", "reaction", "connection_request", "connection_accepted"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function reactionSymbol(value: string) {
  return ({ heart: "❤️", teary: "🥹", laugh: "😂", fire: "🔥", eyes: "👀" } as Record<string, string>)[value] ?? "";
}

async function pairIsAllowed(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  recipientId: string,
  requireAcceptedConnection: boolean,
) {
  const { data: block } = await admin
    .from("blocks")
    .select("id")
    .or(`and(blocker_id.eq.${actorId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${actorId})`)
    .limit(1)
    .maybeSingle();
  if (block) return false;
  if (!requireAcceptedConnection) return true;

  const { data: connection } = await admin
    .from("connections")
    .select("id")
    .eq("status", "accepted")
    .or(`and(requester_id.eq.${actorId},addressee_id.eq.${recipientId}),and(requester_id.eq.${recipientId},addressee_id.eq.${actorId})`)
    .limit(1)
    .maybeSingle();
  return Boolean(connection);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: jsonHeaders });
  if (request.method !== "POST") return response(405, { error: "method_not_allowed" });

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return response(401, { error: "AUTH_REQUIRED" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response(500, { error: "server_not_configured" });

  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return response(401, { error: "AUTH_REQUIRED" });

  let payload: { type?: string; eventId?: string };
  try {
    payload = await request.json();
  } catch {
    return response(400, { error: "invalid_json" });
  }
  if (!payload.type || !eventTypes.has(payload.type as EventType) || !payload.eventId || !uuidPattern.test(payload.eventId)) {
    return response(400, { error: "invalid_event" });
  }

  const type = payload.type as EventType;
  const eventId = payload.eventId;
  const callerId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let target: NotificationTarget | null = null;
  if (type === "moment") {
    const { data: update } = await admin.from("updates").select("id,sender_id,is_quiet").eq("id", eventId).maybeSingle();
    if (!update || update.sender_id !== callerId) return response(403, { error: "event_not_owned" });
    if (update.is_quiet) return response(200, { sent: 0, skipped: "quiet_moment" });
    const { data: recipients } = await admin.from("update_recipients").select("recipient_id").eq("update_id", eventId);
    target = {
      actorId: callerId,
      recipientIds: (recipients ?? []).map((row) => row.recipient_id),
      title: "sent you a moment",
      body: "A little update is waiting for you.",
      data: { type, updateId: eventId, senderId: callerId },
      preference: "moments",
    };
  } else if (type === "nudge") {
    const { data: nudge } = await admin.from("nudges").select("id,sender_id,receiver_id").eq("id", eventId).maybeSingle();
    if (!nudge || nudge.sender_id !== callerId) return response(403, { error: "event_not_owned" });
    target = {
      actorId: callerId,
      recipientIds: [nudge.receiver_id],
      title: "wants a little update 👋",
      body: "Show them what you're up to.",
      data: { type, nudgeId: eventId, senderId: callerId },
      preference: "nudges",
    };
  } else if (type === "reaction") {
    const { data: reaction } = await admin.from("reactions").select("id,update_id,user_id,reaction").eq("id", eventId).maybeSingle();
    if (!reaction || reaction.user_id !== callerId) return response(403, { error: "event_not_owned" });
    const { data: update } = await admin.from("updates").select("sender_id").eq("id", reaction.update_id).maybeSingle();
    if (!update) return response(404, { error: "event_target_missing" });
    target = {
      actorId: callerId,
      recipientIds: [update.sender_id],
      title: `reacted ${reactionSymbol(reaction.reaction)} to your moment`,
      body: "Open Watchu Doin? to see it.",
      data: { type, updateId: reaction.update_id, reactionId: eventId },
      preference: "reactions",
    };
  } else {
    const { data: connection } = await admin.from("connections").select("id,requester_id,addressee_id,status").eq("id", eventId).maybeSingle();
    if (!connection) return response(404, { error: "event_target_missing" });
    if (type === "connection_request") {
      if (connection.requester_id !== callerId || connection.status !== "pending") return response(403, { error: "event_not_owned" });
      target = {
        actorId: callerId,
        recipientIds: [connection.addressee_id],
        title: "wants to connect",
        body: "Open Watchu Doin? to respond.",
        data: { type, connectionId: eventId },
        preference: "connections",
      };
    } else {
      if (connection.addressee_id !== callerId || connection.status !== "accepted") return response(403, { error: "event_not_owned" });
      target = {
        actorId: callerId,
        recipientIds: [connection.requester_id],
        title: "You're connected",
        body: "Share a little moment when you're ready.",
        data: { type, connectionId: eventId },
        preference: "connections",
      };
    }
  }

  target.recipientIds = [...new Set(target.recipientIds.filter((id) => id !== callerId))];
  const requireAcceptedConnection = type === "moment" || type === "nudge" || type === "reaction";
  const allowed = await Promise.all(target.recipientIds.map(async (recipientId) => ({
    recipientId,
    allowed: await pairIsAllowed(admin, callerId, recipientId, requireAcceptedConnection),
  })));
  target.recipientIds = allowed.filter((item) => item.allowed).map((item) => item.recipientId);
  if (target.recipientIds.length === 0) return response(200, { sent: 0, skipped: "no_recipients" });

  const { data: actor } = await admin.from("profiles").select("display_name").eq("id", target.actorId).maybeSingle();
  const actorName = actor?.display_name?.trim() || "Someone";
  const { data: preferences } = await admin.from("notification_preferences").select("user_id,enabled,moments,nudges,reactions,connections").in("user_id", target.recipientIds);
  const preferencesByUser = new Map((preferences ?? []).map((row) => [row.user_id, row]));
  const eligibleRecipients = target.recipientIds.filter((userId) => {
    const preference = preferencesByUser.get(userId);
    return !preference || (preference.enabled && preference[target.preference]);
  });
  if (eligibleRecipients.length === 0) return response(200, { sent: 0, skipped: "preferences" });

  const { data: tokens, error: tokenError } = await admin.from("push_tokens").select("id,user_id,expo_push_token").in("user_id", eligibleRecipients).eq("enabled", true);
  if (tokenError) return response(500, { error: "token_lookup_failed" });

  const claims: { deliveryId: string; tokenId: string; token: string }[] = [];
  for (const token of tokens ?? []) {
    const { data: delivery, error } = await admin.from("notification_deliveries").insert({
      event_type: type,
      event_id: eventId,
      recipient_id: token.user_id,
      push_token_id: token.id,
    }).select("id").maybeSingle();
    if (!error && delivery) claims.push({ deliveryId: delivery.id, tokenId: token.id, token: token.expo_push_token });
  }
  if (claims.length === 0) return response(200, { sent: 0, skipped: "no_new_tokens" });

  const messages = claims.map((claim) => ({
    to: claim.token,
    sound: "default",
    channelId: "watchu-doin",
    title: type === "connection_accepted" ? `${target.title} with ${actorName}` : `${actorName} ${target.title}`,
    body: target.body,
    data: target.data,
  }));

  try {
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Accept": "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    const result = await expoResponse.json();
    const tickets = Array.isArray(result?.data) ? result.data : [];
    for (let index = 0; index < claims.length; index += 1) {
      const claim = claims[index];
      const ticket = tickets[index];
      const invalid = ticket?.details?.error === "DeviceNotRegistered";
      await admin.from("notification_deliveries").update({
        status: invalid ? "invalid_token" : ticket?.status === "ok" ? "sent" : "failed",
        expo_ticket_id: ticket?.id ?? null,
        error: ticket?.message ?? (expoResponse.ok ? null : `expo_http_${expoResponse.status}`),
      }).eq("id", claim.deliveryId);
      if (invalid) await admin.from("push_tokens").update({ enabled: false }).eq("id", claim.tokenId);
    }
    return response(200, { sent: tickets.filter((ticket: { status?: string }) => ticket?.status === "ok").length, attempted: claims.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "push_request_failed";
    await admin.from("notification_deliveries").update({ status: "failed", error: message }).in("id", claims.map((claim) => claim.deliveryId));
    return response(502, { error: "push_request_failed" });
  }
});
