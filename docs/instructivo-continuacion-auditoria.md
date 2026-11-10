# Instructivo Operativo: Continuación de Auditoría y Benchmark Chekea para Apicash

**Estado:** En Pausa (Noviembre 2026)  
**Dispositivo:** Redmi Note 8 Pro (`lineage_begonia`), IP: `192.168.0.106` (Wireless ADB)  
**App auditada:** Chekea (`com.chekea.chekea_mobile` v1.6.1, build 1909)  
**Cuenta de prueba en uso:** `@derekrojo12`  

---

## 1. Estado Actual de la Sesión y Datos de Prueba Mutados

Durante esta sesión pasamos de la **auditoría estática (ingeniería inversa al binario)** a las **pruebas dinámicas con mutación de datos reales en el backend de Firebase Data Connect**:

1. **Cuenta creada:**
   * Nombre: `Banesco Prueba bi`
   * Moneda: `Bs. (VES)`
   * Saldo inicial inyectado: `Bs. 1.500,00` (equivalente en USD calculado por la app: `$1,67` a tasa BCV 899,27).
2. **Gastos registrados en Alimentación:**
   * Gasto 1: `Bs. 300,00` (Descripción: `Almuerzo de prueba`).
   * Gasto 2: `Bs. 200,00` (Registrado para estresar el límite del presupuesto).
   * Saldo resultante en cuenta: `Bs. 1.000,00` ($1,11).
3. **Plan de Presupuesto Activado:**
   * Arquetipo: **El Visionario** (ajustado tras forzar desbalance a 90% Necesidades / 5% Deseos / 5% Ahorro sobre base de Bs. 500,00).
   * Límite de Necesidades: `Bs. 450,00`.
   * Estado actual en pantalla de presupuesto: **`EXCEDIDO`** (Gastado Bs. 500,00 de Bs. 450,00 -> Gastado de más: Bs. 50,00 en rojo).

---

## 2. Reconexión Inmediata por ADB

Si la conexión wireless ADB se interrumpe entre sesiones, ejecutar:

```bash
# 1. Descubrir el puerto TLS activo por mDNS
adb mdns services | grep _adb-tls-connect

# 2. Conectar al puerto devuelto (ejemplo si fuera 45709)
adb connect 192.168.0.106:<puerto_mdns>

# 3. Verificar estado
adb devices -l
# Debe figurar: 192.168.0.106:<puerto> device
```

---

## 3. Próximos Pasos a Ejecutar (Hoja de Ruta Dinámica)

Cuando se reanude la auditoría, continuar con los siguientes bloques de prueba en orden:

### Paso A: Prueba de Eliminación, Consistencia y Papelera (`/trash`)
* **Objetivo:** Comprobar si al borrar una transacción la app recalcula reactivamente el presupuesto y si existe papelera con soft-delete de 30 días.
* **Acción:**
  * En Inicio, la fila del gasto de Bs. 200,00 está en `bounds: [51, 1631][1029, 1831]` (centro: `[540, 1731]`).
  * Tocar `[540, 1731]` para abrir `/transaction-detail`.
  * Presionar el botón de eliminar transacción (icono de papelera).
  * Verificar si regresa a `/home` con balance en `Bs. 1.200,00` y si en `/budget` el badge vuelve automáticamente de `EXCEDIDO` a `EN PLAN` (Bs. 300 de 450).
  * Inspeccionar si en Configuración o Menú aparece la sección de elementos eliminados para restaurar (`/trash`).

### Paso B: Prueba de Cuentas Compartidas (Grupos tipo Splitwise)
* **Objetivo:** Validar la máquina de estados de confirmación bilateral de pagos descubierta en el código.
* **Acción:**
  * Ir a pestaña 5 (Cuentas compartidas: `[920, 2193]`).
  * Crear un grupo de prueba (ej: *"Apartamento Test"*).
  * Agregar un participante ficticio (por nombre sin cuenta Chekea).
  * Cargar un gasto de $30 dividido 50/50.
  * Simular el registro de un abono/pago de $15 y capturar la pantalla para comprobar el estado `"Pago enviado / Por confirmar"`.

### Paso C: Prueba de Compras a Crédito y Cuotas (Financiamiento tipo Cashea)
* **Objetivo:** Verificar la generación del cronograma de cuotas y el impacto de la inicial.
* **Acción:**
  * En Inicio -> Accesos Rápidos -> Tocar `Crédito` (`[924, 1186]`).
  * Tocar *"Agregar compra"*.
  * Cargar un monto total (ej: $100), inicial hoy de $40 (pagada desde la cuenta Banesco creada) y 3 cuotas quincenales de $20.
  * Verificar si la inicial descuenta el saldo de Banesco y si las cuotas quedan programadas en el calendario de vencimientos con sus fechas.

### Paso D: Prueba de Tarjetas de Crédito
* **Objetivo:** Evaluar el flujo de deuda vs saldo.
* **Acción:**
  * En `/credit-purchases` -> pestaña `Tarjetas`.
  * Agregar una tarjeta de crédito ficticia (Banesco / Mercantil, límite $500, corte día 15, pago día 30).
  * Registrar un gasto pagado con tarjeta y comprobar que el balance general no baja, sino que sube la deuda de la tarjeta.

### Paso E: Limpieza Final de Datos de Prueba (Opcional)
* **Objetivo:** Dejar la cuenta de Derek limpia si el usuario lo desea.
* **Acción:**
  * Eliminar la cuenta `Banesco Prueba bi` desde `/accounts/detail`.
  * Confirmar que al borrar la cuenta los movimientos asociados se limpien o queden archivados.

---

## 4. Archivos Clave del Repositorio para Referencia

* `docs/auditoria-chekea.md`: Documento consolidado con arquitectura, 95 operaciones GraphQL/SQL, modelo de tablas y blueprint para React Native + Supabase.
* `/tmp/opencode/libapp_strings.txt`: Volcado de todas las strings del binario nativo.
* `/tmp/opencode/clean.txt`: Diccionario limpio de cadenas en español de la app.
* `/tmp/opencode/themes.md`: Cadenas clasificadas por temas funcionales (onboarding, presupuesto, binance, chekscore, etc.).
