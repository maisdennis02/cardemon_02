"use client";

import { useActionState, useState } from "react";
import { updateRestaurant, type ActionState } from "./actions";
import { slugify } from "@/lib/slug";
import { useLocale, useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { MicButton } from "@/components/voice/mic-button";
import {
  DELIVERY_APP_IDS,
  DELIVERY_APPS,
  SUPPORTED_COUNTRIES,
  getAppsForCountry,
  inputPatternFromRegex,
  type CountryCode,
  type DeliveryApp,
  type DeliveryUrlColumn,
} from "@/lib/delivery-apps";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  country: string | null;
} & Record<DeliveryUrlColumn, string | null>;

// The Ajustes form: business details and delivery apps, always open, one
// submit (spec §4). Every field is controlled so what the owner typed survives
// React's form reset when the server answers with an error.
export function RestaurantSettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const t = useT();
  const locale = useLocale();
  const [state, action, pending] = useActionState<ActionState, FormData>(updateRestaurant, {});
  const [name, setName] = useState(restaurant.name);
  // The address never follows the name here: renaming the business must not
  // break a QR code that is already printed. Only a direct edit changes it.
  const [slug, setSlug] = useState(restaurant.slug);
  const [whatsapp, setWhatsapp] = useState(restaurant.whatsappNumber ?? "");
  const [instagram, setInstagram] = useState(restaurant.instagramUrl ?? "");
  const [description, setDescription] = useState(restaurant.description ?? "");
  const [country, setCountry] = useState<string>(restaurant.country ?? "");
  const [links, setLinks] = useState(() => {
    const initial = {} as Record<DeliveryUrlColumn, string>;
    for (const id of DELIVERY_APP_IDS) {
      const column = DELIVERY_APPS[id].column;
      initial[column] = restaurant[column] ?? "";
    }
    return initial;
  });

  // What was submitted last: "Salvo ✓" only stands while the fields still
  // match it, so it disappears on the first change (typed or dictated).
  const values = JSON.stringify([name, slug, whatsapp, instagram, description, country, links]);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const showSaved = state.ok && !pending && submitted === values;

  const s = t.dashboard.settings;
  const apps = getAppsForCountry(country);
  const blockTitle = "text-lg font-bold text-[color:var(--color-navy)]";

  return (
    <form action={action} onSubmit={() => setSubmitted(values)} className="flex flex-col gap-5 sm:gap-6">
      <input type="hidden" name="id" value={restaurant.id} />

      <section className="card flex flex-col gap-4">
        <h2 className={blockTitle}>{s.businessTitle}</h2>

        <label className="label">
          {s.restaurantName}
          <span className="flex items-center gap-2">
            <input
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input min-w-0 flex-1"
            />
            <MicButton
              value={name}
              onChange={(v) => setName(v.slice(0, 120))}
              lang={locale}
              label={t.dashboard.onboarding.micLabel}
            />
          </span>
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
              className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 font-mono text-sm focus:outline-none"
            />
          </div>
          <span className="label-hint">{s.slugWarning}</span>
        </label>

        <label className="label">
          {s.whatsapp}
          <span className="label-hint">{s.whatsappHint}</span>
          <span className="flex items-center gap-2">
            {/* No pattern: the action reduces dictated numbers to digits. */}
            <input
              name="whatsappNumber"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder={s.whatsappPlaceholder}
              className="input min-w-0 flex-1 font-mono"
            />
            <MicButton
              value={whatsapp}
              onChange={(v) => setWhatsapp(v.slice(0, 30))}
              lang={locale}
              label={t.dashboard.home.whatsappMic}
            />
          </span>
        </label>

        <label className="label">
          {s.instagram}
          <span className="label-hint">{s.instagramHint}</span>
          <input
            name="instagramUrl"
            type="url"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder={s.instagramPlaceholder}
            className="input"
          />
        </label>

        <label className="label">
          {s.description}
          <span className="flex items-start gap-2">
            <textarea
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-w-0 flex-1"
            />
            <MicButton
              value={description}
              onChange={setDescription}
              lang={locale}
              label={s.descriptionMic}
            />
          </span>
        </label>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className={blockTitle}>{s.deliveryTitle}</h2>

        {/* The country decides which apps are offered, so it lives here. */}
        <label id="country" className="label scroll-mt-24">
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

        <fieldset id="delivery" className="flex scroll-mt-20 flex-col gap-3">
          <legend className="sr-only">{s.delivery}</legend>
          <p className="text-xs text-gray-500">{s.deliveryLead}</p>
          {apps.length === 0 ? (
            <p className="text-sm text-gray-500">{s.deliveryCountryPrompt}</p>
          ) : (
            apps.map((app) => (
              <DeliveryAppInput
                key={app.id}
                app={app}
                value={links[app.column]}
                onChange={(v) => setLinks((prev) => ({ ...prev, [app.column]: v }))}
                hint={format(s.deliveryHint, { appName: app.displayName })}
              />
            ))
          )}
        </fieldset>
      </section>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? t.common.saving : t.common.save}
        </button>
        {showSaved && (
          <p role="status" className="text-sm font-semibold text-green-700">
            {t.dashboard.home.saved}
          </p>
        )}
      </div>
    </form>
  );
}

function DeliveryAppInput({
  app,
  value,
  onChange,
  hint,
}: {
  app: DeliveryApp;
  value: string;
  onChange: (value: string) => void;
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={app.urlPlaceholder}
        pattern={inputPatternFromRegex(app.urlPattern)}
        className="input"
      />
    </label>
  );
}
