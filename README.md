# Q-Pass ERP

> Akıllı Geçiş, Kusursuz Yönetim.

Vite + React + TypeScript + Tailwind CSS application hosting the **landing page** (`/`) and the **Admin Panel** (`/admin/*`), with Supabase Auth for role-gated access.

## Stack

- Vite 5 + React 18 + TypeScript
- Tailwind CSS 3 (class-based dark mode)
- react-router-dom 6
- @supabase/supabase-js 2 (Auth + Postgres)
- react-hook-form + zod for typed, validated forms
- framer-motion for entrance / scroll-reveal animations
- lucide-react icons
- class-variance-authority + clsx + tailwind-merge (shadcn-style primitives)

## Environment

Copy `.env.example` → `.env.local` and fill in the values from the Supabase project:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-key>
```

On Vercel, add the same two variables under **Project Settings → Environment Variables**, then redeploy.

## Scripts

```bash
npm install        # install dependencies
npm run dev        # start dev server on http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

## Admin bootstrap

The first admin must be promoted manually:

1. Create a user in Supabase Dashboard → **Authentication → Users → Add user** (email + password, auto-confirm).
2. In the SQL editor run:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'you@qpass.io';
   ```

3. Log in at `/admin/login` — you will land on the Admin Dashboard.

Non-admin accounts are redirected back to the landing page.

## Routes

| Path                | Access                       | Notes                              |
| ------------------- | ---------------------------- | ---------------------------------- |
| `/`                 | Public                       | Landing page                       |
| `/admin/login`      | Public                       | Admin login form                   |
| `/admin`            | Authenticated + `role=admin` | Dashboard                          |
| `/admin/users`      | Authenticated + `role=admin` | Placeholder — coming soon          |
| `/admin/roles`      | Authenticated + `role=admin` | Placeholder — coming soon          |
| `/admin/audit`      | Authenticated + `role=admin` | Placeholder — coming soon          |
| `/admin/settings`   | Authenticated + `role=admin` | Placeholder — coming soon          |

SPA deep-link refresh is handled by `vercel.json` (`/(.*) → /`).

## Structure

```
src/
├── main.tsx                # BrowserRouter + AuthProvider
├── App.tsx                 # Routes tree
├── index.css               # tailwind + base + utilities
├── lib/
│   ├── utils.ts            # cn() helper
│   └── supabase.ts         # Supabase client + types
├── hooks/
│   ├── useTheme.ts         # dark/light toggle
│   └── useAuth.tsx         # AuthProvider + useAuth()
├── pages/
│   ├── LandingPage.tsx     # public landing
│   ├── NotFound.tsx
│   └── admin/
│       ├── AdminLogin.tsx
│       ├── Dashboard.tsx
│       └── Placeholder.tsx
└── components/
    ├── ui/                 # Button, Card, Input, Label (shadcn-like)
    ├── motion/variants.ts  # shared framer-motion variants
    ├── admin/
    │   ├── AdminLayout.tsx # sidebar + topbar shell
    │   ├── RequireAdmin.tsx
    │   └── MiniChart.tsx
    ├── Navbar.tsx
    ├── Hero.tsx
    ├── Features.tsx
    ├── Pricing.tsx
    ├── PortalHub.tsx
    ├── Docs.tsx
    └── Footer.tsx
```

## Landing sections

1. **Sticky Navbar** — blur on scroll, Q-Pass logo, theme toggle, CTAs link to `/admin/login`.
2. **Hero** — gradient slogan, dual CTAs, trust strip, animated grid backdrop, SVG product mockup.
3. **Features** — PDKS Takibi, İK Analitiği, ERP Modülleri.
4. **Pricing** — 3 tiers with featured middle plan.
5. **Portal Access Hub** — Admin / Müşteri / Çalışan cards; Admin card links to `/admin/login`.
6. **Docs** — 4 developer/admin resource cards.
7. **Footer** — brand, product/company/legal columns, social links.
