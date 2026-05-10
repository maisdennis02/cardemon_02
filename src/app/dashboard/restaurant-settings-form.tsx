"use client";

import { useActionState, useState } from "react";
import { updateRestaurant, type ActionState } from "./actions";
import { slugify } from "@/lib/slug";
import { useT } from "@/i18n/provider";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  whatsappNumber: string | null;
};

export function RestaurantSettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const t = useT();
  const [state, action, pending] = useActionState<ActionState, FormData>(updateRestaurant, {});
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(restaurant.slug);

  const s = t.dashboard.settings;

  if (!open) {
    return (
      <section className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[color:var(--color-navy)]">
            {restaurant.name}
          </h1>
          <p className="font-mono text-sm text-gray-500">/m/{restaurant.slug}</p>
          {restaurant.whatsappNumber && (
            <p className="text-sm text-gray-500">
              {s.whatsappLabel} · <span className="font-mono">{restaurant.whatsappNumber}</span>
            </p>
          )}
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm self-start">
          {t.common.edit}
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="mb-4 text-lg font-bold text-[color:var(--color-navy)]">
        {s.editTitle}
      </h2>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={restaurant.id} />

        <label className="label">
          {s.restaurantName}
          <input
            name="name"
            required
            defaultValue={restaurant.name}
            className="input"
          />
        </label>

        <label className="label">
          {s.urlSlug}
          <div className="flex items-center rounded-lg border border-gray-300 bg-white pl-3 transition focus-within:border-[color:var(--color-brand)]">
            <span className="select-none font-mono text-sm text-gray-400">/m/</span>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              pattern="[a-z0-9-]+"
              className="flex-1 border-0 bg-transparent px-2 py-2.5 font-mono text-sm focus:outline-none"
            />
          </div>
        </label>

        <label className="label">
          {s.whatsapp}
          <span className="label-hint">{s.whatsappHint}</span>
          <input
            name="whatsappNumber"
            defaultValue={restaurant.whatsappNumber ?? ""}
            placeholder="5513996332974"
            pattern="\d{8,15}"
            className="input font-mono"
          />
        </label>

        <label className="label">
          {s.description}
          <textarea
            name="description"
            rows={3}
            defaultValue={restaurant.description ?? ""}
            className="input"
          />
        </label>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? t.common.saving : t.common.save}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
            {t.common.cancel}
          </button>
        </div>
      </form>
    </section>
  );
}
