import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    sourceMarker: 'snap-tab-terrain-v1',
    railwayGitCommit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
    railwayGitBranch: process.env.RAILWAY_GIT_BRANCH || null,
    timestamp: new Date().toISOString(),
  });
}
