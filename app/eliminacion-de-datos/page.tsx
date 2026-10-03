import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
    title: "Eliminación de Datos | Baruk593",
    description:
        "Instrucciones para solicitar la eliminación de datos personales en Baruk593.",
};

export default function EliminacionDatosPage() {

    return (
        <LegalPage
            title="Eliminación de Datos"
            updatedAt="3 de octubre de 2026"
        >

            <section>
                <p>
                    Los usuarios de Baruk593 pueden solicitar la eliminación
                    de información personal asociada a nuestros servicios,
                    sujeto a las obligaciones legales y de conservación que
                    puedan resultar aplicables.
                </p>
            </section>


            <section>
                <h2>1. Cómo solicitar la eliminación</h2>

                <p>
                    Envía un correo electrónico a:
                </p>

                <p className="mt-4">
                    <a href="mailto:administracion@baruk593.com?subject=Solicitud%20de%20eliminación%20de%20datos">
                        administracion@baruk593.com
                    </a>
                </p>

                <p className="mt-4">
                    En el asunto escribe:
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                    Solicitud de eliminación de datos
                </p>
            </section>


            <section>
                <h2>2. Información que debes incluir</h2>

                <p>
                    Para identificar correctamente la información asociada
                    a tu cuenta o conversación, indícanos:
                </p>

                <ul>
                    <li>Nombre completo.</li>
                    <li>Correo electrónico utilizado en Baruk593, si corresponde.</li>
                    <li>Número de teléfono o WhatsApp asociado.</li>
                    <li>Una breve descripción de los datos que deseas eliminar.</li>
                </ul>

                <p className="mt-4">
                    Podemos solicitar información adicional únicamente
                    cuando sea necesaria para verificar que la solicitud
                    corresponde al titular de los datos.
                </p>
            </section>


            <section>
                <h2>3. Datos de Facebook, Instagram o WhatsApp</h2>

                <p>
                    Si utilizaste nuestros servicios mediante Facebook,
                    Instagram o WhatsApp, puedes solicitar la eliminación
                    de los datos que Baruk593 haya almacenado como
                    consecuencia de esa interacción.
                </p>

                <p className="mt-4">
                    La solicitud debe indicar el número de teléfono,
                    correo o información necesaria para localizar el
                    registro correspondiente.
                </p>
            </section>


            <section>
                <h2>4. Información que puede eliminarse</h2>

                <p>
                    Según el caso, una solicitud puede comprender:
                </p>

                <ul>
                    <li>Datos básicos del perfil.</li>
                    <li>Información de contacto.</li>
                    <li>Preferencias almacenadas.</li>
                    <li>Historial de conversaciones de atención.</li>
                    <li>Memoria utilizada por Baruk AI.</li>
                    <li>Datos asociados a campañas o leads.</li>
                    <li>Otra información personal que no necesitemos conservar.</li>
                </ul>
            </section>


            <section>
                <h2>5. Información que puede requerir conservación</h2>

                <p>
                    Cierta información podría conservarse cuando exista una
                    obligación legal, tributaria, contable, contractual,
                    de prevención de fraude o de resolución de
                    controversias.
                </p>

                <p className="mt-4">
                    Por ejemplo, determinados registros relacionados con
                    compras, facturación o pagos pueden estar sujetos a
                    períodos obligatorios de conservación.
                </p>
            </section>


            <section>
                <h2>6. Plazo de atención</h2>

                <p>
                    Revisaremos cada solicitud y responderemos dentro de un
                    plazo razonable, considerando la naturaleza de la
                    información solicitada y las obligaciones aplicables.
                </p>
            </section>


            <section>
                <h2>7. Desconectar servicios de Meta</h2>

                <p>
                    El usuario también puede administrar las conexiones,
                    permisos y configuraciones relacionadas con Facebook,
                    Instagram o WhatsApp desde las herramientas que Meta
                    ponga a su disposición.
                </p>

                <p className="mt-4">
                    La eliminación de información dentro de sistemas de
                    Meta se rige adicionalmente por las políticas de Meta.
                </p>
            </section>


            <section>
                <h2>8. Contacto</h2>

                <p>
                    Responsable:
                    <br />
                    <strong>ECUABARUK COMPANY S.A.S.</strong>
                    <br />
                    Marca: Baruk593
                    <br />
                    Ecuador
                </p>

                <p className="mt-4">
                    Correo:
                    <br />
                    <a href="mailto:administracion@baruk593.com">
                        administracion@baruk593.com
                    </a>
                </p>
            </section>

        </LegalPage>
    );
}