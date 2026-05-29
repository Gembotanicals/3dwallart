# Bug Fixes Applied

This document lists the bugs identified in BUG_REPORT.md and the fixes that were applied.

## Critical Bugs Fixed

### 1. Insecure Admin Upgrade Endpoint
**File:** `src/app/api/upgrade-me/route.ts`
**Issue:** The temporary endpoint to upgrade user plans had no security and could be called by anyone.
**Fix:** Added environment variable check (`ALLOW_ADMIN_UPGRADE`) to disable it in production. Only works when explicitly enabled.

### 2. Server-Side Export Always Generated STL
**File:** `src/lib/queue.ts`
**Issue:** When requesting OBJ format from server-side export, it still generated STL.
**Fix:** Updated to check the requested format and call the appropriate generator (`toSTLBuffer` or `toOBJBuffer`). Also implemented the missing `toOBJBuffer` function in `relief-engine-server.ts`.

### 3. R2 URL Extraction Failed on Virtual-Hosted URLs
**File:** `src/lib/r2.ts`
**Issue:** The `extractKeyFromUrl` function only worked with path-style S3 URLs, breaking when R2 used virtual-hosted style.
**Fix:** Added support for both URL formats (path-style and virtual-hosted).

### 4. Project Deletion Didn't Clean Up Export Files
**File:** `src/app/api/projects/[id]/route.ts`
**Issue:** When deleting a project, associated export files in R2 were orphaned.
**Fix:** Added logic to fetch all exports for the project and delete their R2 files before deleting the project record.

### 5. Weak Random Token Generation
**File:** `src/lib/utils.ts`
**Issue:** Used `Math.random()` for generating share tokens, which is cryptographically weak.
**Fix:** Replaced with `crypto.randomBytes()` for secure random generation.

### 6. Thumbnail Deletion Used Wrong Key
**File:** `src/app/api/projects/[id]/thumbnail/route.ts`
**Issue:** When uploading a new thumbnail, the old one wasn't deleted properly because it tried to parse the URL instead of using the stored key.
**Fix:** Use the `thumbnailKey` field directly from the database instead of extracting from URL.

### 7. Share Password Bypass via Query Parameter
**File:** `src/app/api/share/[token]/route.ts`
**Issue:** Password could be passed as a query parameter (`?password=xxx`), bypassing the intended header-only validation.
**Fix:** Removed query parameter support. Password must be sent via `x-share-password` header only.

### 8. Share URL Used Wrong Environment Variable
**File:** `src/app/api/share/route.ts`
**Issue:** Used `NEXTAUTH_URL` which doesn't exist in this app, causing share links to point to localhost.
**Fix:** Updated to use `RAILWAY_PUBLIC_DOMAIN` for production URLs.

## Validation & Safety Fixes

### 9. No Minimum Resolution Validation
**Files:** `src/app/api/export/route.ts`, `src/app/api/export/batch/route.ts`
**Issue:** Could request exports with resolution as low as 1, causing errors or degenerate geometry.
**Fix:** Added minimum resolution check (50) with helpful error message.

### 10. No Maximum Grid Size Validation
**Files:** `src/app/api/export/route.ts`, `src/app/api/export/batch/route.ts`
**Issue:** Could request batch exports with unlimited grid size (e.g., 100x100), causing memory exhaustion.
**Fix:** Added maximum grid size check (8x8 = 64 tiles max).

### 11. Division by Zero in Relief Engine
**Files:** `src/lib/relief-engine-server.ts`, `src/lib/relief-engine.ts`
**Issue:** When grid dimensions (nx or ny) were 1, division by zero occurred.
**Fix:** Added checks to prevent division by zero and handle edge cases.

## Infrastructure Fixes

### 12. Cloudflare R2 S3 Client Configuration
**File:** `src/lib/r2.ts`
**Issue:** S3 client wasn't configured correctly for Cloudflare R2, causing upload failures.
**Fix:** Added `forcePathStyle: true` and `requestChecksumCalculation: "NEVER"` to S3Client config. Also added `.trim()` to credentials to handle trailing newlines from environment variables.

## Known Issues (Not Fixed)

These were identified but not addressed in this round:

- **Inline processing in API routes:** Export generation happens synchronously in API routes, blocking the request. Should use background job queue.
- **Storage quota race conditions:** No atomic check-and-decrement for storage quotas.
- **Base64 body size limits:** Large models sent as base64 in request body may exceed Next.js limits.
- **Missing input sanitization:** Some API endpoints don't validate all input parameters thoroughly.
- **Error handling:** Some errors return generic messages instead of specific diagnostics.

## Testing Recommendations

After deployment, test:
1. Export STL and OBJ formats (both client and server-side)
2. Create and access share links (with and without passwords)
3. Upload new thumbnails and verify old ones are deleted
4. Delete projects and verify all R2 files are cleaned up
5. Try exporting with invalid parameters (low resolution, large grid)
6. Verify share links point to correct domain in production

---

**Total bugs fixed:** 12 critical/high-priority issues
**Files modified:** 13
**Commit:** 582e086
