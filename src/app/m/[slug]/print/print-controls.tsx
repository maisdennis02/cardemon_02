"use client";

import { QRCodeSVG } from "qrcode.react";

// The two pieces of the printable sheet that need the browser: the button
// that opens the device's print / save-as-PDF screen, and the footer QR.

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white"
    >
      {label}
    </button>
  );
}

export function PrintQr({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={84} marginSize={0} level="M" />;
}
