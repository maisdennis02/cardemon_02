"use client";

import { useEffect } from "react";
import "./menu-actions.css";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { WhatsAppIcon, InstagramIcon } from "@/components/icons";
import {
  getOrderedDeliveryLinks,
  type DeliveryApp,
  type DeliveryUrls,
} from "@/lib/delivery-apps";

// Shared by both public menu layouts (photo slideshow and text menu): the
// floating contact/delivery buttons and the analytics pings behind the owner's
// stats card.

export function pingMenuEvent(slug: string, kind: string) {
  fetch("/api/menu-views", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, kind }),
    keepalive: true,
  }).catch(() => {});
}

// One "view" per browser session per menu.
export function MenuViewPing({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `mv:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage can throw in privacy mode — fall through and still ping.
    }
    pingMenuEvent(slug, "view");
  }, [slug]);
  return null;
}

export function MenuActions({
  slug,
  whatsappNumber,
  instagramUrl,
  country,
  deliveryUrls,
}: {
  slug: string;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  country: string | null;
  deliveryUrls: DeliveryUrls;
}) {
  const t = useT();
  const deliveryLinks = getOrderedDeliveryLinks(country, deliveryUrls);
  const hasAnyButton = whatsappNumber || instagramUrl || deliveryLinks.length > 0;
  if (!hasAnyButton) return null;
  return (
    <div className="social-buttons">
      {whatsappNumber && (
        <a
          className="social-link"
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => pingMenuEvent(slug, "click_whatsapp")}
        >
          <button className="social-button wh-button" type="button">
            <WhatsAppIcon />
            <span>Whatsapp</span>
          </button>
        </a>
      )}
      {instagramUrl && (
        <a
          className="social-link"
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => pingMenuEvent(slug, "click_instagram")}
        >
          <button className="social-button ig-button" type="button">
            <InstagramIcon />
            <span>Instagram</span>
          </button>
        </a>
      )}
      {deliveryLinks.map(({ app, url }) => (
        <DeliveryButton
          key={app.id}
          app={app}
          url={url}
          label={format(t.menu.orderOn, { appName: app.displayName })}
          onClick={() => pingMenuEvent(slug, `click_${app.id}`)}
        />
      ))}
    </div>
  );
}

function DeliveryButton({
  app,
  url,
  label,
  onClick,
}: {
  app: DeliveryApp;
  url: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <a
      className="social-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
    >
      <button
        className="social-button delivery-button"
        type="button"
        style={
          {
            "--brand-color": app.brandColor,
            "--text-color": app.textColor,
          } as React.CSSProperties
        }
      >
        {app.logoPath ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={app.logoPath} alt="" className="delivery-logo" aria-hidden />
        ) : (
          <DeliveryPlaceholderIcon />
        )}
        <span>{label}</span>
      </button>
    </a>
  );
}

// TODO: swap for per-app official SVG logos when assets are added.
function DeliveryPlaceholderIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}
