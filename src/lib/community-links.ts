import "server-only";

import { query, withTransaction, isDbConfigured } from "@/lib/db";
import { ensureSchema } from "@/lib/db-init";

export type CommunityPlatform = "whatsapp" | "telegram" | "other";

export type CommunityLink = {
  id: string;
  platform: CommunityPlatform;
  title: string;
  titleEn: string;
  url: string;
};

export const defaultCommunityLinks: CommunityLink[] = [
  {
    id: "whatsapp-community-1",
    platform: "whatsapp",
    title: "مجموعة ICT الأولى على واتساب",
    titleEn: "ICT WhatsApp Group 1",
    url: "https://chat.whatsapp.com/EPc7aW79gQd347mXPqyuiT",
  },
  {
    id: "whatsapp-community-2",
    platform: "whatsapp",
    title: "مجموعة ICT الثانية على واتساب",
    titleEn: "ICT WhatsApp Group 2",
    url: "https://chat.whatsapp.com/BoeyQBSZa92APsol5asLtH",
  },
  {
    id: "telegram-community",
    platform: "telegram",
    title: "قناة مجتمع ICT على تيليجرام",
    titleEn: "ICT Community on Telegram",
    url: "https://t.me/ICT_PS",
  },
  {
    id: "whatsapp-contact",
    platform: "whatsapp",
    title: "تواصل مباشر على واتساب",
    titleEn: "Contact us on WhatsApp",
    url: "https://wa.me/972567598142",
  },
];

export async function getCommunityLinks(): Promise<CommunityLink[]> {
  if (!isDbConfigured()) return defaultCommunityLinks;

  try {
    await ensureSchema();
    const result = await query<{
      id: string;
      platform: CommunityPlatform;
      title: string;
      title_en: string;
      url: string;
    }>(
      `SELECT id, platform, title, title_en, url FROM community_links ORDER BY position ASC`,
    );

    if (!result.rows.length) return defaultCommunityLinks;

    return result.rows.map((row) => ({
      id: row.id,
      platform: row.platform,
      title: row.title,
      titleEn: row.title_en,
      url: row.url,
    }));
  } catch (error) {
    console.error("Failed to fetch community links from PostgreSQL:", error);
    return defaultCommunityLinks;
  }
}

export async function saveCommunityLinks(items: CommunityLink[]) {
  if (!isDbConfigured()) {
    throw new Error("إعدادات قاعدة بيانات PostgreSQL غير مكتملة.");
  }

  await ensureSchema();

  await withTransaction(async (client) => {
    await client.query("DELETE FROM community_links");

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await client.query(
        `INSERT INTO community_links (id, platform, title, title_en, url, position)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.id, item.platform, item.title, item.titleEn, item.url, i],
      );
    }
  });
}
