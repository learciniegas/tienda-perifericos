import { useContext } from 'react'
import { ContextoAutenticacion } from './contextos'

export function useAutenticacion() {
  const contexto = useContext(ContextoAutenticacion)
  if (!contexto) {
    throw new Error('useAutenticacion debe utilizarse dentro de un ProveedorAutenticacion')
  }
  return contexto
}
