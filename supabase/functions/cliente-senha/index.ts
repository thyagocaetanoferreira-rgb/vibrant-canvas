import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple XOR-based encrypt/decrypt using the key
function xorCipher(text: string, key: string): string {
  const result: number[] = [];
  for (let i = 0; i < text.length; i++) {
    result.push(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(String.fromCharCode(...result));
}

function xorDecipher(encoded: string, key: string): string {
  const decoded = atob(encoded);
  const result: number[] = [];
  for (let i = 0; i < decoded.length; i++) {
    result.push(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return String.fromCharCode(...result);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, cliente_id, senha, usuario_id } = await req.json();

    if (action === "encrypt") {
      const encrypted = xorCipher(senha, encryptionKey);
      const { error } = await supabase
        .from("clientes")
        .update({ senha_sistema: encrypted })
        .eq("id", cliente_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "decrypt") {
      const { data, error } = await supabase
        .from("clientes")
        .select("senha_sistema")
        .eq("id", cliente_id)
        .single();

      if (error) throw error;
      if (!data?.senha_sistema) {
        return new Response(
          JSON.stringify({ senha: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const decrypted = xorDecipher(data.senha_sistema, encryptionKey);

      // Log de auditoria
      await supabase.from("audit_log").insert({
        usuario_id,
        cliente_id,
        acao: "senha_revelada",
        detalhes: { timestamp: new Date().toISOString() },
      });

      return new Response(
        JSON.stringify({ senha: decrypted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
