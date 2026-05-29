import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/r2";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const image = await prisma.image.findFirst({
      where: {
        id: params.id,
        userId: userId,
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
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const image = await prisma.image.findFirst({
      where: {
        id: params.id,
        userId: userId,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from R2 (url and thumbnailUrl store keys directly)
    if (image.url) {
      await deleteFile(image.url).catch((err) =>
        console.error("Failed to delete original from R2:", err)
      );
    }

    if (image.thumbnailUrl) {
      await deleteFile(image.thumbnailUrl).catch((err) =>
        console.error("Failed to delete thumbnail from R2:", err)
      );
    }

    // Delete from database
    await prisma.image.delete({
      where: { id: image.id },
    });

    // Update user storage
    await prisma.user.update({
      where: { id: userId },
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
