// app/afiliado/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";

export default async function AfiliadoDashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;


    if (!token) {
        redirect("/afiliado/login");
    }

    const { data: session, error } = await supabaseAdmin
        .from("affiliate_sessions")
        .select("id, affiliate_id, expires_at, revoked_at")
        .eq("token", token)
        .maybeSingle();

    const now = Date.now();
    const exp = session?.expires_at
        ? new Date(session.expires_at).getTime()
        : 0;

    const invalid =
        !!error ||
        !session ||
        session.revoked_at !== null ||
        !exp ||
        exp <= now;

    if (invalid) {
        redirect("/afiliado/login");
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-slate-100 px-4 py-10">
            <div className="mx-auto max-w-4xl border border-[#FF7F00]/30 bg-neutral-900/30 rounded-2xl p-6">
                <h1 className="text-xl font-semibold">Panel Afiliado</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Sesión válida ✅ (placeholder)
                </p>
            </div>
        </div>
    );
}
