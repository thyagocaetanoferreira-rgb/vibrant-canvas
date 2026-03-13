import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read CSV from request body
    const csvText = await req.text();
    const lines = csvText.trim().split("\n");
    
    // Skip header
    const dataLines = lines.slice(1);
    
    const BATCH_SIZE = 500;
    let inserted = 0;
    
    for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
      const batch = dataLines.slice(i, i + BATCH_SIZE);
      const rows = batch.map((line) => {
        const parts = line.split(",");
        const codigo_ibge = parseInt(parts[0]);
        // Nome pode conter vírgulas? Não neste CSV, mas vamos ser seguros
        const nome = parts[1];
        const latitude = parseFloat(parts[2]);
        const longitude = parseFloat(parts[3]);
        const capital = parts[4] === "1";
        const codigo_uf = parseInt(parts[5]);
        const siafi_id = parseInt(parts[6]);
        const ddd = parseInt(parts[7]);
        const fuso_horario = parts[8];

        return {
          id: codigo_ibge,
          codigo_ibge,
          nome,
          latitude,
          longitude,
          capital,
          codigo_uf,
          siafi_id,
          ddd,
          fuso_horario,
        };
      });

      const { error } = await supabase.from("municipios").upsert(rows, { onConflict: "id" });
      if (error) {
        throw new Error(`Batch ${i}: ${error.message}`);
      }
      inserted += rows.length;
    }

    return new Response(JSON.stringify({ success: true, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
