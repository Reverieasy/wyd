import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const jsonHeaders = { "Content-Type": "application/json" };

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
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

  const caller = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return response(401, { error: "AUTH_REQUIRED" });

  let payload: { confirmation?: string };
  try {
    payload = await request.json();
  } catch {
    return response(400, { error: "invalid_json" });
  }
  if (payload.confirmation !== "DELETE") return response(400, { error: "confirmation_required" });

  const userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const objectPaths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from("moment-photos").list(userId, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) return response(502, { error: "photo_cleanup_failed" });
    for (const object of data ?? []) objectPaths.push(`${userId}/${object.name}`);
    if (!data || data.length < 1000) break;
  }

  for (let index = 0; index < objectPaths.length; index += 100) {
    const { error } = await admin.storage.from("moment-photos").remove(objectPaths.slice(index, index + 100));
    if (error) return response(502, { error: "photo_cleanup_failed" });
  }

  const { error: deletionError } = await admin.auth.admin.deleteUser(userId, false);
  if (deletionError) return response(502, { error: "account_deletion_failed" });

  return response(200, { deleted: true, removedPhotos: objectPaths.length });
});
