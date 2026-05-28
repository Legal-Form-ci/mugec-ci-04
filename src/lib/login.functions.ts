import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const inputSchema = z.object({
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(1).max(200),
  portal: z.enum(["member", "admin", "miprojet"]),
});

const mugcecAdminRoles = [
  "admin_national", "admin_regional", "admin_local", "agent_saisie",
  "president", "secretaire_general", "tresorier_national", "commissaire_comptes",
  "directeur_executif", "comite_controle", "conseil_sages", "secretaire_regional",
  "tresorier_regional", "delegue_section",
];

/**
 * Server-side login by identifier (phone, admin login, or email).
 *
 * Returns BOTH the session tokens and the canonical dashboard path for the
 * authenticated user, computed server-side from `user_roles` via the
 * `dashboard_path_for(uuid)` function. This eliminates the race condition
 * where `supabase.rpc("current_user_dashboard_path")` was called from the
 * browser before `setSession()` had finished propagating, causing every
 * profile (incl. admins) to be redirected to `/membre`.
 */
export const loginWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const generic = { ok: false as const, error: "invalid_credentials" };

    let email: string | null = null;
    const identifier = data.identifier.trim().toLowerCase();

    if (data.portal === "member") {
      const digits = identifier.replace(/\D/g, "");
      if (!/^\d{6,}$/.test(digits) || identifier !== digits) return generic;
      const { data: resolved, error } = await supabaseAdmin.rpc("lookup_member_email_by_phone", { p_phone: digits });
      if (error || typeof resolved !== "string" || resolved.length === 0) return generic;
      email = resolved;
    }

    if (data.portal === "admin") {
      if (["mugecadmin", "adminmgec"].includes(identifier)) {
        email = "admin@mugec-ci.local";
      }
    }

    if (data.portal === "miprojet") {
      if (["admininoce", "inoceadmin"].includes(identifier)) {
        email = "inoce@miprojet.local";
      }
    }

    if (!email) return generic;

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });

    const { data: signIn, error: signInErr } = await authClient.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (signInErr || !signIn.session || !signIn.user) return generic;

    const { data: roleRows, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", signIn.user.id);
    if (roleErr) {
      console.error("loginWithIdentifier: roles failed", roleErr);
      return generic;
    }
    const roles = (roleRows ?? []).map((r) => String(r.role));
    const isSuperAdmin = roles.includes("super_admin");
    const isMugecAdmin = roles.some((role) => mugcecAdminRoles.includes(role));

    if (data.portal === "member" && (isSuperAdmin || isMugecAdmin)) return generic;
    if (data.portal === "admin" && (!isMugecAdmin || isSuperAdmin)) return generic;
    if (data.portal === "miprojet" && !isSuperAdmin) return generic;

    const dashboard_path = data.portal === "miprojet" ? "/miprojet" : data.portal === "admin" ? "/admin" : "/membre";

    return {
      ok: true as const,
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      dashboard_path,
    };
  });
