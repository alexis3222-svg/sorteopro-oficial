import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

function isAdmin(req: NextRequest) {
    const cookie = req.cookies.get("admin_session")?.value;
    if (cookie === "1") return true;

    const sent = (req.headers.get("x-admin-secret") || "").trim();
    const expected = (
        process.env.ADMIN_SECRET ||
        process.env.NEXT_PUBLIC_ADMIN_SECRET ||
        ""
    ).trim();

    return Boolean(expected && sent && sent === expected);
}

export async function POST(req: NextRequest) {
    if (!isAdmin(req)) {
        return NextResponse.json(
            { ok: false, error: "No autorizado" },
            { status: 401 }
        );
    }

    const body = await req.json().catch(() => ({}));
    const open = Boolean(body?.open);

    const { error } = await supabaseAdmin
        .from("app_settings")
        .upsert(
            {
                key: "affiliate_registration",
                value: { open },
            },
            { onConflict: "key" }
        );

    if (error) {
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true, open });
}
