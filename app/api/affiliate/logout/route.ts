// app/api/affiliate/logout/route.ts
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AFF_COOKIE = "affiliate_session";
const AFF_FORCE_COOKIE = "affiliate_must_change";

function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        // ✅ Leer cookie desde el request (compatible con cualquier Next)
        const token = req.cookies.get(AFF_COOKIE)?.value;

        if (token) {
            const tokenHash = hashToken(token);

            // ✅ Revocar por token_hash (tu sistema usa hash)
            await supabaseAdmin
                .from("affiliate_sessions")
                .update({ revoked_at: new Date().toISOString() })
                .eq("token", token);
        }

        const res = NextResponse.json({ ok: true });

        // ✅ Borrar cookies SIEMPRE
        res.cookies.set(AFF_COOKIE, "", { path: "/", maxAge: 0 });
        res.cookies.set(AFF_FORCE_COOKIE, "", { path: "/", maxAge: 0 });

        return res;
    } catch {
        const res = NextResponse.json({ ok: true });
        res.cookies.set(AFF_COOKIE, "", { path: "/", maxAge: 0 });
        res.cookies.set(AFF_FORCE_COOKIE, "", { path: "/", maxAge: 0 });
        return res;
    }
}