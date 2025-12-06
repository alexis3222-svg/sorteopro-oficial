// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { FranjaNaranjaRotativa } from "../components/FranjaNaranjaRotativa";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Casa Bikers",
  description: "Plataforma de Casa Bikers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-white text-slate-900 antialiased">
        <div className="min-h-screen flex flex-col bg-white">

          {/* ────────────── HEADER FIJO ────────────── */}
          <header className="fixed top-0 left-0 w-full z-50">
            {/* Franja naranja rotativa arriba */}
            <FranjaNaranjaRotativa />

            {/* Banda negra estilo KTM: sólida, delgada, sin blur */}
            <div className="w-full bg-black/35">
              <div className="mx-auto flex max-w-6xl items-center px-0 py-0">

                <Image
                  src="/logo-bikers.svg"
                  alt="Bikers Motors"
                  width={300}
                  height={80}
                  className="w-[260px] h-auto md:w-[320px]"
                  priority
                />

              </div>
            </div>
          </header>


          {/* ────────────── MAIN ────────────── */}
          <main className="flex-1 bg-white pt-[110px] md:pt-[120px]">
            <div className="mx-auto flex min-h-[calc(100vh-150px)] max-w-6xl flex-col px-4 py-6 md:px-6 md:py-10">
              {children}
            </div>
          </main>

          {/* ────────────── FOOTER ────────────── */}
          <footer className="w-full border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] text-slate-500 text-center">
              <p>Created for: Alexis Amaguay Vásquez</p>
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}
