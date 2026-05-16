type IconProps = { className?: string; size?: number };

const baseProps = (size = 20, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

export function UploadIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function ShareIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function PhoneIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

export function ArrowRightIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function ExternalIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function TrashIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function ChevronUpIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function ChevronDownIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function CheckIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function XIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function PlusIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function CopyIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function DownloadIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function WhatsAppIcon({ className, size }: IconProps) {
  return (
    <svg
      width={size ?? 18}
      height={size ?? 18}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M20.5 3.5A11.9 11.9 0 0 0 3.4 20l-1.4 5.1 5.2-1.4a11.9 11.9 0 0 0 17.4-15.2A11.8 11.8 0 0 0 20.5 3.5ZM12 21.4a9.4 9.4 0 0 1-4.8-1.3l-.3-.2-3.1.8.8-3-.2-.3A9.4 9.4 0 1 1 12 21.4Zm5.4-7c-.3-.1-1.7-.9-2-1s-.5-.1-.7.2-.8 1-1 1.2-.4.2-.7.1a7.7 7.7 0 0 1-2.3-1.4 8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5a.6.6 0 0 0 0-.6c0-.1-.7-1.7-.9-2.3s-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.2 6.2 0 0 0 1.3 3.4 14.4 14.4 0 0 0 5.5 4.8c.8.3 1.4.5 1.9.7a4.5 4.5 0 0 0 2 .1 3.3 3.3 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.2-.3-.3-.6-.4Z" />
    </svg>
  );
}

export function InstagramIcon({ className, size }: IconProps) {
  return (
    <svg
      width={size ?? 18}
      height={size ?? 18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M16 11.4A4 4 0 1 1 12.6 8a4 4 0 0 1 3.4 3.4Z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function GripIcon({ className, size }: IconProps) {
  return (
    <svg
      width={size ?? 20}
      height={size ?? 20}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}
