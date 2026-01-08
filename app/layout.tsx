// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "../components/SiteHeader";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Casa Bikers",
  description: "Plataforma de Casa Bikers",
};


export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-white text-slate-900 antialiased">
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
                Created for: Alexis Amaguay Vásquez
              </p>
            </div>
          </footer>


        </div>
      </body>
    </html>
  );
}
