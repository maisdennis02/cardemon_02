"use client";

import { QRCodeSVG } from "qrcode.react";

// The footer QR of the printable sheet.

export function PrintQr({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={88} marginSize={0} level="M" />;
}
