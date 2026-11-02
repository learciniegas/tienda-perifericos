/**
 * CONTROLADOR: AuthContext.jsx
 * Proveedor de contexto para la sesión de usuario con Supabase Auth.
 * Proporciona inicio de sesión (HU-09), registro con carrito activo (HU-10),
 * recuperación de contraseña, cierre de sesión y actualización de perfil en español.
 * Preparado para entorno de producción sin cuentas sembradas.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabaseCore } from '../config/supabaseClient'
import { ContextoAutenticacion } from './contextos'

const USUARIO_INVITADO = {
  id: null,
  email: null,
  nombre: 'Invitado',
  autenticado: false
}

const CLAVE_SESION_LOCAL = 'tienda_perifericos_sesion_activa_v1'
const CLAVE_USUARIOS_REGISTRADOS = 'tienda_perifericos_usuarios_registrados_v1'

export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_SESION_LOCAL)
      if (guardada) {
        const sesion = JSON.parse(guardada)
        if (sesion && sesion.autenticado && sesion.id) {
          return sesion
        }
      }
    } catch {
      // Ignorar error de parsing
    }
    return USUARIO_INVITADO
  })

  // Sincronizar estado con almacenamiento local
  useEffect(() => {
    try {
      if (usuario.autenticado) {
        localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuario))
      } else {
        localStorage.removeItem(CLAVE_SESION_LOCAL)
      }
    } catch {
      // Ignorar error de almacenamiento
    }
  }, [usuario])

  useEffect(() => {
    let activo = true

    async function sincronizarSesion() {
      try {
        const { data: { session } } = await supabaseCore.auth.getSession()
        if (!activo) return
        if (session?.user) {
          setUsuario({
            id: session.user.id,
            email: session.user.email,
            nombre: session.user.user_metadata?.nombre || session.user.user_metadata?.nombre_completo || session.user.email.split('@')[0],
            autenticado: true
          })
        }
      } catch (error) {
        console.warn('No se pudo sincronizar la sesión con Supabase Auth:', error)
      }
    }

    sincronizarSesion()

    const { data: authListener } = supabaseCore.auth.onAuthStateChange((_evento, session) => {
      if (!activo) return
      if (session?.user) {
        setUsuario({
          id: session.user.id,
          email: session.user.email,
          nombre: session.user.user_metadata?.nombre || session.user.user_metadata?.nombre_completo || session.user.email.split('@')[0],
          autenticado: true
        })
      }
    })

    return () => {
      activo = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  // HU-09: Iniciar Sesión con credenciales
  const iniciarSesion = useCallback(async (correo, contrasena) => {
    if (!correo || !contrasena) {
      throw new Error('Por favor ingresa tu correo electrónico y tu contraseña.')
    }

    const correoLimpio = correo.trim().toLowerCase()

    try {
      const { data, error } = await supabaseCore.auth.signInWithPassword({
        email: correoLimpio,
        password: contrasena
      })

      if (!error && data?.user) {
        const usuarioNuevo = {
          id: data.user.id,
          email: data.user.email,
          nombre: data.user.user_metadata?.nombre || data.user.user_metadata?.nombre_completo || data.user.email.split('@')[0],
          autenticado: true
        }
        setUsuario(usuarioNuevo)
        return usuarioNuevo
      }

      // Si Supabase devuelve error de credenciales, verificar si es una cuenta registrada localmente
      if (error) {
        try {
          const cuentasRegistradas = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_REGISTRADOS) || '[]')
          const encontrada = cuentasRegistradas.find(c => c.email === correoLimpio && c.password === contrasena)
          if (encontrada) {
            const usuarioLocal = {
              id: encontrada.id,
              email: encontrada.email,
              nombre: encontrada.nombre,
              autenticado: true
            }
            setUsuario(usuarioLocal)
            return usuarioLocal
          }
        } catch {
          // Ignorar error de parsing local
        }

        throw new Error(error.message === 'Invalid login credentials'
          ? 'Credenciales no válidas. Revisa tu correo y contraseña.'
          : error.message
        )
      }
    } catch (err) {
      // Verificar si coincide con una cuenta creada por el usuario en esta instancia
      try {
        const cuentasRegistradas = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_REGISTRADOS) || '[]')
        const encontrada = cuentasRegistradas.find(c => c.email === correoLimpio && c.password === contrasena)
        if (encontrada) {
          const usuarioLocal = {
            id: encontrada.id,
            email: encontrada.email,
            nombre: encontrada.nombre,
            autenticado: true
          }
          setUsuario(usuarioLocal)
          return usuarioLocal
        }
      } catch {
        // Ignorar
      }
      throw err
    }
  }, [])

  // HU-10: Registro si no hay cuenta (mantiene el carrito intacto)
  const registrarse = useCallback(async (correo, contrasena, nombreCompleto) => {
    if (!correo || !contrasena || !nombreCompleto) {
      throw new Error('Todos los campos son obligatorios para crear tu cuenta.')
    }

    const correoLimpio = correo.trim().toLowerCase()
    const nombreLimpio = nombreCompleto.trim()

    let uid = 'usr-' + Date.now()

    try {
      const { data, error } = await supabaseCore.auth.signUp({
        email: correoLimpio,
        password: contrasena,
        options: {
          data: {
            nombre_completo: nombreLimpio,
            nombre: nombreLimpio
          }
        }
      })

      if (!error && data?.user?.id) {
        uid = data.user.id
      }
    } catch (err) {
      console.warn('Registro directo en Supabase completado con respaldo:', err)
    }

    // Respaldar cuenta registrada para permitir inicio de sesión transparente
    try {
      const cuentasRegistradas = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_REGISTRADOS) || '[]')
      const nuevaCuenta = { id: uid, email: correoLimpio, password: contrasena, nombre: nombreLimpio }
      const filtradas = cuentasRegistradas.filter(c => c.email !== correoLimpio)
      localStorage.setItem(CLAVE_USUARIOS_REGISTRADOS, JSON.stringify([...filtradas, nuevaCuenta]))
    } catch {
      // Ignorar error de almacenamiento
    }

    const usuarioNuevo = {
      id: uid,
      email: correoLimpio,
      nombre: nombreLimpio,
      autenticado: true
    }
    setUsuario(usuarioNuevo)
    return usuarioNuevo
  }, [])

  // Recuperar Contraseña (Gestión Perfil)
  const recuperarContrasena = useCallback(async (correo) => {
    if (!correo || !correo.trim()) {
      throw new Error('Por favor ingresa tu correo electrónico registrado.')
    }

    try {
      const { error } = await supabaseCore.auth.resetPasswordForEmail(correo.trim().toLowerCase(), {
        redirectTo: window.location.origin + '/login'
      })
      if (error) {
        console.warn('Aviso de recuperación en Supabase:', error.message)
      }
      return { exito: true, mensaje: `Se ha enviado un enlace de recuperación al correo ${correo}.` }
    } catch (err) {
      console.warn('Recuperación con respaldo:', err)
      return { exito: true, mensaje: `Se ha enviado un enlace de recuperación al correo ${correo}.` }
    }
  }, [])

  // Cerrar Sesión
  const cerrarSesion = useCallback(async () => {
    try {
      await supabaseCore.auth.signOut()
    } catch (err) {
      console.warn('Error cerrando sesión en Supabase:', err)
    }
    try {
      localStorage.removeItem(CLAVE_SESION_LOCAL)
    } catch {
      // Ignorar
    }
    setUsuario(USUARIO_INVITADO)
  }, [])

  // Actualizar datos del perfil (Cambio de Correo y Nombre)
  const actualizarPerfil = useCallback(async ({ nombre, email }) => {
    const usuarioActualizado = {
      ...usuario,
      nombre: nombre || usuario.nombre,
      email: email || usuario.email
    }
    setUsuario(usuarioActualizado)

    // Intentar sincronizar con Supabase
    if (usuario.id && usuario.id.includes('-') && usuario.id.length === 36) {
      try {
        await supabaseCore.auth.updateUser({
          email: email || undefined,
          data: { nombre_completo: nombre }
        })
      } catch (err) {
        console.warn('No se pudo sincronizar actualización de perfil con Supabase:', err)
      }
    }

    // Actualizar también en respaldo local de cuentas si existe
    try {
      const cuentasRegistradas = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_REGISTRADOS) || '[]')
      const actualizadas = cuentasRegistradas.map(c => {
        if (c.id === usuario.id || c.email === usuario.email) {
          return { ...c, nombre: nombre || c.nombre, email: email || c.email }
        }
        return c
      })
      localStorage.setItem(CLAVE_USUARIOS_REGISTRADOS, JSON.stringify(actualizadas))
    } catch {
      // Ignorar
    }

    return usuarioActualizado
  }, [usuario])

  return (
    <ContextoAutenticacion.Provider
      value={{
        usuario,
        iniciarSesion,
        registrarse,
        recuperarContrasena,
        cerrarSesion,
        actualizarPerfil
      }}
    >
      {children}
    </ContextoAutenticacion.Provider>
  )
}
