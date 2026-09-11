"use client";

import { googleSignIn } from "./actions";
import { GoogleIcon } from "@/components/icons";
import { useT } from "@/i18n/provider";

/**
 * "Continue with Google" plus the divider that separates it from the
 * email/password form below. Rendered above the credentials form on both
 * /login and /signup — the same button does either, since Auth.js links a
 * verified Google address to an existing account when one exists.
 */
export function GoogleAuth({ callbackUrl }: { callbackUrl?: string }) {
  const t = useT();

  return (
    <div className="flex flex-col gap-4">
      <form action={googleSignIn}>
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <button
          type="submit"
          className="btn w-full border-2 border-gray-300 bg-white text-[color:var(--color-navy)] hover:bg-gray-50"
        >
          <GoogleIcon size={18} />
          {t.auth.continueWithGoogle}
        </button>
      </form>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium text-gray-500">{t.auth.orDivider}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
    </div>
  );
}
