import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type EventType = "moment" | "nudge" | "reaction" | "comment" | "connection_request" | "connection_accepted";

type NotificationTarget = {
  actorId: string;
  recipientIds: string[];
  title: string;
  titlesByRecipient?: Record<string,string>;
  body: string;
  data: Record<string, string>;
  preference: "moments" | "nudges" | "reactions" | "comments" | "connections";
};

const jsonHeaders = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info", "Access-Control-Allow-Methods": "POST,OPTIONS" };
const eventTypes = new Set<EventType>(["moment", "nudge", "reaction", "comment", "connection_request", "connection_accepted"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function reactionSymbol(value: string) {
  return ({ heart: "❤️", teary: "🥹", laugh: "😂", fire: "🔥", eyes: "👀", hug: "🫶", sparkles: "✨" } as Record<string, string>)[value] ?? "";
}

async function pairIsAllowed(
  admin: SupabaseClient,
  actorId: string,
  recipientId: string,
  requireAcceptedConnection: boolean,
  momentId?: string,
  viewerId?: string,
) {
  const { data: block, error: blockError } = await admin
    .from("blocks")
    .select("blocker_id")
    .or(`and(blocker_id.eq.${actorId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${actorId})`)
    .limit(1)
    .maybeSingle();
  if (blockError) throw new Error("block_lookup_failed");
  if (block) return false;
  if (!requireAcceptedConnection) return true;
  if (momentId && viewerId) {
    const { data, error } = await admin.rpc('can_receive_moment', { p_update_id: momentId, p_user_id: viewerId });
    if (error) throw new Error('moment_access_lookup_failed');
    return data === true;
  }

  const { data: connection, error: connectionError } = await admin
    .from("connections")
    .select("id")
    .eq("status", "accepted")
    .or(`and(requester_id.eq.${actorId},addressee_id.eq.${recipientId}),and(requester_id.eq.${recipientId},addressee_id.eq.${actorId})`)
    .limit(1)
    .maybeSingle();
  if (connectionError) throw new Error("connection_lookup_failed");
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

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let payload: { type?: string; eventId?: string; jobId?: string };
  try { payload = await request.json(); } catch { return response(400, { error: "invalid_json" }); }
  let callerId: string;
  const workerSecret = request.headers.get("x-worker-secret");
  if (workerSecret) {
    const { data: valid, error } = await admin.rpc("validate_worker_secret", { p_secret: workerSecret });
    if (error || !valid) return response(401, { error: "AUTH_REQUIRED" });
    const { data: job, error: jobError } = await admin.from("notification_jobs").select("actor_id,event_type,event_id,status").eq("id", payload.jobId ?? "").maybeSingle();
    if (jobError || !job || job.status !== "processing") return response(403, { error: "job_unavailable" });
    callerId = job.actor_id; payload.type = job.event_type; payload.eventId = job.event_id;
  } else {
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await callerClient.auth.getUser();
    if (error || !data.user) return response(401, { error: "AUTH_REQUIRED" });
    callerId = data.user.id;
  }
  if (!payload.type || !eventTypes.has(payload.type as EventType) || !payload.eventId || !uuidPattern.test(payload.eventId)) return response(400, { error: "invalid_event" });
  const type = payload.type as EventType;
  const eventId = payload.eventId;
  try {
  let target: NotificationTarget | null = null;
  if (type === "moment") {
    const { data: update, error: updateError } = await admin.from("updates").select("id,sender_id,is_quiet").eq("id", eventId).maybeSingle();
    if (updateError) throw new Error("update_lookup_failed");
    if (!update || update.sender_id !== callerId) return response(403, { error: "event_not_owned" });
    if (update.is_quiet) return response(200, { sent: 0, skipped: "quiet_moment" });
    const { data: recipients, error: recipientsError } = await admin.from("update_recipients").select("recipient_id").eq("update_id", eventId);
    if (recipientsError) throw new Error("recipients_lookup_failed");
    target = {
      actorId: callerId,
      recipientIds: (recipients ?? []).map((row) => row.recipient_id),
      title: "sent you a moment",
      body: "A little update is waiting for you.",
      data: { type, updateId: eventId, senderId: callerId },
      preference: "moments",
    };
  } else if (type === "nudge") {
    const { data: nudge, error: nudgeError } = await admin.from("nudges").select("id,sender_id,receiver_id").eq("id", eventId).maybeSingle();
    if (nudgeError) throw new Error("nudge_lookup_failed");
    if (!nudge || nudge.sender_id !== callerId) return response(403, { error: "event_not_owned" });
    target = {
      actorId: callerId,
      recipientIds: [nudge.receiver_id],
      title: "wants a little update 👋",
      body: "Show them what you're up to.",
      data: { type, nudgeId: eventId, senderId: callerId },
      preference: "nudges",
    };
  } else if (type === "comment") {
    const { data: comment, error: commentError } = await admin.from('moment_comments').select('id,update_id,user_id').eq('id', eventId).maybeSingle();
    if (commentError) throw new Error('comment_lookup_failed');
    if (!comment || comment.user_id !== callerId) return response(403, { error: 'event_not_owned' });
    const { data: recipients, error: recipientsError } = await admin.rpc('comment_push_recipients', { p_comment_id: eventId });
    if (recipientsError) throw new Error('comment_recipients_lookup_failed');
    target = {
      actorId: callerId,
      recipientIds: (recipients ?? []).map((row: { recipient_id: string }) => row.recipient_id),
      title: 'replied in the comments',
      titlesByRecipient: Object.fromEntries((recipients ?? []).map((row: { recipient_id: string; is_reply: boolean }) =>
        [row.recipient_id, row.is_reply ? 'replied in the comments' : 'commented on your moment'])),
      body: 'Open watchudoin? to read it.',
      data: { type, updateId: comment.update_id, commentId: eventId }, preference: 'comments',
    };
  } else if (type === "reaction") {
    const { data: reaction, error: reactionError } = await admin.from("reactions").select("id,update_id,user_id,reaction").eq("id", eventId).maybeSingle();
    if (reactionError) throw new Error("reaction_lookup_failed");
    if (!reaction || reaction.user_id !== callerId) return response(403, { error: "event_not_owned" });
    const { data: update, error: updateError } = await admin.from("updates").select("sender_id").eq("id", reaction.update_id).maybeSingle();
    if (updateError) throw new Error("update_lookup_failed");
    if (!update) return response(404, { error: "event_target_missing" });
    target = {
      actorId: callerId,
      recipientIds: [update.sender_id],
      title: `reacted ${reactionSymbol(reaction.reaction)} to your moment`,
      body: "Open watchudoin? to see it.",
      data: { type, updateId: reaction.update_id, reactionId: eventId },
      preference: "reactions",
    };
  } else {
    const { data: connection, error: connectionError } = await admin.from("connections").select("id,requester_id,addressee_id,status").eq("id", eventId).maybeSingle();
    if (connectionError) throw new Error("connection_lookup_failed");
    if (!connection) return response(404, { error: "event_target_missing" });
    if (type === "connection_request") {
      if (connection.requester_id !== callerId || connection.status !== "pending") return response(403, { error: "event_not_owned" });
      target = {
        actorId: callerId,
        recipientIds: [connection.addressee_id],
        title: "wants to connect",
        body: "Open watchudoin? to respond.",
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
  // Comment recipients already have both actors' current thread access validated by the RPC.
  const requireAcceptedConnection = type === "moment" || type === "nudge" || type === "reaction";
  const allowed = await Promise.all(target.recipientIds.map(async (recipientId) => ({
    recipientId,
    allowed: await pairIsAllowed(admin, callerId, recipientId, requireAcceptedConnection,
      type === 'moment' || type === 'reaction' || type === 'comment' ? target.data.updateId : undefined,
      type === 'reaction' || type === 'comment' ? callerId : recipientId),
  })));
  target.recipientIds = allowed.filter((item) => item.allowed).map((item) => item.recipientId);
  if (target.recipientIds.length === 0) return response(200, { sent: 0, skipped: "no_recipients" });

  const { data: actor, error: actorError } = await admin.from("profiles").select("display_name").eq("id", target.actorId).maybeSingle();
    if (actorError) throw new Error("actor_lookup_failed");
  const actorName = actor?.display_name?.trim() || "Someone";
  const { data: preferences, error: preferenceError } = await admin.from("notification_preferences").select("*").in("user_id", target.recipientIds);
  if (preferenceError) return response(503, { error: "preference_lookup_failed" });
  const preferencesByUser = new Map((preferences ?? []).map((row) => [row.user_id, row]));
  const eligibleRecipients = target.recipientIds.filter((userId) => {
    const preference = preferencesByUser.get(userId);
    return !preference || (preference.enabled && preference[target.preference] !== false);
  });
  if (eligibleRecipients.length === 0) return response(200, { sent: 0, skipped: "preferences" });

  const { data: tokens, error: tokenError } = await admin.from("push_tokens").select("id,user_id,expo_push_token").in("user_id", eligibleRecipients).eq("enabled", true);
  if (tokenError) return response(500, { error: "token_lookup_failed" });

  const claims: { deliveryId: string; tokenId: string; token: string; recipientId: string }[] = [];
  for (const token of tokens ?? []) {
    const { data: inserted, error: insertError } = await admin.from("notification_deliveries").insert({ event_type: type, event_id: eventId, recipient_id: token.user_id, push_token_id: token.id, attempts: 1, leased_until: new Date(Date.now()+120000).toISOString() }).select("id").maybeSingle();
    if (!insertError && inserted) { claims.push({ deliveryId: inserted.id, tokenId: token.id, token: token.expo_push_token, recipientId: token.user_id }); continue; }
    if (insertError?.code !== "23505") throw new Error("delivery_claim_failed");
    const { data: existing, error: lookupError } = await admin.from("notification_deliveries").select("id,status,attempts,leased_until").eq("event_type",type).eq("event_id",eventId).eq("push_token_id",token.id).single();
    if (lookupError) throw new Error("delivery_lookup_failed");
    if(existing.status==="pending" && Date.parse(existing.leased_until??"1970-01-01")>=Date.now()) throw new Error("delivery_in_progress");
    if ((existing.status === "failed" || (existing.status === "pending" && Date.parse(existing.leased_until ?? "1970-01-01") < Date.now())) && existing.attempts < 5) {
      const { data: reclaimed, error } = await admin.from("notification_deliveries").update({ status:"pending", attempts:existing.attempts+1, leased_until:new Date(Date.now()+120000).toISOString() }).eq("id",existing.id).eq("attempts",existing.attempts).eq("status",existing.status).select("id").maybeSingle();
      if (error) throw new Error("delivery_reclaim_failed");
      if (reclaimed) claims.push({ deliveryId:reclaimed.id,tokenId:token.id,token:token.expo_push_token,recipientId:token.user_id });
    }

  }
  if (claims.length === 0) return response(200, { sent: 0, skipped: "no_new_tokens" });

  const messages = claims.map((claim) => ({
    to: claim.token,
    sound: "default",
    channelId: "watchudoin-updates",
    priority: "high",
    title: type === "connection_accepted" ? `${target.title} with ${actorName}` : `${actorName} ${target.titlesByRecipient?.[claim.recipientId] ?? target.title}`,
    body: target.body,
    data: target.data,
  }));

  try {
    const tickets: { status?: string; id?: string; message?: string; details?: { error?: string } }[] = [];
    for (let start = 0; start < messages.length; start += 100) {
      const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(messages.slice(start,start+100)),signal:AbortSignal.timeout(15000) });
      const result = await expoResponse.json();
      if (!expoResponse.ok || !Array.isArray(result?.data)) throw new Error("expo_send_failed");
      tickets.push(...result.data);
      for (let offset=0;offset<Math.min(100,claims.length-start);offset++) {
        const claim=claims[start+offset],ticket=result.data[offset];
        const invalid=ticket?.details?.error==="DeviceNotRegistered";
        const { error } = await admin.from("notification_deliveries").update({status:invalid?"invalid_token":ticket?.status==="ok"?"sent":"failed",expo_ticket_id:ticket?.id??null,leased_until:null,error:ticket?.message??(ticket?null:"missing_ticket")}).eq("id",claim.deliveryId);
        if(error) throw new Error("delivery_status_failed");
        if(invalid) { const {error}=await admin.from("push_tokens").update({enabled:false}).eq("id",claim.tokenId);if(error)throw new Error("token_disable_failed"); }
      }
    }
    if (tickets.some(ticket => ticket.status !== "ok" && ticket.details?.error !== "DeviceNotRegistered") || tickets.length !== claims.length) return response(502, { error: "delivery_failed" });
    return response(200, { sent: tickets.filter((ticket: { status?: string }) => ticket?.status === "ok").length, attempted: claims.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "push_request_failed";
    await admin.from("notification_deliveries").update({ status: "failed", error: message }).in("id", claims.map((claim) => claim.deliveryId)).eq("status","pending");
    return response(502, { error: "push_request_failed" });
  }
  } catch { return response(503, { error: "delivery_lookup_failed" }); }
});
