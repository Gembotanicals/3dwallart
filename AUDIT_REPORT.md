# 3D Wall Art (ReliefForge) — Bug Audit Report

**Date:** May 30, 2026
**Scope:** All API routes, library files, editor page, control panel, export panel, share modal, dashboard
**Files reviewed:** 19 API routes, 8 library files, 6 client components

---

## CRITICAL / SECURITY ISSUES

### 1. upgrade-me endpoint lets any user self-upgrade to TEAM plan
**File:** `src/app/api/upgrade-me/route.ts` (lines 7-8, 13)
**Severity:** CRITICAL
**Issue:** Any authenticated user can call GET or POST `/api/upgrade-me` to upgrade themselves to TEAM plan (which costs money). The only guard is:
```
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_ADMIN_UPGRADE)
```
If `ALLOW_ADMIN_UPGRADE` is ever accidentally set in production, any user who discovers this endpoint gets free premium access. This should be removed entirely or restricted to admin users only.

### 2. Share password sent via query string but API expects header — BROKEN
**File:** `src/app/share/[token]/page.tsx` (line 135) vs `src/app/api/share/[token]/route.ts` (line 39)
**Severity:** HIGH
**Issue:** The share page's PasswordForm sends the password as a query parameter:
```
`/api/share/${token}?password=${encodeURIComponent(password)}`
```
But the API route reads the password from the `x-share-password` request header:
```
request.headers.get("x-share-password")
```
**Impact:** Password-protected share links are COMPLETELY BROKEN. Users entering the correct password will always get "Password required" or "Invalid password" because the server never receives the password.

### 3. No rate limiting on share endpoint — brute-force risk
**File:** `src/app/api/share/[token]/route.ts`
**Severity:** MEDIUM
**Issue:** No rate limiting on the share GET endpoint. An attacker could:
- Brute-force 32-char share tokens (unlikely but theoretically possible)
- Brute-force passwords on password-protected links
- Inflate view counts by repeated requests

### 4. Race condition in storage quota enforcement
**File:** `src/app/api/upload/route.ts` (lines 52-56, 112-119)
**Severity:** MEDIUM
**Issue:** Upload checks storage quota, then uploads the file, then increments `storageUsed`. Two concurrent uploads could both pass the quota check and both succeed, exceeding the user's storage limit. Same TOCTOU issue exists with project count checks for plan limits.

### 5. Export record created before validation — orphan records
**File:** `src/app/api/export/route.ts` (lines 82-112)
**Severity:** LOW-MEDIUM
**Issue:** An export record is created with status "PENDING" (line 82), then `imageDataUrl` is checked (line 100). If missing, the record is marked "FAILED" but still exists. Over time this creates orphaned failed records.

---

## LOGIC BUGS

### 6. 3MF export produces STL files with wrong extension
**File:** `src/lib/queue.ts` (lines 111-114)
**Severity:** HIGH
**Issue:** The `THREE_MF` format case falls through to STL generation but saves with `.3mf` extension:
```typescript
case "THREE_MF":
  outputBuffer = toSTLBuffer(geo);  // Generates STL data!
  extension = "3mf";                // But labels it as 3MF
  break;
```
**Impact:** Users who pay for 3MF export (PRO plan feature) receive an STL file with a .3mf extension that their slicer software will reject or misparse.

### 7. Share page shows placeholder geometry, not the actual project
**File:** `src/app/share/[token]/page.tsx` (lines 248-292)
**Severity:** HIGH
**Issue:** The shared viewer generates a procedural sine-wave pattern (lines 269-282) instead of displaying the actual project's relief. The comment says "We don't have the original image in share mode" — but the share API doesn't include the image URL or ID in its response. Users sharing a link see a generic demo pattern, not their artwork.

### 8. Base URL construction has operator precedence bug
**File:** `src/app/api/share/route.ts` (line 102)
**Severity:** MEDIUM
**Issue:**
```typescript
const baseUrl = process.env.NEXTAUTH_URL || process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
  : "http://localhost:3000";
```
This evaluates as: `(NEXTAUTH_URL || RAILWAY_PUBLIC_DOMAIN) ? "https://..." : "http://..."`
If `NEXTAUTH_URL` is set but `RAILWAY_PUBLIC_DOMAIN` is not, the condition is truthy, and it constructs `https://undefined/share/...`. Should be:
```typescript
const baseUrl = process.env.NEXTAUTH_URL 
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000");
```

### 9. Batch export processes ALL tiles synchronously in one HTTP request
**File:** `src/app/api/export/batch/route.ts` + `src/lib/queue.ts`
**Severity:** HIGH
**Issue:** `addExportJob()` calls `processInline()` which does heavy computation (image decode, height grid, geometry, R2 upload) synchronously in the API handler. For an 8×8 grid = 64 tiles, this will take minutes and exceed Railway's HTTP timeout (~30-60s). The API returns 202 ("Accepted") but the work is done inline before the response is sent.

### 10. Export route lies about status — says "PENDING" when already done
**File:** `src/app/api/export/route.ts` (lines 115-131)
**Severity:** MEDIUM
**Issue:** `addExportJob()` is async and awaits completion via `processInline()`. By the time the API response is sent, the job is already COMPLETED or FAILED. But the response always says `{ status: "PENDING" }`. The client then starts unnecessary polling.

### 11. PLAN_LIMITS undefined crash in upload route
**File:** `src/app/api/upload/route.ts` (line 51)
**Severity:** MEDIUM
**Issue:** `const planLimits = PLAN_LIMITS[user.plan];` — no fallback to FREE, unlike all other routes which use `PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE`. If a user has an unrecognized plan value (e.g., from a webhook race condition), this crashes with `Cannot read properties of undefined`.

### 12. Image URL signing inconsistency
**File:** `src/app/api/images/route.ts` (line 49) vs `src/app/api/images/[id]/route.ts` (line 31)
**Severity:** LOW
**Issue:** The list endpoint always attempts to sign URLs. The get-by-id endpoint only signs URLs that don't start with 'http'. This inconsistency could cause some URLs to be double-signed or left unsigned.

### 13. Project settings accepted without validation
**File:** `src/app/api/projects/route.ts` (line 95), `src/app/api/projects/[id]/route.ts` (line 67)
**Severity:** MEDIUM
**Issue:** Any arbitrary JSON object can be stored as project settings with no validation. When later cast to `ServerReliefSettings` in the export route (line 92), missing or invalid fields could cause runtime errors during geometry generation (e.g., undefined `s.gc` causing division by zero).

### 14. No format validation in export endpoint
**File:** `src/app/api/export/route.ts`
**Severity:** LOW
**Issue:** The `format` field from request body is not validated against the enum values ("STL", "OBJ", "THREE_MF"). Any string can be stored in the database.

### 15. Editor loads settings one-by-one causing excessive rebuilds
**File:** `src/app/editor/[id]/page.tsx` (lines 181-188)
**Severity:** LOW-MEDIUM (performance)
**Issue:** When loading saved project settings, it iterates through each setting and calls `setSetting()` individually. Each call triggers `refresh()` in the store, rebuilding the height grid and geometry. For a project with 20+ settings, this means 20+ unnecessary full geometry rebuilds.

### 16. Editor auto-save fires on initial project load
**File:** `src/app/editor/[id]/page.tsx` (lines 219-253)
**Severity:** LOW
**Issue:** `lastSettingsRef` is initialized as `''`. When project settings are loaded and applied, the settings string changes from `''` to actual settings, triggering the auto-save effect. This bumps the project version on every page load even when nothing changed.

### 17. Share view count increments on every request including failed auth
**File:** `src/app/api/share/[token]/route.ts` (lines 70-73)
**Severity:** LOW
**Issue:** The view counter increments after password validation but the increment happens on every successful request. Repeated page refreshes inflate the count.

---

## CLIENT-SIDE BUGS

### 18. Export polling never stops on component unmount — memory leak
**File:** `src/components/export/ExportPanel.tsx` (lines 70-101, 208-234)
**Severity:** MEDIUM
**Issue:** Both `pollExport` and `pollBatch` use recursive `setTimeout` calls. If the user navigates away from the editor, the polling continues indefinitely, attempting to update state on an unmounted component (React warning + memory leak).

### 19. No confirmation dialog for project deletion
**File:** `src/app/dashboard/page.tsx` (line 79)
**Severity:** MEDIUM (UX)
**Issue:** `handleDelete` immediately sends the DELETE request with no confirmation dialog. One accidental click permanently deletes a project and all its exports and share links.

### 20. QR code in ShareModal is random, not a real QR encoding
**File:** `src/components/share/ShareModal.tsx` (lines 111-121)
**Severity:** LOW (misleading UI)
**Issue:** The QR code is just 16 random `Math.random()` colored boxes. It doesn't encode the share URL and won't scan to anything useful. It also re-randomizes on every re-render.

### 21. Thumbnail captures wrong canvas
**File:** `src/app/editor/[id]/page.tsx` (line 286)
**Severity:** LOW
**Issue:** `document.querySelector('canvas')` selects the first `<canvas>` in the DOM, which may be the 120×120 source preview canvas (SourcePreview component) rather than the Three.js WebGL canvas. This would result in a tiny, incorrect thumbnail.

### 22. Duplicate export functionality (ExportBar vs ExportPanel)
**File:** `src/components/3d/ExportBar.tsx` + `src/components/export/ExportPanel.tsx`
**Severity:** MEDIUM (UX confusion)
**Issue:** Both components render export buttons in the editor:
- ExportBar: Uses client-side `useEditorStore.exportTile()` — always generates STL locally
- ExportPanel: Uses server-side `/api/export` — supports STL/OBJ/3MF with format selection

Users see two "Export this tile" buttons that do different things. The ExportBar buttons don't respect format selection and produce client-side STLs that aren't tracked in export history.

### 23. Escape key doesn't revert project name
**File:** `src/app/editor/[id]/page.tsx` (lines 276-278)
**Severity:** LOW
**Issue:** Pressing Escape during name editing sets `editingName` to false but doesn't restore the original name — it keeps whatever was partially typed.

### 24. No feedback when dropping invalid file types
**File:** `src/components/3d/ControlPanel.tsx` (lines 181-185)
**Severity:** LOW
**Issue:** `useDropzone` has no `onDropRejected` handler. Dropping a PDF or non-image file produces zero feedback — the file is silently ignored with no error message.

### 25. ExportHistory auto-refresh creates potentially infinite intervals
**File:** `src/components/export/ExportHistory.tsx` (lines 42-51)
**Severity:** LOW
**Issue:** The `useEffect` for auto-refresh depends on `exports` array which changes on every fetch. This creates a new interval on every state update. While the cleanup function clears the old interval, it's wasteful — it should use a ref for the interval ID instead.

---

## DATA FLOW ISSUES

### 26. Delete image doesn't use transactions
**File:** `src/app/api/images/[id]/route.ts` (lines 76-101)
**Severity:** LOW-MEDIUM
**Issue:** Deleting an image performs 3 sequential operations without a transaction:
1. Delete from R2 (best effort)
2. Delete DB record
3. Decrement storage usage

If step 2 succeeds but step 3 fails, the user's `storageUsed` is never decremented. If step 2 fails after step 1 succeeds, the R2 file is gone but the DB record remains with a broken URL.

### 27. Webhook sets plan to "PRO" regardless of actual plan purchased
**File:** `src/app/api/stripe/webhook/route.ts` (line 45)
**Severity:** MEDIUM
**Issue:** On `checkout.session.completed`, the user is always set to `plan: "PRO"` regardless of whether they purchased PRO or TEAM. The `customer.subscription.updated` event eventually corrects this, but there's a window where a TEAM subscriber has PRO access.

### 28. Stripe customer not stored on checkout if user already has one
**File:** `src/app/api/stripe/checkout/route.ts` (lines 42-51)
**Severity:** LOW
**Issue:** If the user doesn't have a `stripeCustomerId`, a new Stripe customer is created but the ID is never saved to the DB before creating the checkout session. If the webhook fires before the next request, it can't find the user by `stripeCustomerId`. The ID is only stored in the webhook handler (line 43 of webhook/route.ts).

---

## SUMMARY TABLE

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1 | upgrade-me self-upgrade | CRITICAL | Security |
| 2 | Password via query vs header mismatch | HIGH | Logic |
| 3 | No rate limiting on share | MEDIUM | Security |
| 4 | Storage quota race condition | MEDIUM | Security |
| 5 | Orphan export records | LOW-MED | Logic |
| 6 | 3MF produces wrong file type | HIGH | Logic |
| 7 | Share page shows placeholder, not actual art | HIGH | Logic |
| 8 | Base URL operator precedence bug | MEDIUM | Logic |
| 9 | Batch export times out (inline processing) | HIGH | Logic |
| 10 | Export status lies (says PENDING when done) | MEDIUM | Logic |
| 11 | PLAN_LIMITS undefined crash | MEDIUM | Logic |
| 12 | URL signing inconsistency | LOW | Logic |
| 13 | No settings validation | MEDIUM | Security |
| 14 | No format validation | LOW | Logic |
| 15 | Excessive geometry rebuilds on load | LOW-MED | Performance |
| 16 | Auto-save fires on initial load | LOW | Logic |
| 17 | View count inflates on refresh | LOW | Logic |
| 18 | Polling memory leak on unmount | MEDIUM | Client |
| 19 | No delete confirmation dialog | MEDIUM | UX |
| 20 | Fake QR code | LOW | UX |
| 21 | Wrong canvas captured for thumbnail | LOW | Client |
| 22 | Duplicate export buttons | MEDIUM | UX |
| 23 | Escape doesn't revert name | LOW | UX |
| 24 | No drop rejection feedback | LOW | UX |
| 25 | ExportHistory interval churn | LOW | Client |
| 26 | Image delete not transactional | LOW-MED | Data |
| 27 | Webhook hardcodes PRO plan | MEDIUM | Data |
| 28 | Stripe customer ID not persisted early | LOW | Data |

---

## TOP PRIORITY FIXES

1. **Remove or properly secure** the `/api/upgrade-me` endpoint
2. **Fix password delivery** — change share page to use `x-share-password` header instead of query param
3. **Fix 3MF export** — either implement actual 3MF generation or disable the option
4. **Fix share page** to display actual project (store image URL/ID in share data)
5. **Fix batch export** — use actual background jobs or process asynchronously
6. **Fix base URL** operator precedence in share route
7. **Add PLAN_LIMITS fallback** in upload route
8. **Fix webhook** to use `getPlanFromSubscription()` on checkout completion
9. **Clean up polling** on unmount in ExportPanel
10. **Add delete confirmation** dialog in dashboard
