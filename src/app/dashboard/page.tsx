import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { ExternalIcon } from "@/components/icons";
import { OnboardingForm } from "./onboarding-form";
import { ImageManager } from "./image-manager";
import { RestaurantSettingsForm } from "./restaurant-settings-form";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: session.user.id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/60">
      <DashboardHeader
        userEmail={session.user.email ?? null}
        publicMenuSlug={restaurant?.slug ?? null}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        {!restaurant ? (
          <OnboardingForm />
        ) : (
          <div className="flex flex-col gap-6">
            <RestaurantSettingsForm restaurant={restaurant} />
            <ImageManager restaurant={restaurant} />
          </div>
        )}
      </main>
    </div>
  );
}

function DashboardHeader({
  userEmail,
  publicMenuSlug,
}: {
  userEmail: string | null;
  publicMenuSlug: string | null;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Logo />
        <div className="flex items-center gap-2">
          {publicMenuSlug && (
            <Link
              href={`/m/${publicMenuSlug}`}
              target="_blank"
              className="btn btn-secondary btn-sm hidden sm:inline-flex"
            >
              View public menu
              <ExternalIcon size={14} />
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="btn btn-ghost btn-sm" title={userEmail ?? "Sign out"}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
