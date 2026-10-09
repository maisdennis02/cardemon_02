import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadRulesFor } from "@/lib/menu";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
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

        // Menu pages and logos have different caps; anything outside the
        // restaurant's own folders is refused.
        const rules = uploadRulesFor(pathname, restaurantId);
        if (!rules) throw new Error("Invalid upload path");

        return {
          allowedContentTypes: rules.types,
          addRandomSuffix: true,
          maximumSizeInBytes: rules.maxBytes,
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
