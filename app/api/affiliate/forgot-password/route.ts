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
    // Vercel suele mandar x-forwarded-for: "ip, proxy1, proxy2"
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

export async function POST(req: NextRequest) {
    try {
        const { identifier } = await req.json();
        const id = typeof identifier === "string" ? normalizeIdentifier(identifier) : "";
        const ip = getClientIp(req);
        const ua = req.headers.get("user-agent");

        // Respuesta genérica SIEMPRE (anti-enumeración)
        const generic = () =>
            NextResponse.json({
                ok: true,
                message: "Si el usuario existe, te enviaremos instrucciones.",
                code: null as string | null,
            });

        if (!id) {
            // aun así registramos intento, pero como "invalid"
            await supabaseAdmin.from("affiliate_password_resets").insert({
                affiliate_id: null,
                identifier: "",
                code_hash: null,
                expires_at: null,
                ip,
                user_agent: ua,
                status: "invalid",
            });
            return generic();
        }

        // ✅ THROTTLE: 3 intentos por 15 minutos (por ip + identifier)
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        const { count: recentCount } = await supabaseAdmin
            .from("affiliate_password_resets")
            .select("id", { count: "exact", head: true })
            .eq("identifier", id)
            .eq("ip", ip)
            .gte("created_at", since);

        if ((recentCount ?? 0) >= 3) {
            await supabaseAdmin.from("affiliate_password_resets").insert({
                affiliate_id: null,
                identifier: id,
                code_hash: null,
                expires_at: null,
                ip,
                user_agent: ua,
                status: "throttled",
            });
            return generic();
        }

        // 1) Buscar afiliado por username o email
        const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, email")
            .or(`username.eq.${id},email.eq.${id}`)
            .maybeSingle();

        // 2) Generar código solo si existe
        let plainCode: string | null = null;
        let codeHash: string | null = null;
        let expiresAt: string | null = null;

        if (affiliate?.id) {
            plainCode = generateCode();
            codeHash = hashCode(plainCode);
            expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        // 3) Registrar intento (exista o no)
        await supabaseAdmin.from("affiliate_password_resets").insert({
            affiliate_id: affiliate?.id ?? null,
            identifier: id,
            code_hash: codeHash,
            expires_at: expiresAt,
            ip,
            user_agent: ua,
            status: "requested",
        });

        // ✅ Respuesta genérica SIEMPRE (code puede ser null)
        return NextResponse.json({
            ok: true,
            message: "Si el usuario existe, te enviaremos instrucciones.",
            code: plainCode,
        });
    } catch {
        return NextResponse.json({
            ok: true,
            message: "Si el usuario existe, te enviaremos instrucciones.",
            code: null,
        });
    }
}
