// The landing section that links to menus, per language.
//
// It lives here rather than in the i18n dictionaries because its SHAPE is not
// the same in every language, and a dictionary forces every locale to carry
// every key:
//
//  - Portuguese shows three customers, each with what they said;
//  - English and Spanish have no customer who speaks the visitor's language,
//    so they show two example menus in that language (src/lib/example-menus.ts)
//    labelled as examples, plus one real restaurant labelled as real.
//
// Rules for anything added here: no invented people, quotes or cities. An
// example is never listed under a heading that claims customers, and a card
// of kind "example" or "real" carries a factual line, not a quote. Every slug
// must be in the example registry or in REAL_MENU_SLUGS — landing-examples
// .test.tsx fails otherwise.

import type { Locale } from "@/i18n/config";

type CardBase = {
  slug: string;
  restaurant: string;
  // The small upper-case line under the name: a city, or "Example menu".
  label: string;
};

export type ShowcaseCard =
  | (CardBase & { kind: "customer"; quote: string; person: string })
  | (CardBase & { kind: "example" | "real"; line: string });

export type LandingShowcase = { heading: string; cards: readonly ShowcaseCard[] };

export const LANDING_SHOWCASE: Record<Locale, LandingShowcase> = {
  "pt-BR": {
    heading: "Restaurantes que já usam o menulala",
    cards: [
      {
        kind: "customer",
        slug: "art-sabor-sushi",
        restaurant: "Art Sabor Sushi",
        label: "Piumhi / MG",
        quote: "Cinco minutos pra configurar. O QR tá nas mesas desde então.",
        person: "Mylena Tanaka",
      },
      {
        kind: "customer",
        slug: "barraca-da-sonia",
        restaurant: "Barraca da Sônia",
        label: "Bertioga / SP",
        quote:
          "A gente reimprimia o cardápio a cada dois meses. Agora troco a foto pelo celular e tá pronto.",
        person: "Sônia Ribeiro",
      },
      {
        kind: "customer",
        slug: "cavalo-marinho",
        restaurant: "Cavalo Marinho",
        label: "Riviera / SP",
        quote:
          "Consigo deixar o cardápio disponível no Google e enviar o link pelo Whatsapp. Muito prático.",
        person: "Roger Almeida",
      },
    ],
  },
  en: {
    heading: "See it working",
    cards: [
      {
        kind: "example",
        slug: "maple-street-diner",
        restaurant: "Maple Street Diner",
        label: "Example menu",
        line: "A sample diner menu we made: breakfast, burgers and pie on three pages.",
      },
      {
        kind: "example",
        slug: "harbor-taproom",
        restaurant: "Harbor Taproom",
        label: "Example menu",
        line: "A sample taproom menu we made: eight beers on tap and bar food on three pages.",
      },
      {
        kind: "real",
        slug: "cavalo-marinho",
        restaurant: "Cavalo Marinho",
        label: "Real restaurant · Brazil",
        line: "A restaurant in Riviera, São Paulo, that uses menulala. Its menu is in Portuguese.",
      },
    ],
  },
  es: {
    heading: "Míralo funcionando",
    cards: [
      {
        kind: "example",
        slug: "taqueria-la-esquina",
        restaurant: "Taquería La Esquina",
        label: "Menú de ejemplo",
        line: "Un menú de taquería que hicimos de ejemplo: tacos, especialidades y bebidas en tres páginas.",
      },
      {
        kind: "example",
        slug: "cafe-buen-dia",
        restaurant: "Café Buen Día",
        label: "Menú de ejemplo",
        line: "Un menú de cafetería que hicimos de ejemplo: café, desayunos y pan en tres páginas.",
      },
      {
        kind: "real",
        slug: "cavalo-marinho",
        restaurant: "Cavalo Marinho",
        label: "Restaurante real · Brasil",
        line: "Un restaurante de Riviera, São Paulo, que usa menulala. Su menú está en portugués.",
      },
    ],
  },
};
