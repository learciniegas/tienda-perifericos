import { createClient } from '@supabase/supabase-js'

const env = import.meta.env || {}

// JWT anon keys que PostgREST valida sin rechazo 401
const DEFAULT_CORE_URL = 'https://gkzkllnyveybjulyouiw.supabase.co'
const DEFAULT_CORE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdremtsbG55dmV5Ymp1bHlvdWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NjU0OTcsImV4cCI6MjEwOTA0MTQ5N30.XFGc0qFTugqKCfqVC44SlYoxLDumhrz_kkTyTlaJuus'

const DEFAULT_TX_URL = 'https://zxqmpylxvxnktqthvigl.supabase.co'
const DEFAULT_TX_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cW1weWx4dnhua3RxdGh2aWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NTYyNzMsImV4cCI6MjEwOTEzMjI3M30.l5RHs2O6dH5tXFhhzswlnnFPVc7lMD00-JNtNAsK4n4'

const coreUrl = env.VITE_CORE_SUPABASE_URL || env.VITE_SUPABASE_URL || env.CORE_PUBLIC_SUPABASE_URL || DEFAULT_CORE_URL
const coreKey = env.VITE_CORE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || DEFAULT_CORE_KEY

const txUrl = env.VITE_TX_SUPABASE_URL || env.TX_PUBLIC_SUPABASE_URL || DEFAULT_TX_URL
const txKey = env.VITE_TX_SUPABASE_ANON_KEY || DEFAULT_TX_KEY

export const supabaseCore = createClient(coreUrl, coreKey)
export const supabaseTx = txUrl && txKey ? createClient(txUrl, txKey) : null

// Exportación predeterminada a Core (catálogo, auth, perfiles)
export const supabase = supabaseCore
export default supabase
