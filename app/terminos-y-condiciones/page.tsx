import { Anton } from "next/font/google";
import Link from "next/link";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

export default function TerminosYCondicionesPage() {
    return (
        <main className="min-h-screen bg-white">
            <div className="mx-auto max-w-4xl px-5 py-10">
                {/* TÍTULO */}
                <h1
                    className={`${anton.className} text-lg md:text-xl uppercase tracking-[0.14em] text-center text-slate-800`}
                >
                    Términos y Condiciones
                </h1>

                {/* CONTENIDO */}
                <div className="mt-6 space-y-2 text-sm md:text-[15px] text-slate-600 leading-[1.35]">
                    <p>
                        <span className="font-semibold text-slate-700">1. Duración:</span>{" "}
                        El sorteo se realizará una vez se haya completado la venta total de
                        números.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">2. Elegibilidad:</span>{" "}
                        El sorteo está abierto a cualquier persona sin restricción de edad.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">
                            3. Selección del Ganador:
                        </span>{" "}
                        El ganador será determinado en base a un sorteo en vivo.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">4. Premio:</span> El
                        premio será entregado a nombre del ganador o su representante mayor
                        de edad con todos los procesos de ley.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">
                            5. Notificación al Ganador:
                        </span>{" "}
                        Nos pondremos en contacto con el ganador a través de los datos
                        proporcionados al participar en el sorteo. Los resultados serán
                        publicados en las redes y medios participantes.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">
                            6. Propiedad Intelectual:
                        </span>{" "}
                        Todo el contenido proporcionado a través de este servicio está
                        protegido por derechos de autor y otros derechos de propiedad
                        intelectual.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">
                            7. Condiciones Generales:
                        </span>{" "}
                        Deben venderse todos los números participantes para poder realizar el
                        sorteo.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">8. Premio:</span> Los
                        ganadores deben seguir nuestras redes sociales indicadas para el
                        sorteo y demostrar que tienen el número ganador.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">
                            8.1 Premio mayor:
                        </span>{" "}
                        El premio será entregado personalmente en la ciudad del ganador, se
                        aplicarán restricciones. El ganador acepta ser grabado en video al
                        momento de la entrega del premio.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">
                            8.2 Premios económicos o especiales:
                        </span>{" "}
                        Serán entregados inmediatamente al ganador del número acertante vía
                        transferencia, efectivo o físicamente, una vez verificado y
                        corroborado por los técnicos.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">8.2.1</span> El ganador
                        del premio especial deberá enviar un video mencionando a Baruk593,
                        indicando el sorteo, el premio y mostrando el número ganador.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">8.2.2</span> Si el
                        premio económico es igual o mayor a $400, el ganador se compromete a
                        comprar $100 en números del sorteo vigente. Si el premio es igual o
                        mayor a $1000, deberá comprar el 10% del valor del premio en números
                        del sorteo vigente.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">8.2.3</span> Las
                        promociones lanzadas en cada actividad mediante nuestras redes
                        sociales y canales oficiales son vigentes únicamente desde el
                        momento en que se anuncian hasta las 11:59 pm del mismo día.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">
                            9. Asignación de números:
                        </span>{" "}
                        Los números serán asignados por el sistema de manera única y
                        aleatoria para cada participante.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">
                            10. Aceptación de Términos:
                        </span>{" "}
                        La participación en el sorteo implica la aceptación total de estos
                        términos y condiciones.
                    </p>

                    <p>
                        <span className="font-semibold text-slate-700">
                            11. Pagos con transferencia:
                        </span>{" "}
                        El participante tendrá una hora para realizar el pago y enviar los
                        datos al WhatsApp de Baruk593. De no hacerlo en ese tiempo, el
                        pedido no será procesado y no se permitirá ningún reembolso.
                    </p>
                </div>

                {/* BOTÓN */}
                <div className="mt-8 text-center">
                    <Link
                        href="/"
                        className="inline-block rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-100"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </main>
    );
}
