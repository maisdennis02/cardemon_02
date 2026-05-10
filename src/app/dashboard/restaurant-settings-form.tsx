"use client";

import { useActionState, useState } from "react";
import { updateRestaurant, type ActionState } from "./actions";
import { slugify } from "@/lib/slug";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  whatsappNumber: string | null;
};

export function RestaurantSettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateRestaurant, {});
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(restaurant.slug);

  if (!open) {
    return (
      <section className="rounded border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">{restaurant.name}</h2>
            <p className="font-mono text-sm text-gray-500">/m/{restaurant.slug}</p>
            {restaurant.whatsappNumber && (
              <p className="text-sm text-gray-500">WhatsApp: {restaurant.whatsappNumber}</p>
            )}
          </div>
          <button onClick={() => setOpen(true)} className="text-sm underline">
            Edit
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded border border-gray-200 p-4">
      <h2 className="mb-3 text-lg font-medium">Edit restaurant</h2>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={restaurant.id} />
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            name="name"
            required
            defaultValue={restaurant.name}
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
          WhatsApp number (digits only)
          <input
            name="whatsappNumber"
            defaultValue={restaurant.whatsappNumber ?? ""}
            placeholder="5513996332974"
            pattern="\d{8,15}"
            className="rounded border px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            rows={3}
            defaultValue={restaurant.description ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border px-3 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
