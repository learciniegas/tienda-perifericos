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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ compro: false, error: "No autorizado. Se requiere token de sesión." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim()
    if (!token) {
      return new Response(JSON.stringify({ compro: false, error: "Token vacío." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const coreClient = createClient(CORE_URL, CORE_ANON_KEY)
    const { data: userData, error: userError } = await coreClient.auth.getUser(token)

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ compro: false, error: "Sesión inválida o expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const usuarioId = userData.user.id

    let productoId: number | null = null
    if (req.method === "GET") {
      const url = new URL(req.url)
      const param = url.searchParams.get("producto_id") || url.searchParams.get("productoId")
      productoId = param ? Number(param) : null
    } else {
      const body = await req.json().catch(() => ({}))
      productoId = Number(body.producto_id || body.productoId)
    }

    if (!productoId || isNaN(productoId)) {
      return new Response(JSON.stringify({ compro: false, error: "Parámetro producto_id requerido y numérico." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const txUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const txServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const txAdmin = createClient(txUrl, txServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data, error } = await txAdmin
      .from("pedidos")
      .select("id, detalles_pedido!inner(producto_id)")
      .eq("usuario_id", usuarioId)
      .eq("detalles_pedido.producto_id", productoId)
      .limit(1)

    if (error) {
      console.error("Error consultando compras en TX:", error)
      return new Response(JSON.stringify({ compro: false, error: "Error consultando historial de pedidos." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const compro = Array.isArray(data) && data.length > 0

    return new Response(JSON.stringify({ compro, producto_id: productoId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error interno del servidor"
    return new Response(JSON.stringify({ compro: false, error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
