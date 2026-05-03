# localhost:forum

Foro web pensado para conversación abierta: hilos con texto e imágenes, comentarios anidados y reacciones, perfiles públicos y bandeja de notificaciones dentro del sitio. Las cuentas se crean con correo electrónico y verificación por código de un solo uso; el inicio de sesión con Google es opcional y se valida en el servidor.

Los adjuntos se guardan en **Supabase Storage**; en PostgreSQL solo viven URLs y metadatos para moderación y listados rápidos. Un rol **superadmin** puede ver analíticas agregadas y herramientas de administración sin exponer datos sensibles en el cliente.

## Qué resuelve

- Participación sin fricción: publicar, comentar y reaccionar en una sola SPA con rutas claras y SEO básico (metadatos, sitemap y documentos legales configurables por variables).
- Confianza en la sesión: cookie `httpOnly`, JWT firmado en backend y hashing de contraseñas con Argon2.
- Despliegue flexible: el cliente puede vivir en el mismo host que el API (Express sirviendo `client/dist`) o en otro origen con CORS explícito.

## Arquitectura

Monorepo **npm workspaces** (`client/`, `server/`). El frontend es **React + TypeScript + Vite + Tailwind**; el backend es **Express + TypeScript** sobre **PostgreSQL**. La configuración de entorno versionada está en `.env.example` (en desarrollo suele dividirse entre `client/.env` y `server/.env`).

## Scripts útiles

| Comando | Rol |
|--------|-----|
| `npm run dev` | Cliente y API en paralelo |
| `npm run build` | Build de ambos paquetes |
| `npm run start` | Solo servidor compilado |
| `npm run lint` / `npm run typecheck` | Calidad estática |
| `npm run db:migrate` | Migraciones SQL |
| `npm run db:wipe -- --confirm` | Borrado de datos de aplicación (producción solo con `WIPE_ALLOW_PRODUCTION=yes`) |

El archivo `render.yaml` describe un ejemplo de sitio estático para el cliente; un servicio Node único que ejecute `npm run build` y `npm start` sirve la SPA y el API bajo la misma URL pública.
