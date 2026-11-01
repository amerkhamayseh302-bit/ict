export type Locale = "ar" | "en";
export type CatalogType = "course" | "ai-tool" | "resource" | "opportunity" | "event";

export type CatalogItem = {
  slug: string;
  type: CatalogType;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  category: string;
  categoryEn: string;
  url: string;
  label?: string;
  labelEn?: string;
  imageUrl?: string;
  startAt?: string;
  tags: string[];
};

export const catalog: CatalogItem[] = [
  { slug: "arduino-docs", type: "course", title: "مدخل إلى Arduino", titleEn: "Getting started with Arduino", summary: "ابدأ من الدليل الرسمي وتعرّف على اللوحة وأول مشروع إلكتروني.", summaryEn: "Start with the official guide to the board and your first electronics project.", category: "إلكترونيات وبرمجة", categoryEn: "Electronics & coding", url: "https://docs.arduino.cc/learn/", label: "دليل خارجي", labelEn: "External guide", tags: ["arduino", "الكترونيات", "electronics", "برمجة"] },
  { slug: "web-dev-mdn", type: "course", title: "تعلم تطوير الويب", titleEn: "Learn web development", summary: "مسار تعليمي منظم لتعلم HTML وCSS وJavaScript.", summaryEn: "A structured path for learning HTML, CSS, and JavaScript.", category: "تطوير الويب", categoryEn: "Web development", url: "https://developer.mozilla.org/en-US/docs/Learn", label: "مجاني", labelEn: "Free", tags: ["html", "css", "javascript", "ويب", "web"] },
  { slug: "deepseek", type: "ai-tool", title: "DeepSeek", titleEn: "DeepSeek", summary: "مساعد ذكاء اصطناعي للبحث والكتابة ومساعدة البرمجة.", summaryEn: "An AI assistant for research, writing, and coding help.", category: "مساعد ذكي", categoryEn: "AI assistant", url: "https://www.deepseek.com/", label: "مجاني / حسب الخطة", labelEn: "Free / plan-dependent", tags: ["بحث", "كتابة", "برمجة", "research", "writing", "coding"] },
  { slug: "ideogram", type: "ai-tool", title: "Ideogram", titleEn: "Ideogram", summary: "أداة لتوليد الصور والتصاميم من وصف نصي.", summaryEn: "Generate images and designs from text prompts.", category: "توليد الصور", categoryEn: "Image generation", url: "https://ideogram.ai/", label: "خطة مجانية متاحة", labelEn: "Free plan available", tags: ["صور", "تصميم", "images", "design"] },
  { slug: "github-student", type: "resource", title: "GitHub Student Developer Pack", titleEn: "GitHub Student Developer Pack", summary: "عروض وأدوات تعليمية للطلاب المؤهلين من شركاء GitHub.", summaryEn: "Offers and learning tools for eligible students from GitHub partners.", category: "موارد للطلاب", categoryEn: "Student resources", url: "https://education.github.com/pack", label: "تحقق من شروط الأهلية", labelEn: "Check eligibility", tags: ["طلاب", "برمجة", "students", "coding"] },
  { slug: "freecodecamp", type: "resource", title: "freeCodeCamp", titleEn: "freeCodeCamp", summary: "دروس ومشاريع تفاعلية لتعلم البرمجة وتقنيات الويب.", summaryEn: "Interactive lessons and projects for coding and web technologies.", category: "تعلم البرمجة", categoryEn: "Learn to code", url: "https://www.freecodecamp.org/learn/", label: "مجاني", labelEn: "Free", tags: ["برمجة", "ويب", "coding", "web"] },
  { slug: "linkedin-jobs", type: "opportunity", title: "ابحث عن فرص تقنية", titleEn: "Find technology opportunities", summary: "استخدم البحث عن الوظائف للعثور على فرص مناسبة؛ تحقق من الموعد والشروط لدى الجهة المعلنة.", summaryEn: "Search for relevant roles and verify deadlines and requirements with the publisher.", category: "وظائف", categoryEn: "Jobs", url: "https://www.linkedin.com/jobs/", label: "رابط بحث عام", labelEn: "General search link", tags: ["وظائف", "تدريب", "jobs", "internships"] },
  { slug: "erasmus-scholarships", type: "opportunity", title: "منح Erasmus Mundus", titleEn: "Erasmus Mundus scholarships", summary: "تعرّف على برامج الماجستير المشتركة والمنح المتاحة عبر الموقع الرسمي.", summaryEn: "Explore joint master's programmes and scholarships on the official site.", category: "منح", categoryEn: "Scholarships", url: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters", label: "راجع مواعيد كل برنامج", labelEn: "Check each programme deadline", tags: ["منح", "دراسة", "scholarship", "study"] },
  { slug: "community-events", type: "event", title: "فعاليات مجتمع ICT", titleEn: "ICT Community events", summary: "تابع قنوات المجتمع لمعرفة مواعيد اللقاءات والورش القادمة.", summaryEn: "Follow the community channels for upcoming meetups and workshops.", category: "فعاليات المجتمع", categoryEn: "Community events", url: "https://t.me/ICT_PS", label: "تابع الإعلانات", labelEn: "Follow announcements", tags: ["لقاءات", "ورش", "meetups", "workshops"] }
];

export const typeInfo: Record<CatalogType, { title: string; titleEn: string; description: string; descriptionEn: string; path: string }> = {
  course: { title: "الدورات", titleEn: "Courses", description: "مصادر ودورات تساعدك تتعلم مهارات تقنية خطوة بخطوة.", descriptionEn: "Courses and learning resources to build your technology skills.", path: "courses" },
  "ai-tool": { title: "أدوات الذكاء الاصطناعي", titleEn: "AI tools", description: "أدوات ذكاء اصطناعي مرتبة حسب الاستخدام والتصنيف.", descriptionEn: "AI tools organized by purpose and category.", path: "ai-tools" },
  resource: { title: "الموارد التقنية", titleEn: "Technology resources", description: "أدلة ومراجع ومصادر مفيدة للمجتمع التقني.", descriptionEn: "Guides, references, and useful resources for the tech community.", path: "resources" },
  opportunity: { title: "الوظائف والمنح", titleEn: "Jobs & scholarships", description: "مصادر تساعدك تتابع الوظائف والتدريب والمنح. تحقق دائماً من المصدر الأصلي.", descriptionEn: "Find jobs, internships, and scholarships. Always verify details with the original publisher.", path: "opportunities" },
  event: { title: "الفعاليات", titleEn: "Events", description: "تابع فعاليات وورش مجتمع ICT والمجتمع التقني.", descriptionEn: "Follow ICT Community events and technology workshops.", path: "events" }
};

export function getCatalogItems(type?: CatalogType, locale: Locale = "ar", query = "", category = "") {
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  return catalog.filter((item) => {
    if (type && item.type !== type) return false;
    if (category && (locale === "en" ? item.categoryEn : item.category) !== category) return false;
    if (!normalizedQuery) return true;
    const text = [item.title, item.titleEn, item.summary, item.summaryEn, item.category, item.categoryEn, ...item.tags].join(" ").toLocaleLowerCase(locale);
    return text.includes(normalizedQuery);
  });
}

export function getCatalogItem(slug: string, type?: CatalogType) {
  return catalog.find((item) => item.slug === slug && (!type || item.type === type));
}

export function getCategories(type: CatalogType, locale: Locale) {
  return [...new Set(getCatalogItems(type).map((item) => locale === "en" ? item.categoryEn : item.category))];
}
