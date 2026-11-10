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

  it('debe extraer datos de un comprobante de Banesco o BDV estándar', () => {
    const textoBDV = `
      Banco de Venezuela
      Pago Móvil BDV
      Operación Exitosa
      Referencia: 84729103
      Fecha: 10/11/2026
      Monto: Bs. 450,00
      Beneficiario: Farmatodo
      Concepto: Medicinas
    `;

    const resultado = parsearComprobanteTexto(textoBDV);

    expect(resultado.bancoEmisor).toBe('Banco de Venezuela');
    expect(resultado.beneficiario).toBe('Farmatodo');
    expect(resultado.monto).toBe(450.0);
    expect(resultado.referencia).toBe('84729103');
    expect(resultado.categoriaSugerida).toBe('Salud y Farmacia');
  });
});
