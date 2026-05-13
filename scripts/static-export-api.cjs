/**
 * next export no admite Route Handlers. Este script mueve `src/app/api` fuera
 * del árbol durante `npm run build:static` y lo restaura después.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const apiSrc = path.join(root, "src", "app", "api");
const apiBak = path.join(root, "src", ".static_export_api_bak");

const cmd = process.argv[2];

if (cmd === "prebuild") {
  if (fs.existsSync(apiSrc)) {
    if (fs.existsSync(apiBak)) fs.rmSync(apiBak, { recursive: true, force: true });
    fs.renameSync(apiSrc, apiBak);
    console.log("[build:static] API routes movidas temporalmente.");
  } else {
    console.log("[build:static] No hay src/app/api, se omite.");
  }
} else if (cmd === "postbuild") {
  if (fs.existsSync(apiBak)) {
    if (fs.existsSync(apiSrc)) fs.rmSync(apiSrc, { recursive: true, force: true });
    fs.renameSync(apiBak, apiSrc);
    console.log("[build:static] API routes restauradas.");
  }
} else {
  console.error("Uso: node scripts/static-export-api.cjs prebuild|postbuild");
  process.exit(1);
}
