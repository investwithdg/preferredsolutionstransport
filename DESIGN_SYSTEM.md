# Preferred Solutions Transport - Design System

## Overview

This design system is built on **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**. It's optimized for the logistics workflow: minimizing time-to-decision for dispatchers, minimizing taps for drivers, and keeping customers informed in real-time.

## Design Principles

1. **Speed First**: Minimize cognitive load and interaction steps for all user roles
2. **Clarity**: Clear visual hierarchy and status communication
3. **Accessibility**: WCAG AA compliance with keyboard-first navigation
4. **Consistency**: Unified component library across all views
5. **Real-time Ready**: Design prepared for live updates and notifications (Milestone 3)

---

## Color System

### Semantic Colors

All colors use CSS variables defined in `app/globals.css` for easy theming.

| Token | Usage | HSL Value (Light) | Example |
|-------|-------|------------------|---------|
| `--primary` | Primary actions, headers | `215.4 16.3% 46.9%` (Slate 600) | Buttons, links |
| `--accent` | Call-to-action, active states | `199.3 89.1% 48.2%` (Sky 600) | Primary buttons, active indicators |
| `--success` | Success states, delivered orders | `142.1 76.2% 36.3%` (Emerald 600) | Completed badges, checkmarks |
| `--warning` | Pending states, alerts | `32.1 94.6% 43.7%` (Amber 600) | Pending badges, warnings |
| `--destructive` | Errors, cancellations | `346.8 77.2% 49.8%` (Rose 600) | Canceled badges, delete actions |
| `--muted` | Backgrounds, disabled states | `210 40% 96.1%` (Slate 50) | Card backgrounds, disabled UI |
| `--border` | Borders, separators | `214.3 31.8% 91.4%` (Slate 200) | Dividers, card outlines |

### Usage Examples

```tsx
// Using semantic color classes
<Button variant="accent">Primary Action</Button>
<Badge variant="success">Delivered</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Canceled</Badge>

// Direct Tailwind classes
<div className="bg-accent text-accent-foreground">...</div>
<div className="border-border bg-muted">...</div>
```

---

## Typography

### Font Family

**Inter** is the primary font family, loaded via system fonts with fallbacks:

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-display` | 30px | 1.2 | 600 | Page titles, hero headings |
| `text-heading-lg` | 24px | 1.3 | 600 | Section headings |
| `text-heading-md` | 18px | 1.4 | 600 | Card titles, subsections |
| `text-body-lg` | 16px | 1.5 | 400 | Large body text, descriptions |
| `text-body` | 14px | 1.5 | 400 | Default body text |

### Usage Examples

```tsx
<h1 className="text-display font-semibold">Page Title</h1>
<h2 className="text-heading-lg font-semibold">Section Heading</h2>
<h3 className="text-heading-md font-semibold">Card Title</h3>
<p className="text-body-lg text-muted-foreground">Large description text</p>
<p className="text-body">Default body text</p>
```

---

## Spacing Scale

Consistent spacing scale based on 4px increments:

| Token | Value | Usage |
|-------|-------|-------|
| `4` | 16px | Compact spacing, inline elements |
| `6` | 24px | Card padding, section gaps |
| `8` | 32px | Large section spacing |
| `12` | 48px | Extra-large gaps |
| `16` | 64px | Page section dividers |
| `24` | 96px | Major layout sections |

### Usage Examples

```tsx
<div className="space-y-6">...</div>        // 24px vertical spacing
<div className="p-6">...</div>              // 24px padding
<div className="gap-4">...</div>            // 16px gap in flex/grid
<div className="mb-8">...</div>             // 32px margin bottom
```

---

## Border Radius

Consistent rounded corners for modern, friendly UI:

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-2xl` | 16px | Cards, buttons, inputs (default) |
| `rounded-xl` | 12px | Smaller elements, badges |
| `rounded-full` | 9999px | Circular elements, status indicators |

### Usage Examples

```tsx
<Card className="rounded-2xl">...</Card>
<Button className="rounded-2xl">...</Button>
<Badge className="rounded-full">...</Badge>
<Avatar className="rounded-full">...</Avatar>
```

---

## Shadows

Soft, subtle shadows for depth:

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-soft-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)` | Cards, dropdowns |
| `shadow-soft-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)` | Modals, elevated cards |

---

## Components

### Core Components (shadcn/ui)

Located in `app/components/ui/`:

- **Button**: Primary UI action with variants (default, accent, success, warning, destructive, outline, ghost)
- **Card**: Container component with header, content, and footer sections
- **Badge**: Status indicator with semantic color variants
- **Input**: Form input with consistent styling
- **Select**: Dropdown selection with Radix UI primitives
- **Table**: Data table with header, body, and footer
- **Dialog**: Modal overlay for confirmations and forms
- **Label**: Form label with accessibility support
- **Separator**: Horizontal/vertical divider
- **Skeleton**: Loading placeholder

### Shared Components

Located in `app/components/shared/`:

#### StatusBadge

```tsx
import { StatusBadge } from '@/app/components/shared/StatusBadge';

<StatusBadge status="Delivered" />
<StatusBadge status="InTransit" />
<StatusBadge status="Canceled" />
```

**Status Colors:**
- `Draft`, `AwaitingPayment`, `ReadyForDispatch` → warning (amber)
- `Assigned`, `Accepted`, `PickedUp`, `InTransit` → accent (sky)
- `Delivered` → success (emerald)
- `Canceled` → destructive (rose)

#### PageHeader

```tsx
import { PageHeader } from '@/app/components/shared/PageHeader';

<PageHeader
  title="Dispatcher Dashboard"
  description="Manage orders and assign drivers"
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'Dispatcher' },
  ]}
  action={<Button>Primary Action</Button>}
/>
```

#### OrderCard

```tsx
import { OrderCard } from '@/app/components/shared/OrderCard';

<OrderCard
  order={order}
  href={`/track/${order.id}`}
  testId="order-card"
/>
```

#### EmptyState

```tsx
import { EmptyState } from '@/app/components/shared/EmptyState';
import { Package } from 'lucide-react';

<EmptyState
  icon={Package}
  title="No orders found"
  description="Orders will appear here once created"
  action={<Button>Create Order</Button>}
/>
```

#### LoadingState

```tsx
import { LoadingState } from '@/app/components/shared/LoadingState';

<LoadingState message="Loading orders..." />
```

---

## Layout & Grid

### Container

```tsx
<div className="container max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
  {/* Customer views: max-w-[1200px] */}
</div>

<div className="container max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
  {/* Operations views: max-w-[1600px] (fluid) */}
</div>
```

### Responsive Grid

```tsx
// 12-column responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">{/* Main content */}</div>
  <div className="lg:col-span-1">{/* Sidebar */}</div>
</div>
```

---

## Icons

Using **Lucide React** for consistent, modern icons:

```tsx
import { Package, TruckIcon, User, MapPin, Phone, Mail } from 'lucide-react';

<Package className="h-5 w-5 text-accent" />
<TruckIcon className="h-6 w-6" />
```

### Common Icon Sizes

- `h-4 w-4` (16px): Inline with text, buttons
- `h-5 w-5` (20px): Section headers, card titles
- `h-6 w-6` (24px): Large icons, stats
- `h-8 w-8` (32px): Hero icons, empty states

---

## Accessibility

### Focus States

All interactive elements have visible focus rings:

```tsx
// Automatic via focus-visible
<Button>Click Me</Button>  // Has built-in focus ring

// Custom focus ring
<div className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
  ...
</div>
```

### Hit Targets

Minimum touch target size: **44px** (WCAG 2.1 Level AAA)

```tsx
// Buttons default to h-11 (44px)
<Button size="default">...</Button>  // 44px height

// Large buttons for critical actions
<Button size="lg">...</Button>       // 48px height
```

### Keyboard Navigation

- All forms are keyboard accessible
- Tab order follows visual hierarchy
- Escape closes modals and dropdowns
- Enter/Space activates buttons

### Screen Readers

- Semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- ARIA labels on icons-only buttons
- `data-testid` attributes for testing

```tsx
<Button aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>

<Card data-testid="order-card">...</Card>
```

---

## State Management

### Loading States

```tsx
import { LoadingState } from '@/app/components/shared/LoadingState';
import { Skeleton } from '@/app/components/ui/skeleton';

// Full page loading
{isLoading && <LoadingState />}

// Skeleton placeholders
<Skeleton className="h-8 w-full" />
```

### Empty States

```tsx
import { EmptyState } from '@/app/components/shared/EmptyState';

{orders.length === 0 && (
  <EmptyState
    icon={Package}
    title="No orders found"
    description="Create your first order to get started"
  />
)}
```

### Error States

```tsx
<Card className="border-destructive/50 bg-destructive/5">
  <CardContent className="p-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-destructive" />
      <div>
        <h4 className="text-sm font-medium text-destructive">Error</h4>
        <p className="text-sm text-destructive/90">{error.message}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## User Role Optimizations

### Dispatcher: Minimize Time-to-Decision

- **Stats cards** at top for quick overview
- **Table layout** for dense information display
- **Inline driver assignment** with select + button
- **Color-coded badges** for instant status recognition

### Driver: Minimize Taps

- **Large tap targets** (48px buttons)
- **Single-tap status progression** (one button per order)
- **Customer contact** prominently displayed
- **Card-based layout** for touch-friendly UI

### Customer: Real-time Information

- **Progress tracker** with visual steps
- **Active order cards** for quick access
- **Real-time status badges**
- **Live map placeholder** (ready for M3)

---

## Responsive Breakpoints

Following Tailwind's default breakpoints:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Small tablets, large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small desktops, large tablets |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

### Mobile-First Approach

```tsx
// Mobile: stack vertically
// Desktop: side-by-side
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
</div>

// Hide on mobile, show on desktop
<div className="hidden lg:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="lg:hidden">Mobile only</div>
```

---

## Testing & Test IDs

All major UI elements include `data-testid` attributes:

```tsx
<div data-testid="dispatcher-dashboard">...</div>
<Card data-testid={`order-card-${order.id}`}>...</Card>
<Button data-testid={`assign-button-${order.id}`}>Assign</Button>
```

---

## Future Enhancements (Milestone 3)

### Real-time Updates

- **Live badge**: `<Badge variant="accent">🔴 Live</Badge>`
- **Passive refresh**: Auto-update without page reload
- **WebSocket integration**: Real-time order status changes

### Notifications

- **Toast component**: For success/error messages
- **Push notifications**: For drivers
- **SMS notifications**: For customers

### Map Integration

- **Google Maps embed**: Live driver tracking
- **Route polyline**: Pickup → Dropoff visualization
- **Driver location marker**: Real-time position updates

---

## Code Style Guidelines

### Component Structure

```tsx
'use client';  // If using hooks or client-side features

import { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  title: string;
  description?: string;
  className?: string;
}

export function MyComponent({ title, description, className }: MyComponentProps) {
  return (
    <div className={cn("base-classes", className)}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
```

### Utility Classes Order

1. Layout (display, position)
2. Sizing (width, height)
3. Spacing (margin, padding)
4. Typography (font, text)
5. Visual (color, background, border)
6. Effects (shadow, opacity, transform)

```tsx
<div className="flex items-center justify-between w-full p-6 text-sm font-medium bg-card border rounded-2xl shadow-soft-md">
  ...
</div>
```

---

## Resources

- **shadcn/ui Docs**: https://ui.shadcn.com/
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev/
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

---

## Changelog

### v1.0.0 (Current)
- Initial design system implementation
- Core component library (Button, Card, Badge, etc.)
- Shared components (StatusBadge, PageHeader, etc.)
- Complete refactor of all dashboards
- Responsive layouts for all user roles
- Accessibility compliance (WCAG AA)

### Planned (Milestone 3)
- Toast notification component
- Real-time update indicators
- Map integration components
- Advanced table features (sorting, filtering)
- Dark mode support

