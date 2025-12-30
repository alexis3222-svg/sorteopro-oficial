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

1) Diagrama general del sistema
A) Mapa de componentes

Frontend (Next.js App Router)

Sitio público / compra: genera pedidos y (cuando corresponde) asocia affiliate_id / affiliate_code.

Panel Afiliado (/afiliado): consume APIs de afiliados para sesión, billetera, movimientos y QR.

Backend (Next.js Route Handlers / API)

APIs ya existentes (no tocar):

/api/affiliate/register

/api/affiliate/login

/api/affiliate/logout

/api/affiliate/me

/api/affiliate/qr

/api/affiliate/wallet

/api/affiliate/movements

Supabase (Postgres + Service Role)

Tablas clave:

Afiliados: affiliates, affiliate_sessions

Dinero: affiliate_wallets, affiliate_commissions, affiliate_withdrawals

Ventas: affiliate_sales, pedidos

Sorteos: sorteos, numeros_asignados

Relación crítica

pedidos.affiliate_id

pedidos.affiliate_code

B) Flujo de sesión del afiliado (login / sesiones propias)
[Afiliado] -> /afiliado (UI)
   |
   | (login)
   v
POST /api/affiliate/login
   |
   | valida credenciales (affiliates)
   | crea sesión (affiliate_sessions)
   | set-cookie (token sesión)
   v
[Browser con cookie]
   |
   | (cada carga / refresco)
   v
GET /api/affiliate/me
   |
   | lee cookie -> busca sesión activa
   | devuelve perfil + código + estado
   v
/afiliado renderiza panel

(logout)
POST /api/affiliate/logout
   |
   | invalida sesión
   | limpia cookie
   v
/afiliado vuelve a "no logueado"


Idea clave de mantenimiento:
El único origen de verdad de “logueado” es affiliate_sessions + cookie. La UI solo refleja lo que diga /me.

C) Flujo de referido (link + QR)
Afiliado comparte:
  https://tu-dominio/... ?ref=AFF_CODE

Cliente entra con ?ref=AFF_CODE
   |
   | (en el flujo de compra)
   | se guarda affiliate_code (y si ya está resuelto, affiliate_id)
   v
INSERT pedidos (incluye affiliate_code / affiliate_id)


QR

El panel /afiliado llama a:

GET /api/affiliate/qr

Devuelve QR “listo” (o data para generarlo) apuntando al link con ?ref=CODE.

D) Flujo de comisión (10% actual, no recalcula histórico)
Pedido cambia a "pagado" (por PayPhone webhook o confirmación admin)
   |
   | regla: si pedidos.affiliate_id (o affiliate_code) existe
   v
Crear comisión:
  INSERT affiliate_commissions
   |
   | actualizar billetera:
   |  affiliate_wallets.balance_available += comisión
   |  affiliate_wallets.balance (total histórico) += comisión
   v
Panel afiliado ve:
  GET /api/affiliate/wallet
  GET /api/affiliate/movements (últimos 20)


Punto crítico de estabilidad:
Este flujo debe ser idempotente (aunque ya lo tienes estable): si el pedido ya generó comisión, no debe duplicarse.

E) Flujo de billetera y retiros (regla $10)

Campos:

balance_available (lo que se puede retirar)

balance_pending (si aplicara retenciones/procesos)

balance_withdrawn (retirado)

balance (histórico total acumulado)

Regla dura:

Retiro solo si balance_available >= 10.

(Tú ya lo tienes como regla del sistema; esto va al README como “business rule”).

2) Estructura exacta de carpetas y archivos para README

Nota: pongo una estructura “documentable” y estándar para este proyecto. Si tienes más carpetas, esto se integra, pero esto cubre lo que ya declaraste como existente y funcionando.

app/
  afiliado/
    page.tsx
    (opcional) components/
      WalletCards.tsx
      MovementsList.tsx
      QrBlock.tsx
      SessionStatus.tsx

  api/
    affiliate/
      register/
        route.ts
      login/
        route.ts
      logout/
        route.ts
      me/
        route.ts
      qr/
        route.ts
      wallet/
        route.ts
      movements/
        route.ts

lib/
  supabase/
    admin.ts
    client.ts
  affiliate/
    session.ts
    constants.ts
    types.ts
  utils/
    money.ts
    qr.ts

supabase/
  migrations/
    (SQLs si los tienes versionados)
  policies/
    (RLS y permisos si los documentas)

Descripción de cada parte (orientado a mantenimiento y escalabilidad)
app/afiliado/page.tsx

Qué es: UI principal del panel de afiliado (dashboard oscuro tipo Admin).

Qué hace:

consulta estado de sesión (/api/affiliate/me)

muestra billetera (/api/affiliate/wallet)

muestra últimos movimientos (/api/affiliate/movements)

genera/descarga QR (/api/affiliate/qr)

muestra link con ?ref=CODE

Regla: archivo base “correcto”, no romper.

app/api/affiliate/*/route.ts

Qué es: capa API (Route Handlers) que habla con Supabase usando privilegios correctos.

Por qué existe: encapsula toda lógica sensible (login, sesiones, wallet, etc.) en servidor.

Cómo escalar: aquí se agregan endpoints nuevos sin tocar el frontend (siempre opcional).

Endpoints:

register/route.ts: crea afiliado (tabla affiliates) y prepara wallet (affiliate_wallets) si aplica.

login/route.ts: valida credenciales, crea sesión (affiliate_sessions), set-cookie.

logout/route.ts: invalida sesión, limpia cookie.

me/route.ts: lee cookie, retorna perfil + estado.

qr/route.ts: devuelve QR del link de referido.

wallet/route.ts: devuelve saldos de affiliate_wallets.

movements/route.ts: devuelve últimos 20 (normalmente desde affiliate_commissions y/o affiliate_sales y/o affiliate_withdrawals según tu implementación).

lib/supabase/

admin.ts

Cliente Supabase con Service Role (solo server).

Usado por APIs para operaciones seguras (comisiones, sesiones, wallets).

client.ts

Cliente Supabase público (si lo usas en UI para lecturas no sensibles).

Regla: nunca meter service role aquí.

lib/affiliate/

session.ts

Helpers de sesión (leer cookie, validar sesión, obtener affiliate_id).

Centraliza lógica para no duplicar en cada route.

constants.ts

Por ejemplo: comisión 0.10, mínimo retiro 10, nombres de cookies, TTL.

OJO: tú ya tienes comisión en 10%; aquí quedaría documentado para futuros devs.

types.ts

Tipos TypeScript: AffiliateMe, Wallet, Movement, etc.

lib/utils/

money.ts: helpers de formateo/decimal seguro.

qr.ts: si tienes helpers de QR (si no, se omite).

supabase/

migrations/: SQL versionado (si lo estás usando).

policies/: RLS / notas de seguridad (opcional pero recomendado para equipo).

3) “Cómo se conecta todo” (resumen para README)

Frontend /afiliado
→ consume solo APIs /api/affiliate/*
→ APIs usan Supabase
→ las tablas fuente de verdad son:

sesión: affiliate_sessions

saldo: affiliate_wallets

movimientos: affiliate_commissions (+ ventas/retiros si aplica)

Compra pública
→ cuando entra con ?ref=CODE, guarda ese affiliate_code y/o affiliate_id en pedidos
→ al marcar pedido como pagado, se dispara lógica de comisión
→ se inserta affiliate_commissions y se actualiza affiliate_wallets.balance_available

4) Mejoras opcionales (sin tocar lo funcional)

Solo para dejarlo anotado en README como “roadmap”:

Idempotencia visible: constraint único tipo (pedido_id) en affiliate_commissions para blindaje anti-duplicados.

Movements unificado: una vista SQL (affiliate_movements_view) que combine comisiones + retiros + ajustes.

Mínimo retiro en backend: validar >= 10 también en API (aunque ya esté en UI) para seguridad.