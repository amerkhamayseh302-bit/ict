"use client";

import {
  Activity,
  ArrowDownLeft,
  ArrowUpLeft,
  Bell,
  BookOpen,
  Copy,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Link2,
  Menu,
  MessageSquareText,
  Image as ImageIcon,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { catalog, type CatalogType } from "@/features/catalog";
import { IctLogo } from "@/components/layout/ict-logo";
import { CommunityLinksPanel } from "./community-links-panel";
import {
  getMedia,
  putMedia,
  removeMedia,
  type StoredMedia,
} from "./media-storage";

type Status = "published" | "draft";
type ManagedItem = {
  id: string;
  slug: string;
  type: CatalogType;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  category: string;
  url: string;
  categoryEn?: string;
  tags?: string[];
  label?: string;
  labelEn?: string;
  status: Status;
  updatedAt: string;
  imageUrl?: string;
  startAt?: string;
};
type MediaAsset = StoredMedia & { preview: string };

const defaultCategories: Record<CatalogType, string[]> = {
  course: ["برمجة", "أمن سيبراني", "تطوير الويب", "قواعد البيانات", "شبكات"],
  "ai-tool": ["كتابة", "تصميم", "توليد الصور", "توليد الفيديو", "إنتاجية"],
  resource: ["برمجة", "أمن سيبراني", "ذكاء اصطناعي", "تصميم", "عام"],
  opportunity: ["وظائف", "تدريب", "منح", "تطوع"],
  event: ["ورش عمل", "لقاءات", "هاكاثون", "ندوات"],
};
const typeInfo: Record<CatalogType, { label: string; icon: typeof BookOpen }> =
  {
    course: { label: "دورة", icon: BookOpen },
    "ai-tool": { label: "أداة ذكاء اصطناعي", icon: Sparkles },
    resource: { label: "مورد تقني", icon: FileText },
    opportunity: { label: "فرصة", icon: BriefcaseBusiness },
    event: { label: "فعالية", icon: Activity },
  };
const initialItems: ManagedItem[] = catalog.map((item) => ({
  id: item.slug,
  slug: item.slug,
  type: item.type,
  title: item.title,
  titleEn: item.titleEn,
  summary: item.summary,
  summaryEn: item.summaryEn,
  category: item.category,
  url: item.url,
  status: "published",
  updatedAt: "2026-10-25",
}));
const blankForm = {
  title: "",
  titleEn: "",
  type: "course" as CatalogType,
  summary: "",
  category: "",
  url: "",
  status: "published" as Status,
  imageUrl: "",
  startAt: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} بايت`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} كيلوبايت`;
  return `${(value / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

export function AdminDashboard() {
  const [items, setItems] = useState(initialItems);
  const [ready, setReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [adminConfigured, setAdminConfigured] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<
    "overview" | "content" | "media" | "communities" | "suggestions" | "settings"
  >("overview");
  const [filter, setFilter] = useState<"all" | CatalogType>("all");
  const [branchFilter, setBranchFilter] = useState("");
  const [categories, setCategories] = useState(
    () =>
      Object.fromEntries(
        (Object.keys(typeInfo) as CatalogType[]).map((type) => [
          type,
          Array.from(
            new Set([
              ...(defaultCategories[type] ?? []),
              ...initialItems
                .filter((item) => item.type === type)
                .map((item) => item.category),
            ]),
          ),
        ]),
      ) as Record<CatalogType, string[]>,
  );
  const [branchModal, setBranchModal] = useState(false);
  const [branchType, setBranchType] = useState<CatalogType>("course");
  const [branchName, setBranchName] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [mediaMessage, setMediaMessage] = useState("");
  const [sendingEventId, setSendingEventId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setAdminConfigured(Boolean(data.configured));
        setAuthenticated(Boolean(data.authenticated));
        setAuthReady(true);
      })
      .catch(() => {
        setAuthError("تعذّر الاتصال بخادم الموقع.");
        setAuthReady(true);
      });
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    Promise.all([
      fetch("/api/admin/content", { cache: "no-store" }).then(
        async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          return data.items as ManagedItem[];
        },
      ),
      fetch("/api/admin/categories", { cache: "no-store" }).then(
        async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          return data.categories as Record<CatalogType, string[]>;
        },
      ),
      getMedia(),
    ])
      .then(([loadedItems, loadedCategories, loadedMedia]) => {
        setItems(loadedItems);
        setCategories(
          (current) =>
            Object.fromEntries(
              (Object.keys(typeInfo) as CatalogType[]).map((type) => [
                type,
                Array.from(
                  new Set([
                    ...current[type],
                    ...(loadedCategories[type] ?? []),
                    ...loadedItems
                      .filter((item) => item.type === type)
                      .map((item) => item.category),
                  ]),
                ),
              ]),
            ) as Record<CatalogType, string[]>,
        );
        setAssets(
          loadedMedia.map((asset) => ({ ...asset, preview: asset.url })),
        );
        setReady(true);
      })
      .catch((error: Error) => {
        setMediaMessage(error.message || "تعذّر تحميل بيانات لوحة التحكم.");
        setReady(true);
      });
  }, [authenticated]);

  useEffect(() => {
    if (view !== "media" && !modal) return;
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter(
        (file) => file.type.startsWith("image/"),
      );
      if (files.length) {
        event.preventDefault();
        void addFiles(files, modal);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [view, modal]);

  async function addFiles(files: File[], selectFirst = false) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (!images.length) {
      setMediaMessage("اختَر ملفات صور؛ أنواع الصور المختلفة مدعومة.");
      return;
    }
    try {
      const added = (await putMedia(images)).map((asset) => ({
        ...asset,
        preview: asset.url,
      }));
      setAssets((current) => [...added, ...current]);
      if (selectFirst && added[0])
        setForm((current) => ({ ...current, imageUrl: added[0].url }));
      setMediaMessage(`تم رفع ${added.length} صورة إلى خادم الموقع.`);
    } catch (error) {
      setMediaMessage(
        error instanceof Error ? error.message : "تعذّر حفظ الصور على الخادم.",
      );
    }
  }

  async function copyImage(asset: MediaAsset) {
    try {
      if (!navigator.clipboard?.write)
        throw new Error("Clipboard image writing is unavailable");
      const blob = await fetch(asset.url).then((response) => response.blob());
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
      bitmap.close();
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Could not encode image")),
          "image/png",
        ),
      );
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      setMediaMessage("نُسخت الصورة إلى الحافظة بصيغة PNG.");
    } catch {
      setMediaMessage(
        "لم يسمح المتصفح بنسخ الصورة. جرّب اللصق أو تنزيل الملف.",
      );
    }
  }

  async function deleteImage(asset: MediaAsset) {
    if (!window.confirm(`حذف الصورة «${asset.name}» من خادم الموقع؟`)) return;
    await removeMedia(asset.id);
    setAssets((current) => current.filter((entry) => entry.id !== asset.id));
    setMediaMessage("تم حذف الصورة من المكتبة.");
  }

  const published = items.filter((item) => item.status === "published").length;
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const typeMatch = filter === "all" || item.type === filter;
        const text =
          `${item.title} ${item.titleEn} ${item.category}`.toLocaleLowerCase(
            "ar",
          );
        return (
          typeMatch &&
          (!branchFilter || item.category === branchFilter) &&
          text.includes(query.trim().toLocaleLowerCase("ar"))
        );
      }),
    [branchFilter, filter, items, query],
  );

  function startCreate() {
    setEditing(null);
    setForm(blankForm);
    setModal(true);
  }
  function startEdit(item: ManagedItem) {
    setEditing(item.id);
    const localStartAt = item.startAt
      ? new Date(
          new Date(item.startAt).getTime() -
            new Date(item.startAt).getTimezoneOffset() * 60_000,
        )
          .toISOString()
          .slice(0, 16)
      : "";
    setForm({
      title: item.title,
      titleEn: item.titleEn,
      type: item.type,
      summary: item.summary,
      category: item.category,
      url: item.url,
      status: item.status,
      imageUrl: item.imageUrl ?? "",
      startAt: localStartAt,
    });
    setMenu(null);
    setModal(true);
  }
  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = editing ?? `ict-${Date.now()}`;
    const old = items.find((item) => item.id === editing);
    const item: ManagedItem = {
      ...form,
      startAt:
        form.type === "event" && form.startAt
          ? new Date(form.startAt).toISOString()
          : undefined,
      id,
      slug: old?.slug ?? id,
      summaryEn: old?.summaryEn ?? "",
      categoryEn: old?.categoryEn ?? "",
      tags: old?.tags ?? [],
      updatedAt: new Date().toISOString(),
    };
    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const saved = result.item as ManagedItem;
      setItems((current) =>
        editing
          ? current.map((entry) => (entry.id === editing ? saved : entry))
          : [saved, ...current],
      );
      setModal(false);
      setNotice(true);
      window.setTimeout(() => setNotice(false), 2500);
    } catch (error) {
      setMediaMessage(
        error instanceof Error
          ? error.message
          : "تعذّر حفظ المحتوى على الخادم.",
      );
    }
  }
  async function toggleStatus(item: ManagedItem) {
    const updated = {
      ...item,
      status:
        item.status === "published"
          ? ("draft" as const)
          : ("published" as const),
    };
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    const result = await response.json();
    if (response.ok)
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? result.item : entry)),
      );
    else setMediaMessage(result.error ?? "تعذّر تحديث حالة المحتوى.");
    setMenu(null);
  }
  async function sendEvent(item: ManagedItem) {
    if (item.type !== "event" || item.status !== "published") return;
    if (
      !window.confirm(
        `إرسال «${item.title}» إلى أعضاء ICT الذين أكدوا بريدهم وفعّلوا تنبيهات الفعاليات؟`,
      )
    ) {
      return;
    }
    setSendingEventId(item.id);
    setMediaMessage("");
    try {
      const response = await fetch("/api/admin/events/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: item.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "تعذّر إرسال الفعالية.");
      setMediaMessage(
        result.sentCount === 0 && result.message
          ? result.message
          : `وصلت الفعالية إلى ${result.sentCount} مشترك${result.failedCount ? `، وتعذّر الإرسال إلى ${result.failedCount}` : ""}.`,
      );
    } catch (error) {
      setMediaMessage(
        error instanceof Error ? error.message : "تعذّر إرسال الفعالية.",
      );
    } finally {
      setSendingEventId(null);
      setMenu(null);
    }
  }
  function selectView(next: typeof view) {
    setView(next);
    setMobileNav(false);
    if (next === "content") {
      setFilter("all");
      setBranchFilter("");
    }
  }
  function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = branchName.trim();
    if (!name) return;
    fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: branchType, name }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setCategories(result.categories);
        if (modal && form.type === branchType)
          setForm((current) => ({ ...current, category: name }));
        setBranchModal(false);
        setBranchName("");
        setNotice(true);
        window.setTimeout(() => setNotice(false), 2500);
      })
      .catch((error: Error) =>
        setMediaMessage(error.message || "تعذّر حفظ الفرع."),
      );
  }

  async function deleteContent(id: string) {
    if (!window.confirm("هل تريد حذف هذا المحتوى من خادم الموقع؟")) return;
    try {
      const response = await fetch(
        `/api/admin/content?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setMediaMessage(
        error instanceof Error ? error.message : "تعذّر حذف المحتوى.",
      );
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword }),
    });
    const result = await response.json();
    if (!response.ok) {
      setAuthError(result.error ?? "تعذّر تسجيل الدخول.");
      return;
    }
    setAuthenticated(true);
    setLoginPassword("");
  }
  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setReady(false);
  }

  const recent = filtered.slice(0, 5);
  const SidebarIcon = LayoutDashboard;
  if (!authReady)
    return (
      <div className="admin-gate" dir="rtl">
        <section>
          <span>
            <IctLogo size={48} alt="شعار ICT" />
          </span>
          <h1>جاري الاتصال</h1>
          <p>نتحقق من صلاحية الدخول إلى لوحة الإدارة…</p>
        </section>
      </div>
    );
  if (!adminConfigured)
    return (
      <div className="admin-gate" dir="rtl">
        <section>
          <span>
            <IctLogo size={48} alt="شعار ICT" />
          </span>
          <h1>إعداد حماية لوحة الإدارة</h1>
          <p>
            قبل استخدام API المحتوى، أضف كلمة مرور الإدارة وسر الجلسة إلى ملف{" "}
            <code>web/.env.local</code> ثم أعد تشغيل الموقع.
          </p>
          <pre>
            ADMIN_PASSWORD=كلمة-مرور-قوية
            <br />
            ADMIN_SESSION_SECRET=سر-عشوائي-طويل-32-حرفًا-على-الأقل
          </pre>
          <p className="gate-muted">
            لا ترفع هذا الملف إلى GitHub أو أي مستودع عام.
          </p>
        </section>
      </div>
    );
  if (!authenticated)
    return (
      <div className="admin-gate" dir="rtl">
        <form onSubmit={login}>
          <span>
            <IctLogo size={48} alt="شعار ICT" />
          </span>
          <h1>تسجيل دخول الإدارة</h1>
          <p>أدخل كلمة مرور الإدارة للمتابعة.</p>
          <label>
            كلمة المرور
            <input
              type="password"
              autoComplete="current-password"
              required
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
            />
          </label>
          {authError && <small role="alert">{authError}</small>}
          <button className="admin-primary" type="submit">
            دخول إلى اللوحة
          </button>
        </form>
      </div>
    );
  if (!ready)
    return (
      <div className="admin-gate" dir="rtl">
        <section>
          <span>
            <IctLogo size={48} alt="شعار ICT" />
          </span>
          <h1>جاري تحميل لوحة الإدارة</h1>
          <p>{mediaMessage || "نتصل بخادم الموقع…"}</p>
        </section>
      </div>
    );
  return (
    <div className="admin-shell" dir="rtl">
      <aside className={`admin-sidebar ${mobileNav ? "is-open" : ""}`}>
        <Link className="admin-brand" href="/ar">
          <span className="admin-brand-mark">
            <IctLogo size={40} />
          </span>
          <span>
            <b>ICT Community</b>
            <small>مساحة الإدارة</small>
          </span>
        </Link>
        <div className="admin-workspace">
          <span className="workspace-avatar">IC</span>
          <span>
            <b>مجتمع ICT</b>
            <small>مساحة العمل</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <small className="admin-nav-caption">القائمة الرئيسية</small>
        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${view === "overview" ? "active" : ""}`}
            onClick={() => selectView("overview")}
          >
            <SidebarIcon size={18} /> نظرة عامة
          </button>
          <button
            className={`admin-nav-item ${view === "content" ? "active" : ""}`}
            onClick={() => selectView("content")}
          >
            <FolderKanban size={18} /> إدارة المحتوى{" "}
            <small>{items.length}</small>
          </button>
          <button
            className={`admin-nav-item ${view === "media" ? "active" : ""}`}
            onClick={() => selectView("media")}
          >
            <ImageIcon size={18} /> مكتبة الصور <small>{assets.length}</small>
          </button>
          <button
            className={`admin-nav-item ${view === "communities" ? "active" : ""}`}
            onClick={() => selectView("communities")}
          >
            <Link2 size={18} /> روابط المجتمع
          </button>
          <button
            className="admin-nav-item disabled"
            onClick={() => selectView("suggestions")}
          >
            <MessageSquareText size={18} /> اقتراحات المجتمع <em>قريباً</em>
          </button>
        </nav>
        <small className="admin-nav-caption admin-nav-spaced">النظام</small>
        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${view === "settings" ? "active" : ""}`}
            onClick={() => selectView("settings")}
          >
            <Settings2 size={18} /> الإعدادات
          </button>
          <Link className="admin-nav-item" href="/ar">
            <ExternalLink size={18} /> عرض الموقع
          </Link>
        </nav>
        <div className="sidebar-spacer" />
        <div className="admin-help">
          <span>
            <CircleHelp size={17} />
          </span>
          <b>بحاجة لمساعدة؟</b>
          <p>نظّم محتوى مجتمع ICT في مكان واحد.</p>
        </div>
        <div className="admin-user">
          <i>A</i>
          <span>
            <b>مدير المجتمع</b>
            <small>مسؤول الموقع</small>
          </span>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-mobile-menu"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label="فتح القائمة"
          >
            <Menu size={19} />
          </button>
          <div className="admin-breadcrumb">
            <span>ICT Community</span>
            <i>/</i>
            <b>
              {view === "overview"
                ? "نظرة عامة"
                : view === "content"
                  ? "إدارة المحتوى"
                  : view === "media"
                    ? "مكتبة الصور"
                    : view === "settings"
                      ? "الإعدادات"
                      : view === "communities"
                        ? "روابط المجتمع"
                        : "اقتراحات المجتمع"}
            </b>
          </div>
          <div className="admin-top-actions">
            <span className="admin-date">
              <Clock3 size={14} /> الأحد، ٢٥ أكتوبر ٢٠٢٦
            </span>
            <button className="admin-icon-button" aria-label="الإشعارات">
              <Bell size={17} />
              <i />
            </button>
            <button
              className="admin-avatar admin-logout"
              title="تسجيل الخروج"
              onClick={() => void logout()}
            >
              A
            </button>
          </div>
        </header>
        <div className="admin-content">
          {(view === "overview" || view === "content") && (
            <>
              <div className="admin-heading">
                <div>
                  <small>مساحة عملك</small>
                  <h1>
                    {view === "overview" ? (
                      <>
                        أهلاً بك في لوحة التحكم <span>👋</span>
                      </>
                    ) : (
                      "إدارة المحتوى"
                    )}
                  </h1>
                  <p>
                    {view === "overview"
                      ? "تابع محتوى مجتمع ICT وأدره من مكان واحد."
                      : "أضف ونظّم الدورات والأدوات والموارد والفرص والفعاليات."}
                  </p>
                </div>
                <button className="admin-primary" onClick={startCreate}>
                  <Plus size={17} /> إضافة محتوى جديد
                </button>
              </div>
              <div className="admin-local-note">
                <WandSparkles size={17} />
                <p>
                  <b>نسخة محلية:</b> تحفظ التعديلات في هذا المتصفح فقط، ولا
                  تغيّر محتوى الموقع العام.
                </p>
                <button
                  onClick={(event) =>
                    event.currentTarget.parentElement?.remove()
                  }
                  aria-label="إغلاق"
                >
                  <X size={15} />
                </button>
              </div>
              {view === "overview" && (
                <>
                  <section className="admin-stats">
                    <StatCard
                      title="إجمالي المحتوى"
                      value={items.length}
                      text="عنصر في المكتبة"
                      icon={FolderKanban}
                      color="teal"
                    />
                    <StatCard
                      title="محتوى منشور"
                      value={published}
                      text="ظاهر على صفحات الموقع"
                      icon={Check}
                      color="green"
                    />
                    <StatCard
                      title="مسودات"
                      value={items.length - published}
                      text="بانتظار المراجعة"
                      icon={FileText}
                      color="amber"
                    />
                    <StatCard
                      title="أقسام المنصة"
                      value={5}
                      text="مجالات المحتوى"
                      icon={Activity}
                      color="blue"
                    />
                  </section>
                  <section className="admin-overview-grid">
                    <div className="admin-panel chart-panel">
                      <div className="panel-title">
                        <div>
                          <h2>توزيع المحتوى</h2>
                          <p>عدد العناصر في كل قسم</p>
                        </div>
                        <span>
                          المكتبة الحالية <ChevronDown size={13} />
                        </span>
                      </div>
                      <div className="activity-chart">
                        <div className="chart-y">
                          <span>العدد</span>
                          <span>{items.length}</span>
                          <span>{Math.ceil(items.length / 2)}</span>
                          <span>٠</span>
                        </div>
                        <div className="chart-columns">
                          {(Object.keys(typeInfo) as CatalogType[]).map(
                            (type) => {
                              const count = items.filter(
                                (item) => item.type === type,
                              ).length;
                              const height = items.length
                                ? Math.max(8, (count / items.length) * 100)
                                : 8;
                              const label =
                                type === "ai-tool"
                                  ? "أدوات"
                                  : type === "opportunity"
                                    ? "فرص"
                                    : type === "resource"
                                      ? "موارد"
                                      : type === "course"
                                        ? "دورات"
                                        : "فعاليات";
                              return (
                                <div className="chart-col" key={type}>
                                  <i style={{ height: `${height}%` }} />
                                  <small>{label}</small>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                      <div className="chart-legend">
                        <span>
                          <i /> عدد العناصر في المكتبة
                        </span>
                        <b>
                          <FolderKanban size={13} /> {items.length} إجمالي
                        </b>
                      </div>
                    </div>
                    <div className="admin-panel categories-panel">
                      <div className="panel-title">
                        <div>
                          <h2>أقسام المنصة</h2>
                          <p>تصفّح المحتوى حسب النوع</p>
                        </div>
                        <button
                          className="admin-link-button"
                          onClick={() => selectView("content")}
                        >
                          عرض الكل <ArrowUpLeft size={14} />
                        </button>
                      </div>
                      <div className="category-list">
                        {(Object.keys(typeInfo) as CatalogType[]).map(
                          (type) => {
                            const Icon = typeInfo[type].icon;
                            const count = items.filter(
                              (item) => item.type === type,
                            ).length;
                            return (
                              <button
                                key={type}
                                onClick={() => {
                                  setFilter(type);
                                  setBranchFilter("");
                                  setView("content");
                                }}
                              >
                                <span
                                  className={`category-icon ${type.replace("-", "")}`}
                                >
                                  <Icon size={16} />
                                </span>
                                <b>
                                  {type === "ai-tool"
                                    ? "أدوات الذكاء الاصطناعي"
                                    : type === "opportunity"
                                      ? "الوظائف والمنح"
                                      : type === "resource"
                                        ? "الموارد التقنية"
                                        : type === "course"
                                          ? "الدورات"
                                          : "الفعاليات"}
                                </b>
                                <small>
                                  {count.toString().padStart(2, "0")}
                                </small>
                                <ArrowDownLeft size={14} />
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </section>
                </>
              )}
              <ContentTable
                items={view === "overview" ? recent : filtered}
                filter={filter}
                query={query}
                setQuery={setQuery}
                setFilter={(value) => {
                  setFilter(value);
                  setBranchFilter("");
                }}
                branchFilter={branchFilter}
                setBranchFilter={setBranchFilter}
                categories={categories}
                onAddBranch={() => {
                  setBranchType(filter === "all" ? "course" : filter);
                  setBranchName("");
                  setBranchModal(true);
                }}
                full={view === "content"}
                onEdit={startEdit}
                onDelete={deleteContent}
                onToggle={toggleStatus}
                onSendEvent={sendEvent}
                sendingEventId={sendingEventId}
                menu={menu}
                setMenu={setMenu}
                onShowAll={() => selectView("content")}
              />
            </>
          )}
          {view === "media" && (
            <>
              <div className="admin-heading">
                <div>
                  <small>ملفاتك المرئية</small>
                  <h1>مكتبة الصور</h1>
                  <p>
                    ارفع الصور أو اسحبها وأفلتها هنا، أو الصق صورة من الحافظة.
                  </p>
                </div>
                <label className="admin-primary media-upload-button">
                  <Upload size={16} /> اختيار صور
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void addFiles(Array.from(event.target.files ?? []));
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="admin-local-note">
                <WandSparkles size={17} />
                <p>
                  <b>API محلي:</b> الصور محفوظة على خادم الموقع ويمكن استخدامها
                  في محتوى الموقع. النسخ يضع الصورة في الحافظة بصيغة PNG.
                </p>
                <button
                  onClick={(event) =>
                    event.currentTarget.parentElement?.remove()
                  }
                  aria-label="إغلاق"
                >
                  <X size={15} />
                </button>
              </div>
              <div
                className={`media-dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target)
                    setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  void addFiles(Array.from(event.dataTransfer.files));
                }}
              >
                <span>
                  <ImageIcon size={24} />
                </span>
                <b>اسحب الصور وأفلتها هنا</b>
                <small>
                  أو اضغط زر «اختيار صور» أو الصق صورة باستخدام Ctrl + V
                </small>
                <small>
                  يدعم صيغ الصور التي يفتحها المتصفح مثل PNG وJPG وWebP وGIF
                  وSVG
                </small>
              </div>
              <div className="media-library-heading">
                <h2>
                  كل الصور <small>{assets.length}</small>
                </h2>
                <span>تُحفظ الملفات داخل هذا المتصفح</span>
              </div>
              {assets.length ? (
                <div className="media-grid">
                  {assets.map((asset) => (
                    <article className="media-card" key={asset.id}>
                      <div className="media-preview">
                        <Image
                          src={asset.preview}
                          alt={asset.name}
                          width={400}
                          height={300}
                          unoptimized
                        />
                      </div>
                      <div className="media-card-info">
                        <b title={asset.name}>{asset.name}</b>
                        <small>
                          {asset.type.replace("image/", "").toUpperCase()} ·{" "}
                          {formatBytes(asset.size)}
                        </small>
                      </div>
                      <div className="media-actions">
                        <button
                          onClick={() => void copyImage(asset)}
                          title="نسخ الصورة"
                        >
                          <Copy size={15} />
                          <span>نسخ</span>
                        </button>
                        <a
                          href={asset.preview}
                          download={asset.name}
                          title="تنزيل الصورة"
                        >
                          <ExternalLink size={15} />
                          <span>تنزيل</span>
                        </a>
                        <button
                          className="media-delete"
                          onClick={() => void deleteImage(asset)}
                          title="حذف الصورة"
                        >
                          <Trash2 size={15} />
                          <span>حذف</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="media-empty">
                  <ImageIcon size={26} />
                  <b>المكتبة فارغة</b>
                  <span>أضف أول صورة بالسحب والإفلات أو اللصق.</span>
                </div>
              )}
              {mediaMessage && (
                <p className="media-message" role="status">
                  {mediaMessage}
                </p>
              )}
            </>
          )}
          {view === "suggestions" && (
            <InfoCard
              icon={MessageSquareText}
              title="اقتراحات المجتمع"
              text="لا يوجد مصدر اقتراحات موصول بلوحة التحكم حالياً. تظهر إجابات الاستبيان في صفحة الردود داخل Google Forms."
              link="https://forms.google.com"
              linkText="فتح Google Forms"
            />
          )}
          {view === "settings" && (
            <InfoCard
              icon={Settings2}
              title="إعدادات لوحة التحكم"
              text="المحتوى المنشور والفروع والصور تُحفظ على خادم الموقع. العناصر المنشورة تظهر في صفحات الأقسام والبحث، أما المسودات فتبقى مخفية إلى أن تنشرها."
            />
          )}
          {view === "communities" && <CommunityLinksPanel />}
        </div>
      </main>

      {modal && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(false);
          }}
        >
          <section
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <header>
              <div>
                <small>مكتبة ICT</small>
                <h2 id="modal-title">
                  {editing ? "تعديل المحتوى" : "إضافة محتوى جديد"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>
            <form onSubmit={saveItem}>
              <label>
                عنوان المحتوى بالعربية
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  placeholder="مثال: مقدمة في البرمجة"
                />
              </label>
              <label>
                العنوان بالإنجليزية <small>اختياري</small>
                <input
                  dir="auto"
                  value={form.titleEn}
                  onChange={(event) =>
                    setForm({ ...form, titleEn: event.target.value })
                  }
                  placeholder="Optional English title"
                />
              </label>
              <div className="admin-form-row">
                <label>
                  نوع المحتوى
                  <select
                    value={form.type}
                    onChange={(event) => {
                      const type = event.target.value as CatalogType;
                      setForm({
                        ...form,
                        type,
                        category: categories[type].includes(form.category)
                          ? form.category
                          : "",
                      });
                    }}
                  >
                    {(Object.keys(typeInfo) as CatalogType[]).map((type) => (
                      <option key={type} value={type}>
                        {typeInfo[type].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  الحالة
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value as Status })
                    }
                  >
                    <option value="draft">مسودة</option>
                    <option value="published">منشور</option>
                  </select>
                </label>
              </div>
              {form.type === "event" && (
                <label>
                  موعد الفعالية
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(event) =>
                      setForm({ ...form, startAt: event.target.value })
                    }
                  />
                  <small>التوقيت حسب المنطقة الزمنية لجهازك.</small>
                </label>
              )}
              <label>الفرع / التخصص</label>
              <div className="branch-form-row">
                <select
                  required
                  aria-label="فرع المحتوى"
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                >
                  <option value="">اختر فرعًا</option>
                  {categories[form.type].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <button
                  className="admin-secondary"
                  type="button"
                  onClick={() => {
                    setBranchType(form.type);
                    setBranchName("");
                    setBranchModal(true);
                  }}
                >
                  <Plus size={14} /> إضافة فرع
                </button>
              </div>
              <label>
                وصف مختصر
                <textarea
                  required
                  rows={3}
                  value={form.summary}
                  onChange={(event) =>
                    setForm({ ...form, summary: event.target.value })
                  }
                  placeholder="اكتب نبذة واضحة عن المحتوى..."
                />
              </label>
              <label>
                رابط المصدر
                <input
                  required
                  type="url"
                  dir="ltr"
                  value={form.url}
                  onChange={(event) =>
                    setForm({ ...form, url: event.target.value })
                  }
                  placeholder="https://"
                />
              </label>
              <label>
                صورة الغلاف{" "}
                <small>اختياري · ارفع صورة جديدة أو اختر من المكتبة</small>
              </label>
              <div className="image-form-tools">
                <label className="admin-secondary image-file-button">
                  <Plus size={14} /> رفع صورة من الجهاز
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void addFiles(Array.from(event.target.files ?? []), true);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <select
                  aria-label="اختيار صورة غلاف من المكتبة"
                  value={form.imageUrl}
                  onChange={(event) =>
                    setForm({ ...form, imageUrl: event.target.value })
                  }
                >
                  <option value="">
                    {assets.length
                      ? "اختر صورة من المكتبة"
                      : "المكتبة فارغة — ارفع صورة"}
                  </option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.url}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="image-form-drop"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void addFiles(Array.from(event.dataTransfer.files), true);
                }}
              >
                <ImageIcon size={14} /> اسحب الصورة وأفلتها هنا، أو الصقها بـ
                Ctrl + V
              </div>
              {form.imageUrl && (
                <Image
                  className="admin-selected-image"
                  src={form.imageUrl}
                  alt="معاينة صورة الغلاف"
                  width={640}
                  height={360}
                  unoptimized
                />
              )}
              <footer>
                <button
                  className="admin-secondary"
                  type="button"
                  onClick={() => setModal(false)}
                >
                  إلغاء
                </button>
                <button className="admin-primary" type="submit">
                  <Check size={16} />{" "}
                  {editing ? "حفظ التعديلات" : "إضافة للمكتبة"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {branchModal && (
        <div
          className="admin-modal-backdrop branch-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBranchModal(false);
          }}
        >
          <section
            className="admin-modal branch-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-modal-title"
          >
            <header>
              <div>
                <small>تنظيم المحتوى</small>
                <h2 id="branch-modal-title">إضافة فرع جديد</h2>
              </div>
              <button
                type="button"
                onClick={() => setBranchModal(false)}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>
            <form onSubmit={saveBranch}>
              <label>
                القسم الرئيسي
                <select
                  value={branchType}
                  onChange={(event) =>
                    setBranchType(event.target.value as CatalogType)
                  }
                >
                  {(Object.keys(typeInfo) as CatalogType[]).map((type) => (
                    <option key={type} value={type}>
                      {typeInfo[type].label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                اسم الفرع
                <input
                  autoFocus
                  required
                  value={branchName}
                  onChange={(event) => setBranchName(event.target.value)}
                  placeholder="مثال: أمن سيبراني"
                />
              </label>
              <footer>
                <button
                  className="admin-secondary"
                  type="button"
                  onClick={() => setBranchModal(false)}
                >
                  إلغاء
                </button>
                <button className="admin-primary" type="submit">
                  <Plus size={15} /> إضافة الفرع
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {mediaMessage && (
        <div className="admin-toast" role="status">
          <CircleHelp size={16} /> {mediaMessage}
        </div>
      )}
      {notice && (
        <div className="admin-toast">
          <Check size={16} /> تم حفظ التغييرات على خادم الموقع
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  text,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  text: string;
  icon: typeof FolderKanban;
  color: string;
}) {
  return (
    <article className="admin-stat">
      <div>
        <span>{title}</span>
        <i className={color}>
          <Icon size={17} />
        </i>
      </div>
      <strong>{value.toString().padStart(2, "0")}</strong>
      <small>{text}</small>
    </article>
  );
}

function InfoCard({
  icon: Icon,
  title,
  text,
  link,
  linkText,
}: {
  icon: typeof Settings2;
  title: string;
  text: string;
  link?: string;
  linkText?: string;
}) {
  return (
    <section className="admin-info-card">
      <span>
        <Icon size={25} />
      </span>
      <h1>{title}</h1>
      <p>{text}</p>
      {link && (
        <a href={link} target="_blank" rel="noreferrer">
          {linkText} <ExternalLink size={14} />
        </a>
      )}
    </section>
  );
}

function ContentTable({
  items,
  filter,
  query,
  setQuery,
  setFilter,
  branchFilter,
  setBranchFilter,
  categories,
  onAddBranch,
  full,
  onEdit,
  onDelete,
  onToggle,
  onSendEvent,
  sendingEventId,
  menu,
  setMenu,
  onShowAll,
}: {
  items: ManagedItem[];
  filter: "all" | CatalogType;
  query: string;
  setQuery: (value: string) => void;
  setFilter: (value: "all" | CatalogType) => void;
  branchFilter: string;
  setBranchFilter: (value: string) => void;
  categories: Record<CatalogType, string[]>;
  onAddBranch: () => void;
  full: boolean;
  onEdit: (item: ManagedItem) => void;
  onDelete: (id: string) => void;
  onToggle: (item: ManagedItem) => void;
  onSendEvent: (item: ManagedItem) => void;
  sendingEventId: string | null;
  menu: string | null;
  setMenu: (value: string | null) => void;
  onShowAll: () => void;
}) {
  const branchOptions = (Object.keys(typeInfo) as CatalogType[])
    .filter((type) => filter === "all" || filter === type)
    .flatMap((type) =>
      categories[type].map((category) => ({
        value: category,
        label:
          filter === "all" ? `${typeInfo[type].label} · ${category}` : category,
      })),
    );
  return (
    <section className="admin-panel admin-table-panel">
      <div className="table-heading">
        <div>
          <h2>{full ? "كل المحتوى" : "أحدث المحتوى"}</h2>
          <p>
            {full
              ? "أدر العناصر وحالة النشر"
              : "آخر العناصر المضافة إلى مكتبة المجتمع"}
          </p>
        </div>
        {!full && (
          <button className="admin-link-button" onClick={onShowAll}>
            عرض الكل <ArrowUpLeft size={14} />
          </button>
        )}
      </div>
      <div className="admin-table-toolbar">
        <label>
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن محتوى..."
          />
        </label>
        <select
          aria-label="تصفية القسم"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as "all" | CatalogType)
          }
        >
          <option value="all">كل الأقسام</option>
          {(Object.keys(typeInfo) as CatalogType[]).map((type) => (
            <option key={type} value={type}>
              {typeInfo[type].label}
            </option>
          ))}
        </select>
        <select
          aria-label="تصفية الفرع"
          value={branchFilter}
          onChange={(event) => setBranchFilter(event.target.value)}
        >
          <option value="">كل الفروع</option>
          {branchOptions.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="admin-secondary add-branch-table"
          onClick={onAddBranch}
        >
          <Plus size={14} /> إضافة فرع
        </button>
      </div>
      <div className="admin-table-overflow">
        <table>
          <thead>
            <tr>
              <th>العنوان</th>
              <th>القسم</th>
              <th>الحالة</th>
              <th>آخر تحديث</th>
              <th>
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const Icon = typeInfo[item.type].icon;
              return (
                <tr key={item.id}>
                  <td>
                    <div className="table-item">
                      <i className={item.type.replace("-", "")}>
                        <Icon size={15} />
                      </i>
                      <span>
                        <b>{item.title}</b>
                        <small>{item.titleEn || item.category}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="type-pill">
                      {typeInfo[item.type].label}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${item.status}`}>
                      <i />
                      {item.status === "published" ? "منشور" : "مسودة"}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(item.updatedAt)}</td>
                  <td className="row-action">
                    <button
                      aria-label={`إجراءات ${item.title}`}
                      onClick={() => setMenu(menu === item.id ? null : item.id)}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {menu === item.id && (
                      <div className="row-menu">
                        <button onClick={() => onEdit(item)}>
                          <FileText size={14} /> تعديل
                        </button>
                        <button onClick={() => onToggle(item)}>
                          <Check size={14} />{" "}
                          {item.status === "published" ? "تحويل لمسودة" : "نشر"}
                        </button>
                        {item.type === "event" && item.status === "published" && (
                          <button
                            onClick={() => onSendEvent(item)}
                            disabled={sendingEventId === item.id}
                          >
                            <Send size={14} />
                            {sendingEventId === item.id
                              ? "جارٍ الإرسال…"
                              : "إرسال الفعالية بالبريد"}
                          </button>
                        )}
                        <a href={item.url} target="_blank" rel="noreferrer">
                          <Link2 size={14} /> فتح المصدر
                        </a>
                        <button
                          className="delete-action"
                          onClick={() => onDelete(item.id)}
                        >
                          <Trash2 size={14} /> حذف
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td className="empty-row" colSpan={5}>
                  لا توجد عناصر مطابقة للبحث.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="table-footer">
        عرض <b>{items.length}</b> عنصر
        {full && <span> محفوظ على هذا الجهاز</span>}
      </footer>
    </section>
  );
}
