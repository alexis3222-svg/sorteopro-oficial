"use client";

import { FormEvent, useState, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type EstadoSorteo = "activo" | "pausado" | "finalizado";

interface EditSorteoFormProps {
    sorteo: {
        id: string;
        titulo: string;
        descripcion: string | null;
        imagen_url: string | null;
        total_numeros: number;
        numeros_vendidos: number;
        precio_numero: number;
        estado: EstadoSorteo;
        actividad_numero: number | null;
    };
    galeriaInicial?: string[];
}

// 👇 nombre del bucket que creaste en Supabase Storage
const STORAGE_BUCKET = "sorteos";

export function EditSorteoForm({
    sorteo,
    galeriaInicial = [],
}: EditSorteoFormProps) {
    const router = useRouter();

    const [titulo, setTitulo] = useState(sorteo.titulo);
    const [descripcion, setDescripcion] = useState(sorteo.descripcion ?? "");
    const [imagenUrl, setImagenUrl] = useState(sorteo.imagen_url ?? "");
    const [galeria, setGaleria] = useState<string[]>(galeriaInicial);

    const [totalNumeros, setTotalNumeros] = useState<number>(
        sorteo.total_numeros
    );
    const [numerosVendidos, setNumerosVendidos] = useState<number>(
        sorteo.numeros_vendidos
    );
    const [precioNumero, setPrecioNumero] = useState<number>(
        sorteo.precio_numero
    );
    const [estado, setEstado] = useState<EstadoSorteo>(sorteo.estado);
    const [actividadNumero, setActividadNumero] = useState<number | "">(
        sorteo.actividad_numero ?? ""
    );

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        const { error } = await supabase
            .from("sorteos")
            .update({
                titulo,
                descripcion: descripcion || null,
                imagen_url: imagenUrl || null,
                total_numeros: totalNumeros,
                numeros_vendidos: numerosVendidos,
                precio_numero: precioNumero,
                estado,
                actividad_numero:
                    actividadNumero === "" ? null : Number(actividadNumero),
                galeria_urls: galeria.length ? galeria : null,
            })
            .eq("id", sorteo.id);

        if (error) {
            console.error("Error actualizando sorteo:", error);
            setErrorMsg("No se pudo guardar el sorteo. Intenta nuevamente.");
        } else {
            setSuccessMsg("Cambios guardados correctamente.");
            router.refresh();
        }

        setSaving(false);
    };

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const ext = file.name.split(".").pop();
            const fileName = `${sorteo.id}-${Date.now()}.${ext}`;
            const filePath = `sorteos/${fileName}`;

            // 👇 IMPORTANTE: upsert en false para que sea un INSERT limpio
            const { error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (uploadError) {
                console.error("Error subiendo imagen:", uploadError);
                setErrorMsg(
                    `Error al subir la imagen: ${uploadError.message ?? "Error desconocido"
                    }`
                );
                setUploading(false);
                return;
            }

            const { data } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(filePath);

            const url = data?.publicUrl;
            if (!url) {
                setErrorMsg(
                    "La imagen se subió pero no se pudo obtener la URL pública."
                );
                setUploading(false);
                return;
            }

            // añadimos a la galería y, si no había principal, la usamos
            setGaleria((prev) => [...prev, url]);
            if (!imagenUrl) setImagenUrl(url);

            setSuccessMsg(
                "Imagen subida correctamente. No olvides guardar los cambios."
            );
        } catch (err: any) {
            console.error("Error inesperado al subir imagen:", err);
            setErrorMsg(
                `Ocurrió un error inesperado al subir la imagen: ${err?.message ?? "Error desconocido"
                }`
            );
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    // Eliminar una imagen de la galería
    const eliminarImagen = (index: number) => {
        setGaleria((prev) => {
            const nueva = [...prev];
            const removida = nueva.splice(index, 1)[0];

            // si era la principal, ponemos otra o vaciamos
            if (removida === imagenUrl) {
                const nuevaPrincipal = nueva[0] ?? "";
                setImagenUrl(nuevaPrincipal);
            }

            return nueva;
        });
    };

    // Mover imagen arriba/abajo (reordenar)
    const moverImagen = (index: number, direccion: "up" | "down") => {
        setGaleria((prev) => {
            const nueva = [...prev];
            const targetIndex = direccion === "up" ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= nueva.length) return prev;

            const temp = nueva[index];
            nueva[index] = nueva[targetIndex];
            nueva[targetIndex] = temp;
            return nueva;
        });
    };

    // Marcar una imagen como principal
    const hacerPrincipal = (url: string) => {
        setImagenUrl(url);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-5 md:px-6 md:py-6"
        >
            {/* Header con botón Volver */}
            <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-50">Editar sorteo</h2>
                    <p className="text-xs text-slate-400">
                        Actualiza la información del sorteo activo de Casa Bikers.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-orange-500 hover:text-orange-200"
                >
                    ← Volver al panel
                </button>
            </div>

            {/* Mensajes */}
            {errorMsg && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {errorMsg}
                </div>
            )}
            {successMsg && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {successMsg}
                </div>
            )}

            {/* Layout en dos columnas: izquierda imagen/galería, derecha datos */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
                {/* Columna izquierda: imagen principal + galería */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
                            Imagen del sorteo
                        </p>

                        {/* Preview principal – responsiva */}
                        <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80">
                            {imagenUrl ? (
                                <img
                                    src={imagenUrl}
                                    alt={titulo}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">
                                    Sin imagen principal
                                </div>
                            )}
                        </div>

                        {/* Upload */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-medium text-slate-300">
                                Subir nueva imagen (se agregará a la galería)
                            </label>
                            <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400">
                                {uploading ? "Subiendo..." : "Elegir archivo"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                            </label>
                            <p className="text-[11px] text-slate-400">
                                Imagen recomendada 16:9 en buena resolución. Se sube a Supabase
                                Storage y se guarda la URL pública.
                            </p>
                        </div>

                        {/* URL manual */}
                        <div className="mt-3 space-y-1">
                            <label className="block text-[11px] font-semibold text-slate-300">
                                O pegar URL de imagen manualmente (principal)
                            </label>
                            <input
                                type="text"
                                value={imagenUrl}
                                onChange={(e) => setImagenUrl(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:border-orange-500 focus:outline-none"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    {/* Galería ordenable */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
                            Galería de imágenes ({galeria.length})
                        </p>

                        {galeria.length === 0 ? (
                            <p className="text-[11px] text-slate-500">
                                Aún no has agregado imágenes a la galería.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {galeria.map((url, index) => {
                                    const esPrincipal = url === imagenUrl;
                                    return (
                                        <div
                                            key={url + index}
                                            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2"
                                        >
                                            <div className="h-14 w-20 overflow-hidden rounded-lg bg-slate-900">
                                                <img
                                                    src={url}
                                                    alt={`Imagen ${index + 1}`}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-slate-300">
                                                        Imagen #{index + 1}
                                                        {esPrincipal && (
                                                            <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-[2px] text-[10px] font-semibold text-emerald-300">
                                                                Principal
                                                            </span>
                                                        )}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => moverImagen(index, "up")}
                                                            className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 hover:border-orange-500"
                                                        >
                                                            ↑
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moverImagen(index, "down")}
                                                            className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 hover:border-orange-500"
                                                        >
                                                            ↓
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => hacerPrincipal(url)}
                                                        className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 hover:border-orange-500"
                                                    >
                                                        Hacer principal
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => eliminarImagen(index)}
                                                        className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] text-red-200 hover:border-red-400/80"
                                                    >
                                                        Quitar de la galería
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Columna derecha: datos del sorteo */}
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Título */}
                        <div className="space-y-1 md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-200">
                                Título del sorteo
                            </label>
                            <input
                                type="text"
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-orange-500 focus:outline-none"
                            />
                        </div>

                        {/* Actividad */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-200">
                                Número de actividad
                            </label>
                            <input
                                type="number"
                                value={actividadNumero}
                                onChange={(e) =>
                                    setActividadNumero(
                                        e.target.value === "" ? "" : Number(e.target.value)
                                    )
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-orange-500 focus:outline-none"
                                placeholder="Ej: 1"
                            />
                        </div>

                        {/* Estado */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-200">
                                Estado del sorteo
                            </label>
                            <select
                                value={estado}
                                onChange={(e) => setEstado(e.target.value as EstadoSorteo)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-orange-500 focus:outline-none"
                            >
                                <option value="activo">Activo</option>
                                <option value="pausado">Pausado</option>
                                <option value="finalizado">Finalizado</option>
                            </select>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-200">
                            Descripción
                        </label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-orange-500 focus:outline-none"
                        />
                    </div>

                    {/* Números y precio */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-200">
                                Total de números
                            </label>
                            <input
                                type="number"
                                value={totalNumeros}
                                onChange={(e) =>
                                    setTotalNumeros(Number(e.target.value) || 0)
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-orange-500 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-200">
                                Números vendidos
                            </label>
                            <input
                                type="number"
                                value={numerosVendidos}
                                onChange={(e) =>
                                    setNumerosVendidos(Number(e.target.value) || 0)
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-orange-500 focus:outline-none"
                            />
                            <p className="text-[11px] text-slate-400">
                                Normalmente se actualiza automáticamente con las ventas.
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-200">
                                Precio por número (USD)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={precioNumero}
                                onChange={(e) =>
                                    setPrecioNumero(Number(e.target.value) || 0)
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-orange-500 hover:text-orange-200"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2 text-xs font-semibold text-black hover:bg-orange-400 disabled:opacity-60"
                >
                    {saving ? "Guardando..." : "Guardar cambios"}
                </button>
            </div>
        </form>
    );
}
