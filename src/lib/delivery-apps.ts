export const DELIVERY_APP_IDS = [
  "ifood",
  "ubereats",
  "doordash",
  "rappi",
  "grubhub",
  "pedidosya",
  "didifood",
] as const;

export type DeliveryAppId = (typeof DELIVERY_APP_IDS)[number];

export type DeliveryUrlColumn =
  | "ifoodUrl"
  | "ubereatsUrl"
  | "doordashUrl"
  | "rappiUrl"
  | "grubhubUrl"
  | "pedidosyaUrl"
  | "didifoodUrl";

export type DeliveryApp = {
  id: DeliveryAppId;
  displayName: string;
  brandColor: string;
  textColor: string;
  column: DeliveryUrlColumn;
  urlPattern: RegExp;
  urlPlaceholder: string;
  logoPath?: string;
};

export const DELIVERY_APPS: Record<DeliveryAppId, DeliveryApp> = {
  ifood: {
    id: "ifood",
    displayName: "iFood",
    brandColor: "#EA1D2C",
    textColor: "#FFFFFF",
    column: "ifoodUrl",
    urlPattern: /^https:\/\/(www\.)?ifood\.com\.br\/.+/i,
    urlPlaceholder: "https://www.ifood.com.br/delivery/...",
    logoPath: "/delivery_logos/IFood/IFood_idvFPAKYIS_2.svg",
  },
  ubereats: {
    id: "ubereats",
    displayName: "Uber Eats",
    brandColor: "#000000",
    textColor: "#FFFFFF",
    column: "ubereatsUrl",
    urlPattern: /^https:\/\/(www\.)?ubereats\.com\/.+/i,
    urlPlaceholder: "https://www.ubereats.com/store/...",
    logoPath: "/delivery_logos/Uber_Eats/Uber_Eats_Symbol_6.svg",
  },
  doordash: {
    id: "doordash",
    displayName: "DoorDash",
    brandColor: "#EB1700",
    textColor: "#FFFFFF",
    column: "doordashUrl",
    urlPattern: /^https:\/\/(www\.)?doordash\.com\/.+/i,
    urlPlaceholder: "https://www.doordash.com/store/...",
    logoPath: "/delivery_logos/DoorDash/DoorDash_idcbr0jK8U_8.svg",
  },
  rappi: {
    id: "rappi",
    displayName: "Rappi",
    brandColor: "#FF441F",
    textColor: "#FFFFFF",
    column: "rappiUrl",
    urlPattern: /^https:\/\/(www\.)?rappi\.(com|com\.br|com\.mx|com\.ar|com\.co|cl|pe)\/.+/i,
    urlPlaceholder: "https://www.rappi.com.br/restaurantes/...",
    logoPath: "/delivery_logos/Rappi/Rappi_idlxcZ7_dJ_4.svg",
  },
  grubhub: {
    id: "grubhub",
    displayName: "Grubhub",
    brandColor: "#F63440",
    textColor: "#FFFFFF",
    column: "grubhubUrl",
    urlPattern: /^https:\/\/(www\.)?grubhub\.com\/.+/i,
    urlPlaceholder: "https://www.grubhub.com/restaurant/...",
    logoPath: "/delivery_logos/Grubhub/Grubhub_idV67dEb89_0.svg",
  },
  pedidosya: {
    id: "pedidosya",
    displayName: "PedidosYa",
    brandColor: "#FA0050",
    textColor: "#FFFFFF",
    column: "pedidosyaUrl",
    urlPattern: /^https:\/\/(www\.)?pedidosya\.(com|com\.ar|com\.uy|cl)\/.+/i,
    urlPlaceholder: "https://www.pedidosya.com.ar/restaurantes/...",
    // TODO: PedidosYa logo not provided yet; falls back to placeholder icon.
  },
  didifood: {
    id: "didifood",
    displayName: "DiDi Food",
    brandColor: "#FF7733",
    textColor: "#FFFFFF",
    column: "didifoodUrl",
    urlPattern: /^https:\/\/(www\.)?didi-food\.com\/.+/i,
    urlPlaceholder: "https://www.didi-food.com/...",
    logoPath: "/delivery_logos/DiDiFood/DiDiFood_idjKpdzJrw_2.svg",
  },
};

export const SUPPORTED_COUNTRIES = [
  "BR",
  "US",
  "MX",
  "AR",
  "UY",
  "CO",
  "CL",
  "PE",
] as const;

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number];

export const COUNTRY_APPS: Record<CountryCode, DeliveryAppId[]> = {
  BR: ["ifood", "rappi", "ubereats"],
  US: ["doordash", "ubereats", "grubhub"],
  MX: ["rappi", "didifood", "ubereats"],
  AR: ["pedidosya", "rappi"],
  UY: ["pedidosya", "rappi"],
  CO: ["rappi", "didifood"],
  CL: ["pedidosya", "rappi", "ubereats"],
  PE: ["rappi", "pedidosya", "didifood"],
};

export function isSupportedCountry(value: unknown): value is CountryCode {
  return typeof value === "string" && (SUPPORTED_COUNTRIES as readonly string[]).includes(value);
}

export function getAppsForCountry(country: string | null | undefined): DeliveryApp[] {
  if (!country || !isSupportedCountry(country)) return [];
  return COUNTRY_APPS[country].map((id) => DELIVERY_APPS[id]);
}

export type DeliveryUrls = Partial<Record<DeliveryUrlColumn, string | null>>;

export function getOrderedDeliveryLinks(
  country: string | null | undefined,
  urls: DeliveryUrls,
): Array<{ app: DeliveryApp; url: string }> {
  return getAppsForCountry(country)
    .map((app) => {
      const url = urls[app.column];
      return url ? { app, url } : null;
    })
    .filter((entry): entry is { app: DeliveryApp; url: string } => entry !== null);
}

// HTML5 input pattern is implicitly anchored; strip ^/$ from the RegExp source.
export function inputPatternFromRegex(regex: RegExp): string {
  return regex.source.replace(/^\^/, "").replace(/\$$/, "");
}
