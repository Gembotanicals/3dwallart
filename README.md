# ReliefForge

**Image to 3D Relief — SaaS Platform**

Transform any image into stunning 3D printable relief wall panels. Upload an image, customize depth mapping and panel settings in real-time 3D, and export production-ready STL files.

## Tech Stack

| Layer        | Technology                              |
|------------- |-----------------------------------------|
| Framework    | Next.js 14 (App Router)                 |
| Language     | TypeScript                              |
| Styling      | Tailwind CSS                            |
| 3D Engine    | React Three Fiber + Three.js            |
| Database     | PostgreSQL (via Prisma ORM)             |
| Auth         | NextAuth v4 (Google, GitHub, Credentials)|
| Job Queue    | BullMQ + Redis                          |
| Storage      | Cloudflare R2                           |
| Billing      | Stripe                                  |
| Email        | Resend                                  |
| State        | Zustand                                 |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Landing  │  │ Auth     │  │ Dashboard│  │ 3D Editor  │ │
│  │ Page     │  │ Pages    │  │ /Library │  │ (R3F)      │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    Next.js API Routes
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                     Server Side                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ NextAuth │  │ Project  │  │ Export   │  │ Stripe     │ │
│  │ API      │  │ CRUD     │  │ Queue    │  │ Webhooks   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
│       │              │              │               │        │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼──────┐ │
│  │PostgreSQL│  │PostgreSQL│  │BullMQ    │  │Stripe API │ │
│  │(Prisma)  │  │(Prisma)  │  │+ Redis   │  │           │ │
│  └──────────┘  └──────────┘  └────┬─────┘  └───────────┘ │
│                                    │                       │
│                              ┌─────▼──────┐               │
│                              │ STL Worker │               │
│                              │ (Node.js)  │               │
│                              └─────┬──────┘               │
│                                    │                       │
│                              ┌─────▼──────┐               │
│                              │Cloudflare  │               │
│                              │R2 Storage  │               │
│                              └────────────┘               │
└───────────────────────────────────────────────────────────┘
```

## API Endpoints

| Method | Endpoint                      | Description                    |
|--------|-------------------------------|--------------------------------|
| GET    | /api/health                   | Health check                   |
| POST   | /api/auth/register            | User registration              |
| *      | /api/auth/[...nextauth]       | NextAuth endpoints             |
| GET    | /api/projects                 | List user projects             |
| POST   | /api/projects                 | Create project                 |
| GET    | /api/projects/[id]            | Get project                    |
| PATCH  | /api/projects/[id]            | Update project                 |
| DELETE | /api/projects/[id]            | Delete project                 |
| POST   | /api/projects/[id]/duplicate  | Duplicate project              |
| POST   | /api/projects/[id]/thumbnail  | Upload thumbnail               |
| GET    | /api/images                   | List user images               |
| DELETE | /api/images/[id]              | Delete image                   |
| POST   | /api/upload                   | Upload image to R2             |
| GET    | /api/user                     | Get current user               |
| POST   | /api/export                   | Start export job               |
| GET    | /api/export/[id]              | Get export status              |
| POST   | /api/export/batch             | Batch export multiple projects |
| POST   | /api/stripe/checkout          | Create checkout session        |
| POST   | /api/stripe/webhook           | Stripe webhook handler         |
| POST   | /api/stripe/portal            | Customer billing portal        |

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- npm or yarn

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd reliefforge/saas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Fill in all required values in `.env`. At minimum you need:
   - `DATABASE_URL` — PostgreSQL connection string
   - `REDIS_URL` — Redis connection string
   - `NEXTAUTH_SECRET` — Random secret (use `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — `http://localhost:3000`

4. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

5. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Start the STL export worker (in a separate terminal):**
   ```bash
   npm run worker
   ```

The app will be available at `http://localhost:3000`.

## Railway Deployment

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and create a new project.
2. Add a **PostgreSQL** plugin.
3. Add a **Redis** plugin.

### Step 2: Deploy the App

1. Connect your GitHub repository to Railway.
2. Railway will auto-detect the project root (`reliefforge/saas`).
3. Set the **Root Directory** to `reliefforge/saas`.

### Step 3: Configure Environment Variables

In Railway's Variables tab, add all variables from `.env.example`:

| Variable                        | Source                                      |
|---------------------------------|---------------------------------------------|
| `DATABASE_URL`                 | From Railway PostgreSQL plugin              |
| `REDIS_URL`                    | From Railway Redis plugin                   |
| `NEXTAUTH_SECRET`              | Generate: `openssl rand -base64 32`         |
| `NEXTAUTH_URL`                 | Your Railway deployment URL                 |
| `R2_ACCOUNT_ID`                | Cloudflare dashboard                        |
| `R2_ACCESS_KEY_ID`             | Cloudflare R2 API tokens                    |
| `R2_SECRET_ACCESS_KEY`         | Cloudflare R2 API tokens                    |
| `R2_BUCKET_NAME`               | `reliefforge`                               |
| `STRIPE_SECRET_KEY`            | Stripe dashboard                            |
| `STRIPE_WEBHOOK_SECRET`        | Stripe webhook signing secret               |
| `STRIPE_PRICE_PRO_MONTHLY`     | Stripe product price ID                     |
| `STRIPE_PRICE_PRO_YEARLY`      | Stripe product price ID                     |
| `STRIPE_PRICE_TEAM_MONTHLY`    | Stripe product price ID                     |
| `STRIPE_PRICE_TEAM_YEARLY`     | Stripe product price ID                     |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key               |
| `RESEND_API_KEY`               | Resend dashboard                            |
| `GOOGLE_CLIENT_ID`             | Google Cloud Console                        |
| `GOOGLE_CLIENT_SECRET`         | Google Cloud Console                        |
| `GITHUB_CLIENT_ID`             | GitHub OAuth App settings                   |
| `GITHUB_CLIENT_SECRET`         | GitHub OAuth App settings                   |

### Step 4: Deploy

Railway will automatically:
1. Run `npx prisma generate && npm run build` (build phase)
2. Run `npx prisma migrate deploy && npm start` (deploy phase)
3. Check health at `/api/health`

### Step 5: Run the Worker

Create a second service instance or use a separate Railway service:
```bash
npm run worker
```

Set the same environment variables for the worker service.

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string for BullMQ |
| `NEXTAUTH_SECRET` | Yes | Secret for NextAuth session encryption |
| `NEXTAUTH_URL` | Yes | Public URL of the application |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API secret key |
| `R2_BUCKET_NAME` | Yes | R2 bucket name |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_PRICE_PRO_MONTHLY` | Yes | Stripe Price ID for Pro monthly |
| `STRIPE_PRICE_PRO_YEARLY` | Yes | Stripe Price ID for Pro yearly |
| `STRIPE_PRICE_TEAM_MONTHLY` | Yes | Stripe Price ID for Team monthly |
| `STRIPE_PRICE_TEAM_YEARLY` | Yes | Stripe Price ID for Team yearly |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (client) |
| `RESEND_API_KEY` | No | Resend API key for transactional emails |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth app client secret |

## Project Structure

```
saas/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration files
│   └── seed.ts                # Seed data
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/                 # App icons
├── src/
│   ├── app/
│   │   ├── (auth)/            # Auth pages (login, signup, forgot-password)
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # User dashboard
│   │   ├── editor/[id]/       # 3D editor
│   │   ├── library/           # Image library
│   │   ├── settings/          # User settings & billing
│   │   ├── share/[token]/     # Public share view
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   ├── sitemap.ts         # SEO sitemap
│   │   └── robots.ts          # SEO robots
│   ├── components/
│   │   ├── 3d/                # React Three Fiber components
│   │   ├── auth/              # Auth UI
│   │   ├── billing/           # Billing UI
│   │   ├── dashboard/         # Dashboard UI
│   │   ├── export/            # Export UI
│   │   ├── landing/           # Landing page sections
│   │   ├── layout/            # Header, Sidebar, Footer
│   │   ├── library/           # Image library UI
│   │   ├── providers/         # Context providers
│   │   └── ui/                # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma client
│   │   ├── queue.ts           # BullMQ queue
│   │   ├── r2.ts              # Cloudflare R2 client
│   │   ├── relief-engine.ts   # Client-side relief generation
│   │   ├── relief-engine-server.ts # Server-side relief generation
│   │   ├── store.ts           # Zustand store
│   │   ├── stripe.ts          # Stripe client
│   │   └── utils.ts           # Utility functions
│   ├── types/                 # TypeScript type definitions
│   └── workers/
│       └── stl-worker.ts      # Background STL export worker
├── Dockerfile                 # Multi-stage Docker build
├── railway.json               # Railway deployment config
├── next.config.js             # Next.js config (standalone output)
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run worker` | Start STL export background worker |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |
| `npx prisma migrate dev` | Run/create migrations |
| `npx prisma generate` | Generate Prisma client |

## License

Proprietary — All rights reserved.
