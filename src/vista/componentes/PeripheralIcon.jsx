/**
 * VISTA: icono de periférico
 * Iconografía SVG optimizada y accesible para periféricos y acciones del sistema.
 * Soporta normalización flexible de categorías (singular/plural, acentos).
 */

export function IconoPeriferico({ tipo, className = '', size = 24, 'aria-hidden': ariaHidden = true }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': ariaHidden
  }

  // Normaliza acentos y mayúsculas para aceptar categorías del catálogo y nombres del icono.
  const tipoNormalizado = String(tipo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  if (tipoNormalizado.includes('teclado') || tipoNormalizado.includes('keyboard')) {
    return (
      <svg {...props}>
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <line x1="6" y1="8" x2="6.01" y2="8" strokeWidth="3" />
        <line x1="10" y1="8" x2="10.01" y2="8" strokeWidth="3" />
        <line x1="14" y1="8" x2="14.01" y2="8" strokeWidth="3" />
        <line x1="18" y1="8" x2="18.01" y2="8" strokeWidth="3" />
        <line x1="6" y1="12" x2="6.01" y2="12" strokeWidth="3" />
        <line x1="10" y1="12" x2="10.01" y2="12" strokeWidth="3" />
        <line x1="14" y1="12" x2="14.01" y2="12" strokeWidth="3" />
        <line x1="18" y1="12" x2="18.01" y2="12" strokeWidth="3" />
        <line x1="8" y1="16" x2="16" y2="16" strokeWidth="2" />
      </svg>
    )
  }

  if (tipoNormalizado.includes('raton') || tipoNormalizado.includes('mouse')) {
    return (
      <svg {...props}>
        <rect x="5" y="2" width="14" height="20" rx="7" />
        <line x1="12" y1="6" x2="12" y2="10" />
      </svg>
    )
  }

  if (tipoNormalizado.includes('auricular') || tipoNormalizado.includes('audifono') || tipoNormalizado.includes('headset') || tipoNormalizado.includes('audio')) {
    return (
      <svg {...props}>
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    )
  }

  if (tipoNormalizado.includes('webcam') || tipoNormalizado.includes('camara') || tipoNormalizado.includes('cam')) {
    return (
      <svg {...props}>
        <circle cx="12" cy="10" r="8" />
        <circle cx="12" cy="10" r="3" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="7" y1="22" x2="17" y2="22" />
      </svg>
    )
  }

  if (tipoNormalizado.includes('alfombrilla') || tipoNormalizado.includes('mousepad') || tipoNormalizado.includes('pad')) {
    return (
      <svg {...props}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="6" y1="15" x2="18" y2="15" strokeDasharray="2 2" />
        <circle cx="15" cy="10" r="1.5" />
      </svg>
    )
  }

  switch (tipoNormalizado) {
    case 'cart':
      return (
        <svg {...props}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )

    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )

    case 'user':
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )

    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )

    case 'truck':
      return (
        <svg {...props}>
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      )

    case 'check':
      return (
        <svg {...props}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )

    case 'star':
      return (
        <svg {...props} fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )

    case 'chevron-down':
      return (
        <svg {...props}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )

    case 'logo':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden={ariaHidden}>
          <rect x="4" y="6" width="24" height="16" rx="2" stroke="#ffffff" strokeWidth="2.5" fill="#481b7e" />
          <polygon points="16,2 26,8 6,8" fill="#fde047" />
          <line x1="9" y1="11" x2="23" y2="11" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="15" x2="17" y2="15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <rect x="13" y="22" width="6" height="4" fill="#ffffff" />
          <line x1="10" y1="26" x2="22" y2="26" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )

    default:
      // Respaldo genérico que nunca regresa null
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
  }
}
