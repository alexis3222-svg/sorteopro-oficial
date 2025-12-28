// app/api/affiliate/qr/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";

// ✅ QR via servicio público (sin librerías). Devuelve PNG.
// Nota: es un servicio externo, pero no es librería NPM.
function buildQrUrl(text: string, size = 360) {
    const data = encodeURIComponent(text);
    // api.qrserver.com es simple y devuelve PNG directo
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}`;
}

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

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

        // Construir URL base desde el request (sirve local/prod)
        const origin = req.nextUrl.origin;
        const link = `${origin}/?ref=${encodeURIComponent(code)}`;

        // Traer PNG del servicio QR
        const qrUrl = buildQrUrl(link, 420);
        const r = await fetch(qrUrl, { cache: "no-store" });

        if (!r.ok) {
            return NextResponse.json({ ok: false, error: "No se pudo generar QR" }, { status: 502 });
        }

        const buf = await r.arrayBuffer();

        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store",
                // Para que el botón "Descargar" tenga nombre
                "Content-Disposition": `inline; filename="qr_${code}.png"`,
            },
        });
    } catch (e) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }
}
