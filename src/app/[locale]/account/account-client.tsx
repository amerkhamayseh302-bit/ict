"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BellRing, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import type { Locale } from "@/features/catalog";

type Member = { id: string; email: string };

export function AccountClient({
  locale,
  confirmed = false,
  confirmationError = false,
}: {
  locale: Locale;
  confirmed?: boolean;
  confirmationError?: boolean;
}) {
  const en = locale === "en";
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [eventsEnabled, setEventsEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() => {
    if (confirmationError) {
      return en
        ? "We couldn't confirm this email link. Request a new confirmation email and try again."
        : "تعذّر تأكيد البريد من هذا الرابط. اطلب رسالة تأكيد جديدة وحاول مرة ثانية.";
    }
    return confirmed
      ? en
        ? "Your email is confirmed. Sign in to manage event alerts."
        : "تم تأكيد بريدك. سجّل دخولك لإدارة تنبيهات الفعاليات."
      : "";
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/member/session", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (data.authenticated) setMember(data.member);
        setLoading(false);
      })
      .catch((cause: Error) => {
        setError(cause.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!member) return;
    fetch("/api/member/events", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) setEventsEnabled(Boolean(data.eventsEnabled));
        else setError(data.error ?? "");
      })
      .catch(() =>
        setError(
          en
            ? "Could not load notification preferences."
            : "تعذّر تحميل إعدادات التنبيهات.",
        ),
      );
  }, [member, en]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, email, password, locale }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? (en ? "Authentication failed." : "تعذّر تسجيل الدخول."),
        );
      if (data.confirmationRequired) {
        setMessage(data.message);
        setMode("login");
        return;
      }
      setMember(data.member);
      setPassword("");
      setMessage(
        en
          ? "You are signed in. Choose your notification preferences below."
          : "تم تسجيل دخولك. اختَر إعدادات تنبيهات الفعاليات بالأسفل.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEvents() {
    const nextValue = !eventsEnabled;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/member/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventsEnabled: nextValue }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ??
            (en
              ? "Could not save your preference."
              : "تعذّر حفظ إعداد التنبيهات."),
        );
      setEventsEnabled(nextValue);
      setMessage(
        nextValue
          ? en
            ? "Event notifications are on."
            : "فعّلت تنبيهات الفعاليات على بريدك."
          : en
            ? "Event notifications are off."
            : "أوقفت تنبيهات الفعاليات.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/member/auth", { method: "DELETE" });
    setMember(null);
    setEventsEnabled(false);
    setMessage(en ? "You have signed out." : "تم تسجيل خروجك.");
  }

  return (
    <main className="container page-main account-main" dir={en ? "ltr" : "rtl"}>
      <div className="page-heading">
        <span className="eyebrow">ICT COMMUNITY</span>
        <h1>{en ? "Your account" : "حسابك في مجتمع ICT"}</h1>
        <p>
          {en
            ? "Create an account and choose whether you want event announcements by email."
            : "أنشئ حساباً واختَر إذا بدك تشترك بتنبيهات الفعاليات على بريدك."}
        </p>
      </div>
      {loading ? (
        <div className="account-card">
          <p>{en ? "Checking your session…" : "نتحقق من تسجيل الدخول…"}</p>
        </div>
      ) : member ? (
        <section className="account-card">
          <div className="account-member">
            <span>
              <UserRound size={22} />
            </span>
            <div>
              <small>{en ? "Signed in as" : "مسجّل الدخول بالبريد"}</small>
              <b dir="ltr">{member.email}</b>
            </div>
            <button
              type="button"
              className="account-signout"
              onClick={() => void signOut()}
            >
              <LogOut size={16} />
              {en ? "Sign out" : "تسجيل خروج"}
            </button>
          </div>
          <div className="account-preference">
            <div className="account-pref-icon">
              <BellRing size={21} />
            </div>
            <div className="account-pref-copy">
              <h2>
                {en ? "Event email alerts" : "تنبيهات الفعاليات على البريد"}
              </h2>
              <p>
                {en
                  ? "Turn this on to receive event announcements sent by ICT. You can change this preference any time."
                  : "فعّل الخيار لتصلك الفعاليات التي يرسلها مجتمع ICT، وبتقدر تغيّر اختيارك بأي وقت."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={eventsEnabled}
              disabled={busy}
              className={`account-toggle ${eventsEnabled ? "on" : ""}`}
              onClick={() => void toggleEvents()}
            >
              <span />
            </button>
          </div>
          <p className="account-privacy">
            <ShieldCheck size={15} />
            {en
              ? "Your email is used only for account access and the notifications you enable."
              : "بنستخدم بريدك لتسجيل الدخول والتنبيهات اللي بتختارها فقط."}
          </p>
          {message && (
            <p className="account-message" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
        </section>
      ) : (
        <section className="account-card account-auth-card">
          <div className="account-auth-heading">
            <span>
              <Mail size={20} />
            </span>
            <h2>
              {mode === "signup"
                ? en
                  ? "Create a free account"
                  : "أنشئ حساباً مجانياً"
                : en
                  ? "Welcome back"
                  : "أهلاً بعودتك"}
            </h2>
            <p>
              {mode === "signup"
                ? en
                  ? "Use your email to manage event alerts."
                  : "استخدم بريدك لإدارة تنبيهات الفعاليات."
                : en
                  ? "Sign in to manage your event alerts."
                  : "سجّل دخولك لإدارة تنبيهات الفعاليات."}
            </p>
          </div>
          <form className="account-form" onSubmit={submitAuth}>
            <label>
              {en ? "Email" : "البريد الإلكتروني"}
              <input
                type="email"
                dir="ltr"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <label>
              {en ? "Password" : "كلمة المرور"}
              <input
                type="password"
                dir="ltr"
                required
                minLength={8}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={en ? "At least 8 characters" : "8 أحرف على الأقل"}
              />
            </label>
            <button
              className="button button-primary"
              disabled={busy}
              type="submit"
            >
              {busy
                ? en
                  ? "Please wait…"
                  : "لحظة…"
                : mode === "signup"
                  ? en
                    ? "Create account"
                    : "إنشاء الحساب"
                  : en
                    ? "Sign in"
                    : "تسجيل الدخول"}
            </button>
          </form>
          <button
            className="account-mode-switch"
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
              setMessage("");
            }}
          >
            {mode === "signup"
              ? en
                ? "Already have an account? Sign in"
                : "عندك حساب؟ سجّل دخولك"
              : en
                ? "New here? Create an account"
                : "أول مرة؟ أنشئ حساباً"}
          </button>
          {message && (
            <p className="account-message" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
