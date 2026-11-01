import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/urls";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/api/"] }, sitemap: `${getSiteUrl()}/sitemap.xml` }; }
