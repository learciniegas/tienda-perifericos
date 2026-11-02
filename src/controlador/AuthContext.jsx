/**
 * CONTROLADOR: AuthContext.jsx
 * Proveedor de contexto para la sesión de usuario con Supabase Auth.
 */

import { useState, useEffect } from 'react'
import { supabaseCore } from '../config/supabaseClient'
import { ContextoAutenticacion } from './contextos'

export function ProveedorAutenticacion({ children }) {
  // Inicializado con el usuario 'Luis' tal como se muestra en el diseño de referencia
  const [usuario, setUsuario] = useState({
    id: 'user-demo-luis',
    email: 'luis@ejemplo.com',
    nombre: 'Luis',
    autenticado: true
  })

  useEffect(() => {
    // Sincronizar sesión activa si existe en Supabase
    async function sincronizarSesion() {
      try {
        const { data: { session } } = await supabaseCore.auth.getSession()
        if (session?.user) {
          // Se adapta la sesión externa al formato que consume la interfaz.
          setUsuario({
            id: session.user.id,
            email: session.user.email,
            nombre: session.user.user_metadata?.nombre || session.user.email.split('@')[0],
            autenticado: true
          })
        }
      } catch (error) {
        console.warn('No se pudo sincronizar la sesión; se conserva el usuario de demostración:', error)
      }
    }

    sincronizarSesion()

    const { data: authListener } = supabaseCore.auth.onAuthStateChange((_evento, session) => {
      if (session?.user) {
        setUsuario({
          id: session.user.id,
          email: session.user.email,
          nombre: session.user.user_metadata?.nombre || session.user.email.split('@')[0],
          autenticado: true
        })
      }
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const alternarSesion = () => {
    if (usuario.autenticado) {
      setUsuario({ id: null, email: null, nombre: 'Invitado', autenticado: false })
    } else {
      setUsuario({ id: 'user-demo-luis', email: 'luis@ejemplo.com', nombre: 'Luis', autenticado: true })
    }
  }

  return (
    <ContextoAutenticacion.Provider value={{ usuario, alternarSesion }}>
      {children}
    </ContextoAutenticacion.Provider>
  )
}
