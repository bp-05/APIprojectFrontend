﻿# APIprojectFrontend

SPA en React + Vite que consume una API Django REST Framework (DRF). Usa React Router (Data), Zustand para auth/estado, Axios para HTTP y Tailwind CSS v4 para estilos.

## Stack
- `react`, `vite`, `typescript`
- `react-router` (Data Router)
- `zustand` (estado de auth/ui)
- `axios` (cliente HTTP)
- `tailwindcss` v4 (+ `@tailwindcss/vite`)

## Estructura principal
- `src/main.tsx`: monta el router y ejecuta `useAuth.getState().hydrate()` antes del render.
- `src/router.tsx`: definición de rutas públicas/privadas y rutas por rol.
- `src/routes/Layout.tsx`: header institucional ("Gestor API") y `<Outlet />`.
- `src/routes/Login.tsx`: login con JWT (POST `/api/token/`), carga de usuario (`/api/users/me/`) y redirección por rol.
- `src/routes/guards.ts`: loaders de protección (`requireAuthLoader`, `requireRoleLoader`, etc.).
- `src/routes/roleMap.ts`: mapa de rutas por rol.
- `src/routes/roles/*.tsx`: páginas placeholder para cada rol (ADMIN, VCM, DAC, DC, DOC, COORD).
- `src/lib/env.ts`: normaliza variables `VITE_...` y construye URLs base.
- `src/lib/http.ts`: instancia Axios con `Authorization` y refresh de token en 401.
- `src/index.css`: importa Tailwind v4.

El archivo `src/routes/Home.tsx` fue eliminado; la ruta índice redirige a la ruta correspondiente al rol.

## Autenticación y roles
- Backend DRF (README) expone JWT Simple:
  - Login: `POST /api/token/`
  - Refresh: `POST /api/token/refresh/`
- Tras login, se consulta `GET /api/users/me/` para obtener `role` y se persiste `user_role`.
- Redirecciones por rol (ver `src/routes/roleMap.ts:1`):
  - ADMIN → `/admin`
  - VCM → `/vcm`
  - DAC → `/dac`
  - DC → `/dc`
  - DOC → `/doc`
  - COORD → `/coord`
- Rutas protegidas con loaders:
  - `requireAuthLoader` (token requerido)
  - `requireRoleLoader('ADMIN' | 'VCM' | ...)` (rol exacto requerido)
  - `redirectIfAuthedLoader` (impide ver `/login` si ya hay sesión)
  - `entryLoader` (índice): redirige a la ruta del rol

## Variables de entorno (Vite)
- `.env.example` incluye las claves soportadas:
  - `VITE_API_BASE_URL` (ej. `http://localhost:8000`)
  - `VITE_API_PREFIX` (ej. `/api`)
  - `VITE_AUTH_LOGIN_PATH=/token/`
  - `VITE_AUTH_REFRESH_PATH=/token/refresh/`
  - `VITE_API_TIMEOUT_MS=15000`
- Copia `.env.example` a `.env`/`.env.development` y ajusta valores.

## Tailwind CSS v4
- Configurado vía plugin Vite (`vite.config.ts:3,9`).
- Entrada global `src/index.css:1` con `@import "tailwindcss";`.
- No requiere `tailwind.config.js` por defecto (zero‑config).

## Ejecutar en local
- Requisitos: Node 18+.
- Instalar dependencias: `npm i`
- Desarrollo: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## Despliegue
- Configurar history fallback para SPA (todas las rutas deben servir `index.html`).
