# 3D Wall Art (ReliefForge)

Image-to-3D relief panel converter SaaS application. Users upload images, adjust relief settings, and export 3D-printable STL/OBJ/3MF files.

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18 + TypeScript
- Three.js (3D preview)
- Zustand (state management)
- Tailwind CSS

**Backend:**
- Next.js API routes
- Prisma ORM + PostgreSQL
- Cloudflare R2 (file storage)
- BullMQ + Redis (job queue, optional)
- Sharp (image processing)
- Clerk (authentication)

**Deployment:**
- Railway (all services)
- Project ID: 1457d6fc-97ef-41dc-9ca1-df8358caf8f4
- Service: 3dwallart-app
- Live URL: https://3dwallart-app-production.up.railway.app

## Architecture

### Client-Side Export (ExportBar)
- Top export buttons generate STLs directly in browser
- No server calls, instant download
- Fixed 420px resolution
- Works without R2 or Redis

### Server-Side Export (ExportPanel)
- Bottom export buttons with format/resolution options
- API routes process images with Sharp
- Upload STLs to Cloudflare R2
- Optional Redis queue for async processing
- Export history and re-downloads
- Requires: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME

### Data Models
- **User**: Clerk auth, plan tier (FREE/PRO/TEAM/ENTERPRISE)
- **Project**: Relief settings (JSON), name, thumbnails
- **Image**: User's uploaded images stored in R2
- **Export**: Export records with status tracking
- **ShareLink**: Public project sharing

## Key Features

### Relief Generation
- Image brightness → height map
- Contrast, smoothing, inversion controls
- Grid-based tiling (multi-tile panels)
- Tongue-and-groove joins for multi-tile assembly
- Panel and mold output modes

### Export Options
- **Formats**: STL (all plans), OBJ (PRO+), 3MF (PRO+)
- **Resolutions**: 150-1000px (plan-dependent limits)
- **Batch export**: All tiles in grid
- **Client export**: Instant browser-side generation

### Project Management
- Auto-save settings (1s debounce)
- Project thumbnails
- Export history with signed URLs
- Share links for public viewing

## Environment Variables

Required in Railway:
```
DATABASE_URL           # PostgreSQL connection
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
R2_ACCESS_KEY_ID       # 32 chars, no trailing newlines
R2_SECRET_ACCESS_KEY   # 64 chars
R2_ACCOUNT_ID          # 32 chars
R2_BUCKET_NAME         # e.g. "3dwallart-uploads"
REDIS_URL              # Optional, for async job processing
NEXTAUTH_SECRET
NEXTAUTH_URL
```

## Plan Tiers

Defined in `src/types/index.ts`:
- **FREE**: Limited resolution, STL only
- **PRO**: Higher resolution, OBJ/3MF formats
- **TEAM**: All features, higher limits
- **ENTERPRISE**: Custom

Upgrade endpoint (dev only): `/api/upgrade-me` (GET or POST)

## Deployment

```bash
# Deploy to Railway
railway up --detach

# Check status
railway status

# View logs
railway logs

# Set environment variables
railway variables set KEY=value
```

## Current Status

✅ Client-side exports working (top buttons)
✅ Project auto-save working
✅ Database and auth configured
⚠️ R2 storage integration in progress (credential issues)
⚠️ Server-side exports depend on R2 fix

## Local Development

```bash
npm install
npm run dev
```

Requires local PostgreSQL and optional Redis. Set environment variables in `.env`.
