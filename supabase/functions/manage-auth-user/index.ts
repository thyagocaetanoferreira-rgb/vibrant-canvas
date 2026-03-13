import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, email, password, usuario_id, auth_id } = await req.json();

    if (action === "create") {
      // Create auth user with admin API (auto-confirms email)
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (authError) throw authError;

      const newAuthId = authData.user.id;

      // Link auth_id to usuarios table
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ auth_id: newAuthId })
        .eq("id", usuario_id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, auth_id: newAuthId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_password") {
      if (!auth_id) throw new Error("auth_id é obrigatório para atualizar senha");

      const { error } = await supabase.auth.admin.updateUserById(auth_id, {
        password,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_email") {
      if (!auth_id) throw new Error("auth_id é obrigatório para atualizar email");

      const { error } = await supabase.auth.admin.updateUserById(auth_id, {
        email,
        email_confirm: true,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
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
