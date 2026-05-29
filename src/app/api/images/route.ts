import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSignedUrl } from "@/lib/r2";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * PAGE_SIZE;

    const where = {
      userId: userId,
      ...(search && {
        originalName: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
    };

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.image.count({ where }),
    ]);

    // Sign URLs for all images
    const signedImages = await Promise.all(
      images.map(async (img) => {
        let url = img.url;
        let thumbnailUrl = img.thumbnailUrl;
        try {
          if (url) url = await getSignedUrl(url, 3600);
          if (thumbnailUrl) thumbnailUrl = await getSignedUrl(thumbnailUrl, 3600);
        } catch {
          // If signing fails, return the key as-is
        }
        return { ...img, url, thumbnailUrl };
      })
    );

    return NextResponse.json({
      images: signedImages,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("List images error:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
