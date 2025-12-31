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
    // 1) cookie
    const c = req.cookies.get("admin_session")?.value;
    if (c === "1") return true;

    // 2) header (fallback)
    const sent = (req.headers.get("x-admin-secret") || "").trim();
    const expected = (
        process.env.ADMIN_SECRET ||
        process.env.NEXT_PUBLIC_ADMIN_SECRET ||
        ""
    ).trim();

    if (expected && sent && sent === expected) return true;

    return false;
}

export async function GET(req: NextRequest) {
    try {
        if (!isAdmin(req)) {
            return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
        }

        const statusRaw = (req.nextUrl.searchParams.get("status") || "pending").toLowerCase();
        const status = ["pending", "paid", "rejected", "all"].includes(statusRaw)
            ? statusRaw
            : "pending";

        let q = supabaseAdmin
            .from("affiliate_withdrawals")
            .select(
                `
          id,
          affiliate_id,
          amount,
          status,
          destination,
          notes,
          created_at,
          affiliate:affiliates (
            id,
            username,
            display_name,
            whatsapp,
            code,
            status
          )
        `
            )
            .order("created_at", { ascending: false })
            .limit(100);

        if (status !== "all") q = q.eq("status", status);

        const { data, error } = await q;

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, withdrawals: data ?? [] });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || "Error interno" },
            { status: 500 }
        );
    }
}
