export type StoredMedia = { id: string; name: string; type: string; size: number; createdAt: string; url: string };

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "تعذّر الاتصال بالخادم.");
  return body as T;
}

export async function getMedia(): Promise<StoredMedia[]> {
  return (await parseResponse<{ items: StoredMedia[] }>(await fetch("/api/admin/media", { cache: "no-store" }))).items;
}

export async function putMedia(files: File[]): Promise<StoredMedia[]> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  return (await parseResponse<{ items: StoredMedia[] }>(await fetch("/api/admin/media", { method: "POST", body: form }))).items;
}

export async function removeMedia(id: string) {
  await parseResponse(await fetch(`/api/admin/media?id=${encodeURIComponent(id)}`, { method: "DELETE" }));
}
