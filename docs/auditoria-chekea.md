# Auditoría Técnica y Funcional Exhaustiva de Chekea (v1.6.1)
## Ingeniería Inversa, Arquitectura, Modelo de Datos y Hoja de Ruta para Apicash (React Native + Supabase)

**Fecha de auditoría:** Noviembre 2026  
**Objetivo de auditoría:** Extraer la totalidad de las reglas de negocio, flujos UX, arquitectura de datos, endpoints e integraciones de la app móvil **Chekea (com.chekea.chekea_mobile v1.6.1, build 1909)**, para portar e implementar estas funcionalidades dentro de **Apicash** utilizando **React Native (Expo) + Supabase**.

---

## 1. Arquitectura de Software e Infraestructura de Chekea

### 1.1 Stack Técnico del Cliente (Mobile)
* **Framework:** **Flutter** (Dart AOT compilado en binario nativo `libapp.so`, arquitectura ARM64 v8a).
* **Parches OTA (Over-The-Air):** **Shorebird** (`shorebird.yaml`, `libshorebird.so`). Permite a los desarrolladores publicar correcciones inmediatas de código Dart sin pasar por los tiempos de revisión de Google Play Store ni Apple App Store.
* **Almacenamiento y Caché Local:** **Hive** (`.hive`, `.hivec`) con cifrado mediante clave persistida en secure storage (`hive_encryption_key_v1`). Utiliza cajas de caché específicas:
  * `accounts.cache`
  * `transactions.cache`
  * `budget_plan.cache`
  * `categories.cache`
  * `exchange_rates.cache` (17 keys de tasas)
  * `home.cache`
* **Widgets del Sistema:** `com.cheqea.cheqea_mobile.RateWidgetProvider` vía `home_widget` para mostrar la tasa USDT/BCV y la brecha en la pantalla de inicio del teléfono.
* **Seguridad Local:** `local_auth` para autenticación biométrica (huella dactilar / Face ID) con PIN de respaldo interno y bloqueo de capturas (`FLAG_SECURE` / ocultar en el app switcher).

### 1.2 Infraestructura Backend y Servicios en la Nube
* **Proveedor Principal:** **Google Firebase Ecosystem** (Proyecto: `cheqea-app`, ID Android: `1:901568601021:android:1032ad5498233bc36990d4`).
* **Autenticación:** Firebase Auth (Email OTP con link mágico, Google Sign-In con reCAPTCHA Enterprise).
* **Capa de Datos de Alta Escala:** **Firebase Data Connect (v1)** vía `/google.firebase.dataconnect.v1.ConnectorService/ExecuteQuery` y `ExecuteMutation`. Reemplaza el uso directo de Firestore por un esquema tipado respaldado por Cloud SQL (PostgreSQL).
* **Edge Functions:** Firebase Cloud Functions en región `southamerica-east1` (San Pablo, Brasil) para menor latencia en Sudamérica:
  * `https://southamerica-east1-cheqea-app.cloudfunctions.net/binanceMarket` (scraping/proxy de órdenes Binance P2P).
* **Almacenamiento de Archivos:** Firebase Storage (`cheqea-app.firebasestorage.app`) para fotos de perfil, comprobantes de pago y facturas escaneadas.
* **Notificaciones Push:** Firebase Cloud Messaging (FCM) + Apple APNs con canales locales vía `flutter_local_notifications`.

---

## 2. Mapa Completo de Rutas y Pantallas

| Ruta interna | Pantalla / Funcionalidad |
| :--- | :--- |
| `/splash` | Pantalla de carga inicial y validación de sesión |
| `/welcome` / `/onboarding` | Bienvenida, selección de nombre de usuario y quiz inicial |
| `/auth` | Login / Registro con Email OTP y Google |
| `/home` | Dashboard principal: balance multimoneda, monitor de tasas, accesos rápidos |
| `/accounts` | Lista de cuentas dividida en Nacionales e Internacionales |
| `/accounts/add` | Formulario de alta de cuenta (banco nacional, billetera, exchange, efectivo) |
| `/accounts/currency` | Selector de moneda por cuenta |
| `/accounts/detail` | Historial de movimientos, balance y ajustes de cuenta |
| `/account-fees` | Configuración de comisiones bancarias por cuenta (topes BCV vs manual) |
| `/add-transaction` | Registro unificado: Gasto, Ingreso, Préstamo, Tarjeta |
| `/transfer` | Mover fondos entre cuentas propias (pago móvil con comisión vs transferencia) |
| `/transaction-detail` | Detalle, edición, cambio de cuenta pagadora y eliminación a papelera |
| `/transactions` | Historial paginado con búsqueda y filtro por categoría/cuenta |
| `/movements/breakdown` | Desglose mensual de ingresos y gastos por categoría |
| `/budget` / `/budget-view` | Vista mensual del presupuesto (barras interactivas) |
| `/budget/onboarding` | Asistente de 3 preguntas para calcular presupuesto 50/30/20 |
| `/budget-calculator` | Calculadora interactiva de distribución de ingresos |
| `/goals` | Lista de fondos (Emergencia, Ahorro general) y metas específicas |
| `/goal-new` / `/goal-detail` | Creación y progreso de metas (Individual, Pareja, Grupal) |
| `/goal-members` / `/goals/invitations` | Miembros de meta colaborativa y bandeja de invitaciones |
| `/shared-expenses` | Dashboard de Cuentas Compartidas (grupos tipo Splitwise) |
| `/shared-group-new` | Crear nuevo grupo de gastos con color e ícono |
| `/shared-group-participants`| Gestión de integrantes (con o sin cuenta Chekea) |
| `/shared-expense-new` | Cargar gasto grupal con división igual, porcentual o exacta |
| `/shared-expense-detail` | Detalle de consumos y cálculo de saldos consolidados |
| `/shared-expenses/invitations`| Bandeja de invitaciones a grupos |
| `/scan-receipt` | Escaneo OCR de facturas físicas con cámara |
| `/calculator` | Calculadora financiera (Convertir vs Equivalencias multimoneda) |
| `/rates-monitor` | Monitor histórico USDT vs BCV y gráfico de brecha cambiaria |
| `/price-index` / `/price-index/basket` | Canasta de productos e inflación personal del usuario |
| `/chekscore` / `/chekscore/intro` | Scoring crediticio interno de Chekea |
| `/credit-purchases` / `/cuotas` | Compras financiadas a cuotas (Cashea, Krece, etc.) |
| `/credit-purchase-new` | Alta de compra a crédito con inicial y calendario de cuotas |
| `/cards` / `/tarjetas` | Tarjetas de crédito con cupo, corte y fecha de pago |
| `/loans` | Préstamos otorgados y recibidos con control de abonos |
| `/recurring` | Ingresos y gastos fijos automatizados |
| `/categories` | Catálogo de categorías con clasificación (Necesidad/Deseo/Ahorro) |
| `/assistant` | Asistente conversacional IA (Chekito) por texto y voz |
| `/settings` | Configuración: moneda base, formato numérico, país, zona horaria |
| `/settings/privacy` | Modo privado, huella/Face ID, ocultar en app switcher |
| `/settings/notifications`| Toggles granulares por tipo de push y recordatorio |
| `/support` | Sistema de tickets con captura y video |
| `/trash` | Papelera de reciclaje de transacciones para recuperación |

---

## 3. Modelo de Datos y Entidades (Firebase Data Connect)

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────────┐
│      users      │──────<│    accounts     │──────<│     transactions     │
└─────────────────┘       └─────────────────┘       └──────────────────────┘
         │                         │                            │
         │                         │                            │
         ├─────────────────────────┼────────────────────────────┤
         │                         │                            │
         ▼                         ▼                            ▼
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────────┐
│   budget_plan   │       │   credit_cards  │       │  shared_expense_grp  │
└─────────────────┘       └─────────────────┘       └──────────────────────┘
         │                         │                            │
         ▼                         ▼                            ▼
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────────┐
│  categories     │       │ credit_purchase │       │ shared_expense_split │
└─────────────────┘       └─────────────────┘       └──────────────────────┘
```

### 3.1 Tablas y Atributos Clave

1. **`users`**
   * `id` (UUID / Firebase UID), `username` (@nombreunico), `email`, `display_name`, `photo_url`.
   * `base_currency` (por defecto `'VES'`), `enabled_currencies` (array: `['VES', 'USD', 'USDT', 'EUR', 'COP', 'BTC', 'ETH', 'SOL', 'XRP']`).
   * `country` (`'Venezuela'`), `timezone` (`'America/Caracas'`), `number_format` (`1.234.567,89`).
   * `onboarding_completed`, `deleted_at` (soft delete de 30 días para recuperación).

2. **`accounts`**
   * `id`, `user_id`, `name`, `currency` (`VES`, `USD`, etc.), `account_type` (`bank`, `cash`, `wallet`, `exchange`, `crypto`).
   * `bank_identifier` (ej: `bdv`, `banesco`, `mercantil`, `binance`, `zinli`).
   * `initial_balance`, `current_balance`, `icon`, `color_hex`.
   * `is_national` (boolean), `is_archived`.

3. **`account_fee_configs`**
   * `id`, `account_id`, `fee_type` (`pago_movil`, `transferencia`, `conversion`).
   * `percentage`, `fixed_amount`, `apply_bcv_cap` (respetar topes máximos oficiales del BCV).

4. **`transactions`**
   * `id`, `user_id`, `account_id`, `category_id`, `type` (`income`, `expense`, `transfer`, `adjustment`).
   * `amount`, `currency`, `amount_usd_calculated`, `exchange_rate_used`.
   * `date`, `description`, `merchant_name`, `is_recurring`, `linked_transaction_id` (para transferencias entre cuentas).
   * `credit_card_id` (si fue pagado con tarjeta), `receipt_url`, `is_deleted`.

5. **`budget_plans`**
   * `id`, `user_id`, `plan_type` (`equilibrado`, `ahorradorMax`, `pilar`, `visionario`, `custom`).
   * `monthly_income_declared`, `income_currency`.
   * `needs_percentage` (ej. 50%), `wants_percentage` (ej. 30%), `savings_percentage` (ej. 20%).
   * `start_day_of_month` (ej. día 1 o día 15).

6. **`categories`**
   * `id`, `user_id` (null si es default), `name`, `icon`, `color_hex`, `type` (`income` | `expense`).
   * `budget_bucket` (`needs`, `wants`, `savings`).
   * `is_hidden`, `parent_id` (para subcategorías).

7. **`goals` & `goal_contributions`**
   * `goals`: `id`, `user_id`, `name`, `target_amount`, `currency`, `current_amount`, `deadline_date`, `goal_type` (`emergency_fund`, `general_savings`, `custom_goal`), `is_collaborative`, `invite_code`.
   * `goal_members`: `goal_id`, `user_id`, `role` (`owner`, `contributor`), `status` (`pending`, `accepted`).
   * `goal_contributions`: `id`, `goal_id`, `user_id`, `account_id`, `amount`, `currency`, `created_at`.

8. **`shared_expense_groups` & `shared_expenses`**
   * `shared_expense_groups`: `id`, `owner_user_id`, `name`, `description`, `color_hex`, `invite_code`, `status` (`active`, `archived`).
   * `shared_expense_members`: `group_id`, `user_id` (opcional si es miembro sin app), `display_name`, `role`.
   * `shared_expenses`: `id`, `group_id`, `paid_by_member_id`, `total_amount`, `currency`, `category_id`, `split_type` (`equal`, `percentage`, `exact`, `itemized`), `receipt_scan_id`.
   * `shared_expense_splits`: `expense_id`, `member_id`, `amount_owed`, `percentage`.
   * `shared_expense_settlements`: `id`, `group_id`, `from_member_id`, `to_member_id`, `amount`, `currency`, `status` (`pending_confirmation`, `confirmed`, `rejected`). **Regla crítica: El saldo solo cambia al confirmar el receptor.**

9. **`credit_purchases` & `installment_payments`**
   * `credit_purchases`: `id`, `user_id`, `merchant_name`, `total_amount`, `currency`, `down_payment` (inicial), `down_payment_account_id` / `card_id`, `installments_count`, `first_due_date`, `status` (`active`, `completed`, `cancelled`).
   * `installment_payments`: `purchase_id`, `installment_number`, `due_date`, `amount`, `status` (`pending`, `paid`, `overdue`), `paid_date`, `paid_from_account_id`.

10. **`loans` & `loan_payments`**
    * `loans`: `id`, `user_id`, `counterparty_name`, `type` (`lent` [presté] | `borrowed` [me prestaron]), `total_amount`, `currency`, `balance_remaining`, `due_date`, `status` (`active`, `settled`, `written_off` [dado por perdido / condonado]).

11. **`price_index_items` (Inflación Personal)**
    * `id`, `user_id`, `product_name`, `merchant_name`, `first_price`, `latest_price`, `currency`, `last_purchase_date`, `inflation_rate`.

---

## 4. Radiografía Funcional Detallada

### 4.1 Onboarding y Perfilado Financiero
1. **Selección de @username:** Validación en tiempo real contra la base de datos para garantizar identificador único para transferencias y grupos compartidos.
2. **Quiz de 3 preguntas de presupuesto:**
   * *Pregunta 1:* ¿Cómo entra tu dinero? (Sueldo fijo mensual, Quincenal, Freelance/Variable, Múltiples fuentes).
   * *Pregunta 2:* ¿Cuánto de tu ingreso se va en gastos fijos indispensables? (<30%, ~50%, >70%).
   * *Pregunta 3:* ¿Qué haces primero al cobrar? (Ahorro primero, Pago deudas, Gasto según necesito).
3. **Generación automática del arquetipo:**
   * **El Equilibrado (50/30/20):** Ideal para ingresos estables. 50% Necesidades, 30% Deseos, 20% Ahorro.
   * **El Ahorrador Max (20/30/50):** Gastos mínimos, enfoque agresivo en ahorro para metas grandes.
   * **El Pilar:** Prioriza responsabilidades familiares y gastos fijos, manteniendo un margen mínimo de ahorro.
   * **El Visionario:** Para freelancers y emprendedores con ingresos fluctuantes y fondos de contingencia.

### 4.2 Monitor de Tasas y Brecha Cambiaria
* Consulta continua de:
  * **BCV USD:** Tasa oficial de referencia.
  * **BCV EUR:** Tasa oficial europea.
  * **Binance P2P USDT:** Mediana de órdenes de compra/venta de USDT en bolívares.
  * **CoinGecko:** Precios spot para criptoactivos (BTC, ETH, SOL, XRP).
* **Cálculo de Brecha:**
  $$\text{Brecha (\%)} = \left(\frac{\text{Tasa USDT}}{\text{Tasa BCV}} - 1\right) \times 100$$
* **Pérdida por Diferencia de Cambio:** Muestra al usuario cuánto poder adquisitivo perdió en el mes al convertir o pagar con bolívares fuera de la tasa oficial.

### 4.3 Sistema de Cuentas Compartidas (Bilateral Payment Settlement)
* Para resolver las disputas en gastos de roommates o salidas:
  1. Un usuario carga un gasto de $60 y lo divide entre 3.
  2. El usuario B paga su parte ($20) seleccionando su cuenta de salida.
  3. El sistema marca el pago en estado `Pago enviado / Por confirmar`.
  4. El balance de la deuda **NO cambia** en el grupo hasta que el usuario A (quien pagó el gasto original) pulsa `Confirmar pago`.
  5. Si el usuario A rechaza el pago, el gasto vuelve a su estado deudor anterior sin tocar cuentas contables erróneamente.

### 4.4 ChekScore (Scoring Financiero)
* Motor de reputación crediticia interna basado en 5 pilares:
  1. **Consistencia de Ahorro:** Aportes regulares en los últimos 3 meses a fondos o metas.
  2. **Salud del Presupuesto:** Porcentaje del mes vivido dentro de los límites de Necesidades y Deseos.
  3. **Puntualidad de Cuotas:** Pagos a tiempo de cuotas de compras a crédito y tarjetas.
  4. **Deuda Controlada:** Relación deuda/ingreso menor al 30%.
  5. **Manejo de Cuentas Compartidas:** Pagos de deudas grupales sin demoras.
* *Escala:* 0 a 1000 puntos con niveles (`Bajo`, `Medio`, `Alto`, `Excelente`).

### 4.5 Escaneo OCR de Facturas y Reparto por Ítem
* El escáner lee el ticket y extrae:
  * Nombre del comercio / RIF.
  * Fecha y hora original de la factura.
  * Lista de productos con precio unitario e IVA.
  * Total consolidado.
* **Reparto interactivo:** En cuentas compartidas, cada integrante toca los ítems que consumió. Si dos personas compartieron una pizza, el ítem se divide 50/50. La app suma propinas o impuestos proporcionalmente.

---

## 5. Hoja de Ruta de Implementación para Apicasch (React Native + Supabase)

Para llevar todas estas capacidades a **Apicash**, preservando el backend en Supabase y utilizando **React Native con Expo**, se establece el siguiente plan de arquitectura:

### 5.1 Estructura del Proyecto Mobile (`/apps/mobile` o carpeta raíz `/mobile`)
* **Framework:** React Native con **Expo SDK 52+** (TypeScript estricto, React 19).
* **Navegación:** **Expo Router (File-based routing)**, replicando la estructura de rutas observada en Chekea.
* **Estilos:** **NativeWind v4** (Tailwind CSS en React Native) para reutilizar los tokens de diseño de la web de Apicash.
* **Caché y Datos:** **TanStack Query (React Query v5)** + **MMKV** (almacenamiento ultra-rápido en C++ reemplazando a Hive).
* **Auth & DB Client:** `@supabase/supabase-js` con `expo-secure-store` para persistencia de tokens de sesión.
* **UI Components:** Lucide Icons (`lucide-react-native`), animaciones con `react-native-reanimated`.
* **Cámara & OCR:** `expo-camera` + llamada a Edge Function de Supabase con Google Cloud Vision API o Gemini 1.5 Flash para parsing estructurado de tickets en JSON.

### 5.2 Migraciones Requeridas en Supabase (`/supabase/migrations/`)
1. **Extensión de tabla `cuentas`:** Agregar soporte para `is_national`, campos de banco específico (BDV, Banesco, etc.), comisiones de pago móvil y flag de exchange.
2. **Módulo de Compras a Crédito:** Crear tablas `credit_purchases` e `installment_payments` para tracking de compras financiadas (Cashea/Krece).
3. **Módulo de Tarjetas de Crédito:** Crear `credit_cards` con fecha de corte, fecha de pago y límite de crédito.
4. **Módulo de Grupos Compartidos:** Crear `shared_groups`, `shared_expenses` y `shared_settlements` con RLS estricto y la máquina de estados de confirmación bilateral.
5. **Historial de Brecha:** Crear tabla `exchange_spread_history` que registre periódicamente el delta entre la tasa Cotizave (P2P) y la tasa oficial BCV.
6. **Políticas RLS:** Mantener el estándar `auth.uid() = user_id` y funciones RPC `SECURITY DEFINER` para cierres de saldos y confirmación de pagos grupales.

---

## 6. Hallazgos y Reglas de Negocio Validadas Dinámicamente (ADB en Vivo)

A través de pruebas dinámicas sobre la build en producción (`com.chekea.chekea_mobile` v1.6.1 en Redmi Note 8 Pro), se corroboraron empíricamente las siguientes reglas de negocio:

1. **Eliminación y Papelera (`/trash`):**
   * Al borrar un movimiento, Chekea dispara un SnackBar con opción de reversa inmediata (`Deshacer`).
   * Reactividad inmediata: el saldo de la cuenta se restituye al instante y el presupuesto se recalcula en tiempo real (p. ej. pasó de `EXCEDIDO` a `EN PLAN`).
   * La papelera `/trash` está situada en la esquina superior de `Mis Movimientos` y ofrece opciones explícitas por ítem de `Restaurar` o `Eliminar definitivamente`.

2. **Cuentas Compartidas:**
   * Cada grupo genera un código de invitación unívoco (p. ej. `APARTAME-AUMMWU`).
   * No permite participantes ficticios; los integrantes deben tener cuenta registrada en Chekea o ingresar mediante token.
   * Restricción estricta de carga: bloquea el registro de gastos con 1 solo miembro bajo el toast `"Necesitas al menos 2 miembros para cargar un gasto"`.

3. **Compras Financiadas a Crédito (tipo Cashea):**
   * Soporta modalidad de inicial + cuotas periódicas (quincenales de 14 días o mensuales).
   * Al pagar una inicial en divisa ($40) usando una cuenta en moneda local (VES), aplica la conversión al vuelo usando la tasa oficial del día y debita el monto total equivalente (`Bs. 35.970,82`), admitiendo saldo negativo por sobregiro.
   * Genera la proyección automática de vencimientos en la sección de `Próximos Pagos` respetando los intervalos de 14 días.

4. **Tarjetas de Crédito y Separación de Deuda:**
   * Las tarjetas son entidades financieras independientes: un gasto asignado a una tarjeta de crédito **no altera el balance líquido general de cuentas**.
   * Disminuye el crédito disponible de la tarjeta e incrementa la `Deuda Total`.
   * Proyecta automáticamente `Tu próximo pago` acorde al día de pago configurado, calculando el `Pago mínimo` de forma reactiva.

---

## 7. Desglose Forense del Binario (Reverse Engineering a Nivel de Byte)

Al extraer y desensamblar `libapp.so` (14.4 MB) y los assets del bundle (`base.apk` + `split_config.arm64_v8a.apk`), se descubrieron componentes de infraestructura y telemetría críticos que no estaban expuestos a nivel de interfaz de usuario:

### 7.1 Backend Serverless de Precios P2P en Vivo
* **Cloud Function descubierta:**  
  `https://southamerica-east1-cheqea-app.cloudfunctions.net/binanceMarket`
* **Payload en tiempo real (Auditado vía curl):**
  * `prices`: Cotizaciones spot en tiempo real para `BTCUSDT`, `ETHUSDT`, `BNBUSDT`, `XRPUSDT`, `SOLUSDT`.
  * `p2p`: Spread bid/ask real de Binance P2P para `USDT/VES`, `BTC/VES`, `ETH/VES` (ej. USDT Buy: `1056.65` / Sell: `1054.00`).
  * `p2pMethods`: Diccionario maestro de pasarelas de pago admitidas para P2P por moneda (`VES` con 21 bancos/métodos nacionales como Pago Móvil, Banesco, BDV, Mercantil, Bancamiga; `USD` con 130 métodos como Zelle, Zinli, Wally, Banesco Panamá, Facebank; `EUR` y `COP`).
  * **Implicación para Apicash:** Apicash puede implementar un scraper/mirror similar en una Edge Function de Supabase para obtener automáticamente el spread real y los métodos de pago P2P sin depender de APIs de terceros de pago.

### 7.2 Rutas Ocultas de Desarrollo (`/dev/*`)
El router de GoRouter en Flutter tiene compiladas rutas internas de testing e inyección de fallas que confirman las capacidades bajo el capó:
* `/dev/fault-injector`: Inyector de fallas para simular caída de red, pérdida de Firebase Data Connect y timeouts de Cloud Functions.
* `/dev/rates-inspector`: Inspección de micro-variaciones de spread cambiario en tiempo real.
* `/dev/price-index`: Simulador de canasta básica de alimentos y tasa de inflación mensual.
* `/dev/chekscore`: Simulador de escenarios y fases (`ChekscoreMockScenario`, `ChekscoreMockPhase`).
* `/dev/haptics-lab`: Calibrador de vibración táctil para el teclado financiero.
* `/dev/components-preview` y `/dev/empty-states`: Catálogo de estados vacíos y diseño atómico.

### 7.3 Arquitectura de Home Widget (Android Glance & iOS WidgetKit)
* Se detectaron los adaptadores nativos `home_widget` y `RateWidgetProvider` / `glance`.
* Chekea mantiene un canal de comunicación nativo (`saveWidgetData` / `updateWidget`) que sincroniza en segundo plano el valor del dólar BCV, el USDT P2P y la brecha cambiaria para mostrar el widget en la pantalla de inicio del dispositivo sin necesidad de abrir la aplicación.

### 7.4 Changelog Histórico y Decisiones de Arquitectura Internas
A partir de `docs/notas-de-version.md` extraído de los assets compilados, se descubrieron los puntos de dolor y lecciones aprendidas de Chekea:
* **Problema de Parseo de Montos (v1.4.2):** Al inicio tenían bugs donde 300 se guardaba como 30.000 o 1.500 como 1,5 debido a inconsistencias de separadores de miles/decimales (`.` vs `,`). Se solucionó unificando el control de monto y moneda en un único componente atómico.
* **Separación de Deuda vs Liquidez (v1.2.3 y v1.4.1):** Tuvieron que corregir que las compras con tarjeta debitaban cuentas de banco erróneamente; migraron al modelo estricto donde una tarjeta de crédito **solo incrementa deuda** y solo las cuentas de banco poseen liquidez.
* **Anti-Duplicidad de Importaciones Bancarias (v1.4.1):** En archivos CSV/TSV agregaron un hash por movimiento (fecha + monto + descripción) para evitar duplicar transacciones si una importación se interrumpe a la mitad.

---

*Fin del documento de auditoría técnica.*
