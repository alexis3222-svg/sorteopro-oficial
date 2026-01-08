"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Anton } from "next/font/google";

const anton = Anton({ subsets: ["latin"], weight: "400" });

export default function SocioComercialPage() {
    const router = useRouter();

    const [nombres, setNombres] = useState("");
    const [apellidos, setApellidos] = useState("");
    const [email, setEmail] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [okMsg, setOkMsg] = useState<string | null>(null);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setOkMsg(null);

        const n = nombres.trim();
        const a = apellidos.trim();
        const em = email.trim().toLowerCase();
        const u = username.trim();
        const p = password;
        const cp = confirmPassword;
        const wa = whatsapp.trim();

        if (!wa) {
            setErrorMsg("El número de WhatsApp es obligatorio.");
            return;
        }

        const waValido = /^09\d{8}$/.test(wa);
        if (!waValido) {
            setErrorMsg("Ingresa un WhatsApp ecuatoriano válido (09xxxxxxxx).");
            return;
        }


        // ✅ DEBUG visible: te dirá exactamente qué llega vacío
        const missing: string[] = [];
        if (!n) missing.push("Nombres");
        if (!a) missing.push("Apellidos");
        if (!em) missing.push("Email");
        if (!u) missing.push("Usuario");
        if (!p) missing.push("Contraseña");
        if (!cp) missing.push("Confirmar contraseña");

        if (missing.length > 0) {
            setErrorMsg(`Faltan campos obligatorios: ${missing.join(", ")}.`);
            console.log("DEBUG values:", { n, a, em, u, pLen: p.length, cpLen: cp.length });
            return;
        }

        const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
        if (!correoValido) {
            setErrorMsg("Ingresa un correo electrónico válido.");
            return;
        }

        if (p.length < 6) {
            setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        if (p !== cp) {
            setErrorMsg("Las contraseñas no coinciden.");
            return;
        }

        setLoading(true);
        try {
            const r = await fetch("/api/affiliate/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: n,
                    apellido: a,
                    email: em,
                    username: u,
                    password: p,
                    whatsapp: wa,          // ✅ nuevo
                }),

                cache: "no-store",
            });

            const data = await r.json().catch(() => null);

            if (!r.ok || !data?.ok) {
                setErrorMsg(data?.error || `No se pudo registrar (HTTP ${r.status})`);
                return;
            }

            setOkMsg("Registro creado. Ahora puedes iniciar sesión.");
            router.push("/afiliado/login");
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err?.message || "Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-white text-neutral-900">
            <div className="mx-auto max-w-3xl px-4 py-10">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <h1
                        className={`${anton.className} text-xl md:text-2xl uppercase tracking-[0.18em]`}
                    >
                        Socio comercial
                    </h1>

                    <p className="mt-2 text-sm text-neutral-600">
                        Regístrate para obtener tu código, tu QR y tu billetera de comisiones.
                    </p>

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            <Field
                                label="Nombres"
                                value={nombres}
                                onChange={setNombres}
                                placeholder="Ej: Jean Carlo"
                            />
                            <Field
                                label="Apellidos"
                                value={apellidos}
                                onChange={setApellidos}
                                placeholder="Ej: Mendez Gomez"
                            />
                        </div>

                        <Field
                            label="Email (obligatorio)"
                            type="email"
                            value={email}
                            onChange={setEmail}
                            placeholder="correo@ejemplo.com"
                            name="email"
                            autoComplete="email"
                        />

                        <Field
                            label="WhatsApp (obligatorio)"
                            value={whatsapp}
                            onChange={setWhatsapp}
                            placeholder="09xxxxxxxx"
                        />

                        <Field
                            label="Escribe tu alias"
                            value={username}
                            onChange={setUsername}
                            placeholder="Ej: juan322"
                            name="username"
                            autoComplete="username"
                        />

                        <Field
                            label="Contraseña nueva"
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="Ej: juan123456"
                            name="password"
                            autoComplete="new-password"
                        />

                        <Field
                            label="Confirmar nueva contraseña"
                            type="password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            placeholder="••••••••"
                            name="confirmPassword"
                            autoComplete="new-password"
                        />


                        {errorMsg && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {errorMsg}
                            </div>
                        )}

                        {okMsg && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                {okMsg}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-xl border-2 border-[#FF6600] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-black transition hover:bg-[#FF7F00] hover:text-white disabled:opacity-60"
                            >
                                {loading ? "Creando..." : "Comenzar"}
                            </button>

                            <button
                                type="button"
                                onClick={() => router.push("/")}
                                className="rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-neutral-50"
                            >
                                Volver al inicio
                            </button>
                        </div>

                        <p className="text-xs text-neutral-500">
                            Al registrarte aceptas nuestros Términos y Condiciones.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    name,
    autoComplete,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    name?: string;
    autoComplete?: string;
}) {

    return (
        <label className="block">
            <span className="text-xs font-semibold text-neutral-700">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onInput={(e) => onChange((e.target as HTMLInputElement).value)} // ✅ autofill seguro
                placeholder={placeholder}
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF7F00]"
            />

        </label>
    );
}
