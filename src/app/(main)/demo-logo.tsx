// The example restaurant's logo on the landing: a serving cloche in a round
// badge, drawn in SVG so it is sharp at any size and needs no translation.
export function DemoLogo({ accent, className }: { accent: string; className?: string }) {
  return (
    <svg data-demo-logo="" viewBox="0 0 100 100" aria-hidden className={className}>
      <circle cx="50" cy="50" r="50" fill="#fdf6ec" />
      <circle cx="50" cy="50" r="44" fill="none" stroke={accent} strokeWidth="3" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={accent} strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="50" cy="35" r="4" fill={accent} />
      <path d="M27 63 A23 23 0 0 1 73 63 Z" fill={accent} />
      <path d="M35 57 A15 15 0 0 1 43 46" fill="none" stroke="#fdf6ec" strokeWidth="3" strokeLinecap="round" />
      <rect x="22" y="64" width="56" height="6" rx="3" fill={accent} />
      <path d="M22 38 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 z" fill={accent} />
      <path d="M78 38 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 z" fill={accent} />
    </svg>
  );
}
