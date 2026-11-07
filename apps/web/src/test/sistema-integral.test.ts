import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

// Modelado de los cálculos críticos de Apicasch según la especificación de BD y Esquema
describe('Auditoría Integral de Lógica de Negocio (Apicasch)', () => {

  describe('1. Cuentas y Balances (saldo_cache)', () => {
    it('debe calcular saldo_cache sumando ingresos y ajustes y restando gastos', () => {
      const movimientos = [
        { tipo: 'ingreso', monto: new Decimal(500) },
        { tipo: 'gasto', monto: new Decimal(120.50) },
        { tipo: 'ajuste', monto: new Decimal(50) }, // ej: retiro de ahorro que ingresa a cuenta
        { tipo: 'gasto', monto: new Decimal(30) },
      ];

      const saldoFinal = movimientos.reduce((acc, mov) => {
        if (mov.tipo === 'ingreso' || mov.tipo === 'ajuste') {
          return acc.plus(mov.monto);
        } else if (mov.tipo === 'gasto') {
          return acc.minus(mov.monto);
        }
        return acc;
      }, new Decimal(0));

      expect(saldoFinal.toNumber()).toBe(399.50);
    });

    it('al anular una transacción debe revertir su impacto exacto', () => {
      let saldo = new Decimal(100);
      const gasto = new Decimal(40);
      
      // Se aplica gasto
      saldo = saldo.minus(gasto);
      expect(saldo.toNumber()).toBe(60);

      // Se anula gasto (reversión: sumar de vuelta)
      saldo = saldo.plus(gasto);
      expect(saldo.toNumber()).toBe(100);
    });
  });

  describe('2. Metas de Ahorro y Retiros Multimoneda', () => {
    it('debe calcular correctamente el aporte en VES a una meta en USD usando tasa', () => {
      const tasa = new Decimal(50); // 50 VES por USD
      const aporteVES = new Decimal(1000);
      const montoConvertidoUSD = aporteVES.dividedBy(tasa);

      expect(montoConvertidoUSD.toNumber()).toBe(20);
    });

    it('debe calcular retiro de meta en USD hacia cuenta en VES', () => {
      const tasa = new Decimal(50);
      const metaActualUSD = new Decimal(100);
      const retiroEnVES = new Decimal(1500); // 1500 VES = 30 USD

      // Conversión del retiro a la moneda de la meta (USD)
      const impactoMetaUSD = retiroEnVES.dividedBy(tasa);
      expect(impactoMetaUSD.toNumber()).toBe(30);

      // Verificación de saldo restante en meta
      const nuevaMeta = metaActualUSD.minus(impactoMetaUSD);
      expect(nuevaMeta.toNumber()).toBe(70);
    });

    it('debe rechazar retiro si el monto convertido supera el fondo disponible', () => {
      const metaUSD = new Decimal(20);
      const tasa = new Decimal(50);
      const retiroVES = new Decimal(1500); // 1500 / 50 = 30 USD > 20 USD

      const retiroUSD = retiroVES.dividedBy(tasa);
      const fondosSuficientes = metaUSD.greaterThanOrEqualTo(retiroUSD);
      expect(fondosSuficientes).toBe(false);
    });

    it('sincronización auxiliar: al anular un retiro de ahorro se devuelven fondos a la meta', () => {
      let metaUSD = new Decimal(100);
      const retiroUSD = new Decimal(25);

      // Retiro
      metaUSD = metaUSD.minus(retiroUSD);
      expect(metaUSD.toNumber()).toBe(75);

      // Anulación del retiro (reversión en trigger: suma monto_impacto_auxiliar)
      metaUSD = metaUSD.plus(retiroUSD);
      expect(metaUSD.toNumber()).toBe(100);
    });
  });

  describe('3. Deudas y Amortizaciones Multimoneda', () => {
    it('debe calcular el monto máximo para liquidar deuda en USD pagando desde cuenta en VES', () => {
      const deudaUSD = new Decimal(120);
      const tasa = new Decimal(50); // 50 VES/USD
      
      const maximoVES = deudaUSD.times(tasa);
      expect(maximoVES.toNumber()).toBe(6000);
    });

    it('debe calcular amortización en USD desde cuenta en VES y restar proporcional a la deuda', () => {
      let deudaUSD = new Decimal(100);
      const tasa = new Decimal(50);
      const pagoVES = new Decimal(2500); // amortiza 50 USD

      const impactoUSD = pagoVES.dividedBy(tasa);
      deudaUSD = Decimal.max(0, deudaUSD.minus(impactoUSD));

      expect(deudaUSD.toNumber()).toBe(50);
    });

    it('al anular el pago de una deuda debe restituir el saldo_pendiente', () => {
      let deudaUSD = new Decimal(50);
      const impactoUSD = new Decimal(30);

      // Anulación de pago: se incrementa saldo pendiente
      deudaUSD = deudaUSD.plus(impactoUSD);
      expect(deudaUSD.toNumber()).toBe(80);
    });
  });

  describe('4. Dashboard y Normalización Multimoneda', () => {
    it('debe sumar ahorros y deudas normalizados a USD cuando coexisten registros en USD y VES', () => {
      const tasa = new Decimal(50);
      const metas = [
        { moneda: 'USD', monto_actual: 200 },
        { moneda: 'VES', monto_actual: 5000 } // 5000 / 50 = 100 USD
      ];

      const totalAhorrosUSD = metas.reduce((acc, m) => {
        const monto = new Decimal(m.monto_actual);
        if (m.moneda === 'VES') {
          return acc.plus(monto.dividedBy(tasa));
        }
        return acc.plus(monto);
      }, new Decimal(0));

      expect(totalAhorrosUSD.toNumber()).toBe(300);
    });

    it('debe calcular balance neto agregando saldo USD fijo + VES en USD', () => {
      const cuentas = [
        { moneda: 'USD', saldo_cache: 1500, activa: true },
        { moneda: 'VES', saldo_cache: 50000, activa: true },
        { moneda: 'USD', saldo_cache: 300, activa: false } // inactiva no debe entrar
      ];
      const tasa = new Decimal(50);

      const usdFijo = cuentas
        .filter(c => c.activa && c.moneda === 'USD')
        .reduce((acc, c) => acc.plus(c.saldo_cache), new Decimal(0));

      const vesTotal = cuentas
        .filter(c => c.activa && c.moneda === 'VES')
        .reduce((acc, c) => acc.plus(c.saldo_cache), new Decimal(0));

      const vesEnUsd = vesTotal.dividedBy(tasa);
      const balanceNeto = usdFijo.plus(vesEnUsd);

      expect(usdFijo.toNumber()).toBe(1500);
      expect(vesTotal.toNumber()).toBe(50000);
      expect(vesEnUsd.toNumber()).toBe(1000);
      expect(balanceNeto.toNumber()).toBe(2500);
    });

    it('las transferencias internas no deben alterar los ingresos ni los gastos del mes', () => {
      const transacciones = [
        { tipo: 'ingreso', monto_usd: 1000 },
        { tipo: 'gasto', monto_usd: 350 },
        // Traspaso interno de 200 USD: pierna salida y pierna entrada
        { tipo: 'transferencia', transferencia_direccion: 'salida', monto_usd: 200 },
        { tipo: 'transferencia', transferencia_direccion: 'entrada', monto_usd: 200 }
      ];

      // Computo del Dashboard P&L
      const ingresosMes = transacciones
        .filter(t => t.tipo === 'ingreso')
        .reduce((acc, t) => acc + t.monto_usd, 0);

      const gastosMes = transacciones
        .filter(t => t.tipo === 'gasto')
        .reduce((acc, t) => acc + t.monto_usd, 0);

      expect(ingresosMes).toBe(1000);
      expect(gastosMes).toBe(350);
    });

    it('traspaso entre cuentas en VES (BANCARIBE -> BANCO DE VENEZUELA) actualiza saldos correctamente', () => {
      // Simulación del comportamiento del trigger actualizar_saldo_cuenta() y registrar_transferencia()
      const cuentaOrigen = { id: 'cta-bancaribe', nombre: 'BANCARIBE', moneda: 'VES', saldo_cache: new Decimal(10000) };
      const cuentaDestino = { id: 'cta-bdv', nombre: 'BANCO DE VENEZUELA', moneda: 'VES', saldo_cache: new Decimal(2000) };
      const monto = new Decimal(5000);
      const descripcion = 'Gasolina';

      // Validación previa
      expect(cuentaOrigen.id).not.toBe(cuentaDestino.id);
      expect(monto.toNumber()).toBeGreaterThan(0);
      expect(cuentaOrigen.saldo_cache.greaterThanOrEqualTo(monto)).toBe(true);

      // Movimientos generados por la RPC
      const txSalida = {
        cuenta_id: cuentaOrigen.id,
        cuenta_destino_id: cuentaDestino.id,
        tipo: 'transferencia',
        transferencia_direccion: 'salida',
        monto_original: monto,
        moneda_original: 'VES',
        descripcion
      };

      const txEntrada = {
        cuenta_id: cuentaDestino.id,
        cuenta_destino_id: cuentaOrigen.id,
        tipo: 'transferencia',
        transferencia_direccion: 'entrada',
        monto_original: monto,
        moneda_original: 'VES',
        descripcion
      };

      // Simulación de actualización de saldos según actualizar_saldo_cuenta
      const actualizarSaldo = (saldoPrevio: Decimal, tx: typeof txSalida) => {
        if (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'salida') {
          return saldoPrevio.minus(tx.monto_original);
        } else if (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'entrada') {
          return saldoPrevio.plus(tx.monto_original);
        }
        return saldoPrevio;
      };

      cuentaOrigen.saldo_cache = actualizarSaldo(cuentaOrigen.saldo_cache, txSalida);
      cuentaDestino.saldo_cache = actualizarSaldo(cuentaDestino.saldo_cache, txEntrada);

      // Verificación de saldos
      expect(cuentaOrigen.saldo_cache.toNumber()).toBe(5000);
      expect(cuentaDestino.saldo_cache.toNumber()).toBe(7000);
    });
  });

});
