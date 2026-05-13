"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCube, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-cube";
import "swiper/css/pagination";
import "swiper/css/autoplay";
import "./hero-phone-preview.css";
import type { SerializableApp } from "@/lib/hero-mockup";

type Props = {
  alt: string;
  images: string[];
  apps: SerializableApp[];
};

export function HeroPhonePreview({ alt, images, apps }: Props) {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="relative aspect-[9/19] w-full rounded-[2.5rem] border-[10px] border-[color:var(--color-navy)] bg-[color:var(--color-navy)] shadow-2xl">
        <div className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-gray-700" />
        <div className="hero-phone-screen">
          <div className="hero-social-buttons">
            <button type="button" className="hero-social-button hero-wh-button">
              <WhatsAppIcon />
              <span>WhatsApp</span>
            </button>
            <button type="button" className="hero-social-button hero-ig-button">
              <InstagramIcon />
              <span>Instagram</span>
            </button>
            {apps.map((app) => (
              <button
                key={app.id}
                type="button"
                className="hero-social-button hero-delivery-button"
                style={
                  {
                    "--brand-color": app.brandColor,
                    "--text-color": app.textColor,
                  } as React.CSSProperties
                }
              >
                {app.logoPath ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={app.logoPath}
                    alt=""
                    className="hero-delivery-logo"
                    aria-hidden
                  />
                ) : (
                  <DeliveryPlaceholderIcon />
                )}
                <span>{app.displayName}</span>
              </button>
            ))}
          </div>

          <Swiper
            modules={[Autoplay, EffectCube, Pagination]}
            effect="cube"
            grabCursor
            loop
            autoplay={{ delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            cubeEffect={{
              shadow: false,
              slideShadows: true,
              shadowOffset: 4,
              shadowScale: 0.94,
            }}
            pagination={{ clickable: true }}
            className="hero-swiper"
          >
            {images.map((url, i) => (
              <SwiperSlide key={url}>
                {i === 0 && <ChevronHint />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${alt} ${i + 1}`}
                  className="hero-slide-img"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
      <div className="absolute -left-4 -top-4 -z-10 h-32 w-32 rounded-full bg-[color:var(--color-brand-100)] blur-2xl" />
      <div className="absolute -bottom-6 -right-6 -z-10 h-40 w-40 rounded-full bg-[color:var(--color-brand-50)] blur-2xl" />
    </div>
  );
}

function ChevronHint() {
  return (
    <div className="hero-chevron-hint" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          className={`hero-chev hero-chev-${i}`}
          width="18"
          height="18"
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
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.5 3.5A11.9 11.9 0 0 0 3.4 20l-1.4 5.1 5.2-1.4a11.9 11.9 0 0 0 17.4-15.2A11.8 11.8 0 0 0 20.5 3.5ZM12 21.4a9.4 9.4 0 0 1-4.8-1.3l-.3-.2-3.1.8.8-3-.2-.3A9.4 9.4 0 1 1 12 21.4Zm5.4-7c-.3-.1-1.7-.9-2-1s-.5-.1-.7.2-.8 1-1 1.2-.4.2-.7.1a7.7 7.7 0 0 1-2.3-1.4 8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5a.6.6 0 0 0 0-.6c0-.1-.7-1.7-.9-2.3s-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.2 6.2 0 0 0 1.3 3.4 14.4 14.4 0 0 0 5.5 4.8c.8.3 1.4.5 1.9.7a4.5 4.5 0 0 0 2 .1 3.3 3.3 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.2-.3-.3-.6-.4Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="13"
      height="13"
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

function DeliveryPlaceholderIcon() {
  return (
    <svg
      width="13"
      height="13"
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
