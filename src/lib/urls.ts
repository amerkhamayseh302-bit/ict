const allowedProtocols = new Set(["http:", "https:"]);

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return allowedProtocols.has(url.protocol) && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be configured in production.");
  }
  const url = new URL(configured || "http://localhost:3000");
  if (url.username || url.password || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a public HTTPS URL in production.");
  }
  return url.origin;
}
