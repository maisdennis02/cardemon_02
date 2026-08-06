"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { KALAM_BOLD_WOFF2_B64 } from "./kalam-font";

const FONT_STACK =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const KALAM_STACK = `'Kalam', 'Comic Sans MS', cursive`;

const NAVY = "#101522";
const BRAND = "#007aff";

// Embedded so the SVG renders Kalam in PNG export and standalone .svg viewers.
const EMBEDDED_FONT_CSS = `@font-face{font-family:'Kalam';font-style:normal;font-weight:700;src:url(data:font/woff2;base64,${KALAM_BOLD_WOFF2_B64}) format('woff2');}`;

type BrandedQrProps = {
  value: string;
  title: string;
  scanLabel: string;
  scanHint: string;
  width?: number;
};

// Layout (viewBox 320×360):
//   Frame: 20,40 → 300,320 (280×280 square, stroke 3)
//   QR:    30,50 → 290,310 (260×260, padding 10 on every side of the frame)
//          marginSize=4 gives the ISO-recommended 4 modules of quiet zone
//          baked inside the QR; the 10px frame padding adds a little more.
export const BrandedQrCode = forwardRef<SVGSVGElement, BrandedQrProps>(
  function BrandedQrCode({ value, title, scanLabel, width }, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 360"
        width={width}
        height={width ? (width * 360) / 320 : undefined}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <defs>
          <style dangerouslySetInnerHTML={{ __html: EMBEDDED_FONT_CSS }} />
        </defs>

        <rect x="0" y="0" width="320" height="360" fill="#ffffff" />

        <rect
          x="20"
          y="40"
          width="280"
          height="280"
          rx="16"
          ry="16"
          fill="none"
          stroke={NAVY}
          strokeWidth="3"
        />

        <QRCodeSVG
          value={value}
          size={260}
          level="M"
          marginSize={4}
          fgColor={NAVY}
          bgColor="#ffffff"
          x={30}
          y={50}
          width={260}
          height={260}
        />

        <text
          x="160"
          y="54"
          textAnchor="middle"
          fontFamily={KALAM_STACK}
          fontSize="36"
          fontWeight="700"
          fill={NAVY}
          stroke="#ffffff"
          strokeWidth="24"
          strokeLinejoin="round"
          paintOrder="stroke fill"
        >
          {scanLabel}
        </text>
        {/* <text
          x="160"
          y="62"
          textAnchor="middle"
          fontFamily={FONT_STACK}
          fontSize="9.5"
          fontWeight="500"
          fill={MUTED}
        >
          {scanHint}
        </text> */}

        <text
          x="160"
          y="324"
          textAnchor="middle"
          fontFamily={FONT_STACK}
          fontSize="14"
          fontWeight="700"
          letterSpacing="-0.01em"
          fill="none"
          stroke="#ffffff"
          strokeWidth="16"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          menulala.com
        </text>
        <text
          x="160"
          y="324"
          textAnchor="middle"
          fontFamily={FONT_STACK}
          fontSize="14"
          fontWeight="700"
          letterSpacing="-0.01em"
          fill={NAVY}
        >
          <tspan>menulala</tspan>
          <tspan fill={BRAND}>.</tspan>
          <tspan>com</tspan>
        </text>
      </svg>
    );
  },
);
