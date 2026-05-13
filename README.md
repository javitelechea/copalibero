# CopaLibero

Web del torneo (Next.js): tabla, partidos, jugadores y (opcional) panel admin.

> **Si “ves el README” en la URL publicada (`*.github.io/...`):** casi seguro tenés **GitHub Pages** con origen **“Deploy from a branch”** y la raíz del repo **sin** `index.html`. GitHub usa Jekyll y **muestra el README como página**. La solución no es “más variables”: es **publicar el build de Next** (carpeta `out/`) con **GitHub Actions** (ya hay workflow en `.github/workflows/deploy-github-pages.yml`) o usar Cloudflare/Vercel con `out` como salida.

> **Si “ves el README” dentro de github.com** (pestaña del repo): eso es normal, es documentación, no la web del torneo.

---

## La forma más simple de publicar (GitHub + estático, sin Firebase)

Ideal si solo querés **mostrar el torneo con datos de ejemplo** y subir con **Git push** (Vercel / Netlify / **Cloudflare Pages** conectado al repo).

1. En el hosting, conectá el repo de GitHub (Create project → import from Git).
2. Si la app está en la subcarpeta `copalibero`, configurá **Root directory** = `copalibero`.
3. Usá este build:

| Campo | Valor |
| ----- | ----- |
| Install command | `npm ci` (o `npm install`) |
| Build command | `npm run build:static` |
| Output / publish directory | `out` |

Mismo dato en lista (por si la tabla no se lee bien en el celular):

- **Install:** `npm ci` o `npm install`
- **Build:** `npm run build:static`
- **Output / Publish directory:** `out`

No hace falta definir variables de entorno para esa build: queda **solo demo** embebida (sin Firebase, sin servidor, sin admin útil).

4. Cada push a la rama configurada vuelve a desplegar solo.

En local, lo mismo:

```bash
npm install
npm run build:static
```

La carpeta `out/` es el sitio estático (subila manualmente si querés, sin Git).

### GitHub Pages (que no te muestre el README)

1. **Settings** → **Pages** → **Build and deployment** → **Source: GitHub Actions** (no “Deploy from a branch” con la raíz del repo vacía: ahí GitHub muestra el README).
2. Push a `main`: corre el workflow `.github/workflows/deploy-github-pages.yml` (build estático + sube `out/`).
3. Abrí la URL `https://TU_USUARIO.github.io/NOMBRE_REPO/` (el primer deploy puede tardar un minuto). Si falla, mirá **Actions** en el repo.

---

## Modo demo con servidor Next (sin Firebase, con `npm run dev` / Vercel build normal)

Si usás `npm run dev` o `npm run build` (no `build:static`), la parte pública arranca si hay **Firebase completo**, **modo demo** o **backend D1** (ver abajo).

Variables típicas en el hosting o en `.env.local`:

- **Name:** `NEXT_PUBLIC_COPALIBERO_DEMO`  
- **Value:** `1`  

No completes `NEXT_PUBLIC_FIREBASE_*` si no tenés Firebase: con demo activado igual ves tabla, partidos y jugadores de ejemplo.

**Admin en modo demo:** no puede persistir datos (no hay Firestore ni API hasta que configures algo más abajo).

---

## Producción con Firebase (datos reales + admin)

1. Copiá `.env.local.example` a `.env.local` y completá las `NEXT_PUBLIC_FIREBASE_*`.
2. En Firestore, documento **`admins/{tu_uid}`** para el usuario de login.
3. Reglas: `firebase/firestore.rules`.
4. Quitá o desactivá `NEXT_PUBLIC_COPALIBERO_DEMO` si no querés datos de prueba.

Build habitual: `npm run build` → output según tu plataforma (Vercel por defecto `.next` + serverless).

---

## Backend en Cloudflare (D1, sin Firebase)

Variables: `NEXT_PUBLIC_COPALIBERO_BACKEND=d1`, D1 migrado, `SESSION_SECRET`, y deploy con OpenNext (`npm run deploy:cf` o el flujo de Wrangler). Para desarrollo acorde al Worker: `npm run preview:cf`. Detalle en `.env.local.example` y `wrangler.jsonc`.

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

---

## Resumen rápido

| Objetivo | Qué usar |
| -------- | -------- |
| Solo mostrar demo, subir fácil (Git o ZIP) | `npm run build:static` → carpeta **`out/`** |
| Demo con `next dev` / build estándar | `NEXT_PUBLIC_COPALIBERO_DEMO=1` |
| Torneo real + admin Firebase | Todas las `NEXT_PUBLIC_FIREBASE_*` + `admins/{uid}` |
| Torneo real sin Firebase | `NEXT_PUBLIC_COPALIBERO_BACKEND=d1` + D1 + secrets |

Lista equivalente:

- **Demo estática (Git / ZIP):** `npm run build:static` → `out/`
- **Demo con Next normal:** `NEXT_PUBLIC_COPALIBERO_DEMO=1`
- **Producción Firebase:** `NEXT_PUBLIC_FIREBASE_*` + `admins/{uid}`
- **Producción sin Firebase:** `NEXT_PUBLIC_COPALIBERO_BACKEND=d1` + D1 + secrets
