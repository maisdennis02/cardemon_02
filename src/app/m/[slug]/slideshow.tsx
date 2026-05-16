"use client";

import { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCube, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-cube";
import "swiper/css/pagination";
import "./slideshow.css";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { WhatsAppIcon, InstagramIcon } from "@/components/icons";
import {
  getOrderedDeliveryLinks,
  type DeliveryApp,
  type DeliveryUrls,
} from "@/lib/delivery-apps";

type Props = {
  slug: string;
  name: string;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  country: string | null;
  deliveryUrls: DeliveryUrls;
  images: string[];
};

function pingMenuEvent(slug: string, kind: string) {
  fetch("/api/menu-views", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, kind }),
    keepalive: true,
  }).catch(() => {});
}

export function MenuSlideshow({
  slug,
  name,
  whatsappNumber,
  instagramUrl,
  country,
  deliveryUrls,
  images,
}: Props) {
  const t = useT();
  const deliveryLinks = getOrderedDeliveryLinks(country, deliveryUrls);

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
  const hasAnyButton = whatsappNumber || instagramUrl || deliveryLinks.length > 0;
  return (
    <div className="menu-root">
      {hasAnyButton && (
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
      )}

      <Swiper
        modules={[EffectCube, Pagination]}
        effect="cube"
        grabCursor
        cubeEffect={{ shadow: true, slideShadows: true, shadowOffset: 12, shadowScale: 0.9 }}
        pagination={{ clickable: true }}
        className="menu-swiper"
      >
        {images.length === 0 ? (
          <SwiperSlide>
            <div className="empty-slide">
              <p>{t.menu.preparing}</p>
            </div>
          </SwiperSlide>
        ) : (
          images.map((url, i) => (
            <SwiperSlide key={url}>
              {i === 0 && <ChevronHint />}
              <img
                src={url}
                alt={format(t.menu.pageAlt, { n: i + 1 })}
                className="slide-img"
              />
            </SwiperSlide>
          ))
        )}

        <SwiperSlide>
          <div className="last-slide">
            <span className="last-label-01">{t.menu.cardapioDigital}</span>
            <span className="last-label-02">{name}</span>
            <div className="menulala-credit">
              <p>{t.menu.madeBy}</p>
              <a
                className="menulala-link"
                href="https://menulala.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="menulala-button">menulala.com</span>
              </a>
            </div>
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}

function ChevronHint() {
  return (
    <div className="chevron-hint" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          className={`chev chev-${i}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
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
