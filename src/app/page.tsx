import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import {
  ArrowRightIcon,
  PhoneIcon,
  ShareIcon,
  UploadIcon,
} from "@/components/icons";
import previewImage from "../../example/01.jpg";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader signedIn={!!session?.user} />
      <Hero signedIn={!!session?.user} />
      <Features />
      <BottomCta signedIn={!!session?.user} />
      <SiteFooter />
    </div>
  );
}

function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-24 md:grid-cols-2 md:items-center">
        <div className="flex flex-col gap-6">
          <span className="self-start rounded-full bg-[color:var(--color-brand-50)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[color:var(--color-brand-700)]">
            Cardápio digital
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[color:var(--color-navy)] sm:text-5xl md:text-6xl">
            Your menu,
            <br />
            <span className="text-[color:var(--color-brand)]">a swipe away.</span>
          </h1>
          <p className="max-w-md text-lg text-gray-600">
            Upload your menu artwork. Share a link or QR code. Customers swipe through
            it on any phone — right at the table.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-primary">
              {signedIn ? "Go to dashboard" : "Get started"}
              <ArrowRightIcon size={16} />
            </Link>
            {!signedIn && (
              <Link href="/login" className="btn btn-secondary">
                I have an account
              </Link>
            )}
          </div>
        </div>

        <PhonePreview />
      </div>
    </section>
  );
}

function PhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="relative aspect-[9/19] w-full rounded-[2.5rem] border-[10px] border-[color:var(--color-navy)] bg-[color:var(--color-navy)] shadow-2xl">
        <div className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-gray-700" />
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-white">
          <Image
            src={previewImage}
            alt="Menu preview"
            fill
            sizes="(max-width: 640px) 80vw, 380px"
            className="object-cover object-top"
            priority
          />
        </div>
      </div>
      <div className="absolute -left-4 -top-4 -z-10 h-32 w-32 rounded-full bg-[color:var(--color-brand-100)] blur-2xl" />
      <div className="absolute -bottom-6 -right-6 -z-10 h-40 w-40 rounded-full bg-[color:var(--color-brand-50)] blur-2xl" />
    </div>
  );
}

function Features() {
  const items = [
    {
      icon: UploadIcon,
      title: "Upload your artwork",
      body: "Drag in the menu pages you already designed. JPG, PNG, whatever you have.",
    },
    {
      icon: ShareIcon,
      title: "Share a link",
      body: "Every restaurant gets a clean URL like cardemon.app/m/yourname. Print it on a QR.",
    },
    {
      icon: PhoneIcon,
      title: "Customers swipe",
      body: "On any phone — no app, no install. Smooth cube animation, tap WhatsApp to order.",
    },
  ];

  return (
    <section className="border-t border-gray-100 bg-gray-50/60">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-[color:var(--color-navy)] sm:text-4xl">
          Three steps. That&apos;s it.
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <div key={i} className="card flex flex-col gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand)]">
                <it.icon size={22} />
              </div>
              <h3 className="text-lg font-bold text-[color:var(--color-navy)]">
                {it.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCta({ signedIn }: { signedIn: boolean }) {
  if (signedIn) return null;
  return (
    <section className="bg-[color:var(--color-navy)] text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
        <h2 className="text-3xl font-bold sm:text-4xl">Ready to go digital?</h2>
        <p className="max-w-lg text-gray-300">
          Free to try. Set up your menu in five minutes.
        </p>
        <Link href="/signup" className="btn btn-primary">
          Get started
          <ArrowRightIcon size={16} />
        </Link>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-gray-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span>·</span>
          <span>Cardápio digital</span>
        </div>
        <p>© {new Date().getFullYear()} cardemon</p>
      </div>
    </footer>
  );
}
