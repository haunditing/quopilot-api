import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { UploadImageInput } from "../schemas/branding-schema.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function extForMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/gif": "gif",
  };
  return map[mime] ?? "bin";
}

/**
 * Guarda una imagen recibida como base64 en /uploads y devuelve la ruta
 * relativa para servirla. La ruta es estable y segura (nombre generado).
 */
export async function saveUploadedImage(
  input: UploadImageInput,
): Promise<{ url: string }> {
  const ext = extForMime(input.mime);
  const safeName = path
    .basename(input.filename)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.(png|jpe?g|webp|svg|gif)$/i, "");
  const filename = `${crypto.randomUUID()}-${safeName || "image"}.${ext}`;

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const buffer = Buffer.from(input.data.replace(/\s/g, ""), "base64");
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return { url: `/uploads/${filename}` };
}
