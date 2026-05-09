import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-semibold sm:text-5xl">Digital menus for restaurants</h1>
      <p className="mt-4 max-w-xl text-lg text-gray-600">
        Sign up, upload your dishes, and share a link your customers can open from any phone.
      </p>
      <div className="mt-8 flex gap-3">
        {session?.user ? (
          <Link href="/dashboard" className="rounded bg-black px-5 py-3 text-white">
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href="/signup" className="rounded bg-black px-5 py-3 text-white">
              Get started
            </Link>
            <Link href="/login" className="rounded border px-5 py-3">
              Log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
