import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcrypt";
import { getSignedUrl } from "@/lib/r2";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            settings: true,
            thumbnailUrl: true,
            imageId: true,
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check expiration
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // Check password protection
    if (shareLink.password) {
      // Only accept password via header (never query params — they get logged)
      const providedPassword = request.headers.get("x-share-password");

      if (!providedPassword) {
        return NextResponse.json(
          {
            error: "Password required",
            passwordRequired: true,
            projectName: shareLink.project.name,
          },
          { status: 401 }
        );
      }

      const validPassword = await bcrypt.compare(
        providedPassword,
        shareLink.password
      );
      if (!validPassword) {
        return NextResponse.json(
          {
            error: "Invalid password",
            passwordRequired: true,
            invalidPassword: true,
            projectName: shareLink.project.name,
          },
          { status: 403 }
        );
      }
    }

    // Increment views
    await prisma.shareLink.update({
      where: { token },
      data: { views: { increment: 1 } },
    });

    // Generate signed image URL if project has an image
    let imageUrl: string | null = null;
    if (shareLink.project.imageId) {
      try {
        const image = await prisma.image.findUnique({
          where: { id: shareLink.project.imageId },
          select: { url: true },
        });
        if (image?.url) {
          imageUrl = await getSignedUrl(image.url, 3600);
        }
      } catch {
        // Best-effort — fall back to no image
      }
    }

    // Return project settings + image for the viewer
    return NextResponse.json({
      projectName: shareLink.project.name,
      settings: shareLink.project.settings,
      thumbnailUrl: shareLink.project.thumbnailUrl,
      imageUrl,
      views: shareLink.views + 1,
      passwordProtected: !!shareLink.password,
      expiresAt: shareLink.expiresAt,
    });
  } catch (error) {
    console.error("GET /api/share/[token] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = params;

    // Find the share link and verify ownership
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        project: { select: { userId: true } },
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (shareLink.project.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.shareLink.delete({
      where: { token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/share/[token] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
