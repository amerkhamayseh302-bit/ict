"use client";

import Image from "next/image";
import { useState } from "react";

export function IctLogo({
  size,
  alt = "",
  priority = false,
}: {
  size: number;
  alt?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="ict-logo-fallback"
        style={{
          width: size,
          height: "auto",
          maxWidth: "100%",
          aspectRatio: "1 / 1",
        }}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        ICT
      </span>
    );
  }

  return (
    <Image
      src="/ict-logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
