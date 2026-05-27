import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteFile, extractKeyFromUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const image = await prisma.image.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json(image);
  } catch (error) {
    console.error("Get image error:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const image = await prisma.image.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from R2
    const originalKey = extractKeyFromUrl(image.url);
    if (originalKey) {
      await deleteFile(originalKey).catch((err) =>
        console.error("Failed to delete original from R2:", err)
      );
    }

    if (image.thumbnailUrl) {
      const thumbKey = extractKeyFromUrl(image.thumbnailUrl);
      if (thumbKey) {
        await deleteFile(thumbKey).catch((err) =>
          console.error("Failed to delete thumbnail from R2:", err)
        );
      }
    }

    // Delete from database
    await prisma.image.delete({
      where: { id: image.id },
    });

    // Update user storage
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        storageUsed: {
          decrement: image.sizeBytes,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
