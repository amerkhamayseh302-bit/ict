import "server-only";

import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/admin-supabase";

const bucket = "ict-media";
export type MediaRecord = { id: string; name: string; type: string; size: number; createdAt: string };
export type VerifiedImage = { bytes: Uint8Array; type: string };

function sniffImageType(bytes: Uint8Array): string | null {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
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
  // [SECURITY FIX]: Verify image signatures instead of trusting the browser supplied MIME type.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  return type ? { bytes, type } : null;
}

export async function listMedia(): Promise<MediaRecord[]> {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase server configuration is missing.");
  const { data, error } = await client.from("media_assets").select("id, name, type, size, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id as string, name: row.name as string, type: row.type as string, size: Number(row.size), createdAt: row.created_at as string }));
}

export async function storeMedia(file: File, verifiedImage: VerifiedImage): Promise<MediaRecord> {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase server configuration is missing.");
  const safeName = file.name.replace(/\\/g, "/").split("/").pop()?.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 150) || "image";
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const { error: uploadError } = await client.storage.from(bucket).upload(id, Buffer.from(verifiedImage.bytes), {
    contentType: verifiedImage.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const record: MediaRecord = { id, name: safeName, type: verifiedImage.type, size: verifiedImage.bytes.byteLength, createdAt };
  const { error: metadataError } = await client.from("media_assets").insert({
    id, name: safeName, type: verifiedImage.type, size: record.size, object_path: id, created_at: createdAt,
  });
  if (metadataError) {
    await client.storage.from(bucket).remove([id]);
    throw metadataError;
  }
  return record;
}

export async function deleteMedia(id: string) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase server configuration is missing.");
  const { data, error } = await client.from("media_assets").select("id, name, type, size, created_at, object_path").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { error: removeError } = await client.storage.from(bucket).remove([data.object_path as string]);
  if (removeError) throw removeError;
  const { error: deleteError } = await client.from("media_assets").delete().eq("id", id);
  if (deleteError) throw deleteError;
  return { id: data.id as string, name: data.name as string, type: data.type as string, size: Number(data.size), createdAt: data.created_at as string };
}

export async function readMediaFile(id: string) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase server configuration is missing.");
  const { data: record, error } = await client.from("media_assets").select("id, name, type, size, created_at, object_path").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!record) return null;
  const { data: blob, error: downloadError } = await client.storage.from(bucket).download(record.object_path as string);
  if (downloadError || !blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type || type !== record.type) return null;
  return {
    record: { id: record.id as string, name: record.name as string, type, size: Number(record.size), createdAt: record.created_at as string },
    bytes,
  };
}
