# localhost:forum

Monorepo fullstack: foro con registro, verificación por correo, publicaciones con texto e imágenes, comentarios, reacciones y notificaciones in-app.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind  
- **Backend:** Node.js, Express, TypeScript  
- **Base de datos:** PostgreSQL (compatible con Supabase; SSL y pooler soportados)  
- **Archivos:** Supabase Storage; la base solo guarda referencias y URLs  
- **Auth:** Argon2, sesiones en PostgreSQL, cookies `httpOnly`, opcional Google Sign-In (JWT verificado en servidor)

Workspaces npm: `client/` y `server/`.

## Inicio rápido

Requisitos: **Node 20+**. PostgreSQL con extensiones `pgcrypto` y `citext` (Supabase las incluye).

1. Clonar el repositorio  
2. `npm install` en la raíz  
3. Copiar variables del servidor:

```bash
cp server/env.example server/.env
```

4. Completar `server/.env`: `DATABASE_URL`, `SESSION_SECRET` (valor largo y aleatorio), correo si usás verificación por mail, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`. La **service role** solo en el servidor, nunca en el cliente ni en variables `VITE_*`.

   **Google (opcional):** en Google Cloud Console, OAuth client ID tipo Web. Orígenes autorizados: URL del front (local y producción). Mismo Client ID en `GOOGLE_CLIENT_ID` (servidor) y `VITE_GOOGLE_CLIENT_ID` en `client/.env` (plantilla: `client/.env.example`).

5. Bucket público en Supabase para las URLs de imágenes.

6. Migraciones:

```bash
npm run db:migrate
```

7. Desarrollo:

```bash
npm run dev
```

Por defecto el front usa el puerto **5174** y el API **4000**. El proxy de Vite apunta a **`http://127.0.0.1:4000`**. Si el front en producción está en otro dominio que el API, definí la URL base del API según tu despliegue.

**AdSense:** variables `VITE_GOOGLE_ADSENSE_*` en el cliente; detalle en `docs/monetizacion-google-adsense.md`.

## Scripts

| Comando | Descripción |
|--------|----------------|
| `npm run dev` | Cliente y servidor en paralelo |
| `npm run build` | Build de ambos paquetes |
| `npm run start` | Solo API compilada (tras `build`) |
| `npm run typecheck` / `npm run lint` | Comprobaciones estáticas |
| `npm run db:migrate` | Aplica migraciones SQL |
| `npm run db:wipe -- --confirm` | Vacía tablas de aplicación y el bucket de Storage. En producción exige `WIPE_ALLOW_PRODUCTION=yes`. |

Variables documentadas en **`server/env.example`** y **`client/.env.example`**.

## Frontend

Rutas con `history.pushState` (sin React Router): inicio, login, registro, verificación, foro, `/posts/:id`, perfiles `/users/:id`, edición de perfil, notificaciones, admin (superadmin), términos, privacidad y contacto.

## API

JSON bajo `/api`: autenticación, usuarios, foro (posts, reacciones, comentarios). Los handlers están en `server/src/routes/`.

## Producción

`NODE_ENV=production`, `SESSION_SECRET` fuerte, `CLIENT_ORIGIN` con la URL HTTPS del front, `TRUST_PROXY_HOPS` si hay proxy delante del servidor.
