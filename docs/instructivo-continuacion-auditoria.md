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

## 3. Hoja de Ruta Dinámica y Resultados Ejecutados

### Paso A: Prueba de Eliminación, Consistencia y Papelera (`/trash`) — [COMPLETADO ✅]
* **Objetivo:** Comprobar si al borrar una transacción la app recalcula reactivamente el presupuesto y si existe papelera con soft-delete de 30 días.
* **Resultado observado:**
  * Al eliminar el gasto de Bs. 200,00, emergió un SnackBar `"Transacción movida a la papelera."` con botón `"Deshacer"`.
  * El balance de la cuenta subió reactivamente en tiempo real de `Bs. 1.000,00` a `Bs. 1.200,00`.
  * En `/budget` el badge cambió inmediatamente de `EXCEDIDO` a **`EN PLAN`** (Gastado Bs. 300,00 de Bs. 450,00 · Quedan Bs. 150,00).
  * La pantalla `/trash` (Papelera) se encuentra en **Mis Movimientos** (botón superior derecho). Muestra la transacción con acciones individuales de `"Restaurar"` y `"Eliminar definitivamente"`.

### Paso B: Prueba de Cuentas Compartidas (Grupos tipo Splitwise) — [COMPLETADO ✅]
* **Objetivo:** Validar la máquina de estados y reglas de miembros.
* **Resultado observado:**
  * Se creó exitosamente el grupo `"Apartamento Test"`. Cada grupo genera un código de invitación único (ej: `APARTAME-AUMMWU`).
  * **Regla de negocio descubierta:** Chekea NO admite participantes ficticios o "dummies". Solo permite buscar por username/correo a usuarios registrados en Chekea o compartir el enlace de invitación.
  * Al intentar registrar un gasto con 1 solo miembro, la app bloquea con validación: `"Necesitas al menos 2 miembros para cargar un gasto."`

### Paso C: Prueba de Compras a Crédito y Cuotas (Financiamiento tipo Cashea) — [COMPLETADO ✅]
* **Objetivo:** Verificar la generación del cronograma de cuotas y el impacto de la inicial.
* **Resultado observado:**
  * Se registró compra en USD de `$100,00` (Zapatos en Tienda Test) con inicial de `$40,00` y 3 cuotas quincenales (cada 14 días).
  * **Regla de cobro de inicial:** Al colocar inicial > 0, exige `"Pagar desde"`. Se seleccionó `Banesco Prueba bi (VES)`. La app aplicó conversión inmediata a tasa BCV (899,27 VES/$), debitando `Bs. 35.970,82` de la cuenta y permitiendo saldo negativo (`Bs. -34.770,82`).
  * Generó automáticamente el cronograma de amortización con 3 cuotas exactas de `$20,00` para las fechas: 23 nov (en 14 días), 07 dic (en 28 días) y 21 dic (en 42 días).

### Paso D: Prueba de Tarjetas de Crédito — [COMPLETADO ✅]
* **Objetivo:** Evaluar el flujo de deuda vs saldo.
* **Resultado observado:**
  * Se creó la tarjeta de crédito `"Banesco Master"` con límite de `$500,00`, corte día 15 y pago día 30, pago mínimo 3% e interés mensual 3%.
  * Se registró un gasto de `Bs. 150,00` pagado con dicha tarjeta.
  * **Regla contable confirmada:** El balance general de cuentas no bajó (se mantuvo en `Bs. -34.770,82`). La deuda de la tarjeta subió a `Bs. 150,00` ($0,17), el disponible bajó a `Bs. 350,00` (30% usado) y se proyectó automáticamente `"Tu próximo pago"` para el 30 nov con un pago mínimo calculado de `Bs. 7,50` (5%).

### Paso E: Limpieza Final de Datos de Prueba (Opcional)
* **Objetivo:** Dejar la cuenta de Derek limpia si el usuario lo desea.
* **Acción:**
  * Eliminar la cuenta `Banesco Prueba bi` desde `/accounts/detail`, el grupo `"Apartamento Test"`, la compra a crédito y la tarjeta `"Banesco Master"`.

---

## 4. Archivos Clave del Repositorio para Referencia

* `docs/auditoria-chekea.md`: Documento consolidado con arquitectura, 95 operaciones GraphQL/SQL, modelo de tablas y blueprint para React Native + Supabase.
* `/tmp/opencode/libapp_strings.txt`: Volcado de todas las strings del binario nativo.
* `/tmp/opencode/clean.txt`: Diccionario limpio de cadenas en español de la app.
* `/tmp/opencode/themes.md`: Cadenas clasificadas por temas funcionales (onboarding, presupuesto, binance, chekscore, etc.).
