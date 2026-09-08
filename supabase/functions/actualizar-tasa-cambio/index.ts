import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

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
    
    // Extraemos directamente la Mediana P2P que Cotizave provee en su índice
    const p2pMedian = data.index?.p2p_median;
    
    if (!p2pMedian) {
      throw new Error("La API de Cotizave no retornó la mediana P2P esperada.");
    }

    const tasaFinal = Number(p2pMedian);

    if (isNaN(tasaFinal) || tasaFinal <= 0) {
      throw new Error("La tasa obtenida no es válida: " + tasaFinal);
    }

    // 3. Conectar a Supabase usando Service Role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { error: dbError } = await supabase
      .from('tasas_cambio')
      .insert([
        { 
          tasa: tasaFinal, 
          fuente: 'Cotizave API - Mediana P2P' 
        }
      ]);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true, tasa: tasaFinal, provider: 'Cotizave' }), { 
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
