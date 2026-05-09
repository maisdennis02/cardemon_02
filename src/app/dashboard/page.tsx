import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "./onboarding-form";
import { MenuManager } from "./menu-manager";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: session.user.id },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4 text-sm">
          {restaurant && (
            <Link href={`/m/${restaurant.slug}`} target="_blank" className="underline">
              View public menu →
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-gray-600 underline">Sign out</button>
          </form>
        </div>
      </header>

      {!restaurant ? <OnboardingForm /> : <MenuManager restaurant={restaurant} />}
    </main>
  );
}
