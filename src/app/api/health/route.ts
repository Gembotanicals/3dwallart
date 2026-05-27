import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";
  const statusCode = dbStatus === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version || "0.1.0",
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
      },
    },
    { status: statusCode }
  );
}
