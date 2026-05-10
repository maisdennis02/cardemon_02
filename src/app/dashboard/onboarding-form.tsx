"use client";

import { useActionState, useState } from "react";
import { createRestaurant, type ActionState } from "./actions";
import { slugify } from "@/lib/slug";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createRestaurant, {});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <section className="rounded border border-gray-200 p-6">
      <h2 className="mb-1 text-lg font-medium">Set up your restaurant</h2>
      <p className="mb-4 text-sm text-gray-600">
        Customers will visit <code className="rounded bg-gray-100 px-1">/m/&lt;slug&gt;</code> to
        view your menu.
      </p>
      <form action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Restaurant name
          <input
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          URL slug
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            pattern="[a-z0-9-]+"
            className="rounded border px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          WhatsApp number (optional, digits only including country code)
          <input
            name="whatsappNumber"
            placeholder="5513996332974"
            pattern="\d{8,15}"
            className="rounded border px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description (optional)
          <textarea name="description" rows={3} className="rounded border px-3 py-2" />
        </label>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create restaurant"}
        </button>
      </form>
    </section>
  );
}
