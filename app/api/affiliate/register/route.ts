// app/api/affiliate/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const {
            nombre,
            apellido,
            whatsapp,
            email,
            password,
        } = body;

        if (!nombre || !apellido || !whatsapp || !password) {
            return NextResponse.json(
                { ok: false, error: "Faltan campos obligatorios" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { ok: false, error: "La contraseña debe tener al menos 6 caracteres" },
                { status: 400 }
            );
        }

        // 1️⃣ generar username automático
        const baseUsername =
            `${nombre}.${apellido}`
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");

        const username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;

        // 2️⃣ hash password
        const password_hash = await bcrypt.hash(password, 10);

        // 3️⃣ crear afiliado (code se genera solo)
        const { data: affiliate, error: affiliateError } = await supabaseAdmin
            .from("affiliates")
            .insert({
                nombre,
                apellido,
                whatsapp,
                email: email || null,
                username,
                password_hash,
                estado: "activo",
            })
            .select("id, code")
            .single();

        if (affiliateError || !affiliate) {
            console.error("Error creando afiliado:", affiliateError);
            return NextResponse.json(
                { ok: false, error: "No se pudo crear el socio" },
                { status: 500 }
            );
        }

        // 4️⃣ crear wallet
        const { error: walletError } = await supabaseAdmin
            .from("affiliate_wallets")
            .insert({
                affiliate_id: affiliate.id,
                balance: 0,
            });

        if (walletError) {
            console.error("Error creando wallet:", walletError);
            return NextResponse.json(
                { ok: false, error: "No se pudo crear la billetera" },
                { status: 500 }
            );
        }

        // 5️⃣ crear sesión simple (cookie httpOnly)
        const response = NextResponse.json({
            ok: true,
            affiliate: {
                id: affiliate.id,
                code: affiliate.code,
                username,
            },
        });

        response.cookies.set({
            name: "affiliate_session",
            value: String(affiliate.id),
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 días
            sameSite: "lax",
        });

        return response;

    } catch (e: any) {
        console.error("Error register affiliate:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
