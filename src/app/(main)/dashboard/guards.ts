import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";

// Session and ownership checks shared by the dashboard's server actions. They
// live outside the "use server" files on purpose: every export of such a file
// becomes a publicly callable endpoint.

export async function dashT() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return dict.dashboard;
}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}

export async function requireOwnedRestaurant(userId: string, restaurantId: string) {
  const r = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
  });
  if (!r) {
    const t = await dashT();
    throw new Error(t.errors.restaurantNotFound);
  }
  return r;
}
