import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

const communityLinksFile = path.join(
  process.cwd(),
  "data",
  "community-links.json",
);

export async function getCommunityLinks(): Promise<CommunityLink[]> {
  try {
    return JSON.parse(await readFile(communityLinksFile, "utf8")) as CommunityLink[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultCommunityLinks;
    }
    throw error;
  }
}

export async function saveCommunityLinks(items: CommunityLink[]) {
  await mkdir(path.dirname(communityLinksFile), { recursive: true });
  await writeFile(communityLinksFile, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}
