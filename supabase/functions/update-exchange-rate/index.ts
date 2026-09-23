import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

interface ExchangeRateSource {
  name: string;
  extractors: ((data: unknown) => number | null)[];
}

interface RateInsert {
  tasa: number;
  fuente: string;
}

interface ErrorContext {
  endpoint?: string;
  cotizaveResponse?: unknown;
  extractedRates?: RateInsert[];
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

function asPositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(num) && num > 0) return num;
  return null;
}

// Cotizave response shape may vary across endpoints and API versions,
// so each source tries multiple extraction paths.
const SOURCES: ExchangeRateSource[] = [
  {
    name: 'Cotizave API - Mediana P2P',
    extractors: [
      (data) => asPositiveNumber(getPath(data, 'index.p2p_median')),
      (data) => asPositiveNumber(getPath(data, 'rates.p2p.median')),
      (data) => asPositiveNumber(getPath(data, 'rates.p2p.rate')),
      (data) => asPositiveNumber(getPath(data, 'p2p_median')),
      (data) => asPositiveNumber(getPath(data, 'p2p.median')),
    ]
  },
  {
    name: 'Banco Central de Venezuela',
    extractors: [
      (data) => asPositiveNumber(getPath(data, 'index.bcv')),
      (data) => asPositiveNumber(getPath(data, 'rates.bcv.rate')),
      (data) => asPositiveNumber(getPath(data, 'rates.bcv')),
      (data) => asPositiveNumber(getPath(data, 'bcv')),
    ]
  },
  {
    name: 'EnParaleloVzla',
    extractors: [
      (data) => asPositiveNumber(getPath(data, 'index.paralelo')),
      (data) => asPositiveNumber(getPath(data, 'rates.paralelo.rate')),
      (data) => asPositiveNumber(getPath(data, 'rates.paralelo')),
      (data) => asPositiveNumber(getPath(data, 'paralelo')),
    ]
  },
  {
    name: 'Binance P2P',
    extractors: [
      (data) => asPositiveNumber(getPath(data, 'index.binance')),
      (data) => asPositiveNumber(getPath(data, 'rates.binance.rate')),
      (data) => asPositiveNumber(getPath(data, 'rates.binance')),
      (data) => asPositiveNumber(getPath(data, 'binance')),
    ]
  },
  {
    name: 'DolarToday',
    extractors: [
      (data) => asPositiveNumber(getPath(data, 'index.dolartoday')),
      (data) => asPositiveNumber(getPath(data, 'rates.dolartoday.rate')),
      (data) => asPositiveNumber(getPath(data, 'rates.dolartoday')),
      (data) => asPositiveNumber(getPath(data, 'dolartoday')),
    ]
  }
];

async function fetchCotizave(path: string, apiKey: string): Promise<unknown> {
  const url = `https://api.cotizave.com${path}`;
  const response = await fetch(url, {
    headers: {
      "X-API-Key": apiKey,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    const errData = await response.text();
    throw new Error(`Cotizave API ${path}: ${response.status} - ${errData}`);
  }

  return response.json();
}

function extractRates(data: unknown): RateInsert[] {
  const ratesToInsert: RateInsert[] = [];

  for (const source of SOURCES) {
    let rate: number | null = null;
    for (const extractor of source.extractors) {
      const value = extractor(data);
      if (value != null) {
        rate = value;
        break;
      }
    }

    if (rate != null) {
      ratesToInsert.push({ tasa: rate, fuente: source.name });
      console.log(`Rate extracted for "${source.name}": ${rate}`);
    } else {
      console.warn(`Could not extract rate for source: ${source.name}`);
    }
  }

  return ratesToInsert;
}

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}

async function sendErrorEmail(error: Error, context: ErrorContext): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const notificationEmail = Deno.env.get("NOTIFICATION_EMAIL");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

  if (!resendApiKey || !notificationEmail) {
    console.warn("Email notification not configured. Set RESEND_API_KEY and NOTIFICATION_EMAIL.");
    return;
  }

  const projectRef = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1] || "unknown";
  const date = new Date().toISOString();

  const extractedRatesHtml = context.extractedRates && context.extractedRates.length > 0
    ? `<p><strong>Tasas extraídas:</strong> ${context.extractedRates.map(r => `${r.fuente}: ${r.tasa}`).join(", ")}</p>`
    : "";

  const responseHtml = context.cotizaveResponse
    ? `<p><strong>Respuesta de Cotizave:</strong></p><pre>${JSON.stringify(context.cotizaveResponse, null, 2)}</pre>`
    : "";

  const endpointHtml = context.endpoint
    ? `<p><strong>Endpoint usado:</strong> ${context.endpoint}</p>`
    : "";

  const html = `
    <h2>Error al actualizar la tasa diaria - Apicasch</h2>
    <p><strong>Fecha:</strong> ${date}</p>
    <p><strong>Proyecto:</strong> ${projectRef}</p>
    <p><strong>Error:</strong> ${error.message}</p>
    ${endpointHtml}
    ${extractedRatesHtml}
    ${responseHtml}
    <p>Revisa los logs en Supabase Dashboard para más detalles.</p>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `Apicasch <${fromEmail}>`,
        to: notificationEmail,
        subject: "[Apicasch] Falló la actualización diaria de la tasa",
        html
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Error sending notification email:", response.status, errText);
    } else {
      const result = await response.json();
      console.log("Notification email sent:", result.id);
    }
  } catch (err: unknown) {
    console.error("Exception sending notification email:", toError(err).message);
  }
}

Deno.serve(async (req) => {
  const errorContext: ErrorContext = {};

  try {
    const cronSecretHeader = req.headers.get("X-CRON-Secret");
    const expectedKey = Deno.env.get("CRON_SECRET");

    if (!expectedKey) {
      throw new Error("CRON_SECRET is not configured in Supabase environment variables.");
    }

    if (cronSecretHeader !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const cotizaveApiKey = Deno.env.get("COTIZAVE_API_KEY");

    if (!cotizaveApiKey) {
      throw new Error("COTIZAVE_API_KEY environment variable is missing.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
    }

    let data: unknown;
    let endpointUsed = '/v1/fx/rates';

    try {
      data = await fetchCotizave('/v1/fx/rates', cotizaveApiKey);
    } catch (ratesErr: unknown) {
      const ratesError = toError(ratesErr);
      console.warn("Failed /v1/fx/rates, trying fallback /v1/fx/index:", ratesError.message);
      endpointUsed = '/v1/fx/index';
      data = await fetchCotizave('/v1/fx/index', cotizaveApiKey);
    }

    errorContext.endpoint = endpointUsed;
    errorContext.cotizaveResponse = data;

    console.log(`Cotizave response (${endpointUsed}):`, JSON.stringify(data));

    const ratesToInsert = extractRates(data);
    errorContext.extractedRates = ratesToInsert;

    if (ratesToInsert.length === 0) {
      throw new Error("Could not extract any valid rate from Cotizave API. Check logs for response shape.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Traer las últimas tasas insertadas (ej. las últimas 10) para comparar el estado actual
    const { data: recentRates, error: recentError } = await supabase
      .from('tasas_cambio')
      .select('tasa, fuente')
      .order('fecha', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error("Error checking recent rates:", recentError.message);
      throw recentError;
    }

    // Mapa con la última tasa conocida de cada fuente
    const lastKnownRates = new Map<string, number>();
    for (const row of (recentRates || [])) {
      if (!lastKnownRates.has(row.fuente as string)) {
        lastKnownRates.set(row.fuente as string, Number(row.tasa));
      }
    }

    // Solo insertamos si la tasa cambió respecto al último registro conocido
    const newRates = ratesToInsert.filter(r => {
      const lastRate = lastKnownRates.get(r.fuente);
      return lastRate === undefined || lastRate !== r.tasa;
    });

    if (newRates.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        message: "Rates have not changed since the last check. Skipped insertion."
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { error: dbError } = await supabase
      .from('tasas_cambio')
      .insert(newRates);

    if (dbError) {
      console.error("Error inserting into tasas_cambio:", dbError.message, dbError.code, dbError.details);
      throw dbError;
    }

    return new Response(JSON.stringify({
      success: true,
      endpoint: endpointUsed,
      tasas: newRates
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: unknown) {
    const error = toError(err);
    console.error("Error updating rate:", error.message);
    await sendErrorEmail(error, errorContext);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
