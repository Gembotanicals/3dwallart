import { PrismaClient, Plan, ExportStatus, ExportFormat } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Demo User ─────────────────────────────────────────────────
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@reliefforge.com" },
    update: {},
    create: {
      email: "demo@reliefforge.com",
      name: "Demo User",
      clerkId: "clerk_demo_seed",
      plan: Plan.PRO,
      storageUsed: 15_728_640, // ~15 MB
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
    },
  });

  console.log(`  ✓ Created user: ${demoUser.email} (${demoUser.id})`);

  // ─── Sample Project 1: Floral Relief Panel ────────────────────
  const floralSettings = {
    panel: {
      width: 300,
      height: 200,
      depth: 25,
      units: "mm",
    },
    grid: {
      rows: 4,
      cols: 6,
      spacing: 5,
    },
    relief: {
      intensity: 0.75,
      smoothing: 3,
      contrast: 1.2,
      invertDepth: false,
      baseHeight: 2,
    },
    joining: {
      enabled: true,
      method: "tongue_and_groove",
      tolerance: 0.2,
    },
    color: {
      mode: "grayscale",
      ambientOcclusion: true,
      shadowIntensity: 0.6,
    },
    mold: {
      enabled: false,
      wallThickness: 5,
      draftAngle: 3,
    },
  };

  const project1 = await prisma.project.upsert({
    where: { id: "demo-project-floral" },
    update: {},
    create: {
      id: "demo-project-floral",
      userId: demoUser.id,
      name: "Victorian Floral Panel",
      settings: floralSettings,
      thumbnailUrl: null,
      stlUrl: null,
      version: 3,
    },
  });

  console.log(`  ✓ Created project: ${project1.name} (${project1.id})`);

  // ─── Sample Project 2: Geometric Art Deco ─────────────────────
  const artDecoSettings = {
    panel: {
      width: 400,
      height: 400,
      depth: 30,
      units: "mm",
    },
    grid: {
      rows: 3,
      cols: 3,
      spacing: 8,
    },
    relief: {
      intensity: 0.9,
      smoothing: 1,
      contrast: 1.5,
      invertDepth: false,
      baseHeight: 5,
    },
    joining: {
      enabled: true,
      method: "dowel",
      tolerance: 0.15,
      dowelDiameter: 8,
    },
    color: {
      mode: "duotone",
      primaryColor: "#1a1a2e",
      secondaryColor: "#c9a227",
      ambientOcclusion: true,
      shadowIntensity: 0.8,
    },
    mold: {
      enabled: true,
      wallThickness: 8,
      draftAngle: 5,
      moldType: "two_part",
    },
  };

  const project2 = await prisma.project.upsert({
    where: { id: "demo-project-artdeco" },
    update: {},
    create: {
      id: "demo-project-artdeco",
      userId: demoUser.id,
      name: "Art Deco Geometric Wall Art",
      settings: artDecoSettings,
      thumbnailUrl: null,
      stlUrl: null,
      version: 1,
    },
  });

  console.log(`  ✓ Created project: ${project2.name} (${project2.id})`);

  // ─── Sample Exports ───────────────────────────────────────────
  const export1 = await prisma.export.create({
    data: {
      projectId: project1.id,
      format: ExportFormat.STL,
      resolution: 220,
      status: ExportStatus.COMPLETED,
      url: "https://storage.reliefforge.com/exports/demo-floral-220.stl",
      fileSize: 8_388_608, // ~8 MB
      completedAt: new Date(),
    },
  });

  console.log(`  ✓ Created export: ${export1.format} for ${project1.name}`);

  const export2 = await prisma.export.create({
    data: {
      projectId: project2.id,
      format: ExportFormat.THREE_MF,
      resolution: 300,
      status: ExportStatus.PROCESSING,
    },
  });

  console.log(`  ✓ Created export: ${export2.format} for ${project2.name} (processing)`);

  // ─── Sample Share Link ────────────────────────────────────────
  const shareLink = await prisma.shareLink.create({
    data: {
      projectId: project1.id,
      token: "demo-share-token-abc123",
      views: 12,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  console.log(`  ✓ Created share link: ${shareLink.token}`);

  // ─── Sample Image ─────────────────────────────────────────────
  const image = await prisma.image.create({
    data: {
      userId: demoUser.id,
      filename: "victorian-floral-source.jpg",
      originalName: "victorian-floral-source.jpg",
      url: "https://storage.reliefforge.com/images/demo-floral.jpg",
      thumbnailUrl: "https://storage.reliefforge.com/images/demo-floral-thumb.jpg",
      width: 1920,
      height: 1280,
      sizeBytes: 2_097_152, // ~2 MB
      mimeType: "image/jpeg",
    },
  });

  console.log(`  ✓ Created image: ${image.originalName}`);

  console.log("\n✅ Seed completed successfully!");
  console.log(`   User: ${demoUser.email}`);
  console.log(`   Projects: 2`);
  console.log(`   Exports: 2`);
  console.log(`   Share Links: 1`);
  console.log(`   Images: 1`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
