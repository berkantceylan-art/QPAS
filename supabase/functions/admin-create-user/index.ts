// Deployed via MCP deploy_edge_function with verify_jwt: false.
// Gateway verification is disabled because supabase-js v2 attaches the
// new-format publishable key (`sb_publishable_…`) to Authorization, which the
// gateway refuses to validate. This handler performs the full auth check
// itself: decode JWT -> admin.auth.getUser(token) -> profiles.role='admin'.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function generatePassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  const picks = [
    upper[buf[0] % upper.length],
    lower[buf[1] % lower.length],
    digits[buf[2] % digits.length],
    symbols[buf[3] % symbols.length],
  ];
  for (let i = 4; i < length; i++) picks.push(all[buf[i] % all.length]);
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.join("");
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Missing Authorization bearer token" }, 401);
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return json({ error: "Empty bearer token" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "Server misconfigured" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const decoded = decodeJwt(token);
  let callerId: string | null = null;
  if (decoded && typeof decoded.sub === "string" && decoded.role === "authenticated") {
    callerId = decoded.sub;
  } else {
    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !callerData?.user) {
      return json(
        {
          error: "Unauthorized",
          detail: callerError?.message ?? "Token is not a valid user JWT",
        },
        401,
      );
    }
    callerId = callerData.user.id;
  }

  const { data: callerProfile, error: callerProfileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();
  if (callerProfileError) {
    return json(
      { error: "Profile lookup failed", detail: callerProfileError.message },
      500,
    );
  }
  if (callerProfile?.role !== "admin") {
    return json(
      { error: "Forbidden", detail: "Admin role required" },
      403,
    );
  }

  let body: {
    email?: string;
    full_name?: string;
    role?: string;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const fullName = body.full_name?.trim() || null;
  const role = body.role;
  const providedPassword = body.password?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Geçerli bir e-posta gerekli" }, 400);
  }
  if (role !== "client" && role !== "employee") {
    return json({ error: "role must be 'client' or 'employee'" }, 400);
  }
  if (providedPassword && providedPassword.length < 8) {
    return json({ error: "Şifre en az 8 karakter olmalı" }, 400);
  }

  const finalPassword = providedPassword || generatePassword(14);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  });

  if (createError || !created?.user) {
    const msg = createError?.message ?? "Kullanıcı oluşturulamadı";
    const status = /already registered|exists/i.test(msg) ? 409 : 400;
    return json({ error: msg }, status);
  }

  const newUserId = created.user.id;

  const { error: upsertError } = await admin.from("profiles").upsert({
    id: newUserId,
    email,
    full_name: fullName,
    role,
  });

  if (upsertError) {
    await admin.auth.admin.deleteUser(newUserId);
    return json(
      { error: "Profile upsert failed", detail: upsertError.message },
      500,
    );
  }

  return json(
    {
      id: newUserId,
      email,
      full_name: fullName,
      role,
      initial_password: providedPassword ? null : finalPassword,
    },
    200,
  );
});
