"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import {
  recordMenuImages,
  deleteMenuImage,
  reorderMenuImages,
} from "./actions";

type MenuImage = {
  id: string;
  url: string;
  sortOrder: number;
};

type Restaurant = {
  id: string;
  images: MenuImage[];
};

export function ImageManager({ restaurant }: { restaurant: Restaurant }) {
  return (
    <section className="rounded border border-gray-200 p-4">
      <h2 className="mb-3 text-lg font-medium">Menu pages</h2>
      <p className="mb-4 text-sm text-gray-600">
        Upload your menu artwork as image(s). Customers will swipe through them in order.
      </p>

      <UploadForm restaurantId={restaurant.id} />

      {restaurant.images.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No menu pages yet. Upload your first image above.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {restaurant.images.map((img, i) => (
            <ImageRow
              key={img.id}
              image={img}
              index={i}
              total={restaurant.images.length}
              orderedIds={restaurant.images.map((x) => x.id)}
              restaurantId={restaurant.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function UploadForm({ restaurantId }: { restaurantId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const files = inputRef.current?.files;
    if (!files || files.length === 0) {
      setError("Pick at least one image.");
      return;
    }

    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        setError(`${f.name} is not an image.`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError(`${f.name} is over 10 MB.`);
        return;
      }
    }

    setBusy(true);
    setProgress({ done: 0, total: files.length });

    try {
      const urls: string[] = [];
      for (const [i, file] of Array.from(files).entries()) {
        const blob = await upload(`menu-pages/${restaurantId}/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          clientPayload: JSON.stringify({ restaurantId }),
        });
        urls.push(blob.url);
        setProgress({ done: i + 1, total: files.length });
      }

      const res = await recordMenuImages({ restaurantId, urls });
      if (res.error) {
        setError(res.error);
      } else {
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded border border-dashed border-gray-300 p-3"
    >
      <input
        ref={inputRef}
        name="images"
        type="file"
        accept="image/*"
        multiple
        required
        disabled={busy}
        className="text-sm"
      />
      {progress && (
        <p className="text-sm text-gray-600">
          Uploading {progress.done} of {progress.total}…
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}

function ImageRow({
  image,
  index,
  total,
  orderedIds,
  restaurantId,
}: {
  image: MenuImage;
  index: number;
  total: number;
  orderedIds: string[];
  restaurantId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function move(direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= total) return;
    const next = [...orderedIds];
    [next[index], next[target]] = [next[target], next[index]];
    const fd = new FormData();
    fd.set("restaurantId", restaurantId);
    fd.set("orderedIds", next.join(","));
    setBusy(true);
    startTransition(async () => {
      await reorderMenuImages(fd);
      setBusy(false);
    });
  }

  return (
    <li className="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 p-2">
      <span className="w-6 text-center text-sm text-gray-500">{index + 1}</span>
      <Image
        src={image.url}
        alt={`Menu page ${index + 1}`}
        width={80}
        height={80}
        className="h-20 w-20 flex-shrink-0 rounded object-cover"
      />
      <div className="flex-1" />
      <div className="flex flex-col gap-1">
        <button
          onClick={() => move(-1)}
          disabled={index === 0 || pending || busy}
          className="rounded border bg-white px-2 py-1 text-xs disabled:opacity-30"
        >
          ↑
        </button>
        <button
          onClick={() => move(1)}
          disabled={index === total - 1 || pending || busy}
          className="rounded border bg-white px-2 py-1 text-xs disabled:opacity-30"
        >
          ↓
        </button>
      </div>
      <form action={deleteMenuImage}>
        <input type="hidden" name="id" value={image.id} />
        <button className="text-sm text-red-600 underline">Delete</button>
      </form>
    </li>
  );
}
