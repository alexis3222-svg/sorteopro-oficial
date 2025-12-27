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

## 🤝 Sistema de Referidos / Afiliados (Spec v1)

Objetivo:
- Permitir que socios (taxis, streamers, promotores) refieran compras mediante un link/QR único.
- Pagar comisión automática por cada pedido que pase a `pagado`.
- Mostrar una billetera (panel web) con saldo, historial y retiros.

### 🧩 Conceptos
- **Affiliate (afiliado):** socio que refiere (ej: TAXI048 / STREAMER12).
- **Referral code:** código público que viaja en URL (ej: `?ref=TAXI048`).
- **Commission:** % fijo por venta (v1: 10% del total del pedido).
- **Wallet:** saldo acumulado por comisiones (disponible / pendiente / retirado).

### ✅ Reglas críticas (NO romper pagos)
- No se toca la lógica PayPhone.
- El cálculo de comisión ocurre SOLO cuando el pedido queda en `pagado`.
- Debe ser idempotente: una venta no genera comisión 2 veces.

### 🔗 Flujo (mínimo)
1) Afiliado comparte link/QR: `https://casabikers.vercel.app/?ref=TAXI048`
2) En Home, al abrir con `ref`, se guarda en cookie/localStorage.
3) Cuando se crea el pedido, se persiste `affiliate_id` (o `ref_code`) dentro de `pedidos`.
4) Cuando el pedido pasa a `pagado` (PayPhone confirm / admin transferencia):
   - Se registra una venta en `affiliate_sales`
   - Se calcula comisión (10%)
   - Se suma a la billetera

### 🗄️ Tablas nuevas (Supabase)
1) `affiliates`
- id (uuid)
- code (text UNIQUE) ej: TAXI048
- nombre (text)
- telefono (text)
- correo (text)
- password_hash (text)  ← usuario+contraseña tradicional
- is_active (bool)
- created_at

2) `affiliate_wallets`
- affiliate_id (uuid PK/FK)
- balance_available (numeric)  ← lo que puede retirar
- balance_pending (numeric)    ← por seguridad, opcional (v1 puede ser 0)
- balance_withdrawn (numeric)
- updated_at

3) `affiliate_sales`
- id (uuid)
- affiliate_id (uuid FK)
- pedido_id (int UNIQUE)       ← idempotencia fuerte
- sorteo_id (uuid)
- monto_pedido (numeric)
- porcentaje (numeric)         ← 0.10
- comision (numeric)
- status (text)                ← credited | reversed
- created_at

4) `affiliate_withdrawals` (fase 2)
- id (uuid)
- affiliate_id (uuid)
- amount (numeric)
- method (text)                ← transferencia, efectivo, etc
- status (text)                ← requested, approved, paid, rejected
- created_at

### 🧷 Campo nuevo en pedidos
- `affiliate_id` (uuid nullable)  o `affiliate_code` (text nullable)

Recomendación: guardar `affiliate_id` (mejor integridad), pero también mantener `affiliate_code` para auditoría.

### 🧮 Comisión (v1)
- comisión = monto_pedido * 0.10
- Se acredita SOLO cuando `pedido.estado = 'pagado'`
- La venta se crea UNA sola vez por pedido (UNIQUE(pedido_id))

### 🔐 Login afiliado (tradicional)
- Endpoint: `/api/affiliate/login`
- Sesión: cookie httpOnly (JWT simple) o sesión en tabla (fase 2)
- Panel: `/afiliado` (responsive)
  - saldo
  - ventas
  - QR
  - solicitar retiro
- El afiliado ingresa con:
  - **usuario:** `username` (se muestra como “Nombre Apellido” en UI)
  - **contraseña:** password
- Nota: aunque el usuario vea “Nombre Apellido”, internamente se guarda como `username` único para evitar duplicados.

4) Reglas de negocio (para README / Spec)

Retiro mínimo: $20 (sobre wallet.balance_available)

Un retiro crea un registro requested

Admin lo marca paid y recién ahí:

se descuenta saldo

se registra retiro

se notifica por WhatsApp

Datos bancarios:

se guardan en affiliate_payout_profiles

el socio puede actualizarlos con “Cambiar cuenta”

5) WhatsApp “pago exitoso” (sin romper nada)

Como aún no has dicho qué proveedor usas:

Twilio / Meta WhatsApp Cloud / otro gateway

lo dejamos como stub (función sendWhatsapp()), para conectar luego.

✅ La idea es que el botón de admin llame:
POST /api/admin/withdrawals/mark-paid

Ese endpoint:

valida admin

cambia estado

actualiza wallet

lee payout profile

envía WhatsApp