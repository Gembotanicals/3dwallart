import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { uploadFile, generateKey, deleteFile, extractKeyFromUrl } from "@/lib/r2";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
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
    const key = generateKey(session.user.id, `thumbnails/${params.id}.${ext}`);
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
