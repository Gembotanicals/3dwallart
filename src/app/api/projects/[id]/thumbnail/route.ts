import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadFile, generateKey, deleteFile, extractKeyFromUrl } from "@/lib/r2";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: userId },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { imageData } = body; // base64 data URL from canvas.toDataURL()

    if (!imageData) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Parse base64 data URL
    const matches = imageData.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      return NextResponse.json({ error: "Invalid image data format" }, { status: 400 });
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Delete old thumbnail from R2 if exists
    if (project.thumbnailUrl) {
      const oldKey = extractKeyFromUrl(project.thumbnailUrl);
      if (oldKey) {
        await deleteFile(oldKey).catch(() => {}); // best-effort
      }
    }

    // Upload to R2
    const ext = contentType.includes("png") ? "png" : "jpg";
    const key = generateKey(userId, `thumbnails/${params.id}.${ext}`);
    const url = await uploadFile(key, buffer, contentType);

    // Update project
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: { thumbnailUrl: url },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/projects/[id]/thumbnail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
