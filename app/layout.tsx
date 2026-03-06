// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "../components/SiteHeader";
import type { ReactNode } from "react";
import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: {
    default: "Baruk593",
    template: "%s | Baruk593",
  },
  description: "Plataforma oficial de actividades digitales",
  icons: {
    icon: "/logobaruk.svg",          // LOGO PEQUEÑO DE 512X512 principal
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};


export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">

      {/* META PIXEL */}
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '679718581870884');
            fbq('track', 'PageView');
          `,
        }}
      />

      <body className="bg-white text-slate-900 antialiased">

        {/* Meta Pixel noscript */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=679718581870884&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        <div className="min-h-screen flex flex-col bg-white">

          {/* ────────────── HEADER FIJO ────────────── */}
          <SiteHeader />

          {/* ────────────── MAIN ────────────── */}
          <main className="flex-1 bg-white pt-[110px] md:pt-[120px]">
            <div className="mx-auto flex min-h-[calc(100vh-150px)] max-w-6xl flex-col px-4 py-6 md:px-6 md:py-10">
              {children}
            </div>
          </main>

          {/* ------------ FOOTER ------------ */}
          <footer className="mt-10 w-full border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-4 text-center">
              <Link
                href="/terminos-y-condiciones"
                className="text-xs text-slate-600 hover:underline"
              >
                Términos y condiciones
              </Link>

              <p className="mt-2 text-[10px] md:text-[11px] text-slate-400">
                Created for: Baruk593
              </p>
            </div>
          </footer>


        </div>
      </body>
    </html>
  );
}
