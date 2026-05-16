import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getDictionary, getLocale } from "@/i18n";
import { lookupPasswordResetToken } from "@/lib/password-reset";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.auth;

  if (!token) {
    redirect("/forgot-password");
  }

  // Don't reveal whether the token is invalid vs expired by just rendering
  // the form blindly; check up front so we can show a helpful message and
  // skip a doomed submission.
  const lookup = await lookupPasswordResetToken(token);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50/60 px-6 py-10">
      <div className="mb-6">
        <Logo size="lg" />
      </div>
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-[color:var(--color-navy)]">
          {t.reset.title}
        </h1>
        <p className="mb-6 text-sm text-gray-600">{t.reset.lead}</p>

        {lookup.ok ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700">
            {lookup.reason === "expired" ? t.reset.tokenExpired : t.reset.tokenInvalid}
          </p>
        )}
      </div>
      <p className="mt-4 text-sm text-gray-600">
        <Link
          href="/login"
          className="font-bold text-[color:var(--color-brand)] hover:underline"
        >
          {t.backToLogin}
        </Link>
      </p>
    </main>
  );
}
