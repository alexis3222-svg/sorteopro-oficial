# 🎟️ SorteoPro / CasaBikers

Plataforma de sorteos online en producción, con pagos, asignación automática de números, premios instantáneos y panel administrativo.

---

## 🧠 Estado actual del proyecto (IMPORTANTE)

✅ **Producción activa**  
✅ Pagos PayPhone funcionando (confirmación server-to-server)  
✅ Transferencias manuales desde Admin  
✅ Asignación de números:
- Única
- Aleatoria
- Idempotente
- Solo si `pedido.estado = 'pagado'`

✅ Premios instantáneos (números bendecidos) visibles en Home  
✅ Página de Términos y Condiciones  
🚧 Próximo desarrollo: **Sistema de referidos + billetera + QR**

⚠️ **Checkpoint estable:**  
Git tag: `v1.0-stable`  
(no tocar lógica crítica sin branch)

---

## 🧱 Stack técnico

- **Frontend:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **UI:** TailwindCSS
- **Backend:** API Routes (Next.js)
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Admin)
- **Pagos:** PayPhone (token web)
- **Deploy:** Vercel

---

## 📂 Estructura del proyecto

/app
├─ page.tsx → Home (sorteo activo)
├─ layout.tsx → Layout global + footer
├─ terminos-y-condiciones/
│ └─ page.tsx → Página legal
├─ pago-payphone/
├─ pago-exitoso/
├─ pago-fallido/
├─ mi-compra/
├─ admin/
│ ├─ page.tsx → Dashboard admin
│ ├─ pedidos/
│ ├─ numeros/
│ └─ sorteos/[id]/

/components
├─ PremiosInstantaneos.tsx → Números bendecidos (PF style)
├─ SorteoCarousel.tsx
├─ ProgressBar.tsx
├─ PayphoneBox.tsx
├─ TicketPackageCard.tsx
├─ SiteHeader.tsx
└─ ...

/lib
├─ supabaseClient.ts → Cliente público
├─ supabaseAdmin.ts → Cliente service role
└─ asignarNumeros.ts → Lógica central de asignación

/app/api
├─ pedidos/
│ ├─ crear/
│ ├─ asignar/
│ └─ cancelar/
├─ payphone/
│ ├─ button/
│ └─ webhook/ (NO TOCAR)
└─ admin/
└─ pedidos/marcar-pagado/


---

## 🗄️ Esquema de Base de Datos (resumen)

### Tablas clave

- **sorteos**
  - id (uuid)
  - titulo
  - estado (activo / cerrado)
  - actividad_numero
  - total_numeros
  - precio_numero

- **pedidos**
  - id
  - sorteo_id
  - correo
  - estado (`pendiente | pagado`)
  - metodo_pago (`payphone | transferencia`)
  - payphone_client_transaction_id
  - aprobado_por / aprobado_at

- **numeros_asignados**
  - id
  - sorteo_id
  - pedido_id
  - numero (int)
  - UNIQUE(sorteo_id, numero)

- **numeros_bendecidos**
  - id
  - sorteo_id
  - numero (int)

---

## 🔐 Reglas de negocio críticas (NO ROMPER)

- ❌ **Nunca** asignar números si `pedido.estado !== 'pagado'`
- ❌ No duplicar números bajo ningún escenario
- ❌ No tocar webhook PayPhone salvo extrema necesidad
- ✅ Toda asignación pasa por **una sola función**
- ✅ Transferencia y PayPhone usan la misma lógica final
- ✅ Asignación idempotente (si ya asignó, no reasigna)

---

## 💳 Pagos PayPhone (resumen)

- Usa **token web**
- Confirmación:
  - `/api/payphone/button/V2/Confirm`
- Redirección GET con:
  - `tx`
  - `status`
- Confirmación **server-to-server**
- Reversos automáticos ya resueltos
- Logs mínimos (producción estable)

---

## 🎁 Premios Instantáneos

- Se gestionan desde la tabla `numeros_bendecidos`
- Se muestran en Home
- Si un número existe en `numeros_asignados`:
  - Se tacha
  - Muestra “¡Premio Entregado!”
- UI estilo Proyectos Flores (PF)

Archivo clave:


---

## 🚧 Próximo desarrollo planificado

### Sistema de referidos
- Socios / afiliados
- QR único por socio
- Link con tracking
- Billetera interna
- Comisiones por venta
- Panel para socios

⚠️ Todo el desarrollo nuevo debe ir en:



---

## 🧯 Recuperación / respaldo

- Git tag estable: `v1.0-stable`
- Backups automáticos Supabase activos
- Deployments versionados en Vercel

---

## 🧑‍💻 Nota para colaboradores / IA

Este proyecto ya está en producción.  
Cualquier cambio debe ser:
- Quirúrgico
- Reversible
- Justificado
- Sin refactors innecesarios

