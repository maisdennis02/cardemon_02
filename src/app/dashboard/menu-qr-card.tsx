"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckIcon, CopyIcon, DownloadIcon, ExternalIcon } from "@/components/icons";

const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export function MenuQrCard({ slug, name }: { slug: string; name: string }) {
  const origin = useSyncExternalStore(subscribe, getOrigin, getServerOrigin);

  const url = origin ? `${origin}/m/${slug}` : `/m/${slug}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    if (!origin) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function downloadSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(URL.createObjectURL(blob), `${slug}-menu-qr.svg`);
  }

  function downloadPng() {
    const svg = svgRef.current;
    if (!svg) return;
    const SCALE = 4; // 4× the rendered size for print quality
    const data = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.clientWidth * SCALE;
      canvas.height = svg.clientHeight * SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        triggerDownload(URL.createObjectURL(blob), `${slug}-menu-qr.png`);
      }, "image/png");
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  }

  return (
    <section className="card">
      <h2 className="text-lg font-bold text-[color:var(--color-navy)]">Share your menu</h2>
      <p className="mt-1 mb-5 text-sm text-gray-600">
        Print this QR on your tables — customers scan it to open your menu.
      </p>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <QRCodeSVG
            ref={svgRef}
            value={url}
            size={180}
            level="M"
            marginSize={2}
            fgColor="#101522"
            bgColor="#ffffff"
            title={`Menu QR for ${name}`}
          />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Public URL
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <code className="flex-1 truncate font-mono text-sm text-[color:var(--color-navy)]">
                {origin ? url : `…/m/${slug}`}
              </code>
              <button
                onClick={copyUrl}
                disabled={!origin}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-white hover:text-[color:var(--color-navy)]"
                aria-label="Copy URL"
              >
                {copied ? (
                  <>
                    <CheckIcon size={14} />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={downloadPng} className="btn btn-primary btn-sm">
              <DownloadIcon size={14} />
              PNG
            </button>
            <button onClick={downloadSvg} className="btn btn-secondary btn-sm">
              <DownloadIcon size={14} />
              SVG
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              <ExternalIcon size={14} />
              Open
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
