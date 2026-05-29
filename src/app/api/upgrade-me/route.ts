import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export async function POST() { return upgrade(); }
export async function GET() { return upgrade(); }

async function upgrade() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Upgrade user to PRO plan
    const user = await prisma.user.update({
      where: { id: userId },
      data: { plan: "PRO" },
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
