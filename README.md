# CopaLibero

Web del torneo (Next.js): tabla, partidos, jugadores y panel admin con Firebase.

## Publicar **sin Firebase** (solo datos de ejemplo)

La app solo arranca la parte pública si hay **Firebase completo** o **modo demo** activado.

1. En tu hosting (p. ej. [Vercel](https://vercel.com)), abrí el proyecto → **Settings** → **Environment Variables**.
2. Agregá **una sola** variable (Production y, si querés, Preview):
   - **Name:** `NEXT_PUBLIC_COPALIBERO_DEMO`
   - **Value:** `1`
3. **No** cargues las variables `NEXT_PUBLIC_FIREBASE_*` si todavía no tenés proyecto Firebase listo. Si quedan vacías o incompletas, la app igual entra en **modo demo** (datos locales de ejemplo).
4. Hacé un **redeploy** después de guardar variables.

En local, lo mismo en `.env.local`:

```bash
NEXT_PUBLIC_COPALIBERO_DEMO=1
```

Luego `npm run dev` o `npm run build && npm start`.

**Qué incluye el modo demo:** inicio, partidos, jugadores y detalle con datos de ejemplo. **El panel admin** (Firestore + Auth) **no** puede guardar datos hasta que configures Firebase y tu usuario en `admins/{uid}`.

---

## Publicar **con Firebase** (datos reales + admin)

1. Copiá `.env.local.example` a `.env.local` y completá todas las `NEXT_PUBLIC_FIREBASE_*`.
2. En Firestore, creá el documento **`admins/{tu_uid}`** para el usuario con el que te logueás.
3. Reglas: ver `firebase/firestore.rules`.
4. **Quitá** `NEXT_PUBLIC_COPALIBERO_DEMO` o ponela distinta de `1` si ya no querés mezclar datos de prueba.

---

## Desarrollo

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Deploy (referencia rápida)

| Objetivo              | Variables mínimas                                      |
| --------------------- | ------------------------------------------------------ |
| Demo público        | `NEXT_PUBLIC_COPALIBERO_DEMO=1`                        |
| Producción con torneo | Todas las `NEXT_PUBLIC_FIREBASE_*` + doc `admins/...` |

Plataformas habituales: **Vercel**, **Netlify**, **Cloudflare Pages** (build: `npm run build`, output según doc de Next.js 16).
