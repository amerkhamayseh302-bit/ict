import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type MediaRecord = { id: string; name: string; type: string; size: number; createdAt: string };
export type VerifiedImage = { bytes: Uint8Array; type: string };
const dataDirectory = path.join(process.cwd(), "data");
const uploadsDirectory = path.join(dataDirectory, "uploads");
const mediaFile = path.join(dataDirectory, "media.json");

export async function listMedia(): Promise<MediaRecord[]> {
  try {
    return (JSON.parse(await readFile(mediaFile, "utf8")) as MediaRecord[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function sniffImageType(bytes: Uint8Array): string | null {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (bytes.length >= 2 && ascii(0, 2) === "BM") return "image/bmp";
  if (bytes.length >= 4 && (ascii(0, 4) === "II*\u0000" || ascii(0, 4) === "MM\u0000*")) return "image/tiff";
  if (bytes.length >= 12 && ascii(4, 4) === "ftyp" && /^(avif|avis)$/.test(ascii(8, 4))) return "image/avif";
  return null;
}

export async function inspectImageFile(file: File): Promise<VerifiedImage | null> {
  // [SECURITY FIX]: Treat the browser-provided MIME type as untrusted; identify content from file signatures.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  return type ? { bytes, type } : null;
}

export async function storeMedia(file: File, verifiedImage: VerifiedImage): Promise<MediaRecord> {
  await mkdir(uploadsDirectory, { recursive: true });
  const safeName = file.name.replace(/\\/g, "/").split("/").pop()?.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 150) || "image";
  const id = randomUUID();
  const record: MediaRecord = { id, name: safeName, type: verifiedImage.type, size: verifiedImage.bytes.byteLength, createdAt: new Date().toISOString() };
  const records = await listMedia();
  await writeFile(path.join(uploadsDirectory, id), Buffer.from(verifiedImage.bytes), { flag: "wx" });
  await writeFile(mediaFile, `${JSON.stringify([record, ...records], null, 2)}\n`, "utf8");
  return record;
}

export async function deleteMedia(id: string) {
  const records = await listMedia();
  const record = records.find((item) => item.id === id);
  if (!record) return null;
  const { unlink } = await import("node:fs/promises");
  await unlink(path.join(uploadsDirectory, id));
  await writeFile(mediaFile, `${JSON.stringify(records.filter((item) => item.id !== id), null, 2)}\n`, "utf8");
  return record;
}

export async function readMediaFile(id: string) {
  const record = (await listMedia()).find((item) => item.id === id);
  if (!record) return null;
  const bytes = await readFile(path.join(uploadsDirectory, id));
  const type = sniffImageType(bytes);
  if (!type) return null;
  return { record: { ...record, type }, bytes };
}
