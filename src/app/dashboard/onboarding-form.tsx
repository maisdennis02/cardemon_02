"use client";

import { useActionState, useState } from "react";
import { createRestaurant, type ActionState } from "./actions";
import { slugify } from "@/lib/slug";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createRestaurant, {});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <section className="card">
      <h1 className="mb-1 text-2xl font-bold text-[color:var(--color-navy)]">
        Welcome — let's set up your restaurant.
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Pick a name and a public URL. Customers will visit{" "}
        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
          /m/your-slug
        </code>{" "}
        to view the menu.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <label className="label">
          Restaurant name
          <input
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            placeholder="e.g. Barraca da Sônia"
            className="input"
          />
        </label>

        <label className="label">
          URL slug
          <span className="label-hint">Lowercase letters, numbers, and dashes.</span>
          <div className="flex items-center rounded-lg border border-gray-300 bg-white pl-3 transition focus-within:border-[color:var(--color-brand)]">
            <span className="select-none font-mono text-sm text-gray-400">/m/</span>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              pattern="[a-z0-9-]+"
              placeholder="barraca-da-sonia"
              className="flex-1 border-0 bg-transparent px-2 py-2.5 font-mono text-sm focus:outline-none"
            />
          </div>
        </label>

        <label className="label">
          WhatsApp number
          <span className="label-hint">Optional. Digits only with country code, e.g. 5513996332974.</span>
          <input
            name="whatsappNumber"
            placeholder="5513996332974"
            pattern="\d{8,15}"
            className="input font-mono"
          />
        </label>

        <label className="label">
          Description
          <span className="label-hint">Optional. Shown on the menu page metadata.</span>
          <textarea name="description" rows={3} className="input" />
        </label>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary self-start">
          {pending ? "Creating…" : "Create restaurant"}
        </button>
      </form>
    </section>
  );
}
