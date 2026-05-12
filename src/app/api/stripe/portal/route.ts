import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, appUrl } from "@/lib/stripe";

// POST /api/stripe/portal
// Opens the Stripe Customer Portal so the user can manage or cancel.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", req.url), 303);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { billingCustomerId: true },
  });
  if (!user?.billingCustomerId) {
    return NextResponse.redirect(new URL("/pricing", req.url), 303);
  }

  const portal = await stripe().billingPortal.sessions.create({
    customer: user.billingCustomerId,
    return_url: `${appUrl()}/dashboard`,
  });

  return NextResponse.redirect(portal.url, 303);
}
