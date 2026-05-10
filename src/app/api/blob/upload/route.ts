import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Not authenticated");

        const payload = clientPayload ? JSON.parse(clientPayload) : null;
        const restaurantId: string | undefined = payload?.restaurantId;
        if (!restaurantId) throw new Error("Missing restaurantId");

        const owns = await prisma.restaurant.findFirst({
          where: { id: restaurantId, ownerId: session.user.id },
          select: { id: true },
        });
        if (!owns) throw new Error("Restaurant not found");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          addRandomSuffix: true,
          maximumSizeInBytes: 10 * 1024 * 1024,
          tokenPayload: JSON.stringify({ restaurantId, userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client also calls a server action after upload to register
        // the URL in the DB. This callback only fires in production deployments
        // (Vercel cannot reach localhost), so we can't rely on it for local dev.
      },
    });

    return Response.json(jsonResponse);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}
