import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

Deno.serve(async (req) => {
  try {
    // 1. Validar autorización del cron job
    const authHeader = req.headers.get("Authorization");
    const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Obtener la tasa de cambio de la API de Cotizave
    const cotizaveApiKey = Deno.env.get("COTIZAVE_API_KEY");
    
    if (!cotizaveApiKey) {
      throw new Error("Falta la variable de entorno COTIZAVE_API_KEY. Créate una cuenta gratis en cotizave.com para obtenerla.");
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
    
    // Buscamos la tasa del BCV en la respuesta
    const bcvRateObj = data.rates?.find((r: any) => r.market === 'bcv');
    
    if (!bcvRateObj || !bcvRateObj.mid) {
      throw new Error("La API de Cotizave no retornó la tasa del BCV esperada.");
    }

    const tasaBCV = Number(bcvRateObj.mid);

    if (isNaN(tasaBCV) || tasaBCV <= 0) {
      throw new Error("La tasa obtenida no es válida: " + tasaBCV);
    }

    // 3. Conectar a Supabase usando Service Role para ignorar RLS e insertar
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabase = createClient(supabaseUrl!, expectedKey!);

    const { error: dbError } = await supabase
      .from('tasas_cambio')
      .insert([
        { 
          tasa: tasaBCV, 
          fuente: 'Cotizave API - BCV' 
        }
      ]);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true, tasa: tasaBCV, provider: 'Cotizave' }), { 
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
