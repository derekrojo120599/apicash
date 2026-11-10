import { describe, it, expect } from 'vitest';
import { parsearComprobanteTexto } from '@apicash/shared';

describe('Módulo de Extracción y Parsing de Comprobantes de Pago Móvil', () => {
  it('debe extraer con precisión 100% los datos del Pago Móvil real de Bancaribe', () => {
    const textoBancaribeReal = `
      BANCARIBE
      ¡Operación exitosa!

      Tipo de operación: Pago Móvil
      Emisor: Rojo Paredes Derek David
      Fecha: 09-11-2026 10:56 PM

      Monto: Bs. 5.385,24
      Referencia: 2029225683
      Celular de origen: 04149774374
      Celular de destino: 04221007580
      Banco del beneficiario: BANCO DE VENEZUELA
      Identificación del beneficiario: V-30600818
      Nombre del beneficiario: Gas Comunal
      Concepto: pago gas
      Procesado por Suiche 7B
    `;

    const resultado = parsearComprobanteTexto(textoBancaribeReal);

    expect(resultado.bancoEmisor).toBe('Bancaribe');
    expect(resultado.bancoDestino).toBe('BANCO DE VENEZUELA');
    expect(resultado.beneficiario).toBe('Gas Comunal');
    expect(resultado.monto).toBe(5385.24);
    expect(resultado.moneda).toBe('VES');
    expect(resultado.referencia).toBe('2029225683');
    expect(resultado.cedulaRif).toBe('V-30600818');
    expect(resultado.telefonoDestino).toBe('04221007580');
    expect(resultado.concepto).toBe('pago gas');
    expect(resultado.fecha).toBe('09-11-2026 10:56 PM');
    expect(resultado.categoriaSugerida).toBe('Servicios Básicos');
    expect(resultado.confianza).toBe(1.0);
  });

  it('debe extraer con precisión 100% los datos del Pago Móvil real de BDV', () => {
    const textoBDVReal = `
      Comprobante de operación
      PagomóvilBDV Personas

      111.000,00 Bs

      Fecha: 14/10/2026
      Operación: 007662935879
      Identificación: 8287859
      Origen: 0102****3688
      Destino: 04248610645
      Banco: 0105 - BANCO MERCANTIL
      Concepto: pago
    `;

    const resultado = parsearComprobanteTexto(textoBDVReal);

    expect(resultado.bancoEmisor).toBe('Banco de Venezuela');
    expect(resultado.bancoDestino).toBe('BANCO MERCANTIL');
    expect(resultado.monto).toBe(111000.00);
    expect(resultado.moneda).toBe('VES');
    expect(resultado.referencia).toBe('007662935879');
    expect(resultado.cedulaRif).toBe('8287859');
    expect(resultado.telefonoDestino).toBe('04248610645');
    expect(resultado.beneficiario).toContain('04248610645');
    expect(resultado.concepto).toBe('pago');
    expect(resultado.fecha).toBe('14/10/2026');
  });
});
