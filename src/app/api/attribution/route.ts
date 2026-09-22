import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MAX_ACQUISITION_VALUE } from "@/lib/acquisition";

/**
 * First-touch acquisition, handed over by the browser the first time the
 * dashboard loads (see dashboard-telemetry.tsx).
 *
 * This is the only write path for User.acquisition, and it is deliberately
 * narrow, because the number it feeds — cost per signup — is the number the ad
 * budget is judged on. Two guards:
 *
 *  - `acquisition: null`, so first touch wins and a later visit from another
 *    campaign cannot overwrite it;
 *  - the account must be younger than a day, so an owner who signed up months
 *    ago and happens to click an ad today is not counted as a new ad signup.
 *
 * Unknown fields are stripped rather than refused: the body comes from a
 * browser we do not control, and one stray parameter is no reason to lose a
 * real attribution.
 */
const shortString = z.string().max(MAX_ACQUISITION_VALUE).optional();

const AcquisitionSchema = z.object({
  utm_source: shortString,
  utm_medium: shortString,
  utm_campaign: shortString,
  utm_term: shortString,
  utm_content: shortString,
  gclid: shortString,
  gbraid: shortString,
  wbraid: shortString,
  landing: shortString,
  referrer: z.string().max(100).optional(),
  at: z.string().max(40).optional(),
});

const MAX_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response(null, { status: 401 });

  let acquisition;
  try {
    acquisition = AcquisitionSchema.parse(await request.json());
  } catch {
    return new Response(null, { status: 400 });
  }

  // A landing path and a timestamp with nothing else means this visitor
  // arrived carrying no campaign parameters at all. Storing that would only
  // make an organic signup look like a measured one, so leave the column null.
  const hasCampaignParams = Object.entries(acquisition).some(
    ([key, value]) => key !== "landing" && key !== "at" && value,
  );
  if (!hasCampaignParams) return new Response(null, { status: 204 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, acquisition: true },
  });
  if (!user) return new Response(null, { status: 404 });
  if (user.acquisition !== null) return new Response(null, { status: 204 });
  if (Date.now() - user.createdAt.getTime() > MAX_ACCOUNT_AGE_MS) {
    return new Response(null, { status: 204 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { acquisition, acquiredAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
