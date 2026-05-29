import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUserId } from "@/lib/clerk-helpers";

// Dev-only: upgrade current user to TEAM plan
// Remove or secure this endpoint in production
export async function POST() { return upgrade(); }
export async function GET() { return upgrade(); }

async function upgrade() {
  try {
    // Only allow in development or if explicitly enabled
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_ADMIN_UPGRADE) {
      return NextResponse.json({ error: "Endpoint disabled in production" }, { status: 403 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { plan: "TEAM" },
      select: { id: true, email: true, plan: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("[api/upgrade-me] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
