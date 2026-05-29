# 3DWallArt / ReliefForge — Comprehensive Bug Hunt Report

## CRITICAL BUGS

### 1. Security: Unauthenticated Admin Upgrade Endpoint
**File:** `src/app/api/upgrade-me/route.ts` (lines 5-6, 8-29)
**Severity:** CRITICAL
**Description:** The `/api/upgrade-me` endpoint accepts both GET and POST requests and upgrades ANY authenticated user to the TEAM plan with no additional authorization checks. Any logged-in user can call this to get free TEAM access. This appears to be a dev/debug utility that was never removed. In production, this is a privilege escalation vulnerability.
```
export async function POST() { return upgrade(); }
export async function GET() { return upgrade(); }
// No admin check, no rate limiting
```

### 2. Server-Side Export Only Generates STL Regardless of Format
**File:** `src/lib/queue.ts` (lines 101-113)
**Severity:** HIGH
**Description:** The `processInline` function always calls `toSTLBuffer(geo)` and always names the file `.stl` regardless of the requested format. The `ExportJobData` interface accepts `"STL" | "OBJ" | "THREE_MF"` but the processing code ignores the format field entirely. OBJ and THREE_MF exports will produce an STL file with the wrong extension.
```
const stlBuffer = toSTLBuffer(geo);  // Always STL
const r2Key = generateKey(userId, `export-${exportId}-${data.format.toLowerCase()}.stl`);  // Always .stl extension
```

### 3. R2 getSignedUrl Receives a Storage Key, Not a URL
**File:** `src/app/api/export/route.ts` (lines 163-175) and `src/app/api/export/batch/route.ts` (lines 149-168)
**Severity:** HIGH
**Description:** The `getSignedUrl()` function in `r2.ts` expects an R2 object key (like `uploads/user123/1234-file.stl`). The export route's `e.url` stores the R2 key (returned from `uploadFile()` which returns `key`). This works correctly. However, `getSignedUrl()` constructs the signed URL from the S3 client endpoint. If R2 credentials are invalid/empty (as mentioned in recent issues), ALL signed URL generation will fail silently (caught by try/catch), resulting in `url: null` for all completed exports — users will see their exports as "COMPLETED" but get no download link.

### 4. extractKeyFromUrl() URL Format Mismatch with Actual Storage
**File:** `src/lib/r2.ts` (lines 84-90)
**Severity:** HIGH
**Description:** `extractKeyFromUrl()` expects URLs in the format `https://{bucket}.{accountId}.r2.cloudflarestorage.com/{key}` (virtual-hosted style). However, the R2 client is configured with `forcePathStyle: true` (line 16), which means actual R2 URLs would be in path style: `https://{accountId}.r2.cloudflarestorage.com/{bucket}/{key}`. The function will never match and always return `null`, meaning project deletion (line 100-106 in `projects/[id]/route.ts`) will fail to clean up R2 files, causing storage leaks.

### 5. Project Deletion Doesn't Clean Up Export R2 Files
**File:** `src/app/api/projects/[id]/route.ts` (lines 97-112)
**Severity:** MEDIUM-HIGH
**Description:** When deleting a project, only `project.thumbnailUrl` and `project.stlUrl` are cleaned up from R2. The project's associated Export records' R2 files (which are the main output files) are NOT deleted. Due to cascade delete on the Export model, the DB records are deleted but the actual files on R2 remain orphaned forever, consuming storage quota.

### 6. Batch Export Sends Full Image Data URL for Every Tile
**File:** `src/app/api/export/batch/route.ts` (lines 70-99) and `src/components/export/ExportPanel.tsx` (lines 176-198)
**Severity:** MEDIUM-HIGH
**Description:** The batch export creates N export records and calls `addExportJob` N times sequentially, each time with the full `imageDataUrl` (a base64-encoded PNG of the entire image). For a 3x3 grid, this processes 9 tiles sequentially in the API handler. Since `processInline` runs synchronously, this means the HTTP request blocks for potentially many minutes for high-res exports. With `processInline` being awaited in a loop (line 89), the total request time is O(tiles * processing_time), easily exceeding Vercel's 10s/60s timeout limits.

### 7. Storage Used Never Decremented on Export Deletion
**File:** `src/app/api/export/[id]/route.ts` (lines 116-123)
**Severity:** MEDIUM
**Description:** When a completed export is deleted, the R2 file is removed but the user's `storageUsed` counter is never decremented. The upload route increments `storageUsed` (upload/route.ts line 112-118), and image deletion decrements it (images/[id]/route.ts line 79-86), but export file sizes are never tracked in the user's storage quota at all — meaning export files consume R2 storage but don't count against the user's plan limit.

---

## SECURITY ISSUES

### 8. Share Link Password Sent as Query Parameter
**File:** `src/app/api/share/[token]/route.ts` (lines 38-41)
**Severity:** MEDIUM
**Description:** The share password can be passed as a URL query parameter (`?password=xxx`). Query parameters are logged in server access logs, browser history, and proxy logs. This exposes passwords. Only the header method (`x-share-password`) should be accepted for security.

### 9. Insecure Token Generation (Math.random)
**File:** `src/lib/utils.ts` (lines 14-22)
**Severity:** LOW-MEDIUM
**Description:** `generateToken()` uses `Math.random()` which is not cryptographically secure. While the share link tokens use `cuid()` from Prisma (not this function), this utility function exists and could be used for security-sensitive tokens in the future. Should use `crypto.randomBytes()` or `crypto.getRandomValues()`.

### 10. Share Token Uses cuid() — Predictable
**File:** `prisma/schema.prisma` (line 122)
**Severity:** LOW-MEDIUM
**Description:** `ShareLink.token` defaults to `cuid()`. CUIDs are designed to be unique but not cryptographically random. They contain timestamp information and are partially predictable. An attacker could potentially enumerate share links. Should use `crypto.randomUUID()` or a random token.

### 11. Stripe Webhook Secret Non-Null Assertion
**File:** `src/app/api/stripe/webhook/route.ts` (line 23)
**Severity:** LOW-MEDIUM
**Description:** `process.env.STRIPE_WEBHOOK_SECRET!` uses non-null assertion. If this env var is missing, `constructEvent` will throw a confusing error rather than failing with a clear message. The webhook signature verification would silently become broken.

### 12. Stripe Secret Key Non-Null Assertion
**File:** `src/lib/stripe.ts` (line 3)
**Severity:** LOW
**Description:** `process.env.STRIPE_SECRET_KEY!` — same issue. Missing env var causes a runtime crash at module import time.

---

## FUNCTIONAL BUGS

### 13. ExportPanel Format Mismatch: '3MF' Display vs 'THREE_MF' State
**File:** `src/components/export/ExportPanel.tsx` (lines 7, 34, 254-269)
**Severity:** MEDIUM
**Description:** The FORMATS array is `['STL', 'OBJ', '3MF']` but the state type is `'STL' | 'OBJ' | 'THREE_MF'`. The conversion `const val = f === '3MF' ? 'THREE_MF' : f` handles the display-to-state mapping. However, the format comparison `format === val` works correctly. No actual bug here — just confusing. BUT the ExportPanel sends `format` directly to the API, and the API route at `export/route.ts` line 57 checks `format === "THREE_MF"` — this works. However, the server-side `processInline` ignores the format anyway (see Bug #2).

### 14. Export History Shows R2 Keys Instead of Signed URLs on Failure
**File:** `src/app/api/export/route.ts` (lines 164-176)
**Severity:** MEDIUM
**Description:** When `getSignedUrl()` fails (line 170-171), `url` is set to `null`. But the signed URL generation is also attempted on the raw R2 key stored in `e.url`. The key format stored is like `uploads/userId/timestamp-filename.stl` (returned by `uploadFile()`). If R2 credentials are broken, ALL export downloads will show as `null` URL. This is correct behavior but the error is silent — the user sees "COMPLETED" with no download button and no error message.

### 15. Thumbnail extractKeyFromUrl Never Matches (Broken Cleanup)
**File:** `src/app/api/projects/[id]/thumbnail/route.ts` (lines 42-46)
**Severity:** MEDIUM
**Description:** When updating a thumbnail, the old one is deleted using `extractKeyFromUrl(project.thumbnailUrl)`. But `thumbnailUrl` stores the R2 key directly (returned by `uploadFile()` which returns the key), NOT a full URL. So `extractKeyFromUrl()` will always return `null` and old thumbnails will never be cleaned up. Same issue as Bug #4.

### 16. Editor Auto-Save Triggers on Initial Load
**File:** `src/app/editor/[id]/page.tsx` (lines 180-188, 199-233)
**Severity:** LOW-MEDIUM
**Description:** When loading a project with existing settings, each `setSetting()` call (line 185) triggers a re-render and changes the settings object. The auto-save useEffect (line 199) will detect this as a change and trigger a save, even though nothing actually changed from the user's perspective. The `lastSettingsRef` check (line 203) helps somewhat, but the initial load of settings will still trigger at least one unnecessary save.

### 17. Editor Settings Loading Triggers N Individual Refreshes
**File:** `src/app/editor/[id]/page.tsx` (lines 181-188)
**Severity:** MEDIUM
**Description:** Loading project settings iterates over each key and calls `setSetting()` individually. Each `setSetting()` call triggers `refresh()` (in store.ts line 96-98), causing N full geometry rebuilds during load. For a project with 20 settings keys, this means 20 unnecessary height grid + geometry computations.

### 18. m600Text Crashes With Single Band
**File:** `src/lib/relief-engine.ts` (lines 497-507)
**Severity:** LOW
**Description:** `m600Text()` references `bands[1]` on line 501 (`bands[1].z.toFixed(2)`). If there's only 1 band (nc=1), `bands[1]` would be undefined, causing a TypeError. In practice the UI limits nc to min 2, but the function itself has no guard.

---

## TYPE ISSUES

### 19. Type Mismatch: ProjectSettings vs ServerReliefSettings
**File:** `src/types/index.ts` (lines 62-69) vs `src/lib/relief-engine-server.ts` (lines 6-32)
**Severity:** MEDIUM
**Description:** The `ProjectSettings` type in `types/index.ts` is a structured object with nested `panel`, `grid`, `relief`, `joining`, `color`, `mold` sub-objects. But the actual `ReliefSettings` (in `relief-engine.ts`) and `ServerReliefSettings` (in `relief-engine-server.ts`) are flat objects with keys like `pw`, `ph`, `gc`, `gr`, etc. The export route casts `project.settings as unknown as ServerReliefSettings` (export/route.ts line 84), but if the settings were ever stored in the `ProjectSettings` format, this would silently break all server-side exports.

### 20. PlanLimits Record<string> Allows Invalid Keys
**File:** `src/types/index.ts` (line 84)
**Severity:** LOW
**Description:** `PLAN_LIMITS: Record<string, PlanLimits>` accepts any string key. The `user.plan` type is `"FREE" | "PRO" | "TEAM" | "ENTERPRISE"` but if a new plan is added to the Prisma enum without updating PLAN_LIMITS, the fallback `PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE` (export/route.ts line 36) would silently use FREE limits. The Record type should use `Record<Plan, PlanLimits>` to enforce compile-time coverage.

### 21. Prisma Export Import Inconsistency
**File:** `src/app/api/upload/route.ts` (line 2) vs other routes
**Severity:** LOW
**Description:** Some files import `prisma` as named export (`import { prisma } from "@/lib/db"`) and others as default (`import prisma from "@/lib/db"`). The db.ts file exports both. This works but is inconsistent and could cause confusion.

---

## EDGE CASES & ROBUSTNESS

### 22. No Validation on Export Resolution Bounds
**File:** `src/app/api/export/route.ts` (line 37) and `src/app/api/export/batch/route.ts` (line 43)
**Severity:** MEDIUM
**Description:** The resolution is only checked against the plan's max, but there's no minimum validation. A client could send `resolution: 1` or `resolution: -100` which would cause degenerate geometry (division by zero in `W / (nx - 1)` when nx=1, or negative grid sizes).

### 23. No Max Grid Size Validation on Server
**File:** `src/app/api/export/batch/route.ts` (lines 64-65)
**Severity:** MEDIUM
**Description:** `gridCols` and `gridRows` come from the client (`settings.gc`, `settings.gr`). The UI limits to 1-8, but the server has no validation. A malicious client could send `gridCols: 1000, gridRows: 1000`, creating 1,000,000 export records and jobs, causing a denial of service.

### 24. Division by Zero in Geometry When nx=1 or ny=1
**File:** `src/lib/relief-engine-server.ts` (lines 303-304) and `src/lib/relief-engine.ts` (lines 246-247)
**Severity:** LOW-MEDIUM
**Description:** `const dx = W / (nx - 1)` and `const dy = H / (ny - 1)` — if nx or ny is 1 (very low resolution or degenerate tile), this produces Infinity/NaN, leading to corrupt geometry with NaN coordinates in the STL output.

### 25. Large Base64 Image Data in Request Body
**File:** `src/app/api/export/route.ts` (line 90) and `src/app/api/export/batch/route.ts` (line 17)
**Severity:** MEDIUM
**Description:** The `imageDataUrl` is sent as part of the JSON body. For high-resolution images, this can be 50+ MB of base64 data in a single POST. Next.js has default body size limits (1MB by default for API routes). Large images will fail with 413 Payload Too Large. No `bodyParser` configuration or streaming is implemented.

### 26. Storage Quota Race Condition
**File:** `src/app/api/upload/route.ts` (lines 51-57, 112-118)
**Severity:** LOW
**Description:** The storage quota check (line 52) and the increment (line 112-118) are not atomic. Two concurrent uploads could both pass the check and both succeed, exceeding the quota. This is a minor issue for a single-user app but would matter at scale.

### 27. Share Link Password Length/Complexity Not Validated
**File:** `src/app/api/share/route.ts` (lines 88-91)
**Severity:** LOW
**Description:** No validation on password length or complexity. A user could set a 1-character password, making the share link trivially brute-forceable.

---

## ARCHITECTURE & DESIGN ISSUES

### 28. Inline Processing Blocks API Route for Entire Export Duration
**File:** `src/lib/queue.ts` (lines 49-51, 57-137)
**Severity:** HIGH
**Description:** `addExportJob()` calls `processInline()` which does all the work (image decode, height grid, geometry, STL generation, R2 upload) synchronously within the API route handler. The API route returns 202 ACCEPTED (suggesting async processing) but by the time it returns, the work is already done. This means:
- The API call takes as long as the export itself
- For batch exports, the total time is multiplied by the number of tiles
- This defeats the purpose of the polling mechanism in the frontend
- On serverless platforms (Vercel), long exports will timeout

### 29. BullMQ Queue Created but Never Used
**File:** `src/lib/queue.ts` (lines 30-32)
**Severity:** LOW
**Description:** The `stlQueue` is created if Redis is available, but `addExportJob()` always calls `processInline()` directly (line 50). The queue is only referenced in `export/[id]/route.ts` for checking job progress and removing pending jobs. Since jobs are never actually added to the queue, these queue operations are dead code.

### 30. NEXTAUTH_URL Used Despite Using Clerk
**File:** `src/app/api/share/route.ts` (line 102)
**Severity:** LOW
**Description:** The share route uses `process.env.NEXTAUTH_URL` to build the share URL base. But the app uses Clerk for auth, not NextAuth. This env var may not be set, falling back to `http://localhost:3000` even in production.

### 31. Clerk Middleware Doesn't Protect API Routes
**File:** `src/middleware.ts` (lines 3-9)
**Severity:** LOW
**Description:** The `isProtectedRoute` matcher only covers page routes (`/dashboard`, `/editor`, etc.). API routes are NOT in the protected list. While individual API routes check auth via `getCurrentUserId()`, this means an unauthenticated request to an API route will reach the handler and only then be rejected, rather than being rejected at the middleware level.

### 32. No Rate Limiting on Any Endpoint
**Severity:** LOW-MEDIUM
**Description:** No rate limiting exists on any API route. The upload, export, share, and authentication endpoints are all vulnerable to abuse. Particularly concerning for the export endpoint which is computationally expensive.

---

## SUMMARY TABLE

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | CRITICAL | upgrade-me/route.ts | Unauthenticated plan upgrade — any user can get TEAM |
| 2 | HIGH | queue.ts | Server always generates STL, ignores OBJ/3MF format |
| 3 | HIGH | export/route.ts | Silent failure when R2 creds invalid — no download URLs |
| 4 | HIGH | r2.ts | extractKeyFromUrl URL format mismatch — file cleanup broken |
| 5 | MEDIUM-HIGH | projects/[id]/route.ts | Export R2 files orphaned on project delete |
| 6 | MEDIUM-HIGH | export/batch/route.ts | Sequential inline processing blocks for minutes |
| 7 | MEDIUM | export/[id]/route.ts | Storage quota never decremented on export delete |
| 8 | MEDIUM | share/[token]/route.ts | Password in query param — logged in access logs |
| 9 | LOW-MEDIUM | utils.ts | Math.random for token generation |
| 10 | LOW-MEDIUM | schema.prisma | cuid() tokens are predictable |
| 11 | LOW-MEDIUM | webhook/route.ts | Non-null assertion on webhook secret |
| 12 | LOW | stripe.ts | Non-null assertion on secret key |
| 13 | MEDIUM | ExportPanel.tsx | Format naming confusion (3MF vs THREE_MF) |
| 14 | MEDIUM | export/route.ts | Silent null URLs on signing failure |
| 15 | MEDIUM | thumbnail/route.ts | Old thumbnails never cleaned up (key vs URL) |
| 16 | LOW-MEDIUM | editor page.tsx | Unnecessary auto-save on initial load |
| 17 | MEDIUM | editor page.tsx | N individual refresh calls during settings load |
| 18 | LOW | relief-engine.ts | m600Text crashes with single band |
| 19 | MEDIUM | types + export/route.ts | ProjectSettings vs flat ServerReliefSettings mismatch |
| 20 | LOW | types/index.ts | PLAN_LIMITS uses Record<string> instead of Plan enum |
| 21 | LOW | various | Inconsistent prisma import style |
| 22 | MEDIUM | export/route.ts | No minimum resolution validation |
| 23 | MEDIUM | export/batch/route.ts | No server-side max grid size validation — DoS vector |
| 24 | LOW-MEDIUM | relief-engine-server.ts | Division by zero when nx/ny=1 |
| 25 | MEDIUM | export/route.ts | Large base64 body exceeds Next.js default limits |
| 26 | LOW | upload/route.ts | Storage quota race condition |
| 27 | LOW | share/route.ts | No password complexity validation |
| 28 | HIGH | queue.ts | Inline processing defeats async 202 pattern |
| 29 | LOW | queue.ts | BullMQ queue created but never used |
| 30 | LOW | share/route.ts | NEXTAUTH_URL used instead of app URL |
| 31 | LOW | middleware.ts | API routes not in Clerk middleware protection |
| 32 | LOW-MEDIUM | all routes | No rate limiting anywhere |
