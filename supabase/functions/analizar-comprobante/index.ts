import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OcrRequest {
  imageBase64: string; // Base64 encoded image (jpg/png)
}

// Extracts only monto, moneda, fecha and referencia from OCR text.
// banco/beneficiario/categoria are deliberately not extracted anymore.
function parsearComprobanteTexto(texto: string) {
  let monto = "0.00";
  let moneda: "USD" | "VES" = "VES";
  let referencia = "";
  let fecha = "";

  const lower = texto.toLowerCase();

  // 1. Moneda (inherente al comprobante)
  if (lower.includes("binance") || lower.includes("usdt") || lower.includes("usd") || lower.includes("$")) {
    moneda = "USD";
  }

  // 2. Monto
  // Busca patrones como "111.000,00 Bs", "Bs. 5.385,24", "50 USDT", "Monto: 100"
  const matchBs = texto.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s*(?:Bs\.?|VES)/i) ||
                  texto.match(/(?:Monto|Importe|Total)[\s:]*(?:Bs\.?|VES|\$)?\s*([0-9\.\,]+)/i);
  const matchUsdt = texto.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*(?:USDT|USD|\$)/i);

  if (matchBs && matchBs[1]) {
    let raw = matchBs[1].trim();
    if (raw.includes(".") && raw.includes(",")) {
      raw = raw.replace(/\./g, "").replace(",", ".");
    } else if (raw.includes(",")) {
      raw = raw.replace(",", ".");
    }
    monto = raw;
    moneda = "VES";
  } else if (matchUsdt) {
    monto = matchUsdt[1].trim();
    moneda = "USD";
  }

  // 3. Referencia u Operación
  const matchRef = texto.match(/(?:Operaci[oó]n|Referencia|Ref\.?|ID de orden|Secuencia)[\s:]*([0-9]{4,20})/i);
  if (matchRef && matchRef[1]) {
    referencia = matchRef[1].trim();
  }

  // 4. Fecha
  const matchFecha = texto.match(/([0-9]{2}[-\/][0-9]{2}[-\/][0-9]{4}(?:\s+[0-9]{1,2}:[0-9]{2}(?:\s*[APap][Mm])?)?)/);
  if (matchFecha && matchFecha[1]) {
    fecha = matchFecha[1].trim();
  }

  return {
    monto,
    moneda,
    referencia: referencia || "",
    fecha: fecha || new Date().toLocaleDateString("es-ES"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = (await req.json()) as OcrRequest;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Falta imageBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_VISION_API_KEY");
    let textoReconocido = "";

    // 1. Si hay clave de Gemini API configurada, usamos Gemini Flash Vision
    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

        const prompt = `Analiza esta imagen de un comprobante de pago o transferencia bancaria venezolana (Pago Móvil, Transferencia bancaria o Binance Pay).
Devuelve ÚNICAMENTE un JSON válido (sin markdown ni comillas triples) con esta estructura exacta:
{
  "monto": 123.45,
  "moneda": "VES" o "USD",
  "fecha": "fecha de la operacion tal como aparece, preferiblemente ISO yyyy-mm-dd",
  "referencia": "numero de referencia u operacion sin letras, string vacio si no aparece"
}`;

        const resGemini = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (resGemini.ok) {
          const geminiData = await resGemini.json();
          const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedJson = JSON.parse(jsonMatch[0]);
            return new Response(JSON.stringify({ ok: true, data: parsedJson, engine: "gemini-vision" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (geminiErr) {
        console.warn("Fallo Gemini Vision, recurriendo a OCR fallback:", geminiErr);
      }
    }

    // 2. Si no hay Gemini o falló, procesar por OCR de Google Vision REST si existe
    const visionKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (visionKey) {
      const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`;
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

      const resVision = await fetch(visionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: cleanBase64 },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      });

      if (resVision.ok) {
        const vData = await resVision.json();
        textoReconocido = vData.responses?.[0]?.fullTextAnnotation?.text || "";
      }
    }

    // 3. Parser estructurado de alta precisión sobre el texto detectado
    const parsed = parsearComprobanteTexto(textoReconocido);

    return new Response(JSON.stringify({ ok: true, data: parsed, rawText: textoReconocido, engine: "rule-parser" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
