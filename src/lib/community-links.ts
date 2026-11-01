import "server-only";

import { createAdminSupabaseClient } from "@/lib/admin-supabase";

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
  const client = createAdminSupabaseClient();
  if (!client) return defaultCommunityLinks;
  const { data, error } = await client
    .from("community_links")
    .select("id, platform, title, title_en, url")
    .order("position", { ascending: true });
  if (error) throw error;
  if (!data?.length) return defaultCommunityLinks;
  return data.map((row) => ({
    id: row.id as string,
    platform: row.platform as CommunityPlatform,
    title: row.title as string,
    titleEn: row.title_en as string,
    url: row.url as string,
  }));
}

export async function saveCommunityLinks(items: CommunityLink[]) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase server configuration is missing.");
  const { error } = await client.rpc("replace_community_links", {
    links: items.map((item, position) => ({
      id: item.id,
      platform: item.platform,
      title: item.title,
      title_en: item.titleEn,
      url: item.url,
      position,
    })),
  });
  if (error) throw error;
}
