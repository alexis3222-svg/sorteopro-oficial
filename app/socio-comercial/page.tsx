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

        // 🔒 Validaciones quirúrgicas
        if (!nombres.trim()) return setErrorMsg("Ingresa tus nombres.");
        if (!apellidos.trim()) return setErrorMsg("Ingresa tus apellidos.");

        const mail = email.trim().toLowerCase();
        if (!mail) return setErrorMsg("Ingresa tu email.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
            return setErrorMsg("Email inválido.");

        if (!username.trim()) return setErrorMsg("Ingresa un usuario.");
        if (username.trim().length < 4)
            return setErrorMsg("El usuario debe tener mínimo 4 caracteres.");

        if (!password) return setErrorMsg("Ingresa una contraseña.");
        if (password.length < 6)
            return setErrorMsg("La contraseña debe tener mínimo 6 caracteres.");

        if (password !== confirmPassword)
            return setErrorMsg("Las contraseñas no coinciden.");

        setLoading(true);
        try {
            const res = await fetch("/api/affiliate/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: nombres.trim(),
                    apellido: apellidos.trim(),
                    email: mail,
                    username: username.trim(),
                    password,
                }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json?.ok) {
                throw new Error(json?.error || "No se pudo completar el registro.");
            }

            setOkMsg("Registro creado correctamente. Ahora puedes iniciar sesión.");
            // router.push("/afiliado/login"); // lo activamos luego
        } catch (err: any) {
            setErrorMsg(err?.message || "Ocurrió un error inesperado.");
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
                                placeholder="Ej: Alexis Luis"
                            />
                            <Field
                                label="Apellidos"
                                value={apellidos}
                                onChange={setApellidos}
                                placeholder="Ej: Amaguay Vásquez"
                            />
                        </div>

                        <Field
                            label="Email (obligatorio)"
                            type="email"
                            value={email}
                            onChange={setEmail}
                            placeholder="correo@ejemplo.com"
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                            <Field
                                label="Usuario"
                                value={username}
                                onChange={setUsername}
                                placeholder="Ej: socio048"
                            />
                            <Field
                                label="Contraseña"
                                type="password"
                                value={password}
                                onChange={setPassword}
                                placeholder="••••••••"
                            />
                        </div>

                        <Field
                            label="Confirmar contraseña"
                            type="password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            placeholder="••••••••"
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
                                className="rounded-xl border-2 border-[#FF7F00] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-black transition hover:bg-[#FF7F00] hover:text-white disabled:opacity-60"
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
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <label className="block">
            <span className="text-xs font-semibold text-neutral-700">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF7F00]"
            />
        </label>
    );
}
