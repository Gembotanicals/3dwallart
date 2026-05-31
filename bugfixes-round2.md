# Bug Fixes Applied (Round 2)

## Critical Bugs Fixed

### 1. Zustand store not reset between projects
**File:** `src/lib/store.ts`, `src/app/editor/[id]/page.tsx`
**Issue:** When navigating between projects, all state from the previous project (image, geometry, settings, colors) persisted until overwritten. Users saw stale data from the previous project.
**Fix:** Added `reset()` function to store that clears all state back to defaults. Editor now calls `reset()` when project ID changes.

### 2. Auto-save race condition overwrites project settings on load
**File:** `src/app/editor/[id]/page.tsx`
**Issue:** Auto-save fired on first render before project loaded, potentially overwriting saved settings with defaults. Each setting was also saved individually (N saves for N settings).
**Fix:** Added `isLoadingRef` to prevent auto-save during initial load. Settings now sync to `lastSettingsRef` after load completes so auto-save only triggers on actual user changes.

### 3. Settings loaded one-by-one causing N refreshes and N saves
**File:** `src/lib/store.ts`, `src/app/editor/[id]/page.tsx`
**Issue:** `loadProject()` called `setSetting()` for each key, triggering 25+ geometry recomputes and debounced saves.
**Fix:** Added `setSettings()` bulk method that applies all settings at once with a single refresh. Editor now uses this instead of looping through settings.

## High Priority Fixes

### 4. Library and Settings pages missing navigation header
**Files:** `src/app/library/page.tsx`, `src/app/settings/page.tsx`
**Issue:** Only Dashboard had `<AppHeader />`. Users couldn't navigate between sections without modifying URL or using browser back.
**Fix:** Added `<AppHeader />` to both pages with proper layout structure.

### 5. Export polling memory leak on component unmount
**File:** `src/components/export/ExportPanel.tsx`
**Issue:** `pollExport` and `pollBatch` used recursive `setTimeout` with no cleanup. If user navigated away during export, polling continued making requests and calling `setState` on unmounted component.
**Fix:** Added `mountedRef` and `pollTimersRef` to track mounted state and all active timers. Cleanup effect clears all timers on unmount. All poll functions check `mountedRef.current` before setting state.

### 6. Share password flow completely broken
**Files:** `src/app/share/[token]/page.tsx`
**Issue:** Client sent password via query string `?password=xxx` but API expected it in `x-share-password` header. Password-protected shares always failed.
**Fix:** Updated client to send password via `x-share-password` header instead of query string.

## Medium Priority Fixes

### 7. Color toggle doesn't refresh geometry
**File:** `src/components/3d/ControlPanel.tsx`
**Issue:** When enabling `colorOn`, it called `setSetting()` which triggered `refresh()` with old colors/bands, then computed new colors/bands but didn't call `refresh()` again. Geometry stayed uncolored until another setting changed.
**Fix:** Reversed order: compute and set colors/bands first, then call `setSetting()` which triggers refresh with the correct colors.

### 8. Thumbnail captures wrong canvas
**Files:** `src/app/editor/[id]/page.tsx`, `src/components/3d/ReliefViewer.tsx`
**Issue:** `document.querySelector('canvas')` grabbed the first canvas, which could be the SourcePreview minimap instead of the 3D viewport.
**Fix:** Added `id="relief-viewport"` to ReliefViewer's wrapper div. Thumbnail capture now queries `#relief-viewport canvas` to target the correct canvas.

### 9. Share URL operator precedence bug
**File:** `src/app/api/share/route.ts`
**Issue:** `process.env.NEXTAUTH_URL || process.env.RAILWAY_PUBLIC_DOMAIN ? ... : ...` had incorrect precedence. The `||` operator has lower precedence than `?:`, causing unexpected behavior.
**Fix:** Added parentheses: `process.env.NEXTAUTH_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? ... : ...)`.

### 10. Non-404 errors silently ignored in editor
**File:** `src/app/editor/[id]/page.tsx`
**Issue:** If project fetch returned 500 or network error, `loadError` stayed false and page rendered normally with default settings. No error shown to user.
**Fix:** Now sets `loadError` for any non-ok response and network errors, showing the "Project not found" error state.

### 11. BufferGeometry memory leak in ReliefViewer
**File:** `src/components/3d/ReliefViewer.tsx`
**Issue:** `useMemo` created new `BufferGeometry` when geometry changed but never disposed the old one, causing GPU memory leaks over time.
**Fix:** Added cleanup effect that calls `bufferGeometry?.dispose()` when geometry changes or component unmounts.

## Summary

**Total bugs fixed:** 11 critical/high/medium priority issues
**Files modified:** 10
**Commit:** 3ab7455

### Remaining Known Issues (Lower Priority)
- Fake QR code in share modal (visual placeholder, not functional)
- Dead code: EditorTour, ShareList, Sidebar components never used
- Conflicting ReliefSettings types in `src/types/index.ts` vs `src/lib/relief-engine.ts`
- Duplicate formatBytes implementations
- Modal components lack keyboard accessibility (no Escape handler, no focus trap)
- ExportHistory pagination doesn't reset when new exports arrive
- Batch export processes synchronously in one request (may timeout on large grids)
