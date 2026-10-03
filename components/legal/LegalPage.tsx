import Link from "next/link";

type LegalPageProps = {
    title: string;
    updatedAt: string;
    children: React.ReactNode;
};

export default function LegalPage({
    title,
    updatedAt,
    children,
}: LegalPageProps) {

    return (
        <main className="min-h-screen bg-[#f6f7f9] text-slate-900">
            <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:py-16">

                <div className="mb-8">
                    <Link
                        href="/"
                        className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                    >
                        ← Volver a Baruk593
                    </Link>
                </div>

                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">

                    <header className="border-b border-slate-200 pb-7">
                        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">
                            Baruk593
                        </p>

                        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                            {title}
                        </h1>

                        <p className="mt-4 text-sm text-slate-500">
                            Última actualización: {updatedAt}
                        </p>
                    </header>

                    <div className="
                        mt-8
                        space-y-8
                        text-[15px]
                        leading-7
                        text-slate-700

                        [&_h2]:mt-10
                        [&_h2]:text-xl
                        [&_h2]:font-bold
                        [&_h2]:text-slate-950

                        [&_h3]:mt-6
                        [&_h3]:text-base
                        [&_h3]:font-bold
                        [&_h3]:text-slate-900

                        [&_ul]:list-disc
                        [&_ul]:space-y-2
                        [&_ul]:pl-6

                        [&_ol]:list-decimal
                        [&_ol]:space-y-2
                        [&_ol]:pl-6

                        [&_a]:font-semibold
                        [&_a]:text-orange-600
                        hover:[&_a]:text-orange-700
                    ">
                        {children}
                    </div>

                </article>

                <footer className="mt-8 text-center text-xs leading-5 text-slate-500">
                    © {new Date().getFullYear()} ECUABARUK COMPANY S.A.S. · Baruk593
                </footer>

            </div>
        </main>
    );
}