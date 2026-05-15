"use client";

import { useActionState, useState } from "react";
import { updateRestaurant, type ActionState } from "./actions";
import { slugify } from "@/lib/slug";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import {
  SUPPORTED_COUNTRIES,
  getAppsForCountry,
  inputPatternFromRegex,
  type CountryCode,
  type DeliveryApp,
} from "@/lib/delivery-apps";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  country: string | null;
  ifoodUrl: string | null;
  ubereatsUrl: string | null;
  doordashUrl: string | null;
  rappiUrl: string | null;
  grubhubUrl: string | null;
  pedidosyaUrl: string | null;
  didifoodUrl: string | null;
};

export function RestaurantSettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const t = useT();
  const [state, action, pending] = useActionState<ActionState, FormData>(updateRestaurant, {});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [slug, setSlug] = useState(restaurant.slug);
  const [slugTouched, setSlugTouched] = useState(
    restaurant.slug !== slugify(restaurant.name),
  );
  const [country, setCountry] = useState<string>(restaurant.country ?? "");

  const s = t.dashboard.settings;
  const apps = getAppsForCountry(country);

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
          {restaurant.instagramUrl && (
            <p className="text-sm text-gray-500">
              {s.instagramLabel} ·{" "}
              <a
                className="font-mono underline"
                href={restaurant.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {restaurant.instagramUrl}
              </a>
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
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
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
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              pattern="[a-z0-9-]+"
              className="flex-1 border-0 bg-transparent px-2 py-2.5 font-mono text-sm focus:outline-none"
            />
          </div>
        </label>

        <label className="label">
          {s.country}
          <span className="label-hint">{s.countryHint}</span>
          <select
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="input"
          >
            <option value="" disabled>
              {s.countryPlaceholder}
            </option>
            {SUPPORTED_COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {s.countries[code as CountryCode]}
              </option>
            ))}
          </select>
        </label>

        <label className="label">
          {s.whatsapp}
          <span className="label-hint">{s.whatsappHint}</span>
          <input
            name="whatsappNumber"
            defaultValue={restaurant.whatsappNumber ?? ""}
            placeholder={s.whatsappPlaceholder}
            pattern="\d{8,15}"
            className="input font-mono"
          />
        </label>

        <label className="label">
          {s.instagram}
          <span className="label-hint">{s.instagramHint}</span>
          <input
            name="instagramUrl"
            type="url"
            defaultValue={restaurant.instagramUrl ?? ""}
            placeholder={s.instagramPlaceholder}
            className="input"
          />
        </label>

        <fieldset className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-bold text-[color:var(--color-navy)]">
            {s.delivery}
          </legend>
          <p className="-mt-2 text-xs text-gray-500">{s.deliveryLead}</p>
          {apps.length === 0 ? (
            <p className="text-sm text-gray-500">{s.deliveryCountryPrompt}</p>
          ) : (
            apps.map((app) => (
              <DeliveryAppInput
                key={app.id}
                app={app}
                defaultValue={restaurant[app.column] ?? ""}
                hint={format(s.deliveryHint, { appName: app.displayName })}
              />
            ))
          )}
        </fieldset>

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

function DeliveryAppInput({
  app,
  defaultValue,
  hint,
}: {
  app: DeliveryApp;
  defaultValue: string;
  hint: string;
}) {
  return (
    <label className="label">
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: app.brandColor }}
        />
        {app.displayName}
      </span>
      <span className="label-hint">{hint}</span>
      <input
        name={app.column}
        type="url"
        defaultValue={defaultValue}
        placeholder={app.urlPlaceholder}
        pattern={inputPatternFromRegex(app.urlPattern)}
        className="input"
      />
    </label>
  );
}
