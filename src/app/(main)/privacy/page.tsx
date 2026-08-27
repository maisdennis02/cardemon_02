import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";
import type { Locale } from "@/i18n";
import { LegalArticle, type LegalContent } from "@/components/legal-article";

// Privacy policy (LGPD-oriented — menulala's market is Brazil-first). Content
// lives here rather than in the i18n dictionaries: legal text is long-form
// prose versioned as a document, not UI strings reused across components.

const CONTACT_EMAIL = "contato@menulala.com";

const CONTENT: Record<Locale, LegalContent> = {
  "pt-BR": {
    title: "Política de Privacidade",
    updated: "Última atualização: 27 de agosto de 2026",
    intro:
      "Esta política explica quais dados o menulala coleta, por que coleta e quais são os seus direitos. Ela se aplica ao site menulala.com, ao painel de restaurantes e às páginas públicas de cardápio, em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).",
    sections: [
      {
        heading: "Dados que coletamos de donos de restaurante",
        paragraphs: [
          "Ao criar uma conta: e-mail, nome (opcional) e senha (armazenada apenas como hash criptográfico — nunca em texto claro). Ao configurar seu restaurante: nome, endereço público do cardápio (slug), descrição, país, número de WhatsApp, links de redes sociais e de apps de entrega, e as imagens do cardápio que você envia.",
          "Pagamentos são processados pela Stripe. O menulala não recebe nem armazena números de cartão — guardamos apenas identificadores da assinatura (status e validade do plano).",
        ],
      },
      {
        heading: "Dados que coletamos de visitantes de cardápios",
        paragraphs: [
          "Quando alguém visita uma página pública de cardápio, registramos contagens de visualização e de cliques (por exemplo, no botão do WhatsApp), acompanhadas apenas do país de origem, derivado do endereço IP. O endereço IP em si não é armazenado por nós, e essas contagens não identificam o visitante.",
          "Também usamos o Vercel Analytics, uma ferramenta de métricas agregadas que não usa cookies e não rastreia visitantes entre sites.",
        ],
      },
      {
        heading: "Para que usamos os dados",
        paragraphs: [
          "Para prestar o serviço (exibir seu cardápio, autenticar seu acesso, processar sua assinatura), para mostrar a você estatísticas do seu próprio cardápio, para enviar e-mails transacionais (como redefinição de senha e avisos de pagamento) e para manter a segurança da plataforma. Base legal: execução de contrato (art. 7º, V da LGPD) e legítimo interesse (art. 7º, IX).",
        ],
      },
      {
        heading: "Com quem compartilhamos",
        paragraphs: [
          "Usamos operadores que processam dados em nosso nome: Vercel (hospedagem e métricas), Neon (banco de dados), Stripe (pagamentos) e Resend (envio de e-mails). Esses provedores podem processar dados em servidores fora do Brasil; a transferência internacional ocorre com salvaguardas contratuais desses provedores. Não vendemos dados pessoais a ninguém.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Usamos apenas cookies essenciais: o cookie de sessão que mantém você conectado ao painel e um cookie de preferência de idioma. Não usamos cookies de publicidade ou rastreamento.",
        ],
      },
      {
        heading: "Retenção e exclusão",
        paragraphs: [
          "Mantemos seus dados enquanto sua conta existir. Você pode excluir sua conta a qualquer momento no painel (seção \"Excluir conta\") — isso remove permanentemente sua conta, seu restaurante, as imagens do cardápio e a página pública. Registros de faturamento podem ser retidos pela Stripe conforme obrigações fiscais.",
        ],
      },
      {
        heading: "Seus direitos (art. 18 da LGPD)",
        paragraphs: [
          "Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade e exclusão dos seus dados, além de informação sobre compartilhamentos. Para exercer qualquer direito, escreva para " +
            CONTACT_EMAIL +
            ". Respondemos no prazo previsto em lei.",
        ],
      },
      {
        heading: "Segurança",
        paragraphs: [
          "Senhas são armazenadas com hash bcrypt, o tráfego é criptografado com HTTPS e o acesso ao banco de dados é restrito. Nenhum sistema é infalível; em caso de incidente de segurança relevante, comunicaremos os afetados e a ANPD conforme a lei.",
        ],
      },
      {
        heading: "Alterações e contato",
        paragraphs: [
          "Podemos atualizar esta política; a data no topo indica a versão vigente. Dúvidas ou solicitações: " + CONTACT_EMAIL + ".",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: August 27, 2026",
    intro:
      "This policy explains what data menulala collects, why, and what your rights are. It applies to menulala.com, the restaurant dashboard, and public menu pages, and is written to comply with Brazil's data protection law (LGPD, Law 13,709/2018).",
    sections: [
      {
        heading: "Data we collect from restaurant owners",
        paragraphs: [
          "When you create an account: email, name (optional), and password (stored only as a cryptographic hash — never in plain text). When you set up your restaurant: name, public menu address (slug), description, country, WhatsApp number, social and delivery-app links, and the menu images you upload.",
          "Payments are processed by Stripe. menulala never receives or stores card numbers — we keep only subscription identifiers (plan status and expiry).",
        ],
      },
      {
        heading: "Data we collect from menu visitors",
        paragraphs: [
          "When someone visits a public menu page we record view and click counts (for example on the WhatsApp button) together with the visitor's country, derived from the IP address. We do not store the IP address itself, and these counts do not identify the visitor.",
          "We also use Vercel Analytics, an aggregate metrics tool that sets no cookies and does not track visitors across sites.",
        ],
      },
      {
        heading: "What we use data for",
        paragraphs: [
          "To provide the service (serving your menu, authenticating you, processing your subscription), to show you your own menu statistics, to send transactional email (password resets, payment notices), and to keep the platform secure. Legal bases: performance of contract and legitimate interest under the LGPD.",
        ],
      },
      {
        heading: "Who we share data with",
        paragraphs: [
          "We use processors acting on our behalf: Vercel (hosting and analytics), Neon (database), Stripe (payments), and Resend (email delivery). These providers may process data on servers outside Brazil under their contractual safeguards. We never sell personal data.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "We use essential cookies only: the session cookie that keeps you signed in to the dashboard and a language-preference cookie. No advertising or tracking cookies.",
        ],
      },
      {
        heading: "Retention and deletion",
        paragraphs: [
          "We keep your data for as long as your account exists. You can delete your account at any time from the dashboard (\"Delete account\" section) — this permanently removes your account, restaurant, menu images, and public page. Billing records may be retained by Stripe for tax purposes.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You may request confirmation of processing, access, correction, anonymization, portability, and deletion of your data, and information about sharing. To exercise any right, write to " +
            CONTACT_EMAIL +
            ". We respond within the legally required period.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "Passwords are stored with bcrypt hashing, traffic is encrypted with HTTPS, and database access is restricted. No system is infallible; in the event of a relevant security incident we will notify affected users and the Brazilian authority (ANPD) as required by law.",
        ],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          "We may update this policy; the date above indicates the current version. Questions or requests: " + CONTACT_EMAIL + ".",
        ],
      },
    ],
  },
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: 27 de agosto de 2026",
    intro:
      "Esta política explica qué datos recopila menulala, por qué, y cuáles son tus derechos. Se aplica a menulala.com, al panel de restaurantes y a las páginas públicas de menú, y está redactada conforme a la ley brasileña de protección de datos (LGPD, Ley 13.709/2018).",
    sections: [
      {
        heading: "Datos que recopilamos de dueños de restaurante",
        paragraphs: [
          "Al crear una cuenta: correo, nombre (opcional) y contraseña (guardada solo como hash criptográfico — nunca en texto plano). Al configurar tu restaurante: nombre, dirección pública del menú (slug), descripción, país, número de WhatsApp, enlaces de redes sociales y apps de entrega, y las imágenes del menú que subes.",
          "Los pagos los procesa Stripe. menulala nunca recibe ni almacena números de tarjeta — solo guardamos identificadores de la suscripción (estado y vigencia del plan).",
        ],
      },
      {
        heading: "Datos que recopilamos de visitantes del menú",
        paragraphs: [
          "Cuando alguien visita una página pública de menú registramos conteos de vistas y clics (por ejemplo en el botón de WhatsApp) junto con el país del visitante, derivado de la dirección IP. No almacenamos la IP en sí, y estos conteos no identifican al visitante.",
          "También usamos Vercel Analytics, una herramienta de métricas agregadas que no usa cookies y no rastrea visitantes entre sitios.",
        ],
      },
      {
        heading: "Para qué usamos los datos",
        paragraphs: [
          "Para prestar el servicio (mostrar tu menú, autenticarte, procesar tu suscripción), para mostrarte estadísticas de tu propio menú, para enviar correos transaccionales (restablecimiento de contraseña, avisos de pago) y para mantener la seguridad de la plataforma. Bases legales: ejecución de contrato e interés legítimo según la LGPD.",
        ],
      },
      {
        heading: "Con quién compartimos",
        paragraphs: [
          "Usamos encargados que procesan datos en nuestro nombre: Vercel (alojamiento y métricas), Neon (base de datos), Stripe (pagos) y Resend (envío de correos). Estos proveedores pueden procesar datos en servidores fuera de Brasil bajo sus salvaguardas contractuales. Nunca vendemos datos personales.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Usamos solo cookies esenciales: la cookie de sesión que te mantiene conectado al panel y una cookie de preferencia de idioma. Sin cookies de publicidad ni de rastreo.",
        ],
      },
      {
        heading: "Retención y eliminación",
        paragraphs: [
          "Conservamos tus datos mientras exista tu cuenta. Puedes eliminar tu cuenta en cualquier momento desde el panel (sección \"Eliminar cuenta\") — esto elimina permanentemente tu cuenta, tu restaurante, las imágenes del menú y la página pública. Stripe puede retener registros de facturación por obligaciones fiscales.",
        ],
      },
      {
        heading: "Tus derechos",
        paragraphs: [
          "Puedes solicitar confirmación del tratamiento, acceso, corrección, anonimización, portabilidad y eliminación de tus datos, además de información sobre compartición. Para ejercer cualquier derecho, escribe a " +
            CONTACT_EMAIL +
            ". Respondemos dentro del plazo legal.",
        ],
      },
      {
        heading: "Seguridad",
        paragraphs: [
          "Las contraseñas se guardan con hash bcrypt, el tráfico va cifrado con HTTPS y el acceso a la base de datos está restringido. Ningún sistema es infalible; ante un incidente de seguridad relevante notificaremos a los afectados y a la autoridad brasileña (ANPD) según exige la ley.",
        ],
      },
      {
        heading: "Cambios y contacto",
        paragraphs: [
          "Podemos actualizar esta política; la fecha de arriba indica la versión vigente. Preguntas o solicitudes: " + CONTACT_EMAIL + ".",
        ],
      },
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  return {
    title: t.common.privacyPolicy,
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return <LegalArticle content={CONTENT[locale]} />;
}
