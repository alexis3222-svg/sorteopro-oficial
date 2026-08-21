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
import BarukParallaxBanner from "@/components/baruk/BarukParallaxBanner";
import F1SphereHomeSection from "@/components/baruk/F1SphereHomeSection";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
});

type ModalStep = "resumen" | "pago" | "ok";

type TipoCompra = "self" | "gift";

type MetodoPago =
  | "transferencia"
  | "payphone"
  | "wallet";

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

  // Métodos de pago disponibles.
  const [metodoPago, setMetodoPago] =
    useState<MetodoPago>(
      "transferencia"
    );

  // Billetera Baruk593
  const [walletBalance, setWalletBalance] =
    useState<number | null>(null);

  const [walletLoading, setWalletLoading] =
    useState(false);

  const [
    walletSessionEmail,
    setWalletSessionEmail,
  ] =
    useState<string | null>(null);

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

    setWalletBalance(null);
    setWalletLoading(false);
    setWalletSessionEmail(null);

    // Estados del pedido.
    setOrderError(null);
    setSavingOrder(false);
  };

  const totalPaquete =
    selectedCantidad != null ? selectedCantidad * precioUnidad : 0;

  /* ============================================================
     SELECCIONAR BILLETERA BARUK593
  ============================================================ */

  const seleccionarWallet = async () => {
    setMetodoPago(
      "wallet"
    );

    setOrderError(
      null
    );

    setWalletLoading(
      true
    );

    setWalletBalance(
      null
    );

    try {
      const {
        data:
        sessionData,

        error:
        sessionError,
      } =
        await supabase
          .auth
          .getSession();


      if (sessionError) {
        throw sessionError;
      }


      const session =
        sessionData.session;


      if (!session) {
        setWalletSessionEmail(
          null
        );

        setOrderError(
          "Para pagar con tu saldo Baruk593 debes iniciar sesión en Mi Cuenta."
        );

        return;
      }


      const sessionEmail =
        String(
          session.user.email ??
          ""
        )
          .trim()
          .toLowerCase();


      setWalletSessionEmail(
        sessionEmail ||
        null
      );


      /*
       * Si todavía no escribió el correo,
       * usamos automáticamente el de su
       * cuenta Baruk593.
       */
      if (
        sessionEmail &&
        !correoCliente.trim()
      ) {
        setCorreoCliente(
          sessionEmail
        );
      }


      const response =
        await fetch(
          "/api/marketplace/wallet",
          {
            method:
              "GET",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },

            cache:
              "no-store",
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => null
          );


      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ??
          "No se pudo consultar tu saldo."
        );
      }


      setWalletBalance(
        Number(
          data.wallet
            ?.availableBalance ??
          0
        )
      );

    } catch (
    err: unknown
    ) {
      console.error(
        "Error consultando billetera:",
        err
      );

      setOrderError(
        err instanceof Error
          ? err.message
          : "No se pudo consultar tu Billetera Baruk593."
      );

    } finally {
      setWalletLoading(
        false
      );
    }
  };

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


    /*
     * =====================================================
     * VALIDAR PAGO CON BILLETERA
     * =====================================================
     */

    let walletAccessToken:
      string | null =
      null;


    if (
      metodoPago ===
      "wallet"
    ) {
      const {
        data:
        sessionData,

        error:
        sessionError,
      } =
        await supabase
          .auth
          .getSession();


      if (sessionError) {
        setOrderError(
          "No se pudo validar tu sesión."
        );

        return;
      }


      const session =
        sessionData.session;


      if (!session) {
        setOrderError(
          "Para pagar con tu saldo Baruk593 debes iniciar sesión en Mi Cuenta."
        );

        return;
      }


      const sessionEmail =
        String(
          session.user.email ??
          ""
        )
          .trim()
          .toLowerCase();


      const buyerEmail =
        correoCliente
          .trim()
          .toLowerCase();


      /*
       * La billetera pertenece a la cuenta
       * autenticada. El correo del comprador
       * debe coincidir.
       */
      if (
        !sessionEmail ||
        buyerEmail !==
        sessionEmail
      ) {
        setOrderError(
          `Para utilizar tu saldo debes comprar con el correo de tu cuenta Baruk593: ${sessionEmail || "correo no disponible"}`
        );

        return;
      }


      /*
       * Validación visual.
       * El servidor también vuelve a comprobar
       * el saldo antes de descontarlo.
       */
      if (
        walletBalance !== null &&
        walletBalance <
        totalPaquete
      ) {
        setOrderError(
          `Saldo insuficiente. Tienes $${walletBalance.toFixed(
            2
          )} disponibles y esta compra cuesta $${totalPaquete.toFixed(
            2
          )}.`
        );

        return;
      }


      walletAccessToken =
        session.access_token;
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
      if (
        metodoPago ===
        "payphone"
      ) {
        /*
         * ===============================================
         * PAYPHONE
         * NO MODIFICAMOS SU FUNCIONAMIENTO ACTUAL
         * ===============================================
         */

        setIsModalOpen(
          false
        );


        const totalStr =
          Number(
            totalPaquete
          ).toFixed(
            2
          );


        const ref =
          `Sorteo ${numeroActividad} - Pedido ${pedido.id}`;


        const tx =
          clientTransactionId ??
          pedido.tx;


        if (!tx) {
          throw new Error(
            "Falta tx para PayPhone (clientTransactionId/pedido.tx)"
          );
        }


        router.push(
          `/pago-payphone?amount=${encodeURIComponent(
            totalStr
          )}` +
          `&ref=${encodeURIComponent(
            ref
          )}` +
          `&tx=${encodeURIComponent(
            tx
          )}`
        );


      } else if (
        metodoPago ===
        "wallet"
      ) {
        /*
         * ===============================================
         * BILLETERA BARUK593
         * ===============================================
         */

        if (
          !walletAccessToken
        ) {
          throw new Error(
            "No se pudo validar tu sesión para pagar con saldo."
          );
        }


        const walletResponse =
          await fetch(
            "/api/wallet/pay/cards",
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${walletAccessToken}`,

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  pedidoId:
                    pedido.id,
                }),
            }
          );


        const walletData =
          await walletResponse
            .json()
            .catch(
              () => null
            );


        /*
         * Si paymentConfirmed = true,
         * el dinero ya fue cobrado correctamente,
         * incluso si las tarjetas siguen
         * terminando de procesarse.
         */
        if (
          !walletResponse.ok &&
          !walletData
            ?.paymentConfirmed
        ) {
          throw new Error(
            walletData?.error ??
            "No se pudo realizar el pago con tu saldo."
          );
        }


        if (
          !walletData
            ?.paymentConfirmed
        ) {
          throw new Error(
            walletData?.error ??
            "No se pudo confirmar el pago con tu saldo."
          );
        }


        /*
         * Actualizamos el saldo mostrado.
         */
        if (
          walletData
            ?.newBalance != null
        ) {
          setWalletBalance(
            Number(
              walletData.newBalance
            )
          );
        }


        setIsModalOpen(
          false
        );


        /*
         * Pago exitoso acepta ?id=
         */
        router.push(
          `/pago-exitoso?id=${encodeURIComponent(
            String(
              pedido.id
            )
          )}&status=approved`
        );


      } else {
        /*
         * ===============================================
         * TRANSFERENCIA
         * ===============================================
         */

        setModalStep(
          "ok"
        );
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

  // 🔍 Buscar números asignados por correo
  // Compra normal + Experience Pass recibidas como regalo
  const handleBuscarNumeros = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setErrorBusqueda(null);
    setNumerosCliente([]);

    const correo =
      buscaCorreo
        .trim()
        .toLowerCase();


    if (!correo) {
      setErrorBusqueda(
        "Ingresa el correo asociado a tus Experience Pass."
      );

      return;
    }


    setBuscandoNumeros(true);


    try {

      /* ======================================================
         1. COMPRAS NORMALES DEL USUARIO
      ====================================================== */

      const {
        data:
        pedidosPropios,

        error:
        pedidosPropiosError,
      } =
        await supabase
          .from(
            "pedidos"
          )
          .select(
            "id"
          )
          .eq(
            "sorteo_id",
            sorteo.id
          )
          .eq(
            "correo",
            correo
          )
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


      if (
        pedidosPropiosError
      ) {

        console.error(
          "Error buscando compras propias:",
          pedidosPropiosError
        );

        setErrorBusqueda(
          "No se pudieron consultar tus participaciones."
        );

        return;
      }


      /* ======================================================
         2. REGALOS RECIBIDOS POR ESTE CORREO
      ====================================================== */

      const {
        data:
        regalos,

        error:
        regalosError,
      } =
        await supabase
          .from(
            "baruk_gifts"
          )
          .select(
            "pedido_id"
          )
          .eq(
            "destinatario_correo",
            correo
          );


      if (
        regalosError
      ) {

        console.error(
          "Error buscando regalos recibidos:",
          regalosError
        );

        setErrorBusqueda(
          "No se pudieron consultar tus Experience Pass recibidas como regalo."
        );

        return;
      }


      const giftPedidoIds =
        Array.from(
          new Set(
            (regalos ?? [])
              .map(
                (regalo: any) =>
                  Number(
                    regalo.pedido_id
                  )
              )
              .filter(
                (id) =>
                  Number.isFinite(
                    id
                  ) &&
                  id > 0
              )
          )
        );


      /* ======================================================
         3. VALIDAR QUE LOS PEDIDOS DE REGALO ESTÉN PAGADOS
            Y PERTENEZCAN AL SORTEO ACTUAL
      ====================================================== */

      let pedidosRegaloPagados:
        {
          id: number;
        }[] =
        [];


      if (
        giftPedidoIds.length >
        0
      ) {

        const {
          data:
          giftOrders,

          error:
          giftOrdersError,
        } =
          await supabase
            .from(
              "pedidos"
            )
            .select(
              "id"
            )
            .in(
              "id",
              giftPedidoIds
            )
            .eq(
              "sorteo_id",
              sorteo.id
            )
            .in(
              "estado",
              [
                "pagado",
                "confirmado",
              ]
            )
            .eq(
              "tipo_compra",
              "gift"
            );


        if (
          giftOrdersError
        ) {

          console.error(
            "Error validando pedidos de regalo:",
            giftOrdersError
          );

          setErrorBusqueda(
            "No se pudieron validar tus Experience Pass recibidas."
          );

          return;
        }


        pedidosRegaloPagados =
          (
            giftOrders ??
            []
          ) as {
            id: number;
          }[];
      }


      /* ======================================================
         4. UNIR:
            - COMPRAS PROPIAS
            - REGALOS RECIBIDOS
      ====================================================== */

      const pedidoIds =
        Array.from(
          new Set(
            [
              ...(
                pedidosPropios ??
                []
              ).map(
                (pedido: any) =>
                  Number(
                    pedido.id
                  )
              ),

              ...pedidosRegaloPagados.map(
                (
                  pedido
                ) =>
                  Number(
                    pedido.id
                  )
              ),
            ].filter(
              (id) =>
                Number.isFinite(
                  id
                ) &&
                id > 0
            )
          )
        );


      if (
        pedidoIds.length ===
        0
      ) {

        setErrorBusqueda(
          "No encontramos participaciones pagadas asociadas a este correo."
        );

        return;
      }


      /* ======================================================
         5. OBTENER LOS NÚMEROS
      ====================================================== */

      const {
        data:
        nums,

        error:
        numsError,
      } =
        await supabase
          .from(
            "numeros_asignados"
          )
          .select(
            "numero"
          )
          .in(
            "pedido_id",
            pedidoIds
          )
          .eq(
            "sorteo_id",
            sorteo.id
          );


      if (
        numsError
      ) {

        console.error(
          "Error buscando números asignados:",
          numsError
        );

        setErrorBusqueda(
          "No se pudieron obtener tus números."
        );

        return;
      }


      if (
        !nums ||
        nums.length ===
        0
      ) {

        setErrorBusqueda(
          "Aún no hay números asignados. Si acabas de recibir o comprar tus Experience Pass, espera unos momentos."
        );

        return;
      }


      /* ======================================================
         6. FORMATEAR NÚMEROS
      ====================================================== */

      const lista =
        (
          nums as NumeroAsignado[]
        )
          .map(
            (item) =>
              String(
                item.numero
              ).padStart(
                5,
                "0"
              )
          )
          .sort(
            () =>
              Math.random() -
              0.5
          );


      setNumerosCliente(
        lista
      );


    } catch (
    err
    ) {

      console.error(
        "Error general buscando números:",
        err
      );

      setErrorBusqueda(
        "Ocurrió un error al buscar tus números."
      );

    } finally {

      setBuscandoNumeros(
        false
      );
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
        progreso={progresoReal}
      />

      {/* =====================================================
    COMPRAR BARUK CARDS
===================================================== */}

      <BarukPurchaseSection
        precioUnidad={precioUnidad}
        agotado={agotado}

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
    F1 SPHERE COLLECTION
===================================================== */}

      <F1SphereHomeSection />


      {/* =====================================================
    CÓMO FUNCIONA
===================================================== */}

      <BarukHowItWorks />

      {/* =====================================================
    CONSULTA TUS NÚMEROS — COMPACTA
===================================================== */}

      <section
        id="consulta-numeros"
        className="
    scroll-mt-24
    w-full
    bg-white
    py-12
    md:py-14
  "
      >
        <div
          className="
      mx-auto
      w-full
      max-w-7xl
      px-4
      md:px-6
  "
        >
          <div
            className="
        overflow-hidden
        rounded-[22px]
        border
        border-slate-200
        bg-white

        shadow-[0_8px_28px_rgba(0,0,0,0.06)]

        lg:grid
        lg:grid-cols-[0.72fr_1.28fr]
      "
          >
            {/* ================================================
          IZQUIERDA
      ================================================= */}

            <div
              className="
          relative
          overflow-hidden
          bg-[#171717]

          px-7
          py-7
          text-white

          md:px-8
          md:py-8
        "
            >
              {/* GLOW */}

              <div
                className="
            pointer-events-none
            absolute
            -right-16
            -top-20

            h-48
            w-48

            rounded-full
            bg-[#C1317F]/20
            blur-[70px]
          "
              />

              <div className="relative z-10">

                <div
                  className="
              flex
              h-9
              w-9
              items-center
              justify-center

              rounded-xl

              border
              border-white/10

              bg-white/[0.06]

              text-[#C1317F]
            "
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                  >
                    <path
                      d="M4 6.5C4 5.12 5.12 4 6.5 4h11C18.88 4 20 5.12 20 6.5v11c0 1.38-1.12 2.5-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M7.5 9h9M7.5 12h6M7.5 15h4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <p
                  className="
              mt-5

              text-[9px]
              font-black
              uppercase
              tracking-[0.2em]

              text-[#C1317F]
            "
                >
                  Tus participaciones
                </p>

                <h2
                  className="
              mt-2

              text-2xl
              font-black
              tracking-[-0.04em]

              md:text-[28px]
            "
                >
                  Consulta tus números
                </h2>

                <p
                  className="
              mt-3
              max-w-sm

              text-[13px]
              leading-6

              text-white/55
            "
                >
                  Ingresa el correo utilizado en tu compra para consultar
                  tus números de participación.
                </p>

                <div
                  className="
              mt-5
              flex
              flex-wrap
              gap-5

              text-[10px]
              font-bold
              text-white/45
            "
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C1317F]" />
                    Consulta segura
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff6600]" />
                    Acceso inmediato
                  </span>
                </div>

              </div>
            </div>

            {/* ================================================
          DERECHA
      ================================================= */}

            <div
              className="
          flex
          flex-col
          justify-center

          px-7
          py-7

          md:px-9
          md:py-8
        "
            >
              <div>

                <p
                  className="
              text-[9px]
              font-black
              uppercase
              tracking-[0.18em]
              text-slate-400
            "
                >
                  Correo de compra
                </p>

                <h3
                  className="
              mt-1

              text-lg
              font-black
              tracking-[-0.025em]
              text-[#171717]
            "
                >
                  Encuentra tus participaciones
                </h3>

                <p
                  className="
              mt-1

              text-xs
              leading-5
              text-slate-400
            "
                >
                  Usa el mismo correo registrado cuando realizaste tu compra.
                </p>

              </div>

              {/* FORM */}

              <form
                onSubmit={handleBuscarNumeros}
                className="
            mt-5

            flex
            flex-col
            gap-3

            sm:flex-row
          "
              >
                <input
                  type="email"
                  value={buscaCorreo}
                  onChange={(e) =>
                    setBuscaCorreo(
                      e.target.value
                    )
                  }
                  required
                  placeholder="correo@ejemplo.com"
                  className="
              min-h-[48px]
              flex-1

              rounded-xl

              border
              border-slate-200

              bg-[#fafafa]

              px-4

              text-sm
              text-[#171717]

              outline-none

              transition-all

              placeholder:text-slate-300

              focus:border-[#C1317F]
              focus:bg-white
              focus:shadow-[0_0_0_4px_rgba(193,49,127,0.08)]
            "
                />

                <button
                  type="submit"
                  disabled={buscandoNumeros}
                  className="
              min-h-[48px]

              rounded-xl

              bg-[#171717]

              px-6

              text-xs
              font-black
              text-white

              transition-all

              hover:bg-[#C1317F]
              hover:shadow-[0_6px_20px_rgba(193,49,127,0.25)]

              disabled:cursor-not-allowed
              disabled:opacity-50
            "
                >
                  {buscandoNumeros
                    ? "Consultando..."
                    : "Consultar"}
                </button>
              </form>

              {/* ERROR */}

              {errorBusqueda && (
                <div
                  className="
              mt-4

              rounded-xl

              border
              border-red-200

              bg-red-50

              px-4
              py-3

              text-xs
              font-semibold
              text-red-600
            "
                >
                  {errorBusqueda}
                </div>
              )}

              {/* RESULTADOS */}

              {numerosCliente.length > 0 && (
                <div
                  className="
              mt-5
              border-t
              border-slate-100
              pt-5
            "
                >
                  <div
                    className="
                flex
                items-center
                justify-between
              "
                  >
                    <p
                      className="
                  text-xs
                  font-black
                  text-[#171717]
                "
                    >
                      Tus números
                    </p>

                    <span
                      className="
                  text-[10px]
                  font-bold
                  text-slate-400
                "
                    >
                      {numerosCliente.length}{" "}
                      {numerosCliente.length === 1
                        ? "participación"
                        : "participaciones"}
                    </span>
                  </div>

                  <div
                    className="
                mt-3
                flex
                flex-wrap
                gap-2
              "
                  >
                    {numerosCliente.map(
                      (num) => (
                        <div
                          key={num}
                          className="
                      group
                      relative
                      overflow-hidden

                      rounded-lg

                      border
                      border-slate-200

                      bg-white

                      px-3
                      py-2

                      transition-all

                      hover:border-[#C1317F]/50
                      hover:shadow-[0_4px_14px_rgba(193,49,127,0.18)]
                    "
                        >
                          <span
                            className="
                        relative
                        z-10

                        text-[11px]
                        font-black
                        tracking-[0.08em]
                        text-[#171717]

                        transition-colors

                        group-hover:text-[#C1317F]
                      "
                          >
                            {num}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
    PREMIOS INSTANTÁNEOS
===================================================== */}

      <PremiosInstantaneos />

      {/* =====================================================
    PARALLAX BANNER
===================================================== */}

      <BarukParallaxBanner />

      {/* =====================================================
    BARUK SHOP
===================================================== */}

      <BarukShop />

      {/* =====================================================
    MODAL DE COMPRA — BARUK593
===================================================== */}

      {isModalOpen && selectedCantidad != null && (
        <div
          className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-black/65
      px-4
      py-5
      backdrop-blur-[6px]
    "
        >
          <div
            className="
        relative
        w-full
        max-w-[480px]
        max-h-[92vh]
        overflow-y-auto
        rounded-[28px]
        border
        border-black/[0.06]
        bg-white
        shadow-[0_30px_100px_rgba(0,0,0,0.28)]
      "
          >
            {/* =================================================
          ACENTO SUPERIOR
      ================================================= */}

            <div
              className="
          h-1.5
          w-full
          bg-gradient-to-r
          from-[#C1317F]
          via-[#ff6600]
          to-[#C1317F]
        "
            />

            {/* =================================================
          CERRAR
      ================================================= */}

            <button
              type="button"
              onClick={handleCerrarModal}
              className="
          absolute
          right-4
          top-5
          z-10
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-full
          border
          border-slate-200
          bg-white
          text-lg
          text-slate-500
          shadow-sm
          transition
          hover:border-slate-300
          hover:bg-slate-50
          hover:text-[#171717]
        "
              aria-label="Cerrar"
            >
              ×
            </button>

            {/* =================================================
          PASO: RESUMEN
      ================================================= */}

            {modalStep === "resumen" && (
              <div className="p-6 md:p-7">
                <div className="pr-10">

                  <p
                    className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.22em]
                text-[#C1317F]
              "
                  >
                    Experience Pass
                  </p>

                  <h3
                    className="
                mt-1
                text-[25px]
                font-black
                tracking-[-0.04em]
                text-[#171717]
              "
                  >
                    Resumen de compra
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Revisa los datos de tu compra antes de continuar.
                  </p>

                </div>

                {/* RESUMEN */}

                <div
                  className="
              mt-6
              overflow-hidden
              rounded-[20px]
              border
              border-slate-200
              bg-[#fafafa]
            "
                >
                  <div className="space-y-4 p-5">

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        Experience Pass
                      </span>

                      <span className="text-sm font-black text-[#171717]">
                        x{selectedCantidad}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        Valor unitario
                      </span>

                      <span className="text-sm font-bold text-[#171717]">
                        ${Number(precioUnidad).toFixed(2)}
                      </span>
                    </div>

                    <div className="h-px bg-slate-200" />

                    <div className="flex items-end justify-between">

                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        Total
                      </span>

                      <span className="text-3xl font-black tracking-[-0.05em] text-[#171717]">
                        ${totalPaquete.toFixed(2)}
                      </span>

                    </div>

                  </div>
                </div>

                {/* REGALO */}

                {tipoCompra === "gift" && (
                  <div
                    className="
                mt-4
                rounded-[18px]
                border
                border-[#C1317F]/20
                bg-[#C1317F]/[0.05]
                p-4
              "
                  >
                    <div className="flex items-start gap-3">

                      <div
                        className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#C1317F]/10
                    text-lg
                  "
                      >
                        🎁
                      </div>

                      <div>
                        <p className="text-xs font-black text-[#171717]">
                          Regalo para {destinatarioNombre}
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          Las Experience Pass serán vinculadas al destinatario.
                        </p>

                        <p className="mt-1 break-all text-[11px] font-bold text-[#C1317F]">
                          {destinatarioCorreo}
                        </p>
                      </div>

                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setModalStep("pago")}
                  className="
              mt-6
              min-h-[52px]
              w-full
              rounded-2xl
              bg-[#171717]
              px-5
              text-sm
              font-black
              text-white
              shadow-[0_10px_30px_rgba(0,0,0,0.15)]
              transition
              hover:bg-[#C1317F]
            "
                >
                  Continuar
                </button>

              </div>
            )}

            {/* =================================================
          PASO: DATOS Y PAGO
      ================================================= */}

            {modalStep === "pago" && (
              <form onSubmit={handleConfirmarDatosPago}>

                {/* CABECERA */}

                <div className="px-6 pb-5 pt-6 md:px-7">

                  <div className="pr-10">

                    <p
                      className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.22em]
                  text-[#C1317F]
                "
                    >
                      Compra segura
                    </p>

                    <h3
                      className="
                  mt-1
                  text-[25px]
                  font-black
                  tracking-[-0.04em]
                  text-[#171717]
                "
                    >
                      Completa tu compra
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Ingresa tus datos y selecciona cómo deseas pagar.
                    </p>

                  </div>

                  {/* MINI RESUMEN */}

                  <div
                    className="
                mt-5
                flex
                items-center
                justify-between
                rounded-[18px]
                border
                border-slate-200
                bg-[#fafafa]
                px-4
                py-3.5
              "
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Tu compra
                      </p>

                      <p className="mt-1 text-sm font-black text-[#171717]">
                        {selectedCantidad} Experience Pass
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Total
                      </p>

                      <p className="mt-1 text-xl font-black text-[#ff6600]">
                        ${totalPaquete.toFixed(2)}
                      </p>
                    </div>
                  </div>

                </div>

                <div className="h-px bg-slate-100" />

                {/* =================================================
              DATOS
          ================================================= */}

                <div className="px-6 py-5 md:px-7">

                  <div className="mb-4 flex items-center gap-3">

                    <div
                      className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#171717]
                  text-xs
                  font-black
                  text-white
                "
                    >
                      1
                    </div>

                    <div>
                      <p className="text-sm font-black text-[#171717]">
                        Tus datos
                      </p>

                      <p className="text-[11px] text-slate-400">
                        Información para identificar tu compra.
                      </p>
                    </div>

                  </div>

                  <div className="space-y-4">

                    {/* NOMBRE */}

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-slate-600">
                        Nombre completo
                      </label>

                      <input
                        type="text"
                        value={nombreCliente}
                        onChange={(e) =>
                          setNombreCliente(e.target.value)
                        }
                        placeholder="Ej: Juan Pérez"
                        className="
                    min-h-[50px]
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-[#fafafa]
                    px-4
                    text-sm
                    text-[#171717]
                    outline-none
                    transition
                    placeholder:text-slate-300
                    focus:border-[#C1317F]
                    focus:bg-white
                    focus:shadow-[0_0_0_4px_rgba(193,49,127,0.08)]
                  "
                      />
                    </div>

                    {/* TELÉFONO */}

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-slate-600">
                        WhatsApp / Teléfono
                      </label>

                      <input
                        type="tel"
                        value={telefonoCliente}
                        onChange={(e) =>
                          setTelefonoCliente(e.target.value)
                        }
                        placeholder="09xxxxxxxx"
                        className="
                    min-h-[50px]
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-[#fafafa]
                    px-4
                    text-sm
                    text-[#171717]
                    outline-none
                    transition
                    placeholder:text-slate-300
                    focus:border-[#C1317F]
                    focus:bg-white
                    focus:shadow-[0_0_0_4px_rgba(193,49,127,0.08)]
                  "
                      />
                    </div>

                    {/* CORREO */}

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-slate-600">
                        Correo electrónico
                      </label>

                      <input
                        type="email"
                        value={correoCliente}
                        onChange={(e) =>
                          setCorreoCliente(e.target.value)
                        }
                        placeholder="correo@ejemplo.com"
                        className="
                    min-h-[50px]
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-[#fafafa]
                    px-4
                    text-sm
                    text-[#171717]
                    outline-none
                    transition
                    placeholder:text-slate-300
                    focus:border-[#C1317F]
                    focus:bg-white
                    focus:shadow-[0_0_0_4px_rgba(193,49,127,0.08)]
                  "
                      />
                    </div>

                  </div>

                </div>

                <div className="h-px bg-slate-100" />

                {/* =================================================
              MÉTODO DE PAGO
          ================================================= */}

                <div className="px-6 py-5 md:px-7">

                  <div className="mb-4 flex items-center gap-3">

                    <div
                      className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#C1317F]
                  text-xs
                  font-black
                  text-white
                "
                    >
                      2
                    </div>

                    <div>
                      <p className="text-sm font-black text-[#171717]">
                        Método de pago
                      </p>

                      <p className="text-[11px] text-slate-400">
                        Elige la opción que prefieras.
                      </p>
                    </div>

                  </div>

                  <div className="space-y-3">

                    {/* =============================================
                  PAYPHONE
              ============================================= */}

                    <label
                      className={`
                  group
                  flex
                  cursor-pointer
                  items-center
                  gap-3
                  rounded-[18px]
                  border
                  p-4
                  transition-all
                  ${metodoPago === "payphone"
                          ? "border-[#ff6600] bg-[#ff6600]/[0.04] shadow-[0_0_0_3px_rgba(255,102,0,0.08)]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                        }
                `}
                    >
                      <input
                        type="radio"
                        name="metodo_pago"
                        className="h-4 w-4 accent-[#ff6600]"
                        checked={metodoPago === "payphone"}
                        onChange={() => {
                          setMetodoPago("payphone");
                          setOrderError(null);
                        }}
                      />

                      <div
                        className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#ff6600]/10
                    text-[#ff6600]
                  "
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-5 w-5"
                        >
                          <rect
                            x="3"
                            y="6"
                            width="18"
                            height="12"
                            rx="2.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          <path
                            d="M3 10h18"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center justify-between gap-2">

                          <p className="text-sm font-black text-[#171717]">
                            PayPhone
                          </p>

                          {metodoPago === "payphone" && (
                            <span
                              className="
                          rounded-full
                          bg-[#ff6600]
                          px-2
                          py-1
                          text-[9px]
                          font-black
                          uppercase
                          tracking-[0.08em]
                          text-white
                        "
                            >
                              Seleccionado
                            </span>
                          )}

                        </div>

                        <p className="mt-1 text-[11px] text-slate-400">
                          Tarjeta de débito, crédito o PayPhone App.
                        </p>

                      </div>
                    </label>

                    {/* =============================================
                  BILLETERA
              ============================================= */}

                    <label
                      className={`
                  group
                  flex
                  cursor-pointer
                  items-center
                  gap-3
                  rounded-[18px]
                  border
                  p-4
                  transition-all
                  ${metodoPago === "wallet"
                          ? "border-[#C1317F] bg-[#C1317F]/[0.04] shadow-[0_0_0_3px_rgba(193,49,127,0.08)]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                        }
                `}
                    >
                      <input
                        type="radio"
                        name="metodo_pago"
                        className="h-4 w-4 accent-[#C1317F]"
                        checked={metodoPago === "wallet"}
                        onChange={() => {
                          void seleccionarWallet();
                        }}
                      />

                      <div
                        className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#C1317F]/10
                    text-[#C1317F]
                  "
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-5 w-5"
                        >
                          <path
                            d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />

                          <path
                            d="M15 10h5v4h-5a2 2 0 1 1 0-4Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center justify-between gap-2">

                          <p className="text-sm font-black text-[#171717]">
                            Saldo Baruk593
                          </p>

                          {walletBalance !== null && (
                            <span
                              className="
                          rounded-full
                          bg-[#C1317F]/10
                          px-2.5
                          py-1
                          text-[10px]
                          font-black
                          text-[#C1317F]
                        "
                            >
                              ${walletBalance.toFixed(2)}
                            </span>
                          )}

                        </div>

                        <p className="mt-1 text-[11px] leading-4 text-slate-400">
                          Usa tus comisiones, ventas o premios.
                        </p>

                      </div>
                    </label>

                    {/* ESTADO WALLET */}

                    {metodoPago === "wallet" && (
                      <div
                        className="
                    rounded-[16px]
                    border
                    border-[#C1317F]/15
                    bg-[#C1317F]/[0.035]
                    px-4
                    py-3
                  "
                      >
                        {walletLoading ? (
                          <div className="flex items-center gap-2">

                            <div
                              className="
                          h-4
                          w-4
                          animate-spin
                          rounded-full
                          border-2
                          border-[#C1317F]/20
                          border-t-[#C1317F]
                        "
                            />

                            <p className="text-[11px] font-semibold text-slate-500">
                              Consultando tu saldo...
                            </p>

                          </div>
                        ) : !walletSessionEmail ? (
                          <div>

                            <p className="text-[11px] font-semibold text-amber-700">
                              Debes iniciar sesión para utilizar tu saldo.
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                router.push("/mi-cuenta")
                              }
                              className="
                          mt-2
                          text-[11px]
                          font-black
                          text-[#C1317F]
                          underline
                          underline-offset-4
                        "
                            >
                              Ir a Mi Cuenta
                            </button>

                          </div>
                        ) : walletBalance !== null ? (
                          <div className="flex items-center justify-between gap-3">

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Disponible
                              </p>

                              <p className="mt-0.5 text-lg font-black text-[#171717]">
                                ${walletBalance.toFixed(2)}
                              </p>
                            </div>

                            {walletBalance >= totalPaquete ? (
                              <span
                                className="
                            rounded-full
                            bg-emerald-50
                            px-3
                            py-1.5
                            text-[10px]
                            font-black
                            text-emerald-700
                          "
                              >
                                ✓ Saldo suficiente
                              </span>
                            ) : (
                              <span
                                className="
                            rounded-full
                            bg-amber-50
                            px-3
                            py-1.5
                            text-[10px]
                            font-black
                            text-amber-700
                          "
                              >
                                Saldo insuficiente
                              </span>
                            )}

                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500">
                            No se pudo consultar tu saldo.
                          </p>
                        )}
                      </div>
                    )}

                    {/* =============================================
                  TRANSFERENCIA
              ============================================= */}

                    <label
                      className={`
                  group
                  flex
                  cursor-pointer
                  items-center
                  gap-3
                  rounded-[18px]
                  border
                  p-4
                  transition-all
                  ${metodoPago === "transferencia"
                          ? "border-[#171717] bg-[#171717]/[0.025] shadow-[0_0_0_3px_rgba(23,23,23,0.05)]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                        }
                `}
                    >
                      <input
                        type="radio"
                        name="metodo_pago"
                        className="h-4 w-4 accent-[#171717]"
                        checked={metodoPago === "transferencia"}
                        onChange={() => {
                          setMetodoPago("transferencia");
                          setOrderError(null);
                        }}
                      />

                      <div
                        className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-100
                    text-[#171717]
                  "
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-5 w-5"
                        >
                          <path
                            d="M3 9h18M5 9V19M9 9V19M15 9V19M19 9V19M3 19h18M12 4 3 8h18L12 4Z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[#171717]">
                          Transferencia bancaria
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          Confirmación manual del comprobante.
                        </p>
                      </div>
                    </label>

                  </div>

                  {/* ERROR */}

                  {orderError && (
                    <div
                      className="
                  mt-4
                  rounded-[16px]
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                  text-[11px]
                  font-semibold
                  leading-5
                  text-red-600
                "
                    >
                      {orderError}
                    </div>
                  )}

                </div>

                {/* =================================================
              ACCIONES
          ================================================= */}

                <div
                  className="
              sticky
              bottom-0
              border-t
              border-slate-100
              bg-white/95
              px-6
              py-5
              backdrop-blur
              md:px-7
            "
                >
                  <button
                    type="submit"
                    disabled={
                      savingOrder ||
                      (
                        metodoPago === "wallet" &&
                        walletBalance !== null &&
                        walletBalance < totalPaquete
                      )
                    }
                    className="
                min-h-[54px]
                w-full
                rounded-2xl
                bg-[#171717]
                px-5
                text-sm
                font-black
                text-white
                shadow-[0_12px_30px_rgba(0,0,0,0.16)]
                transition
                hover:bg-[#C1317F]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
                  >
                    {savingOrder
                      ? metodoPago === "wallet"
                        ? "Procesando pago..."
                        : "Registrando pedido..."
                      : metodoPago === "wallet"
                        ? `Pagar $${totalPaquete.toFixed(2)} con saldo`
                        : metodoPago === "payphone"
                          ? `Continuar a PayPhone · $${totalPaquete.toFixed(2)}`
                          : "Registrar pedido"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCerrarModal}
                    className="
                mt-2
                min-h-[42px]
                w-full
                rounded-xl
                text-xs
                font-bold
                text-slate-400
                transition
                hover:text-[#171717]
              "
                  >
                    Cancelar
                  </button>

                  <p className="mt-2 text-center text-[9px] font-semibold text-slate-300">
                    Pago seguro · Tus datos están protegidos
                  </p>

                </div>

              </form>
            )}

            {/* =================================================
          PASO: TRANSFERENCIA REGISTRADA
      ================================================= */}

            {modalStep === "ok" && (
              <div className="p-6 md:p-7">

                <div className="text-center">

                  <div
                    className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-emerald-50
                text-2xl
              "
                  >
                    ✓
                  </div>

                  <p
                    className="
                mt-5
                text-[10px]
                font-black
                uppercase
                tracking-[0.2em]
                text-[#C1317F]
              "
                  >
                    Pedido registrado
                  </p>

                  <h3
                    className="
                mt-1
                text-[25px]
                font-black
                tracking-[-0.04em]
                text-[#171717]
              "
                  >
                    Ahora realiza tu transferencia
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Tu pedido queda pendiente hasta confirmar el pago.
                  </p>

                </div>

                {/* TOTAL */}

                <div
                  className="
              mt-5
              flex
              items-center
              justify-between
              rounded-[18px]
              bg-[#171717]
              px-5
              py-4
            "
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                      Pedido
                    </p>

                    <p className="mt-1 text-xs font-bold text-white">
                      x{selectedCantidad} Experience Pass
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                      Total
                    </p>

                    <p className="mt-1 text-xl font-black text-[#ff6600]">
                      ${totalPaquete.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* BANCO */}

                <div
                  className="
              mt-4
              rounded-[20px]
              border
              border-slate-200
              bg-[#fafafa]
              p-5
            "
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#C1317F]">
                    Datos bancarios
                  </p>

                  <div className="mt-4 space-y-3">

                    <div className="flex justify-between gap-4">
                      <span className="text-xs text-slate-400">
                        Banco
                      </span>

                      <span className="text-xs font-black text-[#171717]">
                        Guayaquil
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-xs text-slate-400">
                        Cuenta
                      </span>

                      <span className="text-xs font-black text-[#171717]">
                        Ahorros
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-xs text-slate-400">
                        Número
                      </span>

                      <span className="text-xs font-black text-[#171717]">
                        0048055945
                      </span>
                    </div>

                    <div className="h-px bg-slate-200" />

                    <div>
                      <span className="text-xs text-slate-400">
                        Titular
                      </span>

                      <p className="mt-1 text-xs font-black text-[#171717]">
                        Alexis Amaguay Vásquez · Baruk593
                      </p>
                    </div>

                  </div>
                </div>

                {/* WHATSAPP */}

                <a
                  href="https://wa.me/593990575984"
                  target="_blank"
                  rel="noreferrer"
                  className="
              mt-4
              flex
              min-h-[52px]
              w-full
              items-center
              justify-center
              rounded-2xl
              bg-emerald-500
              px-5
              text-sm
              font-black
              text-white
              shadow-[0_10px_25px_rgba(16,185,129,0.20)]
              transition
              hover:bg-emerald-600
            "
                >
                  Enviar comprobante por WhatsApp
                </a>

                <button
                  type="button"
                  onClick={handleCerrarModal}
                  className="
              mt-2
              min-h-[46px]
              w-full
              rounded-xl
              text-xs
              font-bold
              text-slate-400
              transition
              hover:text-[#171717]
            "
                >
                  Cerrar
                </button>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
