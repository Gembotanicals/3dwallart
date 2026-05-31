import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// One-time migration endpoint to add imageId column to projects table
// DELETE THIS FILE after running successfully
export async function GET() {
  try {
    // Check if column already exists
    const check = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'imageId'
    `;

    if (check.length > 0) {
      return NextResponse.json({ 
        status: "already_exists",
        message: "imageId column already exists in projects table"
      });
    }

    // Add the column
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "projects" ADD COLUMN "imageId" TEXT'
    );

    // Verify
    const verify = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `;

    return NextResponse.json({
      status: "success",
      message: "Added imageId column to projects table",
      columns: verify.map(r => r.column_name)
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message
    }, { status: 500 });
  }
}
