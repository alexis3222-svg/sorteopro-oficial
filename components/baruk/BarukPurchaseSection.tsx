"use client";

type TipoCompra = "self" | "gift";

type BarukPurchaseSectionProps = {
    precioUnidad: number;
    agotado: boolean;

    cantidadSeleccionada: number | null;
    onCantidadChange: (cantidad: number) => void;

    tipoCompra: TipoCompra;
    onTipoCompraChange: (tipo: TipoCompra) => void;

    destinatarioNombre: string;
    onDestinatarioNombreChange: (value: string) => void;

    destinatarioCorreo: string;
    onDestinatarioCorreoChange: (value: string) => void;

    destinatarioTelefono: string;
    onDestinatarioTelefonoChange: (value: string) => void;

    mensajeRegalo: string;
    onMensajeRegaloChange: (value: string) => void;

    onComprar: (cantidad: number) => void;
};

const CANTIDADES = [5, 10, 20, 30, 50];

export default function BarukPurchaseSection({
    precioUnidad,
    agotado,

    cantidadSeleccionada,
    onCantidadChange,

    tipoCompra,
    onTipoCompraChange,

    destinatarioNombre,
    onDestinatarioNombreChange,

    destinatarioCorreo,
    onDestinatarioCorreoChange,

    destinatarioTelefono,
    onDestinatarioTelefonoChange,

    mensajeRegalo,
    onMensajeRegaloChange,

    onComprar,
}: BarukPurchaseSectionProps) {
    const cantidad =
        cantidadSeleccionada ?? 5;

    const total =
        cantidad * precioUnidad;

    return (
        <section
            id="comprar-baruk-card"
            className="w-full bg-white"
        >
            <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">

                {/* CABECERA COMPACTA */}

                <div className="mb-5 border-b border-gray-200 pb-4">



                    <h2 className="mt-1 text-xl font-black text-gray-900 md:text-2xl">
                        Compra tus Baruk Cards
                    </h2>

                </div>

                {/* PRODUCTO */}

                <div className="grid items-start gap-7 lg:grid-cols-[minmax(420px,0.9fr)_minmax(500px,1.1fr)] xl:gap-10">

                    {/* =====================================================
              IZQUIERDA - PRODUCTO
          ===================================================== */}

                    <div className="relative">

                        <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-[#f6f6f6] p-5 md:min-h-[460px]">

                            <img
                                src="/assets/baruk-card-front-white-completa.png"
                                alt="Baruk Card"
                                className="max-h-[440px] w-full object-contain"
                            />

                        </div>

                        {/* MINI INFORMACIÓN */}

                        <div className="mt-3 flex items-center justify-between gap-3">

                            <div>

                            </div>



                        </div>

                    </div>

                    {/* =====================================================
              DERECHA - CONFIGURADOR
          ===================================================== */}

                    <div className="lg:pr-2">

                        <h1 className="mt-2 text-2xl font-black leading-tight text-gray-900 md:text-3xl">
                            Tarjeta de la Suerte Baruk593
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                            Cada Baruk Card incluye un número único de participación
                            y puede contener una esfera o un premio instantáneo.
                        </p>

                        {/* PRECIO */}

                        <div className="mt-5 border-b border-gray-200 pb-5">

                            <div className="flex items-end gap-2">

                                <span className="text-3xl font-black text-gray-900">
                                    ${precioUnidad.toFixed(2)}
                                </span>

                                <span className="pb-1 text-sm text-gray-500">
                                    por Card
                                </span>

                            </div>

                        </div>

                        {/* CANTIDAD */}

                        <div className="mt-5">

                            <div className="flex items-center gap-2">

                                <p className="text-sm font-black text-gray-900">
                                    Cantidad:
                                </p>

                                <p className="text-sm font-bold text-[#ff6600]">
                                    {cantidad}
                                </p>

                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">

                                {CANTIDADES.map((opcion) => {
                                    const selected =
                                        opcion === cantidad;

                                    return (
                                        <button
                                            key={opcion}
                                            type="button"
                                            disabled={agotado}
                                            onClick={() =>
                                                onCantidadChange(opcion)
                                            }
                                            className={`min-w-[58px] rounded-lg border px-4 py-2.5 text-sm font-bold transition ${selected
                                                ? "border-[#ff6600] bg-orange-50 text-[#ff6600] ring-1 ring-[#ff6600]"
                                                : "border-gray-300 bg-white text-gray-800 hover:border-gray-500"
                                                }`}
                                        >
                                            {opcion}
                                        </button>
                                    );
                                })}

                            </div>

                        </div>

                        {/* PARA QUIÉN */}

                        <div className="mt-6">

                            <p className="text-sm font-black text-gray-900">
                                ¿Para quién son estas Baruk Cards?
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">

                                <button
                                    type="button"
                                    onClick={() =>
                                        onTipoCompraChange("self")
                                    }
                                    className={`rounded-lg border px-5 py-2.5 text-sm font-bold transition ${tipoCompra === "self"
                                        ? "border-[#ff6600] bg-orange-50 text-[#ff6600] ring-1 ring-[#ff6600]"
                                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
                                        }`}
                                >
                                    Para mí
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onTipoCompraChange("gift")
                                    }
                                    className={`rounded-lg border px-5 py-2.5 text-sm font-bold transition ${tipoCompra === "gift"
                                        ? "border-[#ff6600] bg-orange-50 text-[#ff6600] ring-1 ring-[#ff6600]"
                                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
                                        }`}
                                >
                                    🎁 Regalar
                                </button>

                            </div>

                            <p className="mt-2 text-xs leading-5 text-gray-500">
                                {tipoCompra === "self"
                                    ? "Las tarjetas quedarán vinculadas a tu cuenta."
                                    : "Tú realizas el pago y las tarjetas pertenecerán al destinatario."}
                            </p>

                        </div>

                        {/* =====================================================
                DATOS DEL REGALO
            ===================================================== */}

                        {tipoCompra === "gift" && (

                            <div className="mt-5 border-t border-gray-200 pt-5">

                                <p className="text-sm font-black text-gray-900">
                                    Entrega del regalo
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    Ingresa los datos de la persona que recibirá las Baruk Cards.
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                                    {/* NOMBRE */}

                                    <div className="sm:col-span-2">

                                        <label className="text-xs font-bold text-gray-700">
                                            Nombre del destinatario
                                        </label>

                                        <input
                                            type="text"
                                            value={destinatarioNombre}
                                            onChange={(e) =>
                                                onDestinatarioNombreChange(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Ej: María Pérez"
                                            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
                                        />

                                    </div>

                                    {/* CORREO */}

                                    <div>

                                        <label className="text-xs font-bold text-gray-700">
                                            Correo
                                        </label>

                                        <input
                                            type="email"
                                            value={destinatarioCorreo}
                                            onChange={(e) =>
                                                onDestinatarioCorreoChange(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="correo@ejemplo.com"
                                            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
                                        />

                                    </div>

                                    {/* WHATSAPP */}

                                    <div>

                                        <label className="text-xs font-bold text-gray-700">
                                            WhatsApp
                                        </label>

                                        <input
                                            type="tel"
                                            value={destinatarioTelefono}
                                            onChange={(e) =>
                                                onDestinatarioTelefonoChange(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="09xxxxxxxx"
                                            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
                                        />

                                    </div>

                                    {/* MENSAJE */}

                                    <div className="sm:col-span-2">

                                        <div className="flex items-center justify-between">

                                            <label className="text-xs font-bold text-gray-700">
                                                Mensaje
                                            </label>

                                            <span className="text-[10px] text-gray-400">
                                                {mensajeRegalo.length}/300
                                            </span>

                                        </div>

                                        <textarea
                                            rows={3}
                                            maxLength={300}
                                            value={mensajeRegalo}
                                            onChange={(e) =>
                                                onMensajeRegaloChange(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Escribe un mensaje para el destinatario..."
                                            className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
                                        />

                                    </div>

                                </div>

                            </div>

                        )}

                        {/* TOTAL */}

                        <div className="mt-6 border-t border-gray-200 pt-5">

                            <div className="flex items-center justify-between">

                                <div>
                                    <p className="text-xs text-gray-500">
                                        {cantidad} Baruk Cards
                                    </p>

                                    <p className="mt-1 text-sm font-bold text-gray-700">
                                        Total
                                    </p>
                                </div>

                                <p className="text-3xl font-black text-gray-900">
                                    ${total.toFixed(2)}
                                </p>

                            </div>

                        </div>

                        {/* COMPRAR */}

                        <button
                            type="button"
                            disabled={agotado}
                            onClick={() =>
                                onComprar(cantidad)
                            }
                            className="mt-5 w-full rounded-xl bg-[#ff6600] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#ed5f00] disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            {agotado
                                ? "Baruk Cards agotadas"
                                : tipoCompra === "gift"
                                    ? "Continuar con el regalo"
                                    : "Continuar con la compra"}
                        </button>

                        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[10px] text-gray-500">

                            <span>🔒 Pago seguro</span>

                            <span>⚡ Entrega digital</span>

                            <span>👤 Acceso desde Mi cuenta</span>

                        </div>

                    </div>

                </div>

            </div>
        </section>
    );
}