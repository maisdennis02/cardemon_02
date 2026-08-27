import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";
import type { Locale } from "@/i18n";
import { LegalArticle, type LegalContent } from "@/components/legal-article";

// Terms of service. Same structure decision as /privacy: long-form legal prose
// lives in the page, not in the i18n dictionaries.

const CONTACT_EMAIL = "contato@menulala.com";

const CONTENT: Record<Locale, LegalContent> = {
  "pt-BR": {
    title: "Termos de Uso",
    updated: "Última atualização: 27 de agosto de 2026",
    intro:
      "Estes termos regem o uso do menulala (menulala.com), um serviço de cardápio digital para restaurantes. Ao criar uma conta, você concorda com eles.",
    sections: [
      {
        heading: "O serviço",
        paragraphs: [
          "O menulala permite criar uma página pública de cardápio a partir de imagens que você envia, com QR code, link exclusivo (menulala.com/m/seu-restaurante) e estatísticas de visualização. O plano gratuito tem limite de imagens; o plano Pro amplia esse limite conforme descrito na página de preços.",
        ],
      },
      {
        heading: "Sua conta",
        paragraphs: [
          "Você é responsável por manter sua senha em sigilo e por toda atividade na sua conta. Forneça um e-mail válido — é por ele que enviamos redefinição de senha e avisos importantes.",
        ],
      },
      {
        heading: "Seu conteúdo",
        paragraphs: [
          "As imagens e informações do cardápio são suas. Ao publicá-las no menulala, você nos concede uma licença limitada para hospedá-las e exibi-las na sua página pública — só para isso. Você declara ter o direito de publicar o conteúdo que envia e que ele não infringe direitos de terceiros nem a lei.",
          "Podemos remover conteúdo ilegal ou abusivo e suspender contas que violem estes termos.",
        ],
      },
      {
        heading: "Assinatura e pagamento",
        paragraphs: [
          "O plano Pro é cobrado pela Stripe, por mês ou por ano, no cartão informado. Você pode cancelar a qualquer momento em \"Gerenciar assinatura\"; o acesso Pro continua até o fim do período já pago e não há reembolso proporcional. Se um pagamento de renovação falhar, avisaremos por e-mail; persistindo a falha, a conta volta ao plano gratuito.",
        ],
      },
      {
        heading: "Disponibilidade",
        paragraphs: [
          "Empenhamo-nos para manter o serviço no ar continuamente — inclusive com proteções que mantêm cardápios públicos servindo durante instabilidades — mas o serviço é fornecido \"como está\", sem garantia de disponibilidade ininterrupta.",
        ],
      },
      {
        heading: "Limitação de responsabilidade",
        paragraphs: [
          "Na extensão máxima permitida em lei, a responsabilidade total do menulala por danos relacionados ao serviço fica limitada ao valor pago por você nos 12 meses anteriores ao evento. O menulala não responde por lucros cessantes nem por danos indiretos.",
        ],
      },
      {
        heading: "Encerramento",
        paragraphs: [
          "Você pode excluir sua conta a qualquer momento no painel; isso remove permanentemente seus dados e sua página pública. Podemos encerrar ou suspender contas por violação destes termos, mediante aviso quando possível.",
        ],
      },
      {
        heading: "Alterações, lei aplicável e contato",
        paragraphs: [
          "Podemos atualizar estes termos; mudanças relevantes serão comunicadas por e-mail ou no painel. Estes termos são regidos pelas leis do Brasil. Contato: " +
            CONTACT_EMAIL +
            ".",
        ],
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: "Last updated: August 27, 2026",
    intro:
      "These terms govern your use of menulala (menulala.com), a digital menu service for restaurants. By creating an account you agree to them.",
    sections: [
      {
        heading: "The service",
        paragraphs: [
          "menulala lets you publish a public menu page from images you upload, with a QR code, a dedicated link (menulala.com/m/your-restaurant), and view statistics. The free plan has an image limit; the Pro plan raises it as described on the pricing page.",
        ],
      },
      {
        heading: "Your account",
        paragraphs: [
          "You are responsible for keeping your password confidential and for all activity on your account. Provide a valid email address — it is how we deliver password resets and important notices.",
        ],
      },
      {
        heading: "Your content",
        paragraphs: [
          "Your menu images and information remain yours. By publishing them on menulala you grant us a limited license to host and display them on your public page — for that purpose only. You represent that you have the right to publish what you upload and that it does not infringe third-party rights or the law.",
          "We may remove unlawful or abusive content and suspend accounts that violate these terms.",
        ],
      },
      {
        heading: "Subscription and payment",
        paragraphs: [
          "The Pro plan is billed by Stripe, monthly or yearly, to the card you provide. You can cancel at any time via \"Manage subscription\"; Pro access continues until the end of the paid period and there are no prorated refunds. If a renewal payment fails we will notify you by email; if it keeps failing, the account returns to the free plan.",
        ],
      },
      {
        heading: "Availability",
        paragraphs: [
          "We work to keep the service continuously available — including safeguards that keep public menus serving through instability — but the service is provided \"as is\", with no guarantee of uninterrupted availability.",
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law, menulala's total liability for damages related to the service is limited to the amount you paid in the 12 months preceding the event. menulala is not liable for lost profits or indirect damages.",
        ],
      },
      {
        heading: "Termination",
        paragraphs: [
          "You may delete your account at any time from the dashboard; this permanently removes your data and your public page. We may terminate or suspend accounts for violations of these terms, with notice where feasible.",
        ],
      },
      {
        heading: "Changes, governing law, and contact",
        paragraphs: [
          "We may update these terms; relevant changes will be communicated by email or in the dashboard. These terms are governed by the laws of Brazil. Contact: " +
            CONTACT_EMAIL +
            ".",
        ],
      },
    ],
  },
  es: {
    title: "Términos de Servicio",
    updated: "Última actualización: 27 de agosto de 2026",
    intro:
      "Estos términos rigen el uso de menulala (menulala.com), un servicio de menú digital para restaurantes. Al crear una cuenta, los aceptas.",
    sections: [
      {
        heading: "El servicio",
        paragraphs: [
          "menulala te permite publicar una página pública de menú a partir de imágenes que subes, con código QR, un enlace exclusivo (menulala.com/m/tu-restaurante) y estadísticas de vistas. El plan gratuito tiene un límite de imágenes; el plan Pro lo amplía según se describe en la página de precios.",
        ],
      },
      {
        heading: "Tu cuenta",
        paragraphs: [
          "Eres responsable de mantener tu contraseña en secreto y de toda la actividad de tu cuenta. Proporciona un correo válido — es donde enviamos el restablecimiento de contraseña y avisos importantes.",
        ],
      },
      {
        heading: "Tu contenido",
        paragraphs: [
          "Las imágenes e información de tu menú son tuyas. Al publicarlas en menulala nos concedes una licencia limitada para alojarlas y mostrarlas en tu página pública — solo para eso. Declaras tener derecho a publicar lo que subes y que no infringe derechos de terceros ni la ley.",
          "Podemos retirar contenido ilegal o abusivo y suspender cuentas que violen estos términos.",
        ],
      },
      {
        heading: "Suscripción y pago",
        paragraphs: [
          "El plan Pro lo cobra Stripe, mensual o anualmente, a la tarjeta que proporciones. Puedes cancelar en cualquier momento en \"Gestionar suscripción\"; el acceso Pro continúa hasta el final del período pagado y no hay reembolsos proporcionales. Si falla un pago de renovación te avisaremos por correo; si persiste, la cuenta vuelve al plan gratuito.",
        ],
      },
      {
        heading: "Disponibilidad",
        paragraphs: [
          "Trabajamos para mantener el servicio disponible de forma continua — incluidas protecciones que mantienen los menús públicos en línea durante inestabilidades — pero el servicio se ofrece \"tal cual\", sin garantía de disponibilidad ininterrumpida.",
        ],
      },
      {
        heading: "Limitación de responsabilidad",
        paragraphs: [
          "En la máxima medida permitida por la ley, la responsabilidad total de menulala por daños relacionados con el servicio se limita al importe que pagaste en los 12 meses anteriores al evento. menulala no responde por lucro cesante ni daños indirectos.",
        ],
      },
      {
        heading: "Terminación",
        paragraphs: [
          "Puedes eliminar tu cuenta en cualquier momento desde el panel; esto elimina permanentemente tus datos y tu página pública. Podemos terminar o suspender cuentas por violaciones de estos términos, con aviso cuando sea posible.",
        ],
      },
      {
        heading: "Cambios, ley aplicable y contacto",
        paragraphs: [
          "Podemos actualizar estos términos; los cambios relevantes se comunicarán por correo o en el panel. Estos términos se rigen por las leyes de Brasil. Contacto: " +
            CONTACT_EMAIL +
            ".",
        ],
      },
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  return {
    title: t.common.termsOfService,
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const locale = await getLocale();
  return <LegalArticle content={CONTENT[locale]} />;
}
