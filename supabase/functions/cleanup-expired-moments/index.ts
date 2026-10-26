import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { cleanupExpiredMoments } from './cleanup.ts';

const jsonHeaders = { "Content-Type": "application/json" };

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response(405, { error: "method_not_allowed" });
  const providedSecret = request.headers.get('x-worker-secret') ?? request.headers.get('x-cron-secret');
  if (!providedSecret) return response(401, { error: 'AUTH_REQUIRED' });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return response(500, { error: "server_not_configured" });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const legacySecret = Deno.env.get('CLEANUP_CRON_SECRET');
  if (!legacySecret || providedSecret !== legacySecret) {
    const { data: valid, error } = await admin.rpc('validate_worker_secret', { p_secret: providedSecret });
    if (error || valid !== true) return response(401, { error: 'AUTH_REQUIRED' });
  }
  try { return response(200, await cleanupExpiredMoments(admin)); }
  catch (error) { return response(502, { error: error instanceof Error ? error.message : 'cleanup_failed' }); }
});
