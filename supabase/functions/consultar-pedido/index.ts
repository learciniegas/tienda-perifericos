import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^https:\/\/.*\.vercel\.app$/,
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || ""
  const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((pat) => pat.test(origin))
  const allowOrigin = isAllowed ? origin : "*"

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }
}

const CORE_URL = Deno.env.get("CORE_SUPABASE_URL") || "https://gkzkllnyveybjulyouiw.supabase.co"
const CORE_ANON_KEY = Deno.env.get("CORE_SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdremtsbG55dmV5Ymp1bHlvdWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NjU0OTcsImV4cCI6MjEwOTA0MTQ5N30.XFGc0qFTugqKCfqVC44SlYoxLDumhrz_kkTyTlaJuus"

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Método no permitido." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  try {
    const url = new URL(req.url)
    const codigo = url.searchParams.get("codigo")?.trim().toUpperCase()

    if (!codigo) {
      return new Response(JSON.stringify({ error: "Parámetro 'codigo' requerido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim()
    const coreClient = createClient(CORE_URL, CORE_ANON_KEY, {
      auth: { persistSession: false }
    })

    const { data: { user }, error: authError } = await coreClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sesión no válida o expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const txUrl = Deno.env.get("SUPABASE_URL")!
    const txServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const txClient = createClient(txUrl, txServiceRoleKey, {
      auth: { persistSession: false }
    })

    // Consultar exclusivamente por código Y usuario_id verificado
    const { data: pedido, error: queryError } = await txClient
      .from("pedidos")
      .select(`
        id,
        numero_pedido,
        usuario_id,
        correo_contacto,
        total,
        subtotal,
        impuestos,
        costo_envio,
        envio_calle_principal,
        envio_numeracion,
        envio_ciudad,
        envio_referencia,
        fiscal_identificacion,
        fiscal_razon_social,
        fiscal_direccion,
        creado_en,
        estado_id,
        estados_pedido ( id, nombre, orden ),
        detalles_pedido ( producto_id, nombre_producto, precio_unitario, cantidad, subtotal_linea ),
        historial_estados_pedido ( estado_id, cambiado_en, correo_notificado_en )
      `)
      .eq("numero_pedido", codigo)
      .eq("usuario_id", user.id)
      .maybeSingle()

    if (queryError) {
      return new Response(JSON.stringify({ error: "Error al consultar el pedido.", detalle: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (!pedido) {
      return new Response(JSON.stringify({ error: `No se encontró ningún pedido con código #${codigo} en tu cuenta.` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ pedido }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Error interno del servidor."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
