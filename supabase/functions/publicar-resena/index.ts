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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }
}

const TX_URL = Deno.env.get("TX_SUPABASE_URL") || "https://zxqmpylxvxnktqthvigl.supabase.co"

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado. Se requiere iniciar sesión para publicar una reseña." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim()
    if (!token) {
      return new Response(JSON.stringify({ error: "Token de autenticación vacío." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const coreUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const coreAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const coreServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    const coreAuthClient = createClient(coreUrl, coreAnonKey)
    const { data: userData, error: userError } = await coreAuthClient.auth.getUser(token)

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada. Inicia sesión nuevamente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const usuarioId = userData.user.id

    const body = await req.json().catch(() => ({}))
    const productoId = Number(body.producto_id || body.productoId)
    const calificacion = Number(body.calificacion)
    const comentario = body.comentario ? String(body.comentario).trim() : null
    const titulo = body.titulo ? String(body.titulo).trim() : null
    const ciudad = body.ciudad ? String(body.ciudad).trim() : null

    if (!productoId || isNaN(productoId)) {
      return new Response(JSON.stringify({ error: "El producto es inválido o no existe." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return new Response(JSON.stringify({ error: "La calificación debe ser un valor entre 1 y 5 estrellas." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 1. Verificar compra contra TX enviando el token del usuario a verificar-compra
    let haComprado = false
    try {
      const respVerificacion = await fetch(`${TX_URL}/functions/v1/verificar-compra?producto_id=${productoId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (respVerificacion.ok) {
        const datosVerificacion = await respVerificacion.json()
        haComprado = Boolean(datosVerificacion.compro)
      } else {
        console.error("Fallo llamada a verificar-compra en TX:", respVerificacion.status)
      }
    } catch (errTx) {
      console.error("Error conectando con TX para verificar compra:", errTx)
      return new Response(JSON.stringify({ error: "No se pudo verificar el historial de compras en el servidor." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (!haComprado) {
      return new Response(JSON.stringify({
        error: "Solo los clientes que hayan adquirido este producto en la tienda pueden compartir su valoración y reseña."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 2. Registrar la reseña con compra_verificada = true en Core mediante RPC con service_role
    const coreAdmin = createClient(coreUrl, coreServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: resenaId, error: rpcError } = await coreAdmin.rpc("guardar_resena", {
      p_producto_id: productoId,
      p_calificacion: calificacion,
      p_comentario: comentario,
      p_titulo: titulo,
      p_nombre_autor: null, // toma el nombre del perfil en Core
      p_ciudad: ciudad,
      p_compra_verificada: true,
      p_usuario_id: usuarioId
    })

    if (rpcError) {
      console.error("Error ejecutando guardar_resena:", rpcError)
      return new Response(JSON.stringify({ error: rpcError.message || "Error al registrar la reseña en la base de datos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      resena_id: resenaId,
      mensaje: "Reseña verificada y publicada con éxito."
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error interno del servidor"
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
