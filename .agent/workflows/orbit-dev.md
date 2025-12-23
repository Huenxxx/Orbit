---
description: Cómo desarrollar y ejecutar ORBIT
---

# Desarrollo de ORBIT

## Iniciar en modo desarrollo (web)
// turbo
1. Ejecutar `npm run dev` en el directorio del proyecto
2. Abrir http://localhost:5173 en el navegador

## Iniciar con Electron (desktop)
// turbo
1. Ejecutar `npm run electron:dev` en el directorio del proyecto
2. La aplicación se abrirá automáticamente como ventana desktop

## Compilar para producción
// turbo
1. Ejecutar `npm run build` para compilar el frontend
2. Ejecutar `npm run electron:build` para crear el instalador

## Estructura del proyecto
- `src/components/` - Componentes reutilizables de UI
- `src/pages/` - Páginas completas de la aplicación
- `src/stores/` - Estado global con Zustand
- `src/types/` - Definiciones TypeScript
- `electron/` - Código del proceso principal de Electron

## Agregar nueva página
1. Crear carpeta en `src/pages/NombrePagina/`
2. Crear `NombrePagina.tsx` y `NombrePagina.css`
3. Exportar desde `src/pages/index.ts`
4. Agregar case en `src/App.tsx` en `renderPage()`
5. Agregar item de navegación en `src/components/Sidebar/Sidebar.tsx`

## Agregar nuevo componente
1. Crear carpeta en `src/components/NombreComponente/`
2. Crear `NombreComponente.tsx` y `NombreComponente.css`
3. Exportar desde `src/components/index.ts`
