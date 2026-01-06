import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeIdentifier(v: string) {
    return v.trim().toLowerCase();
}

function getClientIp(req: NextRequest) {
    const xff = req.headers.get("x-forwarded-for") || "";
    const first = xff.split(",")[0]?.trim();
    return first || "unknown";
}

function generateCode() {
    const n = Math.floor(100000 + Math.random() * 900000);
    return `CB-${n}`;
}

function hashCode(code: string) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

function genericResponse(code: string | null) {
    return NextResponse.json({
        ok: true,
        message: "Si el usuario existe, te enviaremos instrucciones.",
        code, // ✅ siempre devuelve algo (anti-enumeración)
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const identifier = typeof body?.identifier === "string" ? body.identifier : "";
        const id = normalizeIdentifier(identifier || "");
        const ip = getClientIp(req);
        const ua = req.headers.get("user-agent");

        // ✅ THROTTLE: 3 intentos por 15 min (por ip + identifier)
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        const { count: recentCount } = await supabaseAdmin
            .from("affiliate_password_resets")
            .select("id", { count: "exact", head: true })
            .eq("identifier", id || "") // si viene vacío, igual cae en el mismo bucket
            .eq("ip", ip)
            .gte("created_at", since);

        if ((recentCount ?? 0) >= 3) {
            // registra intento throttled, pero no revela nada
            await supabaseAdmin.from("affiliate_password_resets").insert({
                affiliate_id: null,
                identifier: id || "",
                code_hash: null,
                expires_at: null,
                ip,
                user_agent: ua,
                status: "throttled",
            });

            // ✅ No generamos código si está throttled (para cortar spam)
            return genericResponse(null);
        }

        // ✅ SIEMPRE generamos código (exista o no exista)
        const plainCode = generateCode();
        const codeHash = hashCode(plainCode);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // 1) Buscar afiliado por username o email (si id vacío, no encontrará)
        const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, email")
            .or(`username.eq.${id},email.eq.${id}`)
            .maybeSingle();

        // 2) Registrar intento SIEMPRE
        await supabaseAdmin.from("affiliate_password_resets").insert({
            affiliate_id: affiliate?.id ?? null,
            identifier: id || "",
            code_hash: codeHash,
            expires_at: expiresAt,
            ip,
            user_agent: ua,
            status: id ? "requested" : "invalid",
        });

        // ✅ Respuesta genérica SIEMPRE + code SIEMPRE (anti-enumeración)
        return genericResponse(plainCode);
    } catch {
        // ✅ nunca filtrar errores
        return NextResponse.json({
            ok: true,
            message: "Si el usuario existe, te enviaremos instrucciones.",
            code: null,
        });
    }
}
