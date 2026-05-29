import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { PLAN_LIMITS } from "@/types";
import bcrypt from "bcrypt";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, password, expiresIn } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: userId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check plan allows sharing
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const planLimits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;

    if (!planLimits.canShareLinks) {
      return NextResponse.json(
        {
          error: "Share links require a paid plan",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // Check password protection permission
    if (password && !planLimits.canPasswordProtect) {
      return NextResponse.json(
        {
          error: "Password protection requires Team plan or higher",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // Calculate expiry
    let expiresAt: Date | null = null;
    if (expiresIn !== undefined && expiresIn !== null) {
      if (expiresIn === 7) {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (expiresIn === 30) {
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else if (expiresIn === 0) {
        expiresAt = null; // Never expires
      } else {
        return NextResponse.json(
          { error: "Invalid expiresIn value. Use 7, 30, or 0 (never)" },
          { status: 400 }
        );
      }
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create the share link
    const shareLink = await prisma.shareLink.create({
      data: {
        projectId,
        password: hashedPassword || null,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000";
    const shareUrl = `/share/${shareLink.token}`;

    return NextResponse.json(
      {
        token: shareLink.token,
        url: shareUrl,
        fullUrl: `${baseUrl}${shareUrl}`,
        id: shareLink.id,
        passwordProtected: !!password,
        expiresAt: shareLink.expiresAt,
        views: 0,
        createdAt: shareLink.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/share error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
