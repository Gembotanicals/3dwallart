// ─────────────────────────────────────────────────────────────────
// ReliefForge TypeScript Types
// Mirrors the Prisma schema with additional domain-specific interfaces
// ─────────────────────────────────────────────────────────────────

// ─── Panel Settings ─────────────────────────────────────────────
export interface PanelSettings {
  width: number;       // Panel width in units
  height: number;      // Panel height in units
  depth: number;       // Maximum relief depth in units
  units: "mm" | "cm" | "in";
}

// ─── Grid Settings ──────────────────────────────────────────────
export interface GridSettings {
  rows: number;
  cols: number;
  spacing: number;     // Gap between panels in units
}

// ─── Relief Settings ────────────────────────────────────────────
// Re-export the canonical ReliefSettings from the engine to avoid type conflicts.
// The engine's interface is the source of truth (27 fields including pw, ph, gc, gr, etc.)
import type { ReliefSettings } from '@/lib/relief-engine';
export type { ReliefSettings };

// ─── Joining Settings ───────────────────────────────────────────
export type JoiningMethod = "tongue_and_groove" | "dowel" | "flat" | "keyed";

export interface JoiningSettings {
  enabled: boolean;
  method: JoiningMethod;
  tolerance: number;       // mm tolerance for fit
  dowelDiameter?: number;  // Only for dowel method
}

// ─── Color Settings ─────────────────────────────────────────────
export type ColorMode = "grayscale" | "duotone" | "fullcolor" | "none";

export interface ColorSettings {
  mode: ColorMode;
  primaryColor?: string;    // Hex color
  secondaryColor?: string;  // Hex color
  ambientOcclusion: boolean;
  shadowIntensity: number;  // 0-1
}

// ─── Mold Settings ──────────────────────────────────────────────
export type MoldType = "one_part" | "two_part" | "waste_mold";

export interface MoldSettings {
  enabled: boolean;
  wallThickness: number;  // mm
  draftAngle: number;     // degrees
  moldType?: MoldType;
}

// ─── Complete Project Settings ──────────────────────────────────
export interface ProjectSettings {
  panel: PanelSettings;
  grid: GridSettings;
  relief: ReliefSettings;
  joining: JoiningSettings;
  color: ColorSettings;
  mold: MoldSettings;
}

// ─── Plan Limits ────────────────────────────────────────────────
export interface PlanLimits {
  maxProjects: number;
  maxStorageBytes: number;
  maxResolution: number;
  canExportSTL: boolean;
  canExportOBJ: boolean;
  canExport3MF: boolean;
  canShareLinks: boolean;
  canPasswordProtect: boolean;
  moldGeneration: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxProjects: 3,
    maxStorageBytes: 100 * 1024 * 1024,  // 100 MB
    maxResolution: 150,
    canExportSTL: true,
    canExportOBJ: false,
    canExport3MF: false,
    canShareLinks: false,
    canPasswordProtect: false,
    moldGeneration: false,
  },
  PRO: {
    maxProjects: 50,
    maxStorageBytes: 5 * 1024 * 1024 * 1024,  // 5 GB
    maxResolution: 400,
    canExportSTL: true,
    canExportOBJ: true,
    canExport3MF: true,
    canShareLinks: true,
    canPasswordProtect: false,
    moldGeneration: true,
  },
  TEAM: {
    maxProjects: 200,
    maxStorageBytes: 25 * 1024 * 1024 * 1024,  // 25 GB
    maxResolution: 600,
    canExportSTL: true,
    canExportOBJ: true,
    canExport3MF: true,
    canShareLinks: true,
    canPasswordProtect: true,
    moldGeneration: true,
  },
  ENTERPRISE: {
    maxProjects: -1,  // unlimited
    maxStorageBytes: -1,  // unlimited
    maxResolution: 1200,
    canExportSTL: true,
    canExportOBJ: true,
    canExport3MF: true,
    canShareLinks: true,
    canPasswordProtect: true,
    moldGeneration: true,
  },
};

// ─── Composed Types (matching Prisma includes) ──────────────────
export interface ProjectWithExports {
  id: string;
  userId: string;
  name: string;
  settings: ProjectSettings;
  thumbnailUrl: string | null;
  stlUrl: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  exports: ExportData[];
  shareLinks: ShareLinkData[];
}

export interface ExportData {
  id: string;
  projectId: string;
  format: "STL" | "OBJ" | "THREE_MF";
  resolution: number;
  url: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileSize: number | null;
  errorMsg: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ShareLinkData {
  id: string;
  projectId: string;
  token: string;
  password: string | null;
  expiresAt: Date | null;
  views: number;
  createdAt: Date;
}

export interface ImageData {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
}

export interface UserData {
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  avatar: string | null;
  plan: "FREE" | "PRO" | "TEAM" | "ENTERPRISE";
  storageUsed: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API Types ──────────────────────────────────────────────────
export interface CreateProjectInput {
  name?: string;
  settings?: Partial<ProjectSettings>;
}

export interface UpdateProjectInput {
  name?: string;
  settings?: Partial<ProjectSettings>;
  thumbnailUrl?: string;
  stlUrl?: string;
}

export interface CreateExportInput {
  projectId: string;
  format: "STL" | "OBJ" | "THREE_MF";
  resolution?: number;
}

export interface CreateShareLinkInput {
  projectId: string;
  password?: string;
  expiresAt?: Date;
}

export interface UploadImageInput {
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}
