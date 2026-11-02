# Tienda de periféricos

Aplicación de comercio electrónico creada con React y Vite. Permite explorar un catálogo de periféricos, filtrar productos, administrar un carrito y consultar el seguimiento de pedidos.

## Requisitos

- Node.js y npm.

## Iniciar el proyecto

Instala las dependencias y ejecuta el servidor de desarrollo:

```bash
npm install
npm run dev
```

Vite mostrará la dirección local en la que se puede abrir la aplicación.

## Comprobaciones

```bash
npm run lint
npm run build
```

`lint` revisa el código con ESLint y `build` genera la versión de producción en `dist/`.

## Organización del código

- `src/modelo/`: datos de respaldo y lógica de acceso al catálogo y al carrito.
- `src/controlador/`: contextos y hooks que coordinan el estado de la aplicación.
- `src/vista/componentes/`: componentes reutilizables de la interfaz.
- `src/vista/paginas/`: páginas asociadas a las rutas de la tienda.
- `src/config/`: configuración de los clientes de Supabase.

Los nombres internos de componentes y de lógica, así como los comentarios explicativos, están en español. Se conservan los términos que forman parte de las API de React y Supabase, los atributos HTML/ARIA, los nombres de tablas y campos externos, y las clases CSS compartidas con las hojas de estilo.
