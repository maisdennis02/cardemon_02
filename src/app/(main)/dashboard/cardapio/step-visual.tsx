"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { capture } from "@/lib/posthog";
import { SUPPORTED_COUNTRIES } from "@/lib/delivery-apps";
import { MENU_FONTS, menuFontFamilies, type MenuTheme } from "@/lib/menu";
import { pickLogoColors, swatchesFor } from "@/lib/menu-colors";
import { BuiltMenuHeader } from "@/app/m/[slug]/built-menu";
import { readLogoPixels } from "./logo-colors";
import type { BuilderRestaurant } from "./menu-builder";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Step 1: country (language and currency), logo, color, header style — with
// a live preview of the header. Saved by the shell when the owner moves on.
export function StepVisual({
  restaurant,
  country,
  onCountry,
  theme,
  onTheme,
}: {
  restaurant: BuilderRestaurant;
  country: string;
  onCountry: (country: string) => void;
  theme: MenuTheme;
  onTheme: (theme: MenuTheme) => void;
}) {
  const t = useT();
  const v = t.dashboard.builder.visual;
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoColors, setLogoColors] = useState<string[]>([]);
  // Only meaningful while the logo's colors are known (right after an upload).
  const [showPalettes, setShowPalettes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!LOGO_TYPES.includes(file.type)) return setError(v.logoNotImage);
    if (file.size > LOGO_MAX_BYTES) return setError(v.logoTooBig);

    setUploading(true);
    try {
      // Colors come from the local file: see readLogoPixels.
      const colors = await readLogoPixels(file).then(pickLogoColors).catch(() => []);
      const blob = await upload(`logos/${restaurant.id}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: JSON.stringify({ restaurantId: restaurant.id }),
      });
      setLogoColors(colors);
      setShowPalettes(false);
      onTheme({ ...theme, logoUrl: blob.url });
      capture("logo_uploaded");
    } catch {
      setError(v.logoFailed);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeLogo() {
    const rest = { ...theme };
    delete rest.logoUrl;
    onTheme(rest);
    setLogoColors([]);
  }

  const swatches = swatchesFor(logoColors, showPalettes);

  return (
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-5 p-5">
        <label className="label">
          {v.country}
          <span className="label-hint">{v.countryHint}</span>
          <select className="input" value={country} onChange={(e) => onCountry(e.target.value)}>
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {t.dashboard.settings.countries[c]}
              </option>
            ))}
          </select>
        </label>

        <div className="label">
          {v.logo}
          <span className="label-hint">{v.logoHint}</span>
          <div className="flex flex-wrap items-center gap-3">
            {theme.logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={theme.logoUrl} alt="" className="size-14 rounded-full border border-gray-200 object-cover" />
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? v.logoUploading : theme.logoUrl ? v.logoChange : v.logoPick}
            </button>
            {theme.logoUrl && !uploading && (
              <button type="button" className="btn btn-danger btn-sm" onClick={removeLogo}>
                {v.logoRemove}
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={LOGO_TYPES.join(",")}
              className="hidden"
              onChange={(e) => onLogo(e.target.files?.[0])}
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-normal text-red-700">{error}</p>}
        </div>

        <div className="label">
          {v.color}
          {logoColors.length > 0 && <span className="label-hint">{v.colorsFromLogo}</span>}
          <div className="flex flex-wrap items-center gap-2">
            {swatches.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={format(v.pickColor, { color: c })}
                aria-pressed={theme.color === c}
                onClick={() => onTheme({ ...theme, color: c })}
                className={`size-10 rounded-full border-2 transition ${
                  theme.color === c ? "border-[color:var(--color-navy)] ring-2 ring-offset-2" : "border-white shadow"
                }`}
                style={{ background: c }}
              />
            ))}
            {logoColors.length > 0 && (
              <button
                type="button"
                className="text-xs font-semibold text-[color:var(--color-brand)]"
                onClick={() => setShowPalettes((x) => !x)}
              >
                {showPalettes ? v.fewerColors : v.moreColors}
              </button>
            )}
          </div>
        </div>

        <div className="label">
          {v.headerStyle}
          <div className="grid grid-cols-2 gap-3">
            {(["centered", "band"] as const).map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={theme.headerStyle === style}
                onClick={() => onTheme({ ...theme, headerStyle: style })}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-semibold ${
                  theme.headerStyle === style ? "border-[color:var(--color-brand)]" : "border-gray-200"
                }`}
              >
                <HeaderThumb style={style} color={theme.color} />
                {style === "centered" ? v.centered : v.band}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <div className="label">
          {v.font}
          <div className="grid grid-cols-2 gap-3">
            {MENU_FONTS.map((font) => {
              const selected = (theme.font ?? "default") === font;
              return (
                <button
                  key={font}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onTheme({ ...theme, font })}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 ${
                    selected ? "border-[color:var(--color-brand)]" : "border-gray-200"
                  }`}
                >
                  <span className="text-2xl font-bold" style={{ fontFamily: menuFontFamilies(font).title }}>
                    Aa
                  </span>
                  <span className="text-xs font-semibold" style={{ fontFamily: menuFontFamilies(font).body }}>
                    {v.fonts[font]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-label={v.headerPreview}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{v.headerPreview}</p>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white pb-6">
          <BuiltMenuHeader name={restaurant.name} theme={theme} />
        </div>
      </section>
    </div>
  );
}

function HeaderThumb({ style, color }: { style: "centered" | "band"; color: string }) {
  return (
    <div className="flex h-14 w-full flex-col items-center overflow-hidden rounded-md bg-gray-50">
      {style === "band" ? (
        <>
          <div className="h-5 w-full" style={{ background: color }} />
          <div className="-mt-2.5 size-5 rounded-full border-2 border-white bg-gray-300" />
          <div className="mt-1 h-1.5 w-10 rounded bg-gray-400" />
        </>
      ) : (
        <>
          <div className="mt-2 size-5 rounded-full bg-gray-300" />
          <div className="mt-1 h-1.5 w-10 rounded bg-gray-400" />
          <div className="mt-1 h-0.5 w-5" style={{ background: color }} />
        </>
      )}
    </div>
  );
}
