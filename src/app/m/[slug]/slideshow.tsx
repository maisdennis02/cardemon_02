"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCube, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-cube";
import "swiper/css/pagination";
import "./slideshow.css";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";

type Props = {
  name: string;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  images: string[];
};

export function MenuSlideshow({ name, whatsappNumber, instagramUrl, images }: Props) {
  const t = useT();
  return (
    <div className="menu-root">
      {(whatsappNumber || instagramUrl) && (
        <div className="social-buttons">
          {whatsappNumber && (
            <a
              className="social-link"
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
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
            >
              <button className="social-button ig-button" type="button">
                <InstagramIcon />
                <span>Instagram</span>
              </button>
            </a>
          )}
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
                href="https://www.instagram.com/cardemon.co/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="menulala-button">@cardemon.co</span>
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

function WhatsAppIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.5 3.5A11.9 11.9 0 0 0 3.4 20l-1.4 5.1 5.2-1.4a11.9 11.9 0 0 0 17.4-15.2A11.8 11.8 0 0 0 20.5 3.5ZM12 21.4a9.4 9.4 0 0 1-4.8-1.3l-.3-.2-3.1.8.8-3-.2-.3A9.4 9.4 0 1 1 12 21.4Zm5.4-7c-.3-.1-1.7-.9-2-1s-.5-.1-.7.2-.8 1-1 1.2-.4.2-.7.1a7.7 7.7 0 0 1-2.3-1.4 8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5a.6.6 0 0 0 0-.6c0-.1-.7-1.7-.9-2.3s-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.2 6.2 0 0 0 1.3 3.4 14.4 14.4 0 0 0 5.5 4.8c.8.3 1.4.5 1.9.7a4.5 4.5 0 0 0 2 .1 3.3 3.3 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.2-.3-.3-.6-.4Z" />
    </svg>
  );
}

function InstagramIcon() {
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
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M16 11.4A4 4 0 1 1 12.6 8a4 4 0 0 1 3.4 3.4Z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
