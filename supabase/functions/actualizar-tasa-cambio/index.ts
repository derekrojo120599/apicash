import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

interface TasaFuente {
  nombre: string;
  extractor: (data: any) => number | null;
}

// Configuración de fuentes de tasa disponibles.
// Ajustá los extractores según la respuesta real de la API de Cotizave.
const FUENTES: TasaFuente[] = [
  {
    nombre: 'Cotizave API - Mediana P2P',
    extractor: (data: any) => {
      const valor = data.index?.p2p_median;
      return valor ? Number(valor) : null;
    }
  },
  {
    nombre: 'Banco Central de Venezuela',
    extractor: (data: any) => {
      // TODO: ajustar según la estructura real de Cotizave para la tasa BCV.
      // Ejemplos posibles:
      // const valor = data.index?.bcv;
      // const valor = data.rates?.bcv?.rate;
      // const valor = data.bcv;
      const valor = data.index?.bcv;
      return valor ? Number(valor) : null;
    }
  }
];

Deno.serve(async (req) => {
  try {
    // 1. Validar autorización del cron job usando nuestro secreto explícito
    const authHeader = req.headers.get("Authorization");
    const expectedKey = Deno.env.get("CRON_SECRET");
    
    if (!expectedKey) {
      throw new Error("El secreto CRON_SECRET no está configurado en las variables de entorno de Supabase.");
    }

    if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Obtener la tasa de cambio de la API de Cotizave
    const cotizaveApiKey = Deno.env.get("COTIZAVE_API_KEY");
    
    if (!cotizaveApiKey) {
      throw new Error("Falta la variable de entorno COTIZAVE_API_KEY.");
    }

    const response = await fetch("https://api.cotizave.com/v1/fx/rates", {
      headers: {
        "X-API-Key": cotizaveApiKey,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`Error de Cotizave API: ${response.status} - ${errData}`);
    }

    const data = await response.json();

    // 3. Extraer todas las tasas configuradas
    const tasasInsertar: { tasa: number; fuente: string }[] = [];

    for (const fuente of FUENTES) {
      const tasa = fuente.extractor(data);
      if (tasa && !isNaN(tasa) && tasa > 0) {
        tasasInsertar.push({ tasa, fuente: fuente.nombre });
      } else {
        console.warn(`No se pudo extraer la tasa para la fuente: ${fuente.nombre}`);
      }
    }

    if (tasasInsertar.length === 0) {
      throw new Error("No se pudo obtener ninguna tasa válida de la API de Cotizave.");
    }

    // 4. Conectar a Supabase usando Service Role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { error: dbError } = await supabase
      .from('tasas_cambio')
      .insert(tasasInsertar);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ 
      success: true, 
      tasas: tasasInsertar 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("Error al actualizar la tasa:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" } 
    });
  }
});
