import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
    const expected = process.env.NEXT_PUBLIC_ADMIN_SECRET || "";
    const got = req.headers.get("x-admin-secret") || "";
    return expected && got && expected === got;
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

type Body = {
    affiliateId?: string;
    status?: "active" | "suspended";
};

export async function POST(req: NextRequest) {
    try {
        if (!isAuthorized(req)) {
            return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
        }

        const body = (await req.json().catch(() => null)) as Body | null;
        const affiliateId = String(body?.affiliateId || "").trim();
        const status = String(body?.status || "").trim().toLowerCase();

        if (!affiliateId) {
            return NextResponse.json({ ok: false, error: "Falta affiliateId" }, { status: 400 });
        }
        if (status !== "active" && status !== "suspended") {
            return NextResponse.json({ ok: false, error: "Status inválido" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("affiliates")
            .update({ status, is_active: status === "active" })
            .eq("id", affiliateId);

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
