"use client";

import { useActionState, useState } from "react";
import { createRestaurant, type ActionState } from "./actions";
import { slugify } from "@/lib/slug";
import { useT } from "@/i18n/provider";

export function OnboardingForm() {
  const t = useT();
  const [state, action, pending] = useActionState<ActionState, FormData>(createRestaurant, {});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const ob = t.dashboard.onboarding;

  return (
    <section className="card">
      <h1 className="mb-1 text-2xl font-bold text-[color:var(--color-navy)]">
        {ob.title}
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        {ob.leadPrefix}{" "}
        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
          {ob.urlExample}
        </code>{" "}
        {ob.leadSuffix}
      </p>

      <form action={action} className="flex flex-col gap-4">
        <label className="label">
          {ob.restaurantName}
          <input
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder={ob.restaurantNamePlaceholder}
            className="input"
          />
        </label>

        <label className="label">
          {ob.urlSlug}
          <span className="label-hint">{ob.slugHint}</span>
          <div className="flex items-center rounded-lg border border-gray-300 bg-white pl-3 transition focus-within:border-[color:var(--color-brand)]">
            <span className="select-none font-mono text-sm text-gray-400">/m/</span>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              pattern="[a-z0-9-]+"
              placeholder={ob.slugPlaceholder}
              className="flex-1 border-0 bg-transparent px-2 py-2.5 font-mono text-sm focus:outline-none"
            />
          </div>
        </label>

        <label className="label">
          {ob.whatsapp}
          <span className="label-hint">{ob.whatsappHint}</span>
          <input
            name="whatsappNumber"
            placeholder={ob.whatsappPlaceholder}
            pattern="\d{8,15}"
            className="input font-mono"
          />
        </label>

        <label className="label">
          {ob.instagram}
          <span className="label-hint">{ob.instagramHint}</span>
          <input
            name="instagramUrl"
            type="url"
            placeholder={ob.instagramPlaceholder}
            className="input"
          />
        </label>

        <label className="label">
          {ob.description}
          <span className="label-hint">{ob.descriptionHint}</span>
          <textarea name="description" rows={3} className="input" />
        </label>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary self-start">
          {pending ? ob.submitting : ob.submit}
        </button>
      </form>
    </section>
  );
}
