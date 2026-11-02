import { useContext } from 'react'
import { ContextoCarrito } from './contextos'

export function useCarrito() {
  const contexto = useContext(ContextoCarrito)
  if (!contexto) {
    throw new Error('useCarrito debe utilizarse dentro de un ProveedorCarrito')
  }
  return contexto
}
