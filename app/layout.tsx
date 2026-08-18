// app/layout.tsx

import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

import Link from "next/link";
import Script from "next/script";

import "./globals.css";

import {
  SiteHeader,
} from "../components/SiteHeader";


/* ============================================================
   METADATA
============================================================ */

export const metadata: Metadata = {
  title: {
    default: "Baruk593",
    template:
      "%s | Baruk593",
  },

  description:
    "Plataforma oficial Baruk593.",

  icons: {
    icon:
      "/logobaruk.svg",

    shortcut:
      "/icon.png",

    apple:
      "/icon.png",
  },
};


/* ============================================================
   LAYOUT
============================================================ */

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const year =
    new Date()
      .getFullYear();

  return (
    <html lang="es">

      <head />

      {/* =================================================
                META PIXEL
            ================================================= */}

      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
                        !function(f,b,e,v,n,t,s)
                        {
                            if(f.fbq)return;

                            n=f.fbq=function(){
                                n.callMethod
                                    ? n.callMethod.apply(n,arguments)
                                    : n.queue.push(arguments)
                            };

                            if(!f._fbq)f._fbq=n;

                            n.push=n;
                            n.loaded=!0;
                            n.version='2.0';
                            n.queue=[];

                            t=b.createElement(e);
                            t.async=!0;
                            t.src=v;

                            s=b.getElementsByTagName(e)[0];

                            s.parentNode.insertBefore(t,s);

                        }(
                            window,
                            document,
                            'script',
                            'https://connect.facebook.net/en_US/fbevents.js'
                        );

                        fbq(
                            'init',
                            '679718581870884'
                        );

                        fbq(
                            'track',
                            'PageView'
                        );
                    `,
        }}
      />

      <body
        className="
                    bg-white
                    text-slate-900
                    antialiased
                "
      >

        {/* =================================================
                    META PIXEL NOSCRIPT
                ================================================= */}

        <noscript>
          <img
            height="1"
            width="1"
            style={{
              display:
                "none",
            }}
            src="https://www.facebook.com/tr?id=679718581870884&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>


        <div
          className="
                        flex
                        min-h-screen
                        flex-col

                        bg-white
                    "
        >

          {/* =================================================
                        HEADER
                    ================================================= */}

          <SiteHeader />


          {/* =================================================
                        CONTENIDO
                    ================================================= */}

          <main
            className="
                            flex-1
                            bg-white
                        "
          >
            <div
              className="
                                mx-auto
                                flex
                                w-full
                                max-w-7xl
                                flex-col

                                px-4

                                md:px-6
                            "
            >
              {children}
            </div>
          </main>


          {/* =================================================
                        FOOTER
                    ================================================= */}

          <footer
            className="
                            relative
                            mt-12
                            w-full
                            overflow-hidden

                            bg-[#151515]

                            text-white
                        "
          >
            {/* LÍNEA SUPERIOR */}

            <div
              className="
                                h-[3px]
                                w-full

                                bg-gradient-to-r

                                from-[#C1317F]
                                via-[#ff6600]
                                to-[#C1317F]
                            "
            />


            {/* DECORACIÓN */}

            <div
              className="
                                pointer-events-none
                                absolute
                                -left-32
                                -top-32

                                h-80
                                w-80

                                rounded-full

                                bg-[#C1317F]/10

                                blur-[110px]
                            "
            />

            <div
              className="
                                pointer-events-none
                                absolute
                                -bottom-40
                                right-0

                                h-80
                                w-80

                                rounded-full

                                bg-[#ff6600]/10

                                blur-[120px]
                            "
            />


            {/* =================================================
                            PARTE PRINCIPAL
                        ================================================= */}

            <div
              className="
                                relative
                                z-10

                                mx-auto
                                w-full
                                max-w-7xl

                                px-5
                                py-12

                                sm:px-6

                                md:py-14
                            "
            >
              <div
                className="
                                    grid
                                    gap-10

                                    md:grid-cols-[1.25fr_0.75fr_0.75fr]
                                    md:gap-12
                                "
              >

                {/* =========================================
                                    MARCA
                                ========================================= */}

                <div>

                  <Link
                    href="/"
                    aria-label="Baruk593"
                    className="
                                            inline-flex
                                            items-center
                                        "
                  >
                    <img
                      src="/baruknaranja-04.svg"
                      alt="Baruk593"
                      className="
                                                h-[34px]
                                                w-auto
                                            "
                    />
                  </Link>


                  <h2
                    className="
                                            mt-6
                                            max-w-sm

                                            text-2xl
                                            font-black
                                            leading-[1.05]
                                            tracking-[-0.04em]

                                            text-white

                                            md:text-[28px]
                                        "
                  >
                    Tu número.
                    <br />

                    <span className="text-[#ff6600]">
                      Tu experiencia.
                    </span>
                  </h2>


                  <p
                    className="
                                            mt-4
                                            max-w-md

                                            text-[13px]
                                            leading-6

                                            text-white/50
                                        "
                  >
                    Descubre las Tarjetas de la
                    Suerte Baruk593, participa,
                    revela experiencias y explora
                    productos seleccionados en
                    Baruk Shop.
                  </p>


                  {/* COLORES MARCA */}

                  <div
                    className="
                                            mt-6
                                            flex
                                            items-center
                                            gap-2
                                        "
                  >
                    <span
                      className="
                                                h-2
                                                w-8
                                                rounded-full

                                                bg-[#ff6600]
                                            "
                    />

                    <span
                      className="
                                                h-2
                                                w-8
                                                rounded-full

                                                bg-[#C1317F]
                                            "
                    />

                    <span
                      className="
                                                h-2
                                                w-8
                                                rounded-full

                                                bg-white/20
                                            "
                    />
                  </div>

                </div>


                {/* =========================================
                                    EXPLORA
                                ========================================= */}

                <div>

                  <p
                    className="
                                            text-[9px]
                                            font-black
                                            uppercase
                                            tracking-[0.22em]

                                            text-[#C1317F]
                                        "
                  >
                    Explora
                  </p>


                  <nav
                    className="
                                            mt-5
                                            space-y-3
                                        "
                  >

                    <Link
                      href="/#comprar-baruk-card"
                      className="
                                                group

                                                flex
                                                items-center
                                                gap-2

                                                text-[13px]
                                                font-bold

                                                text-white/65

                                                transition-colors

                                                hover:text-[#C1317F]
                                            "
                    >
                      Tarjetas de la Suerte

                      <span
                        className="
                                                    translate-x-0

                                                    opacity-0

                                                    transition-all

                                                    group-hover:translate-x-1
                                                    group-hover:opacity-100
                                                "
                      >
                        →
                      </span>
                    </Link>


                    <Link
                      href="/#como-funciona"
                      className="
                                                group

                                                flex
                                                items-center
                                                gap-2

                                                text-[13px]
                                                font-bold

                                                text-white/65

                                                transition-colors

                                                hover:text-[#C1317F]
                                            "
                    >
                      Cómo funciona

                      <span
                        className="
                                                    opacity-0

                                                    transition-all

                                                    group-hover:translate-x-1
                                                    group-hover:opacity-100
                                                "
                      >
                        →
                      </span>
                    </Link>


                    <Link
                      href="/#premios-instantaneos"
                      className="
                                                group

                                                flex
                                                items-center
                                                gap-2

                                                text-[13px]
                                                font-bold

                                                text-white/65

                                                transition-colors

                                                hover:text-[#C1317F]
                                            "
                    >
                      Premios instantáneos

                      <span
                        className="
                                                    opacity-0

                                                    transition-all

                                                    group-hover:translate-x-1
                                                    group-hover:opacity-100
                                                "
                      >
                        →
                      </span>
                    </Link>


                    <Link
                      href="/#consulta-numeros"
                      className="
                                                group

                                                flex
                                                items-center
                                                gap-2

                                                text-[13px]
                                                font-bold

                                                text-white/65

                                                transition-colors

                                                hover:text-[#C1317F]
                                            "
                    >
                      Mis números

                      <span
                        className="
                                                    opacity-0

                                                    transition-all

                                                    group-hover:translate-x-1
                                                    group-hover:opacity-100
                                                "
                      >
                        →
                      </span>
                    </Link>

                  </nav>

                </div>


                {/* =========================================
                                    BARUK593
                                ========================================= */}

                <div>

                  <p
                    className="
                                            text-[9px]
                                            font-black
                                            uppercase
                                            tracking-[0.22em]

                                            text-[#ff6600]
                                        "
                  >
                    Baruk593
                  </p>


                  <nav
                    className="
                                            mt-5
                                            space-y-3
                                        "
                  >

                    <Link
                      href="/tienda"
                      className="
                                                group

                                                flex
                                                items-center
                                                gap-2

                                                text-[13px]
                                                font-bold

                                                text-white/65

                                                transition-colors

                                                hover:text-[#C1317F]
                                            "
                    >
                      Baruk Shop

                      <span
                        className="
                                                    opacity-0

                                                    transition-all

                                                    group-hover:translate-x-1
                                                    group-hover:opacity-100
                                                "
                      >
                        →
                      </span>
                    </Link>


                    <Link
                      href="/socio-comercial"
                      className="
                                                group

                                                flex
                                                items-center
                                                gap-2

                                                text-[13px]
                                                font-bold

                                                text-white/65

                                                transition-colors

                                                hover:text-[#C1317F]
                                            "
                    >
                      Socio comercial

                      <span
                        className="
                                                    opacity-0

                                                    transition-all

                                                    group-hover:translate-x-1
                                                    group-hover:opacity-100
                                                "
                      >
                        →
                      </span>
                    </Link>


                    <Link
                      href="/terminos-y-condiciones"
                      className="
                                                group

                                                flex
                                                items-center
                                                gap-2

                                                text-[13px]
                                                font-bold

                                                text-white/65

                                                transition-colors

                                                hover:text-[#C1317F]
                                            "
                    >
                      Términos y condiciones

                      <span
                        className="
                                                    opacity-0

                                                    transition-all

                                                    group-hover:translate-x-1
                                                    group-hover:opacity-100
                                                "
                      >
                        →
                      </span>
                    </Link>

                  </nav>

                </div>

              </div>


              {/* =================================================
                                INFERIOR
                            ================================================= */}

              <div
                className="
                                    mt-10

                                    flex
                                    flex-col
                                    gap-4

                                    border-t
                                    border-white/10

                                    pt-5

                                    sm:flex-row
                                    sm:items-center
                                    sm:justify-between
                                "
              >

                <p
                  className="
                                        text-[10px]
                                        font-semibold

                                        text-white/35
                                    "
                >
                  © {year} Baruk593.
                  Todos los derechos reservados.
                </p>


                <div
                  className="
                                        flex
                                        items-center
                                        gap-3
                                    "
                >
                  <span
                    className="
                                            h-1.5
                                            w-1.5

                                            rounded-full

                                            bg-[#ff6600]
                                        "
                  />

                  <p
                    className="
                                            text-[10px]
                                            font-bold
                                            uppercase
                                            tracking-[0.12em]

                                            text-white/35
                                        "
                  >
                    Ecuador
                  </p>
                </div>

              </div>

            </div>
          </footer>

        </div>

      </body>
    </html>
  );
}