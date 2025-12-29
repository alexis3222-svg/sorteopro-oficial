// app/api/admin/affiliate/stats/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // 1) Socios registrados
        const { count: sociosActivos, error: e1 } = await supabaseAdmin
            .from("affiliates")
            .select("id", { count: "exact", head: true });

        if (e1) {
            console.error("stats affiliates error:", e1);
            return NextResponse.json({ ok: false, error: "Error contando socios" }, { status: 500 });
        }

        // 2) Retiros pendientes
        const { count: retirosPendientes, error: e2 } = await supabaseAdmin
            .from("affiliate_withdrawals")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");

        if (e2) {
            console.error("stats withdrawals error:", e2);
            return NextResponse.json({ ok: false, error: "Error contando retiros" }, { status: 500 });
        }

        // 3) Wallets: sumatoria real (server)
        const { data: wallets, error: e3 } = await supabaseAdmin
            .from("affiliate_wallets")
            .select("balance_available, balance_pending");

        if (e3) {
            console.error("stats wallets error:", e3);
            return NextResponse.json({ ok: false, error: "Error cargando billeteras" }, { status: 500 });
        }

        const saldoDisponibleTotal = (wallets || []).reduce(
            (acc: number, w: any) => acc + (Number(w.balance_available ?? 0) || 0),
            0
        );

        const saldoPendienteTotal = (wallets || []).reduce(
            (acc: number, w: any) => acc + (Number(w.balance_pending ?? 0) || 0),
            0
        );

        return NextResponse.json({
            ok: true,
            stats: {
                sociosActivos: sociosActivos ?? 0,
                saldoDisponibleTotal,
                saldoPendienteTotal,
                retirosPendientes: retirosPendientes ?? 0,
            },
        });
    } catch (err) {
        console.error("stats internal error:", err);
        return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
    }
}
