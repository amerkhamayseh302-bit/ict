import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, type LucideIcon } from "lucide-react";

export function SectionCard({ href, title, description, count, Icon, locale }: { href: string; title: string; description: string; count: string; Icon: LucideIcon; locale: "ar" | "en" }) {
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  return <Link className="section-card" href={href}><span className="section-icon"><Icon size={22} /></span><span className="section-count">{count}</span><h3>{title}</h3><p>{description}</p><span className="section-link">{locale === "ar" ? "اكتشف القسم" : "Explore section"}<Arrow size={17} /></span></Link>;
}
