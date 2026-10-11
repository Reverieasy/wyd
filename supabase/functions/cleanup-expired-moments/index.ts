import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const jsonHeaders = { "Content-Type": "application/json" };

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response(405, { error: "method_not_allowed" });
  const expectedSecret = Deno.env.get("CLEANUP_CRON_SECRET");
  if (!expectedSecret || request.headers.get("x-cron-secret") !== expectedSecret) {
    return response(401, { error: "AUTH_REQUIRED" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return response(500, { error: "server_not_configured" });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: expired, error: lookupError } = await admin
    .from("updates")
    .select("id,photo_path")
    .lt("expires_at", retentionCutoff)
    .order("expires_at", { ascending: true })
    .limit(100);
  if (lookupError) return response(500, { error: "lookup_failed" });
  if (!expired?.length) return response(200, { deleted: 0 });

  const paths = expired.map((row) => row.photo_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: storageError } = await admin.storage.from("moment-photos").remove(paths);
    if (storageError) return response(502, { error: "photo_cleanup_failed" });
  }

  const { error: deleteError } = await admin.from("updates").delete().in("id", expired.map((row) => row.id));
  if (deleteError) return response(502, { error: "database_cleanup_failed" });
  return response(200, { deleted: expired.length });
});
