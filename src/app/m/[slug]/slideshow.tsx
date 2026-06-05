"use client";

import { useEffect, useRef } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);

  // All cube faces must share one height, else a taller neighbouring page peeks
  // out behind a shorter one (the cube renders every face in 3D at once). We
  // size every slide to the tallest page's aspect ratio and let shorter pages
  // fill the remainder with white. Measured from the images so it adapts to any
  // menu and viewport width.
  const measureTallest = () => {
    const root = rootRef.current;
    if (!root) return;
    let maxAspect = 0;
    root.querySelectorAll<HTMLImageElement>(".slide-img").forEach((img) => {
      if (img.naturalWidth) {
        maxAspect = Math.max(maxAspect, img.naturalHeight / img.naturalWidth);
      }
    });
    if (maxAspect > 0) root.style.setProperty("--menu-aspect", String(maxAspect));
  };
  useEffect(measureTallest, []);

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
    <div className="menu-root" ref={rootRef}>
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
              <ZoomableImage
                src={url}
                alt={format(t.menu.pageAlt, { n: i + 1 })}
                onLoad={measureTallest}
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

/**
 * Menu page image with "peek" pinch-to-zoom: two fingers zoom and pan, and
 * lifting them snaps the image back to its original size so the user can keep
 * swiping between pages. The zoom never sticks (unlike Swiper's built-in zoom).
 *
 * Swiper already ignores two-finger gestures for sliding, so we never disable
 * it — that guarantees swiping can't get stuck after a pinch. On iOS Safari we
 * use the native pinch gesture events (reliable `scale` + `gestureend`); other
 * browsers fall back to two-finger touch math.
 */
function ZoomableImage({
  src,
  alt,
  onLoad,
}: {
  src: string;
  alt: string;
  onLoad?: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const swiperEl = img.closest(".menu-swiper");

    let active = false;
    let startX = 0;
    let startY = 0;

    // Begin a peek: anchor the zoom at the pinch centre and let the image
    // spill past the slide/cube bounds (see the .is-pinching CSS rules).
    const begin = (cx: number, cy: number) => {
      active = true;
      startX = cx;
      startY = cy;
      const rect = img.getBoundingClientRect();
      img.style.transformOrigin = `${cx - rect.left}px ${cy - rect.top}px`;
      img.style.transition = "none";
      swiperEl?.classList.add("is-pinching");
    };

    const update = (scale: number, cx: number, cy: number) => {
      if (!active) return;
      const s = Math.min(4, Math.max(1, scale));
      img.style.transform = `translate(${cx - startX}px, ${cy - startY}px) scale(${s})`;
    };

    // Snap back to original size and hand control back to swiping.
    const end = () => {
      if (!active) return;
      active = false;
      img.style.transition = "transform 220ms ease";
      img.style.transform = "";
      swiperEl?.classList.remove("is-pinching");
    };

    // iOS Safari: native pinch gesture events fire reliably and give us an
    // absolute `scale` plus the gesture centre.
    if ("GestureEvent" in window) {
      type GestureEventLike = Event & {
        scale: number;
        clientX: number;
        clientY: number;
      };
      const onStart = (e: Event) => {
        const g = e as GestureEventLike;
        e.preventDefault();
        begin(g.clientX, g.clientY);
      };
      const onChange = (e: Event) => {
        const g = e as GestureEventLike;
        e.preventDefault();
        update(g.scale, g.clientX, g.clientY);
      };
      const onEnd = (e: Event) => {
        e.preventDefault();
        end();
      };
      img.addEventListener("gesturestart", onStart);
      img.addEventListener("gesturechange", onChange);
      img.addEventListener("gestureend", onEnd);
      return () => {
        img.removeEventListener("gesturestart", onStart);
        img.removeEventListener("gesturechange", onChange);
        img.removeEventListener("gestureend", onEnd);
      };
    }

    // Other browsers (Android Chrome, etc.): two-finger touch math.
    let startDist = 0;
    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const midX = (t: TouchList) => (t[0].clientX + t[1].clientX) / 2;
    const midY = (t: TouchList) => (t[0].clientY + t[1].clientY) / 2;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      startDist = dist(e.touches);
      begin(midX(e.touches), midY(e.touches));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 2) return;
      // Non-passive: blocks the browser's own page pinch-zoom/scroll.
      e.preventDefault();
      update(dist(e.touches) / startDist, midX(e.touches), midY(e.touches));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) end();
    };

    img.addEventListener("touchstart", onTouchStart, { passive: true });
    img.addEventListener("touchmove", onTouchMove, { passive: false });
    img.addEventListener("touchend", onTouchEnd);
    img.addEventListener("touchcancel", onTouchEnd);
    return () => {
      img.removeEventListener("touchstart", onTouchStart);
      img.removeEventListener("touchmove", onTouchMove);
      img.removeEventListener("touchend", onTouchEnd);
      img.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img ref={imgRef} src={src} alt={alt} className="slide-img" onLoad={onLoad} />
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
