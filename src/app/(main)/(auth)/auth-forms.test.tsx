import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";

// React resets an uncontrolled <form action> after every submit, an error
// answer included: a mistyped password wiped the e-mail and the password with
// it (owner, 27/10). Every field the server can reject is controlled, so what
// was typed survives; in server markup that shows as a value="" attribute,
// which an uncontrolled field never renders.

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("./actions", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  googleSignIn: vi.fn(),
}));
vi.mock("../dashboard/actions", () => ({ changePassword: vi.fn() }));

const { default: LoginPage } = await import("./login/page");
const { default: SignupPage } = await import("./signup/page");
const { default: ForgotPasswordPage } = await import("./forgot-password/page");
const { ResetPasswordForm } = await import("./reset-password/reset-password-form");
const { ChangePasswordCard } = await import("../dashboard/change-password-card");

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      {node}
    </DictionaryProvider>,
  );

function controlled(html: string, name: string): boolean {
  const tag = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0];
  if (!tag) throw new Error(`no input named ${name}`);
  return /\svalue="/.test(tag);
}

describe("auth forms keep what was typed after an error", () => {
  it("login keeps the e-mail and the password", () => {
    const html = render(<LoginPage />);
    expect(controlled(html, "email")).toBe(true);
    expect(controlled(html, "password")).toBe(true);
  });

  it("signup keeps the name, the e-mail and the password", () => {
    const html = render(<SignupPage />);
    expect(controlled(html, "name")).toBe(true);
    expect(controlled(html, "email")).toBe(true);
    expect(controlled(html, "password")).toBe(true);
  });

  it("forgot password keeps the e-mail", () => {
    expect(controlled(render(<ForgotPasswordPage />), "email")).toBe(true);
  });

  it("reset password keeps the new password", () => {
    expect(controlled(render(<ResetPasswordForm token="t" />), "password")).toBe(true);
  });

  it("change password keeps the three fields", () => {
    const html = render(<ChangePasswordCard />);
    expect(controlled(html, "currentPassword")).toBe(true);
    expect(controlled(html, "newPassword")).toBe(true);
    expect(controlled(html, "confirmPassword")).toBe(true);
  });
});
