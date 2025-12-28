// app/api/affiliate/me/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";

export async function GET(_req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        // 1) validar sesión
        const { data: session, error: sErr } = await supabaseAdmin
            .from("affiliate_sessions")
            .select("affiliate_id, expires_at, revoked_at")
            .eq("token", token)
            .maybeSingle();

        if (sErr || !session) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        const exp = new Date(session.expires_at).getTime();
        const now = Date.now();

        if (session.revoked_at !== null || !exp || exp <= now) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        // 2) traer affiliate
        const { data: affiliate, error: aErr } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, display_name, code, is_active, created_at")
            .eq("id", session.affiliate_id)
            .maybeSingle();

        if (aErr || !affiliate || affiliate.is_active === false) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        return NextResponse.json({
            ok: true,
            affiliate: {
                id: affiliate.id,
                username: affiliate.username,
                display_name: affiliate.display_name,
                code: affiliate.code,
                created_at: affiliate.created_at,
            },
        });
    } catch {
        return NextResponse.json({ ok: false }, { status: 401 });
    }
}
