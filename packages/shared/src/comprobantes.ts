import { roundMoney } from './money';

export interface ComprobanteExtraido {
  bancoEmisor?: string;
  bancoDestino?: string;
  beneficiario: string;
  cedulaRif?: string;
  telefonoDestino?: string;
  monto: number;
  moneda: 'USD' | 'VES';
  referencia: string;
  concepto?: string;
  fecha?: string;
  categoriaSugerida: string;
  confianza: number; // 0..1
}

/**
 * Categorizador contextual según el concepto o beneficiario del pago.
 */
function inferirCategoria(concepto: string, beneficiario: string): string {
  const texto = `${concepto} ${beneficiario}`.toLowerCase();

  if (texto.includes('gas') || texto.includes('luz') || texto.includes('cantv') || texto.includes('corpoelec') || texto.includes('agua') || texto.includes('hidro')) {
    return 'Servicios Básicos';
  }
  if (texto.includes('farmatodo') || texto.includes('farmacia') || texto.includes('salud') || texto.includes('medico') || texto.includes('clinica')) {
    return 'Salud y Farmacia';
  }
  if (texto.includes('automercado') || texto.includes('plaza') || texto.includes('supermercado') || texto.includes('almuerzo') || texto.includes('cena') || texto.includes('comida') || texto.includes('panaderia')) {
    return 'Alimentación';
  }
  if (texto.includes('alquiler') || texto.includes('condominio') || texto.includes('casa') || texto.includes('apartamento')) {
    return 'Vivienda y Hogar';
  }
  if (texto.includes('gasolina') || texto.includes('taller') || texto.includes('repuesto') || texto.includes('taxi') || texto.includes('ridery') || texto.includes('yummy')) {
    return 'Transporte';
  }
  return 'Gastos Generales';
}

/**
 * Parser inteligente de comprobantes de Pago Móvil y transferencias venezolanas
 * Compatible con: Bancaribe, Banco de Venezuela (BDV), Banesco, Mercantil, Provincial, etc.
 */
export function parsearComprobanteTexto(textoOCR: string): ComprobanteExtraido {
  const lineas = textoOCR.split('\n').map(l => l.trim()).filter(Boolean);
  const textoCompleto = textoOCR.replace(/\r/g, '');

  let bancoEmisor = '';
  let bancoDestino = '';
  let beneficiario = '';
  let cedulaRif = '';
  let telefonoDestino = '';
  let monto = 0;
  let moneda: 'USD' | 'VES' = 'VES';
  let referencia = '';
  let concepto = '';
  let fecha = '';

  // 1. Detectar Banco Emisor
  if (/bancaribe/i.test(textoCompleto)) {
    bancoEmisor = 'Bancaribe';
  } else if (/banco de venezuela|bdv/i.test(textoCompleto)) {
    bancoEmisor = 'Banco de Venezuela';
  } else if (/banesco/i.test(textoCompleto)) {
    bancoEmisor = 'Banesco';
  } else if (/mercantil/i.test(textoCompleto)) {
    bancoEmisor = 'Mercantil';
  } else if (/provincial|bbva/i.test(textoCompleto)) {
    bancoEmisor = 'BBVA Provincial';
  } else if (/bancamiga/i.test(textoCompleto)) {
    bancoEmisor = 'Bancamiga';
  } else if (/bnc/i.test(textoCompleto)) {
    bancoEmisor = 'BNC';
  }

  // 2. Extraer Monto
  // Ejemplo 1: "Monto: Bs. 5.385,24"
  // Ejemplo 2: "111.000,00 Bs"
  let matchMonto = textoCompleto.match(/(?:Monto|Importe|Total)[\s:]*(?:Bs\.?|VES|\$)?\s*([0-9\.\,]+)/i);
  if (!matchMonto) {
    // Buscar monto aislado seguido de Bs o precedido por Bs (ej: 111.000,00 Bs)
    matchMonto = textoCompleto.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s*(?:Bs\.?|VES)/i);
  }

  if (matchMonto && matchMonto[1]) {
    let rawMonto = matchMonto[1].trim();
    if (rawMonto.includes('.') && rawMonto.includes(',')) {
      rawMonto = rawMonto.replace(/\./g, '').replace(',', '.');
    } else if (rawMonto.includes(',')) {
      rawMonto = rawMonto.replace(',', '.');
    }
    const parsed = parseFloat(rawMonto);
    if (!isNaN(parsed) && parsed > 0) {
      monto = roundMoney(parsed, 2).toNumber();
    }
  }

  // Detectar Moneda
  if (/(?:Bs\.?|VES|Bol[ií]vares)/i.test(textoCompleto)) {
    moneda = 'VES';
  } else if (/\$|USD|D[oó]lares/i.test(textoCompleto)) {
    moneda = 'USD';
  }

  // 3. Extraer Referencia u Operación
  // Ejemplo: "Referencia: 2029225683" o "Operación: 007662935879"
  const regexRef = /(?:Referencia|Operaci[oó]n|Nro\.?\s*Referencia|Ref\.?|Secuencia)[\s:]*([0-9]{4,16})/i;
  const matchRef = textoCompleto.match(regexRef);
  if (matchRef && matchRef[1]) {
    referencia = matchRef[1].trim();
  }

  // 4. Extraer Nombre de Beneficiario
  // Ejemplo: "Nombre del beneficiario: Gas Comunal" o "Beneficiario: Gas Comunal" o "Destino: Juan Perez"
  const regexBenefExacto = /(?:Nombre del beneficiario|Nombre beneficiario)[\s:]+([A-Za-z0-9áéíóúÁÉÍÓÚñÑ\.\s]{3,40})/i;
  const matchBenefExacto = textoCompleto.match(regexBenefExacto);

  if (matchBenefExacto && matchBenefExacto[1]) {
    beneficiario = matchBenefExacto[1].split('\n')[0].trim();
  } else {
    const regexBenef = /(?:Beneficiario|Destinatario|Para)[\s:]+([A-Za-z0-9áéíóúÁÉÍÓÚñÑ\.\s]{3,40})/i;
    const matchBenef = textoCompleto.match(regexBenef);
    if (matchBenef && matchBenef[1]) {
      beneficiario = matchBenef[1].split('\n')[0].trim();
    }
  }

  // 5. Extraer Concepto
  // Ejemplo: "Concepto: pago gas"
  const regexConcepto = /(?:Concepto|Motivo|Descripci[oó]n)[\s:]+([A-Za-z0-9áéíóúÁÉÍÓÚñÑ\.\s]{2,50})/i;
  const matchConcepto = textoCompleto.match(regexConcepto);
  if (matchConcepto && matchConcepto[1]) {
    concepto = matchConcepto[1].split('\n')[0].trim();
  }

  // 6. Extraer Cédula o RIF
  // Ejemplo: "Identificación del beneficiario: V-30600818" o "Identificación: 8287859"
  const regexId = /(?:Identificaci[oó]n(?: del beneficiario)?|C\.?I\.?|RIF|C[eé]dula)[\s:]*([VvEeJjGgP]?[-.\s]?[0-9]{6,10})/i;
  const matchId = textoCompleto.match(regexId);
  if (matchId && matchId[1]) {
    cedulaRif = matchId[1].replace(/\s+/g, '').toUpperCase();
  }

  // 7. Extraer Banco Destino
  // Ejemplo: "Banco del beneficiario: BANCO DE VENEZUELA" o "Banco: 0105 - BANCO MERCANTIL"
  const regexBancoDest = /(?:Banco(?: del beneficiario| receptor| destino)?|Destino)[\s:]+(?:[0-9]{4}\s*-\s*)?([A-Za-z\s]{4,35})/i;
  const matchBancoDest = textoCompleto.match(regexBancoDest);
  if (matchBancoDest && matchBancoDest[1]) {
    bancoDestino = matchBancoDest[1].split('\n')[0].trim();
  }

  // 8. Extraer Teléfono
  // Ejemplo: "Celular de destino: 04221007580" o "Destino: 04248610645"
  const regexTel = /(?:Celular de destino|Tel[eé]fono destino|Destino)[\s:]*([0-9]{10,12})/i;
  const matchTel = textoCompleto.match(regexTel);
  if (matchTel && matchTel[1]) {
    telefonoDestino = matchTel[1].trim();
  }

  // Si beneficiario quedó vacío pero tenemos teléfono y banco, armar alias descriptivo
  if (!beneficiario && telefonoDestino) {
    beneficiario = `Pago Móvil ${telefonoDestino}${bancoDestino ? ` (${bancoDestino})` : ''}`;
  }

  // 9. Extraer Fecha
  // Ejemplo: "Fecha: 09-11-2026 10:56 PM"
  const regexFecha = /(?:Fecha|Hora)[\s:]+([0-9]{2}[-\/][0-9]{2}[-\/][0-9]{4}(?:\s+[0-9]{1,2}:[0-9]{2}(?:\s*[APap][Mm])?)?)/i;
  const matchFecha = textoCompleto.match(regexFecha);
  if (matchFecha && matchFecha[1]) {
    fecha = matchFecha[1].trim();
  }

  // Categoría sugerida
  const categoriaSugerida = inferirCategoria(concepto, beneficiario);

  // Nivel de confianza
  let camposDetectados = 0;
  if (monto > 0) camposDetectados++;
  if (referencia) camposDetectados++;
  if (beneficiario) camposDetectados++;
  if (bancoEmisor) camposDetectados++;
  const confianza = roundMoney(camposDetectados / 4, 2).toNumber();

  return {
    bancoEmisor: bancoEmisor || undefined,
    bancoDestino: bancoDestino || undefined,
    beneficiario: beneficiario || 'Destinatario no especificado',
    cedulaRif: cedulaRif || undefined,
    telefonoDestino: telefonoDestino || undefined,
    monto,
    moneda,
    referencia: referencia || 'S/REF',
    concepto: concepto || undefined,
    fecha: fecha || undefined,
    categoriaSugerida,
    confianza
  };
}
