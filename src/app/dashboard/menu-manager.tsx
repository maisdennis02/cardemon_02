"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  toggleItemAvailability,
} from "./actions";

type Item = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  available: boolean;
};

type Category = {
  id: string;
  name: string;
  items: Item[];
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  categories: Category[];
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export function MenuManager({ restaurant }: { restaurant: Restaurant }) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">{restaurant.name}</h2>
        <p className="text-sm text-gray-500">/m/{restaurant.slug}</p>
      </div>

      <NewCategoryForm restaurantId={restaurant.id} />

      {restaurant.categories.length === 0 && (
        <p className="text-sm text-gray-500">Add a category to start building your menu.</p>
      )}

      <div className="flex flex-col gap-8">
        {restaurant.categories.map((cat) => (
          <CategoryBlock key={cat.id} category={cat} />
        ))}
      </div>
    </section>
  );
}

function NewCategoryForm({ restaurantId }: { restaurantId: string }) {
  return (
    <form
      action={createCategory}
      className="flex items-center gap-2 rounded border border-dashed border-gray-300 p-3"
    >
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input
        name="name"
        required
        placeholder="New category (e.g. Starters)"
        className="flex-1 rounded border px-3 py-2 text-sm"
      />
      <button className="rounded bg-black px-3 py-2 text-sm text-white">Add</button>
    </form>
  );
}

function CategoryBlock({ category }: { category: Category }) {
  return (
    <div className="rounded border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-medium">{category.name}</h3>
        <form action={deleteCategory}>
          <input type="hidden" name="id" value={category.id} />
          <button className="text-sm text-red-600 underline">Delete category</button>
        </form>
      </div>

      <div className="flex flex-col divide-y">
        {category.items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>

      <NewItemForm categoryId={category.id} />
    </div>
  );
}

function ItemRow({ item }: { item: Item }) {
  return (
    <div className="flex items-center gap-3 py-3">
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          width={64}
          height={64}
          className="h-16 w-16 rounded object-cover"
        />
      ) : (
        <div className="h-16 w-16 rounded bg-gray-100" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          {!item.available && (
            <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Hidden</span>
          )}
        </div>
        {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
        <p className="text-sm">{formatPrice(item.priceCents, item.currency)}</p>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <form action={toggleItemAvailability}>
          <input type="hidden" name="id" value={item.id} />
          <button className="underline">{item.available ? "Hide" : "Show"}</button>
        </form>
        <form action={deleteItem}>
          <input type="hidden" name="id" value={item.id} />
          <button className="text-red-600 underline">Delete</button>
        </form>
      </div>
    </div>
  );
}

function NewItemForm({ categoryId }: { categoryId: string }) {
  const [state, action, pending] = useActionState(createItem, { error: undefined as string | undefined });
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 self-start text-sm text-blue-600 underline"
      >
        + Add item
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
        setOpen(false);
      }}
      className="mt-3 flex flex-col gap-2 rounded bg-gray-50 p-3"
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      <input name="name" required placeholder="Item name" className="rounded border px-3 py-2" />
      <textarea
        name="description"
        rows={2}
        placeholder="Description (optional)"
        className="rounded border px-3 py-2"
      />
      <input
        name="price"
        required
        placeholder="Price (e.g. 9.99)"
        pattern="\d+(\.\d{1,2})?"
        className="rounded border px-3 py-2"
      />
      <input
        name="image"
        type="file"
        accept="image/*"
        className="text-sm"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save item"}
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
  );
}
