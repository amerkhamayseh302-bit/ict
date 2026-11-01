"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, ExternalLink, Link2, Plus, Trash2, X } from "lucide-react";
import type { CommunityLink, CommunityPlatform } from "@/lib/community-links";

type LinkDraft = Omit<CommunityLink, "id">;

const emptyDraft: LinkDraft = {
  platform: "whatsapp",
  title: "",
  titleEn: "",
  url: "",
};

const platformLabels: Record<CommunityPlatform, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  other: "مجتمع آخر",
};

async function readResponse(response: Response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "تعذّر الاتصال بالخادم.");
  return result as { items: CommunityLink[] };
}

export function CommunityLinksPanel() {
  const [items, setItems] = useState<CommunityLink[]>([]);
  const [draft, setDraft] = useState<LinkDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/community-links", { cache: "no-store" })
      .then(readResponse)
      .then((result) => setItems(result.items))
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  async function persist(nextItems: CommunityLink[]) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await readResponse(
        await fetch("/api/admin/community-links", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: nextItems }),
        }),
      );
      setItems(result.items);
      setMessage("تم حفظ روابط المجتمعات.");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذّر حفظ الروابط.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextLink: CommunityLink = {
      ...draft,
      id: editingId ?? crypto.randomUUID(),
      title: draft.title.trim(),
      titleEn: draft.titleEn.trim(),
      url: draft.url.trim(),
    };
    const nextItems = editingId
      ? items.map((item) => (item.id === editingId ? nextLink : item))
      : [...items, nextLink];

    if (await persist(nextItems)) {
      setDraft(emptyDraft);
      setEditingId(null);
    }
  }

  function edit(item: CommunityLink) {
    setEditingId(item.id);
    setDraft({
      platform: item.platform,
      title: item.title,
      titleEn: item.titleEn,
      url: item.url,
    });
    setMessage("");
    setError("");
  }

  async function remove(item: CommunityLink) {
    if (!window.confirm(`حذف رابط «${item.title}» من صفحة التواصل؟`)) return;
    const nextItems = items.filter((entry) => entry.id !== item.id);
    if (await persist(nextItems) && editingId === item.id) {
      setEditingId(null);
      setDraft(emptyDraft);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft);
    setError("");
    setMessage("");
  }

  return (
    <section className="community-links-admin">
      <div className="admin-heading">
        <div>
          <small>قنوات التواصل</small>
          <h1>روابط مجتمعات ICT</h1>
          <p>أضف روابط المجموعات والقنوات لتظهر مباشرة في صفحة التواصل والتذييل.</p>
        </div>
      </div>

      <div className="community-links-admin-grid">
        <form className="community-link-form" onSubmit={save}>
          <h2>{editingId ? "تعديل رابط مجتمع" : "إضافة رابط مجتمع"}</h2>
          <label>
            اسم المجتمع بالعربية
            <input
              required
              maxLength={80}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="مجموعة ICT على واتساب"
            />
          </label>
          <label>
            الاسم بالإنجليزية <small>اختياري</small>
            <input
              dir="auto"
              maxLength={80}
              value={draft.titleEn}
              onChange={(event) => setDraft({ ...draft, titleEn: event.target.value })}
              placeholder="ICT Community on WhatsApp"
            />
          </label>
          <label>
            المنصة
            <select
              value={draft.platform}
              onChange={(event) =>
                setDraft({ ...draft, platform: event.target.value as CommunityPlatform })
              }
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="other">مجتمع آخر</option>
            </select>
          </label>
          <label>
            رابط الدعوة أو القناة
            <input
              type="url"
              dir="ltr"
              required
              maxLength={2048}
              value={draft.url}
              onChange={(event) => setDraft({ ...draft, url: event.target.value })}
              placeholder="https://..."
            />
          </label>
          <div className="community-link-form-actions">
            <button className="admin-primary" type="submit" disabled={busy}>
              {editingId ? <Check size={15} /> : <Plus size={15} />}
              {busy ? "جارٍ الحفظ…" : editingId ? "حفظ التعديلات" : "إضافة للموقع"}
            </button>
            {editingId && (
              <button className="admin-secondary" type="button" onClick={cancelEdit}>
                <X size={15} /> إلغاء
              </button>
            )}
          </div>
          {message && <p className="community-link-status" role="status">{message}</p>}
          {error && <p className="community-link-error" role="alert">{error}</p>}
        </form>

        <div className="community-link-list">
          <div className="community-link-list-heading">
            <h2>المجتمعات الظاهرة بالموقع</h2>
            <span>{items.length}</span>
          </div>
          {loading ? (
            <p className="community-links-empty">جارٍ تحميل الروابط…</p>
          ) : items.length ? (
            <div className="community-link-list-items">
              {items.map((item) => (
                <article className="community-link-item" key={item.id}>
                  <span className="community-link-icon"><Link2 size={18} /></span>
                  <div className="community-link-copy">
                    <b>{item.title}</b>
                    <small>{platformLabels[item.platform]}{item.titleEn ? ` · ${item.titleEn}` : ""}</small>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.url} <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="community-link-actions">
                    <button type="button" className="admin-secondary" onClick={() => edit(item)} disabled={busy}>
                      تعديل
                    </button>
                    <button type="button" className="community-link-delete" onClick={() => void remove(item)} disabled={busy} aria-label={`حذف ${item.title}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="community-links-empty">ما أضفت روابط بعد. استخدم النموذج لإضافة أول مجتمع.</p>
          )}
        </div>
      </div>
    </section>
  );
}
