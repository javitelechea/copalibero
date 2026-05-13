/** Convierte un archivo de imagen a JPEG en base64 (data URL), recortado para caber en Firestore. */
const MAX_EDGE = 384;
const MAX_DATA_URL_CHARS = 850_000;

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    throw new Error("No se pudo procesar la imagen.");
  }
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  let quality = 0.82;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > MAX_DATA_URL_CHARS && quality > 0.42) {
    quality -= 0.08;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  if (data.length > MAX_DATA_URL_CHARS) {
    throw new Error("La imagen es muy grande. Probá otra más chica o otra foto.");
  }
  return data;
}
