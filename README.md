# Q-Pass ERP — Landing Page

> Akıllı Geçiş, Kusursuz Yönetim.

Modern SaaS landing page for Q-Pass ERP, built with **Vite + React + TypeScript + Tailwind CSS** and shadcn-like UI primitives.

## Stack

- Vite 5 + React 18 + TypeScript
- Tailwind CSS 3 (class-based dark mode)
- lucide-react icons
- class-variance-authority + clsx + tailwind-merge (shadcn-style `cn` helper)

## Scripts

```bash
npm install        # install dependencies
npm run dev        # start dev server on http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

## Structure

```
src/
├── main.tsx               # entry
├── App.tsx                # page composition
├── index.css              # tailwind + base + utilities
├── lib/utils.ts           # cn() helper
├── hooks/useTheme.ts      # dark/light toggle
└── components/
    ├── ui/                # Button, Card (shadcn-like)
    ├── Navbar.tsx
    ├── Hero.tsx
    ├── Features.tsx
    ├── PortalHub.tsx
    └── Footer.tsx
```

## Sections

1. **Sticky Navbar** — blur on scroll, Q-Pass logo, theme toggle, CTAs, mobile menu.
2. **Hero** — gradient slogan, dual CTAs, trust strip, animated grid backdrop.
3. **Features** — PDKS Takibi, İK Analitiği, ERP Modülleri (3 cards).
4. **Portal Access Hub** — Admin / Müşteri / Çalışan portal cards with glassmorphism and distinct accent gradients.
5. **Footer** — brand, product/company/legal columns, social links.
