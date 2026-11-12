/**
 * CONFIGURACIÓN: supabaseClient.js
 * Clientes de Supabase para los dos proyectos arquitectónicos (Fase 7):
 * - supabaseCore: Catálogo, autenticación, perfiles, items_carrito, direcciones, fiscales, reseñas, FAQ, contacto.
 * - supabaseTx: Pedidos, detalles, pagos, inventario de stock y estados.
 *
 * Sin fallbacks ni claves quemadas: requiere obligatoriamente las 4 variables de entorno.
 */

import { createClient } from '@supabase/supabase-js'

const env = import.meta.env || {}

const coreUrl = env.VITE_CORE_SUPABASE_URL
const coreKey = env.VITE_CORE_SUPABASE_ANON_KEY

const txUrl = env.VITE_TX_SUPABASE_URL
const txKey = env.VITE_TX_SUPABASE_ANON_KEY

if (!coreUrl || !coreKey) {
  throw new Error(
    'Faltan variables de entorno requeridas para Supabase Core: VITE_CORE_SUPABASE_URL y VITE_CORE_SUPABASE_ANON_KEY deben estar configuradas.'
  )
}

if (!txUrl || !txKey) {
  throw new Error(
    'Faltan variables de entorno requeridas para Supabase TX: VITE_TX_SUPABASE_URL y VITE_TX_SUPABASE_ANON_KEY deben estar configuradas.'
  )
}

export const supabaseCore = createClient(coreUrl, coreKey)
export const supabaseTx = createClient(txUrl, txKey)

// Exportación predeterminada a Core (catálogo, auth, perfiles)
export const supabase = supabaseCore
export default supabase
