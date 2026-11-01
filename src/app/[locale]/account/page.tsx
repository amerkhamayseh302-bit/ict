import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/dictionary";
import { AccountClient } from "./account-client";

export default async function AccountPage({ params, searchParams }: PageProps<"/[locale]/account">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  return (
    <AccountClient
      locale={locale}
      confirmed={query.confirmed === "1"}
      confirmationError={query.auth_error === "confirmation"}
    />
  );
}
