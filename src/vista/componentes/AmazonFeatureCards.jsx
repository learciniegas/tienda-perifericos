/**
 * VISTA: AmazonFeatureCards.jsx
 * Cuadrícula de tarjetas destacadas por categoría provenientes directamente de la base de datos (Core).
 * Muestra las categorías marcadas con destacada = true.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { obtenerCategorias } from '../../modelo/catalogoModelo'
import { IconoPeriferico } from './PeripheralIcon'

export function TarjetasDestacadas() {
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    let activo = true
    obtenerCategorias()
      .then((todas) => {
        if (!activo) return
        const destacadas = todas.filter(c => c.destacada)
        setCategorias(destacadas.length > 0 ? destacadas : todas.slice(0, 4))
      })
      .catch(() => {})

    return () => {
      activo = false
    }
  }, [])

  if (categorias.length === 0) return null

  return (
    <section className="amazon-cards-section" aria-labelledby="feature-cards-heading">
      <h2 id="feature-cards-heading" className="sr-only">
        Categorías recomendadas para tu setup
      </h2>

      <div className="amazon-cards-grid">
        {categorias.map((cat) => (
          <div key={cat.id} className="amazon-feature-card">
            <h3 className="card-heading">{cat.nombre}</h3>
            
            <div className="card-visual-box">
              <div className="card-main-preview">
                <IconoPeriferico tipo={cat.slug || cat.nombre} size={54} className="card-icon" />
                <p className="card-desc">{cat.descripcion}</p>
              </div>
            </div>

            <Link to={`/catalogo?cat=${cat.slug || cat.id}`} className="card-footer-link">
              <span>Explorar {cat.nombre}</span>
              <span aria-hidden="true" className="link-arrow">→</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
