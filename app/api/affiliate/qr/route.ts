// app/api/affiliate/qr/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";

function buildQrUrl(text: string, size = 420) {
    const data = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}`;
}

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) return NextResponse.json({ ok: false }, { status: 401 });

        const { data: session } = await supabaseAdmin
            .from("affiliate_sessions")
            .select("affiliate_id, expires_at, revoked_at")
            .eq("token", token)
            .maybeSingle();

        if (!session || session.revoked_at !== null) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        const exp = new Date(session.expires_at).getTime();
        if (!exp || exp <= Date.now()) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("username, code, is_active")
            .eq("id", session.affiliate_id)
            .maybeSingle();

        if (!affiliate || affiliate.is_active === false) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        const code = (affiliate.code || affiliate.username || "").trim();
        if (!code) {
            return NextResponse.json({ ok: false, error: "Affiliate sin code" }, { status: 400 });
        }

        const origin = req.nextUrl.origin;
        const link = `${origin}/?ref=${encodeURIComponent(code)}`;

        // ✅ redirect directo a PNG (más estable en serverless)
        const qrUrl = buildQrUrl(link, 420);
        return NextResponse.redirect(qrUrl);
    } catch {
        return NextResponse.json({ ok: false }, { status: 401 });
    }
}
