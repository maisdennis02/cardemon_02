import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import { FeedbackCardView } from "./feedback-card";
import { FEEDBACK_MAX_LENGTH } from "@/lib/feedback-limits";

// The "Sugestões e dúvidas" box at the bottom of the dashboard. The view is
// split from the action-state hook so both answers can be rendered here.

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      {node}
    </DictionaryProvider>,
  );
const noop = () => {};

describe("FeedbackCardView", () => {
  it("shows the title, a bounded textarea and the send button", () => {
    const html = render(<FeedbackCardView state={{}} action={noop} pending={false} />);
    expect(html).toContain(ptBR.dashboard.feedback.title);
    expect(html).toContain(ptBR.dashboard.feedback.lead);
    expect(html).toMatch(new RegExp(`<textarea[^>]*name="message"[^>]*maxlength="${FEEDBACK_MAX_LENGTH}"`, "i"));
    expect(html).toContain(`>${ptBR.dashboard.feedback.submit}<`);
  });

  it("after a successful send, shows the thank-you line and no form", () => {
    const html = render(<FeedbackCardView state={{ ok: true }} action={noop} pending={false} />);
    expect(html).toContain(ptBR.dashboard.feedback.success);
    expect(html).not.toContain("<textarea");
  });

  it("shows the error the action returned, keeping the form", () => {
    const html = render(
      <FeedbackCardView state={{ error: "Escreva a mensagem antes de enviar." }} action={noop} pending={false} />,
    );
    expect(html).toContain("Escreva a mensagem antes de enviar.");
    expect(html).toContain("<textarea");
  });

  it("disables the button and says sending while pending", () => {
    const html = render(<FeedbackCardView state={{}} action={noop} pending={true} />);
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).toContain(ptBR.dashboard.feedback.sending);
  });
});
