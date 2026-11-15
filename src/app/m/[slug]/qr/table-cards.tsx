"use client";

import "./table-cards.css";

import { BrandedQrCode, QrFontStyle } from "@/app/(main)/dashboard/branded-qr";

export type TableCardLabels = {
  title: string;
  print: string;
  help: string;
  line: string;
  order: string;
  scanLabel: string;
  scanHint: string;
  qrTitle: string;
};

export const CARDS_PER_SHEET = 6;

// One A4 sheet, 2 × 3 cards of 105 × 99 mm, cut along the dotted lines. The
// QR is the one the dashboard downloads (BrandedQrCode), so a printed card and
// a downloaded PNG are the same code.
export function TableCards({
  url,
  name,
  color,
  canOrder,
  labels,
}: {
  url: string;
  name: string;
  color: string;
  canOrder: boolean;
  labels: TableCardLabels;
}) {
  return (
    <main className="qr-root">
      <QrFontStyle />
      <div className="qr-controls">
        <h1 className="text-lg font-bold">{labels.title}</h1>
        <p className="text-sm text-gray-600">{labels.help}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          {labels.print}
        </button>
      </div>

      <div className="qr-sheet" aria-label={labels.title}>
        {Array.from({ length: CARDS_PER_SHEET }, (_, i) => (
          <section key={i} className="qr-card">
            <p className="qr-card-name" style={{ color }}>
              {name}
            </p>
            <BrandedQrCode
              value={url}
              title={labels.qrTitle}
              scanLabel={labels.scanLabel}
              scanHint={labels.scanHint}
              embedFont={false}
            />
            <p className="qr-card-line">{labels.line}</p>
            {canOrder && <p className="qr-card-order">{labels.order}</p>}
          </section>
        ))}
      </div>
    </main>
  );
}
