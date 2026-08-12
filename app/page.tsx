"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Anton } from "next/font/google";
import { supabase } from "../lib/supabaseClient";
import { PremiosInstantaneos } from "@/components/PremiosInstantaneos";
import { trackAddToCart, trackViewContent } from "../lib/metaPixel";
import BarukHero from "@/components/baruk/BarukHero";
import BarukPurchaseSection from "@/components/baruk/BarukPurchaseSection";
import BarukShop from "@/components/baruk/BarukShop";
import BarukHowItWorks from "@/components/baruk/BarukHowItWorks";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
});

type ModalStep = "resumen" | "pago" | "ok";

type TipoCompra = "self" | "gift";

type NumeroAsignado = {
  numero: string | number;
};

type PedidoCreado = {
  id: number;
  tx: string;
  estado: string;
};

export default function HomePage() {
  const router = useRouter();

  const [sorteo, setSorteo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // estado para el modal de compra
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCantidad, setSelectedCantidad] =
    useState<number | null>(5);
  const [modalStep, setModalStep] = useState<ModalStep>("resumen");

  // ✅ SOLO estos 2 métodos (coinciden con /api/pedidos/crear)
  const [metodoPago, setMetodoPago] = useState<"transferencia" | "payphone">(
    "transferencia"
  );

  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [correoCliente, setCorreoCliente] = useState("");
  const [tipoCompra, setTipoCompra] =
    useState<TipoCompra>("self");

  const [destinatarioNombre, setDestinatarioNombre] =
    useState("");

  const [destinatarioTelefono, setDestinatarioTelefono] =
    useState("");

  const [destinatarioCorreo, setDestinatarioCorreo] =
    useState("");

  const [mensajeRegalo, setMensajeRegalo] =
    useState("");

  // estado de guardado
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // 🔍 Estado para consulta de números por correo
  const [buscaCorreo, setBuscaCorreo] = useState("");
  const [numerosCliente, setNumerosCliente] = useState<string[]>([]);
  const [buscandoNumeros, setBuscandoNumeros] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("sorteos")
        .select("*")
        .eq("estado", "activo")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setSorteo(data);

        trackViewContent({
          content_name: data.titulo ?? "Sorteo Baruk593",
          content_category: "sorteo",
          content_ids: [String(data.id)],
          content_type: "product",
          value: Number(data.precio_numero ?? 0),
          currency: "USD",
        });
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // 🔗 Capturar código de afiliado (?ref=CODE) y persistirlo
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (ref && ref.trim()) {
      // Cookie ligera SOLO para tracking UX (la validación real es backend)
      document.cookie =
        `affiliate_ref=${encodeURIComponent(ref.trim())}; ` +
        `path=/; max-age=${60 * 60 * 24 * 7}`;
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Cargando sorteo...
      </div>
    );
  }

  if (!sorteo) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        No hay sorteos activos por el momento.
      </div>
    );
  }

  const vendidos = sorteo?.numeros_vendidos ?? 0;
  const total = sorteo?.total_numeros ?? 20000;
  const progresoReal = total > 0 ? (vendidos / total) * 100 : 0;
  const progresoMostrado = progresoReal < 2 ? 2 : progresoReal;
  const precioUnidad = sorteo?.precio_numero ?? 1;
  const numeroActividad: number = sorteo.actividad_numero ?? 1;
  const agotado = total > 0 && vendidos >= total;

  const premios: string[] = (sorteo.titulo ?? "")
    .split("+")
    .map((p: string) => p.trim())
    .filter(Boolean);

  // 👉 imagen principal del hero, tomada de la BD
  const imagenHero: string | null = sorteo.imagen_url ?? null;

  // 👉 galería de imágenes del sorteo (jsonb en la BD)
  const galeriaHero: string[] = Array.isArray(sorteo.galeria_urls)
    ? sorteo.galeria_urls
    : [];

  const handleComprarClick = (
    cantidad: number
  ) => {
    if (agotado) {
      return;
    }

    trackAddToCart({
      content_name:
        sorteo?.titulo ??
        "Baruk Card",

      content_category:
        "baruk_card",

      content_ids: [
        String(
          sorteo?.id ??
          "sin-id"
        ),
      ],

      content_type:
        "product",

      num_items:
        cantidad,

      value:
        Number(
          cantidad *
          precioUnidad
        ),

      currency:
        "USD",
    });

    setSelectedCantidad(
      cantidad
    );

    /*
     * El resumen de cantidad y total
     * ya aparece en la ficha de producto
     * Baruk Card del Home.
     *
     * Por eso abrimos directamente
     * Datos y método de pago.
     */
    setModalStep(
      "pago"
    );

    setIsModalOpen(
      true
    );

    setOrderError(
      null
    );
  };

  const handleCerrarModal = () => {
    setIsModalOpen(false);

    // Dejamos 5 Baruk Cards seleccionadas
    // en el configurador principal.
    setSelectedCantidad(5);

    // Reiniciamos el modal.
    setModalStep("resumen");

    // Datos del comprador.
    setNombreCliente("");
    setTelefonoCliente("");
    setCorreoCliente("");

    // Tipo de compra.
    setTipoCompra("self");

    // Datos del destinatario.
    setDestinatarioNombre("");
    setDestinatarioTelefono("");
    setDestinatarioCorreo("");
    setMensajeRegalo("");

    // Método de pago.
    setMetodoPago("transferencia");

    // Estados del pedido.
    setOrderError(null);
    setSavingOrder(false);
  };

  const totalPaquete =
    selectedCantidad != null ? selectedCantidad * precioUnidad : 0;

  // ✅ Crear pedido SIEMPRE en backend (service role)
  async function crearPedidoServer(
    clientTransactionId: string | null
  ): Promise<PedidoCreado> {
    const r = await fetch("/api/pedidos/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sorteo_id:
          sorteo.id,

        actividad_numero:
          numeroActividad,

        cantidad_numeros:
          selectedCantidad!,

        precio_unitario:
          precioUnidad,

        total:
          totalPaquete,

        /*
         * ============================================
         * DATOS DEL COMPRADOR
         * ============================================
         */

        nombre:
          nombreCliente.trim(),

        telefono:
          telefonoCliente.trim(),

        correo:
          correoCliente
            .trim()
            .toLowerCase(),

        metodo_pago:
          metodoPago,

        /*
         * ============================================
         * COMPRA NORMAL / REGALO
         * ============================================
         */

        tipo_compra:
          tipoCompra,

        /*
         * Solo enviamos destinatario cuando
         * la compra es un regalo.
         */
        gift:
          tipoCompra === "gift"
            ? {
              destinatarioNombre:
                destinatarioNombre.trim(),

              destinatarioCorreo:
                destinatarioCorreo
                  .trim()
                  .toLowerCase(),

              destinatarioTelefono:
                destinatarioTelefono.trim(),

              mensaje:
                mensajeRegalo.trim() ||
                null,
            }
            : null,

        /*
         * PayPhone
         */
        clientTransactionId,

        client_transaction_id:
          clientTransactionId,

        tx:
          clientTransactionId,
      }),
      cache: "no-store",
    });

    const data = await r.json().catch(() => null);

    if (!r.ok || !data?.ok || !data?.pedido) {
      throw new Error(data?.error || `Error creando pedido (HTTP ${r.status})`);
    }

    return data.pedido as PedidoCreado;
  }

  // Guardar pedido + flujo según método de pago
  const handleConfirmarDatosPago = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOrderError(null);

    // 🔒 Validaciones de campos
    if (!nombreCliente.trim()) {
      setOrderError("El nombre completo es obligatorio.");
      return;
    }

    if (!telefonoCliente.trim()) {
      setOrderError("El número de WhatsApp es obligatorio.");
      return;
    }

    const telefonoValido = /^09\d{8}$/.test(telefonoCliente.trim());
    if (!telefonoValido) {
      setOrderError(
        "Ingresa un número de WhatsApp válido (09xxxxxxxx)."
      );
      return;
    }

    if (!correoCliente.trim()) {
      setOrderError(
        "El correo electrónico es obligatorio para ver tus números asignados."
      );
      return;
    }

    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoCliente.trim());
    if (!correoValido) {
      setOrderError("Ingresa un correo electrónico válido.");
      return;
    }

    /*
 * =====================================================
 * VALIDACIONES DEL REGALO
 * =====================================================
 */

    if (tipoCompra === "gift") {
      if (!destinatarioNombre.trim()) {
        setOrderError(
          "Ingresa el nombre de la persona que recibirá el regalo."
        );
        return;
      }

      if (!destinatarioTelefono.trim()) {
        setOrderError(
          "Ingresa el WhatsApp de la persona que recibirá el regalo."
        );
        return;
      }

      const telefonoDestinatarioValido =
        /^09\d{8}$/.test(
          destinatarioTelefono.trim()
        );

      if (!telefonoDestinatarioValido) {
        setOrderError(
          "Ingresa un WhatsApp válido para el destinatario (09xxxxxxxx)."
        );
        return;
      }

      if (!destinatarioCorreo.trim()) {
        setOrderError(
          "Ingresa el correo electrónico de la persona que recibirá el regalo."
        );
        return;
      }

      const correoDestinatarioValido =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          destinatarioCorreo.trim()
        );

      if (!correoDestinatarioValido) {
        setOrderError(
          "Ingresa un correo electrónico válido para el destinatario."
        );
        return;
      }
    }

    if (selectedCantidad == null) {
      setOrderError(
        "No se detectó el paquete seleccionado."
      );
      return;
    }

    setSavingOrder(true);

    try {
      // ✅ PRO-1: generar clientTransactionId SOLO si es PayPhone (siempre string)
      const clientTransactionId =
        metodoPago === "payphone"
          ? (globalThis.crypto?.randomUUID?.() ??
            `tx_${Date.now()}_${Math.random().toString(16).slice(2)}`)
          : null;

      // ✅ extra safety: si por alguna razón quedó vacío
      if (
        metodoPago === "payphone" &&
        (!clientTransactionId || !clientTransactionId.trim())
      ) {
        throw new Error("No se pudo generar clientTransactionId para PayPhone");
      }

      // ✅ 1) Crear pedido en backend (enviando clientTransactionId)
      const pedido = await crearPedidoServer(clientTransactionId);

      // ✅ 2) Flujo por método
      if (metodoPago === "payphone") {
        setIsModalOpen(false);

        const totalStr = Number(totalPaquete).toFixed(2);
        const ref = `Sorteo ${numeroActividad} - Pedido ${pedido.id}`;
        const tx = clientTransactionId ?? pedido.tx;

        if (!tx) {
          throw new Error("Falta tx para PayPhone (clientTransactionId/pedido.tx)");
        }

        // ✅ ÚNICO push (evita doble navegación y evita null)
        router.push(
          `/pago-payphone?amount=${encodeURIComponent(totalStr)}` +
          `&ref=${encodeURIComponent(ref)}` +
          `&tx=${encodeURIComponent(tx)}`
        );
      } else {
        // Transferencia: pedido ya existe como pendiente
        setModalStep("ok");
      }

    } catch (err: any) {
      console.error("Error registrando pedido:", err);
      setOrderError(
        err?.message ||
        "Ocurrió un error inesperado al registrar el pedido. Intenta de nuevo."
      );
    } finally {
      setSavingOrder(false);
    }
  };

  // 🔍 Buscar números asignados por correo  ✅ (CORREGIDO: fuera de handleConfirmarDatosPago)
  const handleBuscarNumeros = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorBusqueda(null);
    setNumerosCliente([]);

    const correo = buscaCorreo.trim().toLowerCase();
    if (!correo) {
      setErrorBusqueda("Ingresa el correo que usaste al realizar tu compra.");
      return;
    }

    setBuscandoNumeros(true);

    try {
      // 1) Buscar pedidos pagados de este sorteo con ese correo
      const { data: pedidos, error: pedidosError } = await supabase
        .from("pedidos")
        .select("id")
        .eq("sorteo_id", sorteo.id)
        .eq("correo", correo)
        .in(
          "estado",
          [
            "pagado",
            "confirmado",
          ]
        )
        .or(
          "tipo_compra.eq.self,tipo_compra.is.null"
        );

      if (pedidosError) {
        console.error("Error buscando pedidos por correo:", pedidosError);
        setErrorBusqueda("No se pudo consultar tus números. Intenta de nuevo.");
        return;
      }

      if (!pedidos || pedidos.length === 0) {
        setErrorBusqueda(
          "No encontramos pedidos pagados con ese correo para esta actividad."
        );
        return;
      }

      // ✅ TS: ids numéricos
      const pedidoIds = pedidos.map((p) => p.id as number);

      // 2) Buscar números asignados a esos pedidos
      const { data: nums, error: numsError } = await supabase
        .from("numeros_asignados")
        .select("numero")
        .in("pedido_id", pedidoIds)
        .eq("sorteo_id", sorteo.id);

      if (numsError) {
        console.error("Error buscando números asignados:", numsError);
        setErrorBusqueda("No se pudieron obtener tus números.");
        return;
      }

      if (!nums || nums.length === 0) {
        setErrorBusqueda(
          "Aún no hay números asignados a tus pedidos. Si acabas de pagar, espera unos minutos."
        );
        return;
      }

      // 3) Formatear y mezclar en orden aleatorio
      const lista = (nums as NumeroAsignado[])
        .map((n) => String(n.numero).padStart(5, "0"))
        .sort(() => Math.random() - 0.5);

      setNumerosCliente(lista);
    } catch (err) {
      console.error("Error general buscando números:", err);
      setErrorBusqueda("Ocurrió un error al buscar tus números.");
    } finally {
      setBuscandoNumeros(false);
    }
  };

  return (
    <div className="flex w-full flex-col">
      {/* =====================================================
    HERO BARUK593
===================================================== */}

      <BarukHero
        titulo={sorteo.titulo}
        imagenUrl={imagenHero}
        galeriaUrls={galeriaHero}
        precioUnidad={precioUnidad}
        agotado={agotado}

        progreso={progresoMostrado}
        vendidos={vendidos}
        total={total}
      />

      {/* =====================================================
    COMPRAR BARUK CARDS
===================================================== */}

      <BarukPurchaseSection
        precioUnidad={
          precioUnidad
        }

        agotado={
          agotado
        }

        cantidadSeleccionada={
          selectedCantidad
        }

        onCantidadChange={
          setSelectedCantidad
        }

        tipoCompra={
          tipoCompra
        }

        onTipoCompraChange={
          setTipoCompra
        }

        destinatarioNombre={
          destinatarioNombre
        }

        onDestinatarioNombreChange={
          setDestinatarioNombre
        }

        destinatarioCorreo={
          destinatarioCorreo
        }

        onDestinatarioCorreoChange={
          setDestinatarioCorreo
        }

        destinatarioTelefono={
          destinatarioTelefono
        }

        onDestinatarioTelefonoChange={
          setDestinatarioTelefono
        }

        mensajeRegalo={
          mensajeRegalo
        }

        onMensajeRegaloChange={
          setMensajeRegalo
        }

        onComprar={
          handleComprarClick
        }
      />

      {/* =====================================================
    CÓMO FUNCIONA
===================================================== */}

      <BarukHowItWorks />

      {/* =====================================================
    CONSULTA TUS NÚMEROS
===================================================== */}

      <section className="w-full py-10 md:py-14">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-[#fafafa]">

          <div className="grid md:grid-cols-[0.85fr_1.15fr]">

            {/* TEXTO */}
            <div className="border-b border-slate-200 px-6 py-7 md:border-b-0 md:border-r md:px-8 md:py-9">

              <p className="text-[10px] font-black uppercase tracking-[0.20em] text-[#ff6600]">
                Tus compras
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#171717] md:text-3xl">
                Consulta tus números
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                Ingresa el correo utilizado en tu compra para consultar los
                números de participación vinculados a tus Baruk Cards.
              </p>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-400">
                <span>🔒 Consulta segura</span>
                <span>⚡ Acceso inmediato</span>
              </div>

            </div>

            {/* FORMULARIO */}
            <div className="flex items-center px-6 py-7 md:px-8 md:py-9">

              <form
                onSubmit={handleBuscarNumeros}
                className="w-full"
              >
                <label
                  htmlFor="correo-consulta"
                  className="text-xs font-bold text-slate-600"
                >
                  Correo de compra
                </label>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row">

                  <input
                    id="correo-consulta"
                    type="email"
                    value={buscaCorreo}
                    onChange={(e) =>
                      setBuscaCorreo(e.target.value)
                    }
                    className="
                min-h-[50px]
                flex-1
                rounded-xl
                border
                border-slate-300
                bg-white
                px-4
                text-sm
                outline-none
                transition

                focus:border-[#ff6600]
                focus:ring-2
                focus:ring-orange-100
              "
                    placeholder="correo@ejemplo.com"
                  />

                  <button
                    type="submit"
                    disabled={buscandoNumeros}
                    className="
                min-h-[50px]
                rounded-xl
                bg-[#ff6600]
                px-6
                text-sm
                font-black
                text-white
                transition

                hover:bg-[#f15f00]

                disabled:cursor-not-allowed
                disabled:opacity-60
              "
                  >
                    {buscandoNumeros
                      ? "Consultando..."
                      : "Consultar"}
                  </button>

                </div>

                <p className="mt-3 text-[11px] leading-5 text-slate-400">
                  Usa el mismo correo electrónico registrado al momento de realizar tu compra.
                </p>

                {errorBusqueda && (
                  <p className="mt-3 text-xs font-semibold text-red-500">
                    {errorBusqueda}
                  </p>
                )}

              </form>

            </div>

          </div>

          {/* RESULTADOS */}
          {numerosCliente.length > 0 && (
            <div className="border-t border-slate-200 bg-white px-6 py-7 md:px-8">

              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff6600]">
                    Tus Baruk Cards
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Números de participación asignados para esta actividad
                  </p>
                </div>

                <p className="text-xs font-semibold text-slate-400">
                  Actividad #{numeroActividad}
                </p>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">

                {numerosCliente.map((num) => (
                  <div
                    key={num}
                    className="
                rounded-2xl
                border
                border-orange-200
                bg-[#fffaf6]
                px-4
                py-4
                text-center
                transition

                hover:-translate-y-0.5
                hover:border-orange-300
                hover:shadow-md
              "
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Número
                    </p>

                    <span
                      className={`${anton.className} mt-1 block text-xl tracking-[0.12em] text-[#ff6600]`}
                    >
                      {num}
                    </span>
                  </div>
                ))}

              </div>

            </div>
          )}

        </div>
      </section>

      {/* =====================================================
    PREMIOS INSTANTÁNEOS
===================================================== */}

      <PremiosInstantaneos />

      {/* =====================================================
    PRODUCTOS EN TENDENCIA
===================================================== */}

      <BarukShop />

      {/* CÓMO PARTICIPAR */}
      <div
        id="como-funciona"
        className="mt-16 scroll-mt-24"
      >

      </div>

      {/* MODAL COMPRA */}
      {isModalOpen && selectedCantidad != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-[#1f2128] p-6 shadow-xl border border-white/10">
            {modalStep === "resumen" && (
              <>
                <h3
                  className={`${anton.className} text-lg md:text-xl uppercase tracking-[0.18em] text-[#ff9933] text-center`}
                >
                  Resumen de compra
                </h3>

                <p className="mt-2 text-center text-xs text-slate-300">
                  Actividad #{numeroActividad} · {sorteo.titulo}
                </p>

                <div className="mt-4 space-y-2 text-sm text-slate-200">
                  <div className="flex justify-between">
                    <span>Cantidad de números</span>
                    <span className="font-semibold">x{selectedCantidad}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Precio por número</span>
                    <span>${precioUnidad.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-1">
                    <span className="font-semibold">Total a pagar</span>
                    <span className="font-semibold text-[#FF7F00]">
                      ${totalPaquete.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-slate-400 text-center">
                  En el siguiente paso podrás elegir tu método de pago y dejar
                  tus datos para confirmar la reserva de tus números.
                </p>
                {tipoCompra === "gift" && (

                  <div className="mt-4 rounded-xl border border-[#FF7F00]/30 bg-[#FF7F00]/10 p-4 text-center">

                    <p className="text-xs font-bold text-[#ff9933]">
                      🎁 Este pedido es un regalo para {destinatarioNombre}
                    </p>

                    <p className="mt-2 text-[11px] leading-5 text-slate-300">
                      Una vez confirmado el pago, las Baruk Cards
                      quedarán vinculadas al destinatario mediante:
                    </p>

                    <p className="mt-2 break-all text-[11px] font-semibold text-white">
                      {destinatarioCorreo}
                    </p>

                  </div>

                )}

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    className="w-full rounded-xl bg-[#FF7F00] px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-[#ff9933]"
                    onClick={() => setModalStep("pago")}
                  >
                    Continuar al pago
                  </button>
                  <button
                    className="w-full rounded-xl border border-white/30 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                    onClick={handleCerrarModal}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}

            {modalStep === "pago" && (
              <form onSubmit={handleConfirmarDatosPago}>
                <h3
                  className={`${anton.className} text-lg md:text-xl uppercase tracking-[0.18em] text-[#ff9933] text-center`}
                >
                  Datos y método de pago
                </h3>

                <p className="mt-2 text-center text-xs text-slate-300">
                  Actividad #{numeroActividad} · Paquete x{selectedCantidad} ·{" "}
                  <span className="font-semibold text-[#FF7F00]">
                    ${totalPaquete.toFixed(2)}
                  </span>
                </p>

                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <div className="space-y-1">

                    <p className="pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF7F00]">
                      Tus datos de compra
                    </p>
                    <label className="text-xs text-slate-300">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={nombreCliente}
                      onChange={(e) => setNombreCliente(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-[#15161b] px-3 py-2 text-xs outline-none focus:border-[#FF7F00]"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      WhatsApp / Teléfono
                    </label>
                    <input
                      type="tel"
                      value={telefonoCliente}
                      onChange={(e) => setTelefonoCliente(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-[#15161b] px-3 py-2 text-xs outline-none focus:border-[#FF7F00]"
                      placeholder="Ej: 09xxxxxxxx"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={correoCliente}
                      onChange={(e) => setCorreoCliente(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-[#15161b] px-3 py-2 text-xs outline-none focus:border-[#FF7F00]"
                      placeholder="Ej: correo@ejemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-300">
                      Elige tu método de pago:
                    </p>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        className="h-3 w-3"
                        checked={metodoPago === "payphone"}
                        onChange={() => setMetodoPago("payphone")}
                      />
                      <span>Tarjeta (Debito / Credito)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        className="h-3 w-3"
                        checked={metodoPago === "transferencia"}
                        onChange={() => setMetodoPago("transferencia")}
                      />
                      <span>Transferencia / Depósito bancario</span>
                    </label>
                  </div>

                  {orderError && (
                    <p className="text-[11px] text-red-400">{orderError}</p>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={savingOrder}
                    className="w-full rounded-xl bg-[#FF7F00] px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-[#ff6600] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingOrder ? "Registrando pedido..." : "Confirmar pedido"}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-white/30 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                    onClick={handleCerrarModal}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {modalStep === "ok" && (
              <>
                <h3
                  className={`${anton.className} text-lg md:text-xl uppercase tracking-[0.18em] text-[#ff6600] text-center`}
                >
                  Pedido recibido
                </h3>

                <p className="mt-3 text-sm text-slate-200 text-center">
                  ¡Gracias, {nombreCliente || "participante"}! 🙌
                </p>

                <p className="mt-2 text-xs text-slate-300 text-center">
                  Hemos registrado tu pedido del paquete{" "}
                  <span className="font-semibold">x{selectedCantidad}</span> por{" "}
                  <span className="font-semibold text-[#FF7F00]">
                    ${totalPaquete.toFixed(2)}
                  </span>
                  .
                </p>

                <p className="mt-3 text-[11px] text-slate-400 text-center">
                  Tu pedido aparecerá como pendiente hasta que confirmemos el pago desde el
                  panel administrativo.
                </p>

                {/* 🔹 INFORMACIÓN PARA TRANSFERENCIA */}
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs text-slate-200 space-y-2">
                  <p className="text-center font-semibold text-[#FF7F00]">
                    Datos para transferencia o depósito
                  </p>

                  <p className="text-center">
                    <span className="font-semibold">Banco:</span> Guayaquil
                  </p>
                  <p className="text-center">
                    <span className="font-semibold">Tipo de cuenta:</span> Ahorros
                  </p>
                  <p className="text-center">
                    <span className="font-semibold">Número de cuenta:</span> 0048055945
                  </p>
                  <p className="text-center">
                    <span className="font-semibold">Titular:</span> Alexis Amaguay Vásquez "Baruk593"
                  </p>

                  <p className="mt-2 text-center text-slate-300">
                    📲 Envía el comprobante por WhatsApp:
                  </p>

                  <div className="flex flex-col items-center gap-2">
                    {/* 🔗 Link WhatsApp */}
                    <a
                      href="https://wa.me/593990575984"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
                    >
                      0990575984
                    </a>

                    {/* 📋 Copiar al portapapeles */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("0990575984");
                        alert("Número copiado al portapapeles");
                      }}
                      className="rounded-full border border-slate-600 px-3 py-1 text-[11px] text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
                    >
                      Copiar número
                    </button>
                  </div>

                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    className="w-full rounded-xl bg-[#FF7F00] px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-[#ff6600]"
                    onClick={handleCerrarModal}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
