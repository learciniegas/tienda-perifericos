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

const CORE_URL = Deno.env.get("CORE_SUPABASE_URL") || "https://gkzkllnyveybjulyouiw.supabase.co"
const CORE_ANON_KEY = Deno.env.get("CORE_SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdremtsbG55dmV5Ymp1bHlvdWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NjU0OTcsImV4cCI6MjEwOTA0MTQ5N30.XFGc0qFTugqKCfqVC44SlYoxLDumhrz_kkTyTlaJuus"

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
    // 1. Extraer y verificar token de sesión emitido por Core
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado. Se requiere inicio de sesión para realizar el pedido." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim()
    if (!token) {
      return new Response(JSON.stringify({ error: "Token de autorización inválido." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const coreClient = createClient(CORE_URL, CORE_ANON_KEY, {
      auth: { persistSession: false }
    })

    const { data: { user }, error: authError } = await coreClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sesión no válida o expirada. Por favor inicia sesión nuevamente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const body = await req.json()
    const { items, direccion, fiscal, metodo, referencia_transaccion, clave_idempotencia } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "El pedido debe contener al menos un producto." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (!direccion || !direccion.calle_principal || !direccion.numeracion) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios en la dirección de entrega." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (!fiscal || !fiscal.identificacion || !fiscal.razon_social) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios de facturación (identificación o razón social)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 2. Precios y nombres desde el servidor: Consultar productos activos en Core
    const productIds = items.map(i => Number(i.producto_id)).filter(id => !isNaN(id) && id > 0)
    const { data: productosCore, error: prodError } = await coreClient
      .from("productos")
      .select("id, nombre, precio, activo, categoria_id, categorias(nombre)")
      .in("id", productIds)

    if (prodError || !productosCore) {
      return new Response(JSON.stringify({ error: "Error al validar productos en el catálogo central." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const mapaProductos = new Map(productosCore.map(p => [p.id, p]))

    for (const item of items) {
      const prod = mapaProductos.get(Number(item.producto_id))
      if (!prod) {
        return new Response(JSON.stringify({ error: `El producto con ID ${item.producto_id} no existe en el catálogo.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
      if (prod.activo === false) {
        return new Response(JSON.stringify({ error: `El producto "${prod.nombre}" no está activo actualmente.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    }

    // 3. Consultar configuración de negocio desde Core (o valores por defecto del sistema)
    let ivaPorcentaje = 0.15
    let envioGratisDesde = 50.00
    let costoEnvioBase = 5.00

    try {
      const { data: configRows } = await coreClient
        .from("configuracion_tienda")
        .select("clave, valor")

      if (Array.isArray(configRows)) {
        for (const row of configRows) {
          const val = typeof row.valor === "number" ? row.valor : Number(row.valor)
          if (row.clave === "iva_porcentaje" && !isNaN(val)) ivaPorcentaje = val
          if (row.clave === "envio_gratis_desde" && !isNaN(val)) envioGratisDesde = val
          if (row.clave === "costo_envio" && !isNaN(val)) costoEnvioBase = val
        }
      }
    } catch {
      // Usar defaults establecidos
    }

    const itemsValidados = items.map(item => {
      const prod = mapaProductos.get(Number(item.producto_id))!
      const precioUnitario = Number(prod.precio)
      const cant = Math.max(1, Math.min(Number(item.cantidad) || 1, 99))
      return {
        producto_id: prod.id,
        nombre: prod.nombre,
        precio_unitario: precioUnitario,
        cantidad: cant,
        subtotal: +(precioUnitario * cant).toFixed(2),
        categoria: prod.categorias?.nombre || "Periférico"
      }
    })

    const subtotal = +(itemsValidados.reduce((acc, i) => acc + i.subtotal, 0)).toFixed(2)
    // Umbral único de envío gratis: a partir de $50 (subtotal >= 50)
    const costoEnvio = subtotal >= envioGratisDesde || subtotal === 0 ? 0 : costoEnvioBase
    const impuestos = +(subtotal * ivaPorcentaje).toFixed(2)
    const total = +(subtotal + costoEnvio + impuestos).toFixed(2)

    // 4. Preparar payload atómico para RPC en Supabase TX usando service_role
    const txUrl = Deno.env.get("SUPABASE_URL")!
    const txServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const txClient = createClient(txUrl, txServiceRoleKey, {
      auth: { persistSession: false }
    })

    const refTransaccion = referencia_transaccion || `TX-${Math.floor(100000 + Math.random() * 900000)}`
    const claveIdemp = clave_idempotencia || `IDEMP-${Date.now()}-${crypto.randomUUID()}`

    const payloadRPC = {
      clave_idempotencia: claveIdemp,
      usuario_id: user.id, // Obtenido exclusivamente del token verificado
      correo_contacto: user.email,
      fiscal: {
        identificacion: String(fiscal.identificacion).trim(),
        razon_social: String(fiscal.razon_social).trim(),
        direccion: String(fiscal.direccion || "Quito, Pichincha").trim()
      },
      envio: {
        calle_principal: String(direccion.calle_principal).trim(),
        numeracion: String(direccion.numeracion).trim(),
        ciudad: `Quito (${String(direccion.sector || "Quito").trim()})`,
        referencia: String(direccion.referencia || "Sin referencia adicional").trim()
      },
      items: itemsValidados.map(i => ({
        producto_id: i.producto_id,
        nombre: i.nombre,
        precio_unitario: i.precio_unitario,
        cantidad: i.cantidad
      })),
      impuestos,
      costo_envio: costoEnvio,
      metodo: metodo || "tarjeta",
      referencia_transaccion: refTransaccion
    }

    const { data: numeroPedido, error: rpcError } = await txClient.rpc("registrar_pedido", { p: payloadRPC })

    if (rpcError) {
      if (rpcError.message.includes("stock_insuficiente")) {
        const idProd = rpcError.message.split(":")[1] || ""
        const nombreProd = mapaProductos.get(Number(idProd))?.nombre || `#${idProd}`
        return new Response(JSON.stringify({
          error: `Stock insuficiente para "${nombreProd}". Por favor reduce la cantidad en tu carrito.`,
          codigo: "stock_insuficiente"
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      return new Response(JSON.stringify({
        error: "No fue posible registrar el pedido en la base de datos.",
        detalle: rpcError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 5. Consultar el pedido recién creado desde la base de datos para responder con datos reales
    const { data: pedidoBD, error: errLectura } = await txClient
      .from("pedidos")
      .select(`
        id,
        numero_pedido,
        creado_en,
        estado_id,
        subtotal,
        impuestos,
        costo_envio,
        total,
        envio_calle_principal,
        envio_numeracion,
        envio_ciudad,
        envio_referencia,
        fiscal_identificacion,
        fiscal_razon_social,
        fiscal_direccion,
        estados_pedido(nombre, orden),
        detalles_pedido(producto_id, nombre_producto, precio_unitario, cantidad, subtotal_linea)
      `)
      .eq("numero_pedido", numeroPedido)
      .single()

    if (errLectura || !pedidoBD) {
      // Si por alguna razón la lectura inmediata falla, devolver los datos calculados confirmados por el RPC
      return new Response(JSON.stringify({
        codigo: numeroPedido,
        total,
        subtotal,
        impuestos,
        costo_envio: costoEnvio,
        items: itemsValidados
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({
      exito: true,
      codigo: pedidoBD.numero_pedido,
      pedido: pedidoBD
    }), {
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
