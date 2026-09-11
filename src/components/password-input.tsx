"use client";

import { useId, useState, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";
import { useT } from "@/i18n/provider";

type PasswordInputProps = {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
  placeholder?: string;
};

/**
 * Password field with a show/hide toggle. Owners type these on phones behind
 * the counter, where a mistyped password is the single most common reason a
 * login fails — letting them look at what they typed is the cheapest fix.
 *
 * The toggle is a `type="button"` so it never submits the surrounding form,
 * and the input keeps its `name`, so `<form action={...}>` still sees it.
 */
export function PasswordInput({
  name,
  label,
  hint,
  autoComplete,
  required,
  minLength,
  placeholder,
}: PasswordInputProps) {
  const t = useT();
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="label">
      <label htmlFor={id}>{label}</label>
      {hint}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className="input pr-12"
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          aria-pressed={visible}
          title={visible ? t.auth.hidePassword : t.auth.showPassword}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-gray-500 transition hover:text-[color:var(--color-navy)]"
        >
          {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
    </div>
  );
}
