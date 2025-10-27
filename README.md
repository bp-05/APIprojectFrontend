# APIprojectFrontend

SPA en React + Vite que consume una API en Django REST Framework. Se usa React Router en modo Data para routing por carga de datos y Zustand para estado de UI/cliente.

## Stack
- `react`, `vite`, `typescript`
- `react-router` (Data Router)
- `zustand` (estado de UI)

## Estructura actual
- `src/main.tsx`: monta `<RouterProvider router={router} />`.
- `src/router.tsx`: `createBrowserRouter` con layout raíz, páginas y manejo de errores.
- `src/routes/Layout.tsx`: navegación, `<Outlet />` y demo de Zustand (sidebar).
- `src/routes/Home.tsx`: ruta inicial con `loader` placeholder y `useLoaderData()`.
- `src/routes/Login.tsx`: ruta pública (loader placeholder).
- `src/routes/ErrorPage.tsx`: `errorElement` para errores de loaders/actions.
- `src/routes/NotFound.tsx`: 404.
- `src/store/ui.ts`: store mínimo de Zustand (`sidebarOpen`, `toggleSidebar`).

Nota: `src/ApiApp.tsx` ya no se usa; la app arranca con el router. Puedes eliminarlo cuando quieras.

## Ejecutar en local
- Requisitos: Node 18+.
- Instalar dependencias: `npm i`
- Desarrollo: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## Routing (modo Data)
- Se usa `createBrowserRouter` y loaders por ruta. Por ahora los loaders son placeholders sin llamadas reales a la API.
- `ErrorPage` captura errores lanzados desde loaders/actions.

## Estado con Zustand
- Enfocado a UI/client state (toggles, filtros, etc.).
- Ejemplo en `Layout`: botón que alterna `sidebarOpen` y muestra un `<aside>`.

## Próximos pasos (planificados)
- Autenticación: mover validación de sesión al `loader` del layout raíz y redirigir `401` a `/login`.
- API helper: `fetch` centralizado con `baseUrl`, `credentials`, y manejo de CSRF/JWT según DRF.
- Rutas de dominio (ej. `/posts`, `/profile`) con loaders/actions reales y `defer()` donde aplique.

## Despliegue
- Configurar history fallback para SPA (todas las rutas deben servir `index.html`).
