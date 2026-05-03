# localhost:forum

Foro web con cuentas por correo (verificación con código de seis dígitos), inicio de sesión con Google opcional, publicaciones con texto e imágenes almacenadas en Supabase Storage, comentarios, reacciones y notificaciones dentro del sitio.

## Tecnologías

- **Frontend:** React, TypeScript, Vite, Tailwind  
- **Backend:** Node.js, Express, TypeScript, PostgreSQL  
- **Archivos:** Supabase Storage; en la base solo quedan URLs y metadatos  
- **Autenticación:** Argon2 para contraseñas, sesión en cookie `httpOnly` con JWT firmado en servidor, Google OAuth comprobado en backend  

Monorepo con workspaces de npm: carpetas `client/` y `server/`.

## Requisitos

Node.js 20 o superior. Base PostgreSQL con extensiones `pgcrypto` y `citext` (en Supabase ya vienen).

## Puesta en marcha

```bash
npm install
```

Creá **`client/.env`** y **`server/.env`** copiando las secciones correspondientes desde **`.env.example`** en la raíz del repo (única plantilla versionada). En desarrollo Vite solo lee `client/.env` y el API `server/.env`; el archivo de la raíz es referencia y sirve también para pegar variables en Render u otros hosts.

Editar `server/.env` como mínimo:

- `DATABASE_URL`, `DATABASE_SSL` si hace falta  
- `SESSION_SECRET`: cadena larga y aleatoria (no subirla al repo)  
- `CLIENT_ORIGIN`: URL base del sitio en el navegador (en desarrollo suele ser `http://localhost:5174`)  
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`  
- Bucket de Storage configurado y con políticas acordes a tu uso  
- Correo de verificación: en hosted gratis tipo Render, SMTP saliente suele estar bloqueado; configurá **`RESEND_API_KEY`** y **`MAIL_FROM`** (listados en `.env.example`). SMTP opcional solo donde la red permita los puertos habituales.

La _service role_ de Supabase solo en el servidor; nunca en variables `VITE_*` ni en el código del cliente.

**Google (opcional):** en Google Cloud Console, cliente OAuth tipo aplicación web. El mismo ID en `GOOGLE_CLIENT_ID` (servidor) y `VITE_GOOGLE_CLIENT_ID` (cliente). Orígenes autorizados: tu URL local y la de producción.

```bash
npm run db:migrate
npm run dev
```

Por defecto el front escucha en el puerto **5174** y el API en **4000**; Vite proxifica `/api` a `http://127.0.0.1:4000`.

Si en producción el front y el API están en el mismo host (por ejemplo Express sirviendo `client/dist`), dejá `VITE_API_URL` vacío en el build del cliente para que las peticiones sean al mismo origen. Si están en dominios distintos, definí `VITE_API_URL` con la URL base del API y revisá CORS (`CLIENT_ORIGIN`, `CLIENT_ORIGINS`, `CLIENT_ORIGIN_REGEX`).

Las rutas públicas listadas para SEO (`robots.txt` / sitemap estático en build) están en `server/src/utils/sitemap-constants.ts` y en `client/vite-plugins/sitemap-constants.ts`; si cambiás rutas, conviene tocar ambos para que sigan iguales.

## Scripts

| Comando | Uso |
|--------|-----|
| `npm run dev` | Cliente y servidor en paralelo |
| `npm run build` | Compila cliente y servidor |
| `npm run start` | Arranca solo el servidor compilado (después del build) |
| `npm run lint` / `npm run typecheck` | Revisión estática |
| `npm run db:migrate` | Aplica migraciones SQL |
| `npm run db:wipe -- --confirm` | Borra datos de aplicación y el bucket de Storage (en producción exige `WIPE_ALLOW_PRODUCTION=yes`) |

Las variables opcionales están comentadas en **`.env.example`** en la raíz.

## Despliegue

En la raíz del repo, `.npmrc` define `production=false` para que `npm install` en CI no salte las `devDependencies` (sin eso el build falla en TypeScript/Vite).

Para entornos tipo Render con `NODE_ENV=production`, conviene explícitamente `npm ci --include=dev` en el comando de build o la variable `NPM_CONFIG_PRODUCTION=false`.

El archivo `render.yaml` del repo describe un sitio estático de ejemplo; un despliegue con API y SPA en un solo servicio Node suele usar `npm run build` en la raíz y `npm start`, con `CLIENT_ORIGIN` apuntando a la URL pública del servicio.
