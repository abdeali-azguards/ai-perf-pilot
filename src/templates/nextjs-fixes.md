# Next.js & React 19 Performance Remediation Guide

A quick-reference guide for resolving common Lighthouse and Core Web Vitals issues in Next.js applications.

---

## 1. Largest Contentful Paint (LCP) Fixes

### A. Preload Critical Hero Images
When Lighthouse reports **"Largest Contentful Paint image was not preloaded"**:
```tsx
// Before:
<Image src="/hero.png" alt="Hero Banner" width={1200} height={600} />

// After:
<Image
  src="/hero.png"
  alt="Hero Banner"
  width={1200}
  height={600}
  priority
  sizes="(max-width: 768px) 100vw, 1200px"
/>
```

### B. Preconnect to Image & Font CDN Origins
In `src/app/layout.tsx`:
```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 2. Total Blocking Time (TBT) & Bundle Size Fixes

### A. Lazy-Load Heavy Client-Side Components
When Lighthouse flags **"Reduce JavaScript execution time"** or **"Reduce unused JavaScript"**:
```tsx
// Before (eagerly bundled into main chunk):
import { HeavyChart } from '@/components/HeavyChart';
import { SwaggerPlayground } from '@/components/SwaggerPlayground';

// After (code-split on demand):
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(
  () => import('@/components/HeavyChart').then((mod) => mod.HeavyChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted" /> }
);
```

### B. Defer Modals and Off-Screen Drawers
Only import modal or drawer code upon user interaction (e.g. click of an "Open Filter" or "Sign Up" button).

---

## 3. Cumulative Layout Shift (CLS) Fixes

### A. Reserve Space for Dynamic Components
Ensure every image, banner, or embed has an intrinsic aspect ratio or skeleton fallback:
```tsx
<div className="relative aspect-[16/9] w-full overflow-hidden">
  <Image src="/banner.jpg" alt="Banner" fill className="object-cover" />
</div>
```

### B. Self-Host Fonts with `next/font`
Avoid layout shifts caused by delayed webfont swap by using `next/font/google` or `next/font/local` with fallback font metrics:
```tsx
import { Geist } from 'next/font/google';

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
});
```
