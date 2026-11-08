// The whole menus behind the three "your restaurant" examples — where a
// visitor lands from the landing's "see the full menu", and the link we send
// to leads. They have to read like a real place: sections, a description on
// every item, local prices, a logo, a colour and a background. The landing's
// phone mock-up keeps its own five-item LANDING_DEMO, which has to fit the
// drawing. Each stays within FREE_ITEM_LIMIT, so it shows what the free plan
// builds.
//
// Logos live in public/demo-menus/<slug>/logo.svg. Owners can only set
// Blob-hosted logos, so the menu page reads these themes with
// readExampleMenuTheme (src/lib/menu.ts), never with readMenuTheme.

import type { Locale } from "@/i18n/config";
import type { Menu, MenuTheme, OptionGroup } from "@/lib/menu";

type ExampleItem = [name: string, priceCents: number, description: string, groups?: OptionGroup[]];

// An option group from [name, extra price] pairs. Required = pick exactly one
// (min 1, max 1); extras = pick none up to `max`. Option ids are prefixed with
// the group id because they must be unique across the whole item.
const group = (id: string, title: string, min: number, max: number, options: [string, number][]): OptionGroup => ({
  id,
  title,
  min,
  max,
  options: options.map(([name, priceCents], i) => ({ id: `${id}-${i}`, name, priceCents })),
});

const exampleMenu = (sections: [string, ExampleItem[]][]): Menu => ({
  v: 1,
  sections: sections.map(([title, items], s) => ({
    id: `s${s}`,
    title,
    items: items.map(([name, priceCents, description, groups], i) => ({
      id: `s${s}i${i}`,
      name,
      priceCents,
      description,
      ...(groups && { groups }),
    })),
  })),
});

const theme = (slug: string, color: string, background: MenuTheme["background"]): MenuTheme => ({
  color,
  headerStyle: "band",
  background,
  logoUrl: `/demo-menus/${slug}/logo.svg`,
});

export const FULL_EXAMPLE_MENUS: Record<Locale, { slug: string; menu: Menu; theme: MenuTheme }> = {
  "pt-BR": {
    slug: "seu-restaurante",
    theme: theme("seu-restaurante", "#c84630", "doodles"),
    menu: exampleMenu([
      [
        "Lanches",
        [
          [
            "X-Burguer",
            2590,
            "Pão brioche, hambúrguer de 150 g, queijo prato e maionese da casa.",
            [
              group("tamanho", "Tamanho", 1, 1, [["Simples", 0], ["Duplo", 800]]),
              group("turbine", "Turbine seu lanche", 0, 3, [["Bacon", 300], ["Cheddar", 250], ["Ovo", 200]]),
            ],
          ],
          ["X-Salada", 2790, "Hambúrguer de 150 g, queijo prato, alface, tomate e maionese da casa."],
          ["X-Bacon", 3190, "Hambúrguer de 150 g, queijo prato, bacon crocante e cebola caramelizada."],
          ["X-Tudo", 3690, "Dois hambúrgueres, queijo, presunto, bacon, ovo, alface e tomate."],
          ["Burguer vegetariano", 2990, "Hambúrguer de grão-de-bico, queijo, rúcula e tomate seco."],
        ],
      ],
      [
        "Porções",
        [
          ["Batata frita", 1890, "400 g, crocante, com sal e orégano. Serve duas pessoas."],
          ["Batata com cheddar e bacon", 2990, "400 g de batata coberta com cheddar cremoso e bacon em cubos."],
          ["Anéis de cebola", 2290, "Empanados na hora, com molho barbecue."],
        ],
      ],
      [
        "Pratos do dia",
        [
          ["Prato feito", 2490, "Arroz, feijão, bife acebolado, batata frita e salada."],
          ["Frango grelhado", 2690, "Filé de frango, arroz, feijão, legumes salteados e salada."],
        ],
      ],
      [
        "Bebidas",
        [
          ["Coca-Cola lata", 790, "350 ml, bem gelada."],
          ["Guaraná lata", 690, "350 ml, bem gelado."],
          [
            "Suco natural",
            990,
            "Feito na hora. Copo de 400 ml.",
            [group("sabor", "Sabor", 1, 1, [["Laranja", 0], ["Limão", 0], ["Maracujá", 0]])],
          ],
          ["Água mineral", 450, "500 ml, com ou sem gás."],
        ],
      ],
      [
        "Sobremesas",
        [
          ["Pudim de leite", 1290, "Fatia do pudim da casa, com calda de caramelo."],
          ["Brownie com sorvete", 1890, "Brownie quente com uma bola de sorvete de creme."],
        ],
      ],
    ]),
  },
  es: {
    slug: "tu-restaurante",
    theme: theme("tu-restaurante", "#2f7d4f", "doodles"),
    menu: exampleMenu([
      [
        "Tacos",
        [
          [
            "Tacos al pastor",
            8500,
            "Con piña, cebolla y cilantro. Tortilla de maíz hecha a mano.",
            [
              group("orden", "Orden", 1, 1, [["3 tacos", 0], ["5 tacos", 5000]]),
              group("extras", "Agrega", 0, 3, [["Queso", 1500], ["Aguacate", 2000], ["Cebollitas", 1000]]),
            ],
          ],
          ["Tacos de suadero", 8500, "Orden de tres, con cebolla, cilantro y salsa verde."],
          ["Tacos de bistec", 9000, "Orden de tres, bistec a la plancha con cebolla asada."],
          ["Campechanos", 9500, "Orden de tres, bistec y longaniza con chicharrón."],
          ["Gringa", 7500, "Tortilla de harina con pastor, queso gratinado y piña."],
        ],
      ],
      [
        "Antojitos",
        [
          ["Quesadilla", 6500, "Tortilla de maíz con queso Oaxaca. Agrega flor de calabaza o champiñones."],
          ["Guacamole con totopos", 7000, "Aguacate, jitomate, cebolla, chile serrano y limón."],
          ["Elote preparado", 4500, "Con mayonesa, queso cotija, chile en polvo y limón."],
        ],
      ],
      [
        "Platillos",
        [
          ["Enchiladas verdes", 12000, "Tres enchiladas de pollo con salsa verde, crema y queso. Con arroz y frijoles."],
          ["Pozole rojo", 11000, "Tazón grande con cerdo, lechuga, rábano, orégano y tostadas."],
        ],
      ],
      [
        "Bebidas",
        [
          [
            "Agua fresca",
            3500,
            "Vaso de 500 ml, hecha en casa.",
            [group("sabor", "Sabor", 1, 1, [["Horchata", 0], ["Jamaica", 0], ["Tamarindo", 0]])],
          ],
          ["Refresco", 3000, "Botella de vidrio de 355 ml."],
          ["Agua mineral", 2500, "Botella de 600 ml."],
        ],
      ],
      [
        "Postres",
        [
          ["Flan napolitano", 4500, "Rebanada del flan de la casa, con cajeta."],
          ["Churros", 5000, "Cinco churros con azúcar y canela, con chocolate para remojar."],
        ],
      ],
    ]),
  },
  en: {
    slug: "your-restaurant",
    theme: theme("your-restaurant", "#1f4e79", "doodles"),
    menu: exampleMenu([
      [
        "Burgers",
        [
          [
            "Classic cheeseburger",
            1250,
            "Quarter-pound patty, American cheese, pickles, onion and house sauce.",
            [
              group("size", "Size", 1, 1, [["Single", 0], ["Double", 400]]),
              group("addons", "Add-ons", 0, 3, [["Bacon", 200], ["Extra cheese", 100], ["Fried egg", 150]]),
            ],
          ],
          ["Bacon BBQ burger", 1450, "Cheddar, crispy bacon, onion rings and smoky barbecue sauce."],
          ["Double smash", 1550, "Two smashed patties, double cheese, grilled onions."],
          ["Veggie burger", 1150, "Black bean patty, pepper jack, avocado and chipotle mayo."],
        ],
      ],
      [
        "Sides",
        [
          ["Fries", 450, "Hand-cut, sea salt. Big enough to share."],
          ["Onion rings", 550, "Beer-battered, with ranch."],
          ["Mac and cheese", 650, "Baked with three cheeses and a crumb topping."],
        ],
      ],
      [
        "Plates",
        [
          ["Chicken tenders", 1200, "Four hand-breaded tenders with fries and honey mustard."],
          ["Grilled chicken salad", 1300, "Romaine, tomato, cucumber, croutons and ranch."],
        ],
      ],
      [
        "Drinks",
        [
          ["Fresh lemonade", 350, "16 oz, squeezed every morning."],
          ["Iced tea", 300, "16 oz, sweet or unsweetened. Free refills."],
          ["Soda", 275, "Coke, Diet Coke or Sprite."],
          [
            "Milkshake",
            650,
            "Thick and cold, with whipped cream.",
            [group("flavor", "Flavor", 1, 1, [["Vanilla", 0], ["Chocolate", 0], ["Strawberry", 0]])],
          ],
        ],
      ],
      [
        "Desserts",
        [
          ["Apple pie", 550, "Warm slice, add a scoop of vanilla for $1."],
          ["Brownie sundae", 700, "Warm brownie, vanilla ice cream and hot fudge."],
        ],
      ],
    ]),
  },
};
