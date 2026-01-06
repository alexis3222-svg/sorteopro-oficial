import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const pin = process.env.ADMIN_TOOLS_PIN || "";
    const fp = crypto.createHash("sha256").update(pin).digest("hex").slice(0, 10);

    return NextResponse.json({
        ok: true,
        exists: Boolean(pin),
        length: pin.length,
        fingerprint: fp,
    });
}
