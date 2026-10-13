"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/provider";
import { capture } from "@/lib/posthog";
import { chooseMenuPhotos } from "../menu-actions";

// Flips the public page from the text menu back to the uploaded photos, then
// returns to the home. Only rendered when photos exist, so needsUpload is a
// race (photos deleted meanwhile) and just surfaces as no-op.
export function UsePhotosButton({ restaurantId }: { restaurantId: string }) {
  const t = useT();
  const c = t.dashboard.menuChoice;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function switchToPhotos() {
    capture("menu_mode_chosen", { mode: "photos" });
    setError(null);
    startTransition(async () => {
      const res = await chooseMenuPhotos({ restaurantId });
      if (res.error) setError(res.error);
      else if (!res.needsUpload) router.push("/dashboard");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={switchToPhotos}
        className="btn btn-secondary self-start disabled:opacity-50"
      >
        {pending ? c.switching : c.switchToPhotos}
      </button>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
