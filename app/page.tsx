"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SorteoCarousel } from "../components/SorteoCarousel";
import { ProgressBar } from "../components/ProgressBar";
import { Anton } from "next/font/google";
import { supabase } from "../lib/supabaseClient";
import NumerosBendecidos from "../components/NumerosBendecidos";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
});

// agregamos "transferencia" al flujo del modal
type ModalStep = "resumen" | "pago" | "transferencia" | "ok";

type NumeroAsignado = {
  numero: string | number;
};

export default function HomePage() {
  const router = useRouter();

  const [sorteo, setSorteo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // estado para el modal de compra
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCantidad, setSelectedCantidad] = useState<number | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>("resumen");

  // datos del checkout
  const [metodoPago, setMetodoPago] = useState<
    "transferencia" | "payphone" | "tarjeta"
  >("transferencia");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [correoCliente, setCorreoCliente] = useState("");

  // estado de guardado en Supabase
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

      if (!error) {
        setSorteo(data);
      }
      setLoading(false);
    };

    fetchData();
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
  const total = sorteo?.total_numeros ?? 10000;
  const progresoReal = total > 0 ? (vendidos / total) * 100 : 0;
  const progresoMostrado = progresoReal < 20 ? 20 : progresoReal;
  const precioUnidad = sorteo?.precio_numero ?? 1;

  const numeroActividad: number = sorteo.actividad_numero ?? 1;

  const premios: string[] = (sorteo.titulo ?? "")
    .split("+")
    .map((p: string) => p.trim())
    .filter(Boolean);

  const paquetes = [5, 9, 12, 20, 30, 50];

  // 👉 imagen principal del hero, tomada de la BD
  const imagenHero: string | null = sorteo.imagen_url ?? null;

  // 👉 galería de imágenes del sorteo (jsonb en la BD)
  const galeriaHero: string[] = Array.isArray(sorteo.galeria_urls)
    ? sorteo.galeria_urls
    : [];

  const handleComprarClick = (cantidad: number) => {
    setSelectedCantidad(cantidad);
    setModalStep("resumen");
    setIsModalOpen(true);
    setOrderError(null);
  };

  const handleCerrarModal = () => {
    setIsModalOpen(false);
    setSelectedCantidad(null);
    setModalStep("resumen");
    setNombreCliente("");
    setTelefonoCliente("");
    setCorreoCliente("");
    setMetodoPago("transferencia");
    setOrderError(null);
    setSavingOrder(false);
  };

  const totalPaquete =
    selectedCantidad != null ? selectedCantidad * precioUnidad : 0;

  const handleConfirmarDatosPago = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOrderError(null);

    // Validaciones (las tuyas)
    if (!nombreCliente.trim()) return setOrderError("El nombre completo es obligatorio.");
    if (!telefonoCliente.trim()) return setOrderError("El número de WhatsApp es obligatorio.");

    const telefonoValido = /^09\d{8}$/.test(telefonoCliente.trim());
    if (!telefonoValido) return setOrderError("Ingresa un número de WhatsApp ecuatoriano válido (09xxxxxxxx).");

    if (!correoCliente.trim()) return setOrderError("El correo electrónico es obligatorio para ver tus números asignados.");
    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoCliente.trim());
    if (!correoValido) return setOrderError("Ingresa un correo electrónico válido.");

    if (selectedCantidad == null) return setOrderError("No se detectó el paquete seleccionado.");

    setSavingOrder(true);

    try {
      const totalStr = Number(totalPaquete).toFixed(2);
      const ref = `Sorteo ${numeroActividad} - Preorden`;

      // tx único para PayPhone
      const tx =
        (crypto as any)?.randomUUID?.() ||
        `P-${numeroActividad}-${Date.now().toString().slice(-8)}-${Math.random().toString(16).slice(2)}`;

      // ✅ PAYPHONE: solo redirige. NO crea pedido, NO vende, NO asigna.
      if (metodoPago === "payphone") {
        setIsModalOpen(false);

        router.push(
          `/pago-payphone?amount=${encodeURIComponent(totalStr)}&ref=${encodeURIComponent(
            ref
          )}&tx=${encodeURIComponent(tx)}&sorteoId=${encodeURIComponent(
            sorteo.id
          )}&cantidad=${encodeURIComponent(String(selectedCantidad))}&nombre=${encodeURIComponent(
            nombreCliente.trim()
          )}&telefono=${encodeURIComponent(telefonoCliente.trim())}&correo=${encodeURIComponent(
            correoCliente.trim().toLowerCase()
          )}`
        );

        return;
      }

      // ✅ TRANSFERENCIA: solo muestra instrucciones. NO crea pedido, NO vende, NO asigna.
      if (metodoPago === "transferencia") {
        setModalStep("transferencia");
        return;
      }

      // Otros (si existiera)
      setModalStep("ok");
    } catch (err: any) {
      console.error(err);
      setOrderError(err?.message || "Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setSavingOrder(false);
    }
  };



  // 🔍 Buscar números asignados por correo
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
        .eq("estado", "pagado");

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

      const pedidoIds = pedidos.map((p) => p.id as string);

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
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      {/* BLOQUE PREMIOS ESTILO PF */}
      <div className="w-full pt-2 md:pt-4">
        <div className="mx-auto max-w-3xl px-4 text-center space-y-0.0 md:space-y-2">
          <p
            className={`${anton.className} text-lg md:text-2xl uppercase tracking-[0.12em] text-[#ff6600]`}
          >
            JUEGA
          </p>

          {premios.length > 0 ? (
            premios.map((premio, index) => (
              <p
                key={index}
                className={`${anton.className} text-lg md:text-2xl uppercase tracking-[0.12em] text-[#2b2b2b]`}
              >
                {index === 0 ? premio : `+ ${premio}`}
              </p>
            ))
          ) : (
            <p
              className={`${anton.className} text-lg md:text-2xl uppercase tracking-[0.12em] text-[#2b2b2b]`}
            >
              {sorteo.titulo}
            </p>
          )}

          <p className="mt-1 text-[15px] md:text-xs font-extrabold tracking-[0.12em] text-slate-600 uppercase">
            ACTIVIDAD #{numeroActividad}
          </p>
        </div>
      </div>

      {/* SECCIÓN HERO / ENCABEZADO */}
      <section className="space-y-6">
        {galeriaHero.length > 0 ? (
          <SorteoCarousel images={galeriaHero} titulo={sorteo.titulo} />
        ) : imagenHero ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/5">
            <img
              src={imagenHero}
              alt={sorteo.titulo ?? "Imagen del sorteo"}
              className="h-auto w-full object-cover"
            />
          </div>
        ) : (
          <SorteoCarousel />
        )}

        <div className="space-y-4 py-3">
          <p
            className={`${anton.className} text-center text-[28px] md:text-[34px] uppercase tracking-tight text-[#2b2b2b]`}
          >
            ¡CANTIDADES LIMITADAS!
          </p>

          <ProgressBar value={progresoMostrado} />

          <p className="text-center text-[13px] md:text[15px] font-normal text-slate-600 leading-relaxed">
            Los vehículos se jugarán una vez vendida la totalidad de los
            números, es decir, cuando la barra de progreso llegue al 100%.
          </p>
        </div>
      </section>

      {/* SECCIÓN: PREMIOS INSTANTÁNEOS + ADQUIERE TUS NÚMEROS */}
      <section className="space-y-10">
        {/* 🟡 BLOQUE PREMIOS INSTANTÁNEOS */}
        <div className="text-center">
          <p className="text-lg md:text-xl font-extrabold uppercase tracking-[0.3em] text-slate-700">
            ¡PREMIOS INSTANTÁNEOS!
          </p>

          <p className="mt-1 text-xs md:text-sm text-slate-600">
            ¡Hay 10 números bendecidos con premios en efectivo! Revisa si tienes uno
            de los siguientes números:
          </p>

          <div className="mt-4">
            <NumerosBendecidos sorteoId={sorteo.id} />
          </div>
        </div>

        {/* 🟠 BLOQUE ADQUIERE TUS NÚMEROS */}
        <div className="space-y-2 text-center">
          <p className="text-lg md:text-xl font-extrabold uppercase tracking-[0.3em] text-slate-700">
            ¡ADQUIERE TUS NÚMEROS!
          </p>

          <p className="text-[13px] font-extrabold text-slate-700">
            Valor de la unidad:{" "}
            <span className="font-extrabold text-slate-700">
              ${precioUnidad.toFixed(2)}
            </span>
          </p>
        </div>

        {/* Tarjetas de paquetes */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
          {paquetes.map((cantidad) => (
            <article
              key={cantidad}
              className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-[#3A3F4B]/90 px-4 py-4 shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                x{cantidad} números
              </p>
              <p className="text-2xl font-bold text-white">
                {(cantidad * precioUnidad).toFixed(2)}
              </p>
              <button
                className="mt-2 w-full rounded-xl bg-[#FF7F00] px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-[#ff6600]"
                onClick={() => handleComprarClick(cantidad)}
              >
                Comprar
              </button>
            </article>
          ))}
        </div>
      </section>


      {/* 🔍 SECCIÓN: CONSULTA TUS NÚMEROS (ESTILO PF) */}
      <section className="w-full pb-10 md:pb-14">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <h3
            className={`${anton.className} text-base md:text-lg uppercase tracking-[0.18em] text-[#2b2b2b] text-center`}
          >
            Consulta tus números
          </h3>
          <p className="mt-2 text-xs md:text-sm text-slate-600 text-center">
            Ingresa el correo que usaste al realizar tu compra y te mostraremos
            los números asignados a tus boletos para esta actividad.
          </p>

          <form
            onSubmit={handleBuscarNumeros}
            className="mt-4 flex flex-col gap-3 md:flex-row md:items-center"
          >
            <input
              type="email"
              value={buscaCorreo}
              onChange={(e) => setBuscaCorreo(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#FF7F00]"
              placeholder="correo@ejemplo.com"
            />
            <button
              type="submit"
              disabled={buscandoNumeros}
              className="rounded-lg bg-[#FF7F00] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-[#ff9933] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {buscandoNumeros ? "Buscando..." : "Ver mis números"}
            </button>
          </form>

          {errorBusqueda && (
            <p className="mt-3 text-xs text-red-500 text-center">
              {errorBusqueda}
            </p>
          )}

          {numerosCliente.length > 0 && (
            <div className="mt-5">
              <p className="text-xs md:text-sm text-slate-700 text-center mb-3">
                Estos son los números que tienes asignados actualmente para la
                actividad #{numeroActividad}:
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 justify-items-center">
                {numerosCliente.map((num) => (
                  <div
                    key={num}
                    className="min-w-[72px] rounded-xl border border-[#FF7F00]/60 bg-[#FFF7EC] px-3 py-2 text-center shadow-sm"
                  >
                    <span
                      className={`${anton.className} text-sm tracking-[0.16em] text-[#2b2b2b]`}
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

      {/* MODAL COMPRA */}
      {
        isModalOpen && selectedCantidad != null && (
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
                          onChange={() => {
                            setMetodoPago("payphone");
                            setOrderError(null); // ✅ limpia el mensaje rojo
                          }}
                        />
                        <span>Tarjeta Debito / Credito</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          className="h-3 w-3"
                          checked={metodoPago === "transferencia"}
                          onChange={() => {
                            setMetodoPago("transferencia");
                            setOrderError(null); // ✅ limpia el mensaje rojo
                          }}
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
                      {savingOrder
                        ? "Registrando pedido..."
                        : "Confirmar pedido"}
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

              {modalStep === "transferencia" && (
                <>
                  <h3
                    className={`${anton.className} text-lg md:text-xl uppercase tracking-[0.18em] text-[#ff9933] text-center`}
                  >
                    Datos para transferencia
                  </h3>

                  <p className="mt-3 text-xs text-slate-300 text-center">
                    Tu pedido fue registrado correctamente. Ahora realiza la
                    transferencia y envía el comprobante.
                  </p>

                  <div className="mt-5 space-y-2 rounded-xl bg-[#15161b] p-4 text-sm border border-white/10">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Banco:</span>
                      <span className="font-semibold text-slate-100">
                        Banco Pichincha
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Tipo de cuenta:</span>
                      <span className="font-semibold text-slate-100">
                        Ahorros
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Número de cuenta:</span>
                      <span className="font-mono text-slate-100">
                        1234567890
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Titular:</span>
                      <span className="font-semibold text-slate-100">
                        ALEXIS AMAGUAY VÁSQUEZ
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Whatsapp:</span>
                      <span className="font-mono text-slate-100">
                        0980966034
                      </span>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-white/10">
                      <span className="text-slate-400">Monto a pagar:</span>
                      <span className="font-bold text-[#FF7F00]">
                        ${totalPaquete.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-slate-300 mb-2">
                      Envía el comprobante por WhatsApp:
                    </p>

                    <a
                      href={`https://wa.me/593980966034?text=${encodeURIComponent(
                        `Hola, te envío el comprobante del pedido del paquete x${selectedCantidad} por $${totalPaquete.toFixed(
                          2
                        )}.`
                      )}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black shadow hover:bg-emerald-400 transition"
                    >
                      📲 Enviar comprobante
                    </a>
                  </div>

                  <p className="mt-4 text-[11px] text-slate-400 text-center">
                    Una vez verificado tu pago, cambiaremos el estado de tu pedido
                    a{" "}
                    <span className="font-semibold text-emerald-300">
                      PAGADO
                    </span>{" "}
                    y se asignarán tus números.
                  </p>

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
                    Tu pedido aparecerá como pendiente hasta que confirmemos el
                    pago desde el panel administrativo.
                  </p>

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
        )
      }
    </div >
  );
}
