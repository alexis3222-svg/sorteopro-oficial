import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const username = String(body?.username ?? "").trim().toLowerCase();
        const password = String(body?.password ?? "").trim();

        if (!username || !password) return jsonError("Falta username o password", 400);

        const { data: aff, error } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, password_hash, is_active")
            .eq("username", username)
            .maybeSingle();

        if (error) return jsonError(error.message, 500);
        if (!aff) return jsonError("Usuario o contraseña inválidos", 401);
        if (aff.is_active === false) return jsonError("Tu cuenta está desactivada", 403);

        const ok = await bcrypt.compare(password, String(aff.password_hash ?? ""));
        if (!ok) return jsonError("Usuario o contraseña inválidos", 401);

        // ✅ Cookie simple (por ahora): "aff:<uuid>"
        const token = `aff:${aff.id}`;

        const res = NextResponse.json({ ok: true });
        res.cookies.set("aff_session", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 30, // 30 días
        });

        return res;
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
