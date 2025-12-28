// app/api/affiliate/logout/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";

export async function POST(_req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (token) {
            // Revocar sesión (no importa si no existe)
            await supabaseAdmin
                .from("affiliate_sessions")
                .update({ revoked_at: new Date().toISOString() })
                .eq("token", token);
        }

        // Borrar cookie
        const res = NextResponse.json({ ok: true });

        res.cookies.set({
            name: COOKIE_NAME,
            value: "",
            path: "/",
            maxAge: 0,
        });

        return res;
    } catch {
        // Logout SIEMPRE responde ok (no revelar estado interno)
        const res = NextResponse.json({ ok: true });

        res.cookies.set({
            name: COOKIE_NAME,
            value: "",
            path: "/",
            maxAge: 0,
        });

        return res;
    }
}
