import Link from "next/link";

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <Link href={href} className={`logo-mark ${cls} no-underline`}>
      cardemon<span className="dot">.</span>
    </Link>
  );
}
