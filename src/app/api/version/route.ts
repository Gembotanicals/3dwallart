import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    sourceMarker: "puzzle-lobe-v1",
    railwayGitCommit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
    railwayGitBranch: process.env.RAILWAY_GIT_BRANCH || null,
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME || null,
    nodeEnv: process.env.NODE_ENV || null,
    checkedAt: new Date().toISOString(),
  });
}
