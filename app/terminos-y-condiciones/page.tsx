import { Anton } from "next/font/google";
import Link from "next/link";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

export default function TerminosYCondicionesPage() {
    return (
        <main className="min-h-screen bg-white">
            <div className="mx-auto max-w-3xl px-5 py-14">
                {/* TÍTULO */}
                <h1
                    className={`${anton.className} text-xl md:text-2xl uppercase tracking-[0.18em] text-center`}
                >
                    Términos y Condiciones
                </h1>

                {/* CONTENIDO */}
                <div className="mt-8 space-y-4 text-sm md:text-base text-slate-700 leading-relaxed">
                    <p>
                        <b>1. Duración:</b> El sorteo se realizará una vez se haya completado
                        la venta total de números.
                    </p>

                    <p>
                        <b>2. Elegibilidad:</b> El sorteo está abierto a cualquier persona sin
                        restricción de edad.
                    </p>

                    <p>
                        <b>3. Selección del Ganador:</b> El ganador será determinado en base a
                        un sorteo en vivo.
                    </p>

                    <p>
                        <b>4. Premio:</b> El premio será entregado a nombre del ganador o su
                        representante mayor de edad con todos los procesos de ley.
                    </p>

                    <p>
                        <b>5. Notificación al Ganador:</b> Nos pondremos en contacto con el
                        ganador a través de los datos proporcionados al participar en el
                        sorteo. Los resultados serán publicados en las redes y medios
                        participantes.
                    </p>

                    <p>
                        <b>6. Propiedad Intelectual:</b> Todo el contenido proporcionado a
                        través de este servicio está protegido por derechos de autor y otros
                        derechos de propiedad intelectual.
                    </p>

                    <p>
                        <b>7. Condiciones Generales:</b> Deben venderse todos los números
                        participantes para poder realizar el sorteo.
                    </p>

                    <p>
                        <b>8. Premio:</b> Los ganadores deben seguir nuestras redes sociales
                        indicadas para el sorteo y demostrar que tienen el número ganador.
                    </p>

                    <p>
                        <b>8.1 Premio mayor:</b> El premio será entregado personalmente en la
                        ciudad del ganador, se aplicarán restricciones. El ganador acepta ser
                        grabado en video al momento de la entrega del premio.
                    </p>

                    <p>
                        <b>8.2 Premios económicos o especiales:</b> Serán entregados
                        inmediatamente al ganador del número acertante vía transferencia,
                        efectivo o físicamente, una vez verificado por los técnicos.
                    </p>

                    <p>
                        <b>8.2.1</b> El ganador del premio especial deberá enviar un video
                        mencionando a Casa Bikers, indicando el sorteo, el premio y mostrando
                        el número ganador.
                    </p>

                    <p>
                        <b>8.2.2</b> Si el premio económico es igual o mayor a $400, el
                        ganador se compromete a comprar $100 en números del sorteo vigente.
                        Si es igual o mayor a $1000, deberá comprar el 10% del valor del
                        premio.
                    </p>

                    <p>
                        <b>8.2.3</b> Las promociones lanzadas en cada actividad son válidas
                        únicamente desde su anuncio hasta las 11:59 pm del mismo día.
                    </p>

                    <p>
                        <b>9. Asignación de números:</b> Los números serán asignados por el
                        sistema de manera única y aleatoria.
                    </p>

                    <p>
                        <b>10. Aceptación de Términos:</b> La participación implica la
                        aceptación total de estos términos y condiciones.
                    </p>

                    <p>
                        <b>11. Pagos con transferencia:</b> El participante tendrá una hora
                        para realizar el pago y enviar los datos al WhatsApp de Casa Bikers.
                        De no hacerlo, el pedido no será procesado y no se permitirá ningún
                        reembolso.
                    </p>
                </div>

                {/* BOTÓN VOLVER */}
                <div className="mt-10 text-center">
                    <Link
                        href="/"
                        className="inline-block rounded-lg border border-slate-300 px-5 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </main>
    );
}
