"use client";

import Image from "next/image";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { upload } from "@vercel/blob/client";
import {
  recordMenuImages,
  deleteMenuImage,
  reorderMenuImages,
} from "./actions";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/icons";

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
    <section className="card">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[color:var(--color-navy)]">Menu pages</h2>
        <p className="mt-1 text-sm text-gray-600">
          Upload your menu artwork. Customers swipe through them in order.
        </p>
      </div>

      <UploadDropzone restaurantId={restaurant.id} />

      {restaurant.images.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No menu pages yet — upload your first image above.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {restaurant.images.map((img, i) => (
            <ImageCard
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

function UploadDropzone({ restaurantId }: { restaurantId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const files = Array.from(fileList);
    for (const f of files) {
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
      for (const [i, file] of files.entries()) {
        const blob = await upload(`menu-pages/${restaurantId}/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          clientPayload: JSON.stringify({ restaurantId }),
        });
        urls.push(blob.url);
        setProgress({ done: i + 1, total: files.length });
      }

      const res = await recordMenuImages({ restaurantId, urls });
      if (res.error) setError(res.error);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-50)]"
            : "border-gray-300 bg-gray-50 hover:border-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-50)]/40"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[color:var(--color-brand)] shadow-sm">
          <UploadIcon size={20} />
        </div>
        <p className="text-sm font-medium text-[color:var(--color-navy)]">
          {dragOver ? "Drop to upload" : "Drag images here, or click to choose"}
        </p>
        <p className="text-xs text-gray-500">JPG, PNG, WEBP up to 10 MB each</p>
        <input
          ref={inputRef}
          name="images"
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </label>

      {progress && (
        <div className="flex items-center gap-3 rounded-lg bg-[color:var(--color-brand-50)] px-3 py-2 text-sm text-[color:var(--color-brand-700)]">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
            <div
              className="h-full bg-[color:var(--color-brand)] transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <span className="font-medium tabular-nums">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}

function ImageCard({
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
  const disabled = pending || busy;

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
    <li className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        <Image
          src={image.url}
          alt={`Menu page ${index + 1}`}
          fill
          sizes="(max-width: 640px) 100vw, 320px"
          className="object-cover"
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
          {index + 1}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => move(-1)}
            disabled={index === 0 || disabled}
            aria-label="Move up"
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[color:var(--color-navy)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronUpIcon size={18} />
          </button>
          <button
            onClick={() => move(1)}
            disabled={index === total - 1 || disabled}
            aria-label="Move down"
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[color:var(--color-navy)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronDownIcon size={18} />
          </button>
        </div>

        <form action={deleteMenuImage}>
          <input type="hidden" name="id" value={image.id} />
          <button
            aria-label="Delete image"
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
          >
            <TrashIcon size={14} />
            Delete
          </button>
        </form>
      </div>
    </li>
  );
}
