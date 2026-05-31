import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFile, getSignedUrl, r2, R2_BUCKET } from "@/lib/r2";
import { getCurrentUserId } from "@/lib/clerk-helpers";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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

    // If ?download=true, stream the image content directly from R2
    // This avoids CORS issues with signed URLs
    const download = request.nextUrl.searchParams.get("download");
    if (download === "true" && image.url) {
      const key = image.url.startsWith("http") ? null : image.url;
      if (key) {
        try {
          const response = await r2.send(
            new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
          );
          const body = response.Body;
          if (body) {
            // Convert SDK response body to a ReadableStream
            const chunks: Uint8Array[] = [];
            if (typeof (body as any)[Symbol.asyncIterator] === 'function') {
              for await (const chunk of body as AsyncIterable<Uint8Array>) {
                chunks.push(chunk);
              }
            } else if (body instanceof Uint8Array) {
              chunks.push(body);
            } else if (typeof body === 'string') {
              chunks.push(new TextEncoder().encode(body));
            }
            const buffer = new Uint8Array(
              chunks.reduce((acc, c) => acc + c.length, 0)
            );
            let offset = 0;
            for (const chunk of chunks) {
              buffer.set(chunk, offset);
              offset += chunk.length;
            }
            return new NextResponse(buffer, {
              headers: {
                "Content-Type": image.mimeType || "application/octet-stream",
                "Content-Length": String(buffer.length),
                "Cache-Control": "private, max-age=3600",
              },
            });
          }
        } catch (err) {
          console.error("Failed to stream image from R2:", err);
          // Fall through to signed URL approach
        }
      }
    }

    // Generate signed URLs for R2 keys
    let url = image.url;
    if (url && !url.startsWith('http')) {
      url = await getSignedUrl(url, 3600);
    }

    let thumbnailUrl = image.thumbnailUrl;
    if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
      thumbnailUrl = await getSignedUrl(thumbnailUrl, 3600);
    }

    return NextResponse.json({
      ...image,
      url,
      thumbnailUrl,
    });
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
