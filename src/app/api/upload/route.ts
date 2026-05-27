import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFile, generateKey } from "@/lib/r2";
import { PLAN_LIMITS } from "@/types";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, JPEG, WebP" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Get user and check quota
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const planLimits = PLAN_LIMITS[user.plan];
    if (planLimits.maxStorageBytes !== -1 && user.storageUsed + file.size > planLimits.maxStorageBytes) {
      return NextResponse.json(
        { error: "Storage quota exceeded. Please upgrade your plan." },
        { status: 403 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate storage key
    const filename = generateKey(user.id, file.name);

    // Process image with sharp (optional - graceful fallback)
    let width = 0;
    let height = 0;
    let thumbnailBuffer: Buffer | null = null;

    try {
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(buffer).metadata();
      width = metadata.width || 0;
      height = metadata.height || 0;

      // Generate thumbnail
      thumbnailBuffer = await sharp(buffer)
        .resize(200, 200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      console.error("Sharp processing failed, skipping thumbnail:", err);
    }

    // Upload original to R2
    const originalUrl = await uploadFile(filename, buffer, file.type);

    // Upload thumbnail to R2
    let thumbnailUrl: string | null = null;
    if (thumbnailBuffer) {
      const thumbKey = filename.replace(/\.[^.]+$/, "-thumb.webp");
      thumbnailUrl = await uploadFile(thumbKey, thumbnailBuffer, "image/webp");
    }

    // Create image record in database
    const image = await prisma.image.create({
      data: {
        userId: user.id,
        filename,
        originalName: file.name,
        url: originalUrl,
        thumbnailUrl,
        width,
        height,
        sizeBytes: file.size,
        mimeType: file.type,
      },
    });

    // Update user's storage usage
    await prisma.user.update({
      where: { id: user.id },
      data: {
        storageUsed: {
          increment: file.size,
        },
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
