// app/(afiliado)/afiliado/layout.tsx
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AfiliadoHeaderClient from "./AfiliadoHeaderClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";

async function getAffiliateFromSession() {
    // ✅ cookies() ES ASYNC en tu versión
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || "";
    if (!token) return null;

    const nowIso = new Date().toISOString();

    // ✅ Buscar sesión por token (PLAIN) porque tu DB tiene columna `token`
    const { data: session } = await supabaseAdmin
        .from("affiliate_sessions")
        .select("affiliate_id, expires_at, revoked_at")
        .eq("token", token)
        .maybeSingle();

    if (!session?.affiliate_id) return null;
    if (session.revoked_at) return null;
    if (session.expires_at && session.expires_at <= nowIso) return null;

    const { data: affiliate } = await supabaseAdmin
        .from("affiliates")
        .select("id, username, must_change_password, is_active")
        .eq("id", session.affiliate_id)
        .maybeSingle();

    if (!affiliate?.id) return null;
    if (affiliate.is_active === false) return null;

    return affiliate;
}

export default async function AfiliadoLayout({ children }: { children: ReactNode }) {
    const affiliate = await getAffiliateFromSession();

    // 🔐 Sin sesión → login
    if (!affiliate) redirect("/afiliado/login");

    // ✅ Ya NO forzamos cambiar clave aquí (se hace con botón)
    // if (affiliate.must_change_password) redirect("/afiliado/cambiar-clave");

    return (
        <div className="min-h-screen bg-neutral-950 text-slate-100">
            <AfiliadoHeaderClient />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
    );
}