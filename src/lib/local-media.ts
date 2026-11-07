import "server-only";

import { randomUUID } from "node:crypto";
import { query, isDbConfigured } from "@/lib/db";
import { ensureSchema } from "@/lib/db-init";

export type MediaRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
};

export type VerifiedImage = {
  bytes: Uint8Array;
  type: string;
};

function sniffImageType(bytes: Uint8Array): string | null {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));

  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    )
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(ascii(0, 6))
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 4) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 2 && ascii(0, 2) === "BM") {
    return "image/bmp";
  }
  if (
    bytes.length >= 4 &&
    (ascii(0, 4) === "II*\u0000" || ascii(0, 4) === "MM\u0000*")
  ) {
    return "image/tiff";
  }
  if (
    bytes.length >= 12 &&
    ascii(4, 4) === "ftyp" &&
    /^(avif|avis)$/.test(ascii(8, 4))
  ) {
    return "image/avif";
  }
  return null;
}

export async function inspectImageFile(file: File): Promise<VerifiedImage | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  return type ? { bytes, type } : null;
}

export async function listMedia(): Promise<MediaRecord[]> {
  if (!isDbConfigured()) {
    throw new Error("إعدادات قاعدة بيانات PostgreSQL غير مكتملة.");
  }

  await ensureSchema();

  const result = await query<{
    id: string;
    name: string;
    type: string;
    size: string | number;
    created_at: Date | string;
  }>(
    `SELECT id, name, type, size, created_at FROM media_assets ORDER BY created_at DESC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    size: Number(row.size),
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function storeMedia(
  file: File,
  verifiedImage: VerifiedImage,
): Promise<MediaRecord> {
  if (!isDbConfigured()) {
    throw new Error("إعدادات قاعدة بيانات PostgreSQL غير مكتملة.");
  }

  await ensureSchema();

  const safeName =
    file.name
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, 150) || "image";

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const size = verifiedImage.bytes.byteLength;
  const buffer = Buffer.from(verifiedImage.bytes);

  await query(
    `INSERT INTO media_assets (id, name, type, size, data, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, safeName, verifiedImage.type, size, buffer, createdAt],
  );

  return {
    id,
    name: safeName,
    type: verifiedImage.type,
    size,
    createdAt,
  };
}

export async function deleteMedia(id: string): Promise<MediaRecord | null> {
  if (!isDbConfigured()) {
    throw new Error("إعدادات قاعدة بيانات PostgreSQL غير مكتملة.");
  }

  await ensureSchema();

  const result = await query<{
    id: string;
    name: string;
    type: string;
    size: string | number;
    created_at: Date | string;
  }>(
    `DELETE FROM media_assets WHERE id = $1
     RETURNING id, name, type, size, created_at`,
    [id],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    size: Number(row.size),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function readMediaFile(
  id: string,
): Promise<{ record: MediaRecord; bytes: Uint8Array } | null> {
  if (!isDbConfigured()) {
    throw new Error("إعدادات قاعدة بيانات PostgreSQL غير مكتملة.");
  }

  await ensureSchema();

  const result = await query<{
    id: string;
    name: string;
    type: string;
    size: string | number;
    data: Buffer;
    created_at: Date | string;
  }>(
    `SELECT id, name, type, size, data, created_at
     FROM media_assets
     WHERE id = $1`,
    [id],
  );

  const row = result.rows[0];
  if (!row || !row.data) return null;

  const bytes = new Uint8Array(row.data);
  const detectedType = sniffImageType(bytes);
  if (!detectedType || detectedType !== row.type) {
    return null;
  }

  return {
    record: {
      id: row.id,
      name: row.name,
      type: row.type,
      size: Number(row.size),
      createdAt: new Date(row.created_at).toISOString(),
    },
    bytes,
  };
}
