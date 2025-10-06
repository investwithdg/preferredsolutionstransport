# Wireframes & High-Fidelity Design Specs

## Overview

This document outlines the UI/UX design for Preferred Solutions Transport across all user roles. Each screen is optimized for its specific user workflow.

---

## 1. Customer Journey

### 1.1 Homepage (`/`)

**Purpose**: Marketing landing page to drive quote requests

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ HEADER: Logo | Request Quote (CTA)                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│           HERO SECTION                              │
│   "Professional Delivery Services"                  │
│   [Request a Quote] (large accent button)          │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│     FEATURES (3-column grid)                        │
│  [Icon] Easy Pickup  [Icon] Fast  [Icon] Secure    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│     STATS (3-column)                                │
│   500+ Deliveries | 98% On-Time | 4.9★ Rating     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│     CTA: "Ready to get started?"                    │
│     [Request a Quote]                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key Elements**:
- Hero with background gradient
- Large, prominent CTA button (accent color)
- Icon cards for features
- Stats section with numbers
- Secondary CTA at bottom

---

### 1.2 Quote Request (`/quote`)

**Purpose**: Capture delivery details and proceed to payment

**Layout** (Desktop):
```
┌────────────────────────────────┬──────────────────┐
│ CUSTOMER INFO CARD             │ PRICE BREAKDOWN  │
│ ┌────────────┬───────────────┐ │ ┌──────────────┐ │
│ │ Name *     │ Email *       │ │ │ Base: $50.00 │ │
│ └────────────┴───────────────┘ │ │ Miles: $40.00│ │
│ Phone (optional)                │ │ Fuel: $9.00  │ │
│                                 │ ├──────────────┤ │
│ DELIVERY DETAILS CARD           │ │ Total: $99   │ │
│ Pickup Address * (autocomplete) │ └──────────────┘ │
│ Dropoff Address * (autocomplete)│                  │
│ ┌────────────┬───────────────┐ │ [Continue to   │ │
│ │ Distance * │ Weight (opt)  │ │  Payment]      │ │
│ └────────────┴───────────────┘ │ (accent button) │
└────────────────────────────────┴──────────────────┘
```

**Key Elements**:
- Two-column layout (form left, pricing right)
- Sticky pricing sidebar on desktop
- Google Maps Autocomplete for addresses
- Auto-calculated distance with visual feedback
- Real-time price breakdown
- Large "Continue to Payment" button

**States**:
- Loading: "Calculating distance..." (with spinner)
- Success: "✓ Distance calculated automatically" (green text)
- Error: "⚠ Could not calculate distance" (amber text)

---

### 1.3 Order Tracking (`/track/[orderId]`)

**Purpose**: Real-time order tracking for customers

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Track Your Order                    [Status Badge]  │
│ Order #12345678                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│          PROGRESS TRACKER                           │
│   ●──────●──────●──────●──────○                    │
│  Ready  Assigned Picked  Transit Delivered          │
│                     Up                              │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┬──────────────┬──────────────┐    │
│  │ DELIVERY     │ DRIVER INFO  │ ORDER        │    │
│  │ INFO         │              │ SUMMARY      │    │
│  │ Pickup: ...  │ Name: John   │ Total: $99   │    │
│  │ Dropoff: ... │ Phone: ...   │ Date: ...    │    │
│  │ 20 miles     │              │              │    │
│  └──────────────┴──────────────┴──────────────┘    │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ACTIVITY TIMELINE                                  │
│  ● Payment Received         12:00 PM                │
│  │                                                  │
│  ● Driver Assigned          12:05 PM                │
│  │                                                  │
│  ● Package Picked Up        12:30 PM                │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [MAP PLACEHOLDER - Coming in M3]                   │
│  "Live Map Tracking - Coming Soon"                  │
└─────────────────────────────────────────────────────┘
```

**Key Elements**:
- Visual progress tracker (5 steps)
- Gradient progress bar
- Three-column info cards
- Activity timeline (vertical)
- Map placeholder for M3
- Customer support banner at bottom

---

### 1.4 Customer Dashboard (`/customer/dashboard`)

**Purpose**: View active and past orders

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Welcome back, John!      [Request New Quote] (CTA)  │
│ Track your deliveries                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  STATS (3-column)                                   │
│  [2] Active  [15] Completed  [17] Total Orders     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ACTIVE ORDERS (2)                                  │
│  ┌─────────┬─────────┬─────────┐                   │
│  │ Order   │ Order   │ Order   │ (card grid)       │
│  │ Card 1  │ Card 2  │ Card 3  │                   │
│  │ $99.00  │ $150.00 │ $75.00  │                   │
│  │ [Track] │ [Track] │ [Track] │                   │
│  └─────────┴─────────┴─────────┘                   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ORDER HISTORY                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ Order ID | Route | Status | Amount | Date  │    │
│  ├────────────────────────────────────────────┤    │
│  │ #12345   │ A→B  │ [Done] │ $99   │ Jan 5  │    │
│  │ #12344   │ C→D  │ [Done] │ $150  │ Jan 3  │    │
│  │ ...                                        │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Key Elements**:
- Personalized greeting
- Stats cards (active, completed, total)
- Card grid for active orders (3-column, responsive)
- Data table for past orders
- Quick "Request New Quote" CTA

---

## 2. Dispatcher Dashboard (`/dispatcher`)

**Purpose**: Minimize time-to-decision for order assignment

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Dispatch Queue                                      │
│ Assign incoming orders to available drivers         │
├─────────────────────────────────────────────────────┤
│  STATS (4-column)                                   │
│  [5] Pending  [3] Available  [2] Busy  [5] Total   │
│      Orders       Drivers     Drivers   Drivers    │
├─────────────────────────────────────────────────────┤
│  ORDERS TABLE                                       │
│  ┌───────────────────────────────────────────────┐ │
│  │ Order | Customer | Route | Total | Actions   │ │
│  ├───────────────────────────────────────────────┤ │
│  │ #123  │ John Doe │ A→B  │ $99  │ [Select   │ │
│  │ 20 mi │ john@... │      │      │  Driver▼] │ │
│  │       │ 555-1234 │      │      │ [Assign]  │ │
│  ├───────────────────────────────────────────────┤ │
│  │ #124  │ Jane     │ C→D  │ $150 │ ...       │ │
│  │ ...                                           │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Key Elements**:
- Stats dashboard at top (pending, available, busy, total)
- Dense table layout for quick scanning
- Inline driver selection (dropdown + assign button)
- Color-coded driver availability (✓ green for available)
- Distance and pricing visible at a glance
- Large table with all order details

**Optimization**:
- Single row per order (no expanding)
- Dropdown pre-populates available drivers
- One-click assign action
- Auto-refresh on assignment (optimistic UI)

---

## 3. Driver Dashboard (`/driver`)

**Purpose**: Minimize taps for status updates

**Layout** (Mobile-optimized):
```
┌─────────────────────────────────┐
│ Driver Dashboard                │
│ [Select Driver▼] (demo mode)   │
├─────────────────────────────────┤
│  ACTIVE ORDERS (2)              │
│  ┌─────────────────────────────┐│
│  │ Order #12345   [InTransit]  ││
│  │ ┌─────────────┬───────────┐ ││
│  │ │ CUSTOMER    │ DELIVERY  │ ││
│  │ │ John Doe    │ Pickup:   │ ││
│  │ │ john@...    │ 123 Main  │ ││
│  │ │ 📞 Call     │ Dropoff:  │ ││
│  │ │             │ 456 Oak   │ ││
│  │ │             │ 20 mi     │ ││
│  │ └─────────────┴───────────┘ ││
│  │                             ││
│  │      [Mark Delivered]       ││
│  │    (large accent button)    ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Order #12346 ...            ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  COMPLETED ORDERS (5)           │
│  (Collapsed list view)          │
└─────────────────────────────────┘
```

**Key Elements**:
- Card-based layout (touch-friendly)
- Large, single-action button (48px height)
- Customer info with quick-call link
- Delivery addresses prominently displayed
- Status progression: Assigned → Accepted → PickedUp → InTransit → Delivered
- Completed orders collapsed for quick reference

**Optimization**:
- One button per order (next status action)
- Large tap targets (≥44px)
- Customer phone number as clickable link
- Minimal scrolling (active orders prioritized)

---

## 4. Admin Dashboard (`/admin`)

**Purpose**: System management and reporting

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Admin Dashboard                                     │
│ ┌─────┬─────┬─────┬─────┬──────┐ (tabs)           │
│ │Over-│Users│Driv-│Ord- │Pric- │                   │
│ │view │     │ers  │ers  │ing   │                   │
│ └─────┴─────┴─────┴─────┴──────┘                   │
├─────────────────────────────────────────────────────┤
│  [OVERVIEW TAB]                                     │
│                                                     │
│  STATS (5-column)                                   │
│  [100] Orders | [$10k] Revenue | [15] Active |     │
│  [5] Drivers | [25] Users                          │
│                                                     │
│  RECENT ORDERS TABLE                                │
│  ┌───────────────────────────────────────────────┐ │
│  │ Order | Customer | Driver | Status | Amount  │ │
│  ├───────────────────────────────────────────────┤ │
│  │ #123  │ John     │ Mike   │ [Done] │ $99    │ │
│  │ ...                                           │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Tabs**:
1. **Overview**: Stats + recent orders table
2. **Users**: User management table (email, role, created, actions)
3. **Drivers**: Driver management table (name, phone, vehicle, active orders)
4. **Orders**: Full order history table (all columns)
5. **Pricing**: Pricing configuration (base fee, per-mile, fuel surcharge)

**Key Elements**:
- Tab navigation at top
- Stats dashboard on Overview tab
- Data tables with actions (Edit, Delete)
- "Add User" / "Add Driver" CTAs
- Pricing configuration form (disabled for now, "Coming Soon")

---

## 5. Design Patterns

### Status Badges

```
[ReadyForDispatch] - Amber/Warning
[Assigned] - Sky/Accent
[PickedUp] - Sky/Accent
[InTransit] - Sky/Accent
[Delivered] - Emerald/Success
[Canceled] - Rose/Destructive
```

### Button Hierarchy

1. **Primary (Accent)**: Main CTA, critical actions
   - "Continue to Payment"
   - "Assign Driver"
   - "Mark Delivered"

2. **Secondary (Outline)**: Less critical actions
   - "View Details"
   - "Edit"

3. **Ghost**: Tertiary actions
   - "Cancel"
   - Table row actions

### Card Layouts

**Info Card** (3-column for tracking):
```
┌──────────────┐
│ 📦 Icon      │
│ Title        │
│ Detail 1     │
│ Detail 2     │
└──────────────┘
```

**Order Card** (customer dashboard):
```
┌──────────────┐
│ #123 [Status]│
│ From: A      │
│ To: B        │
│ Driver: John │
│ $99.00 [→]   │
└──────────────┘
```

### Empty States

All empty states follow this pattern:
```
┌──────────────┐
│   [Icon]     │
│              │
│ "No items"   │
│ Description  │
│              │
│ [CTA Button] │
└──────────────┘
```

### Loading States

- **Full page**: `<LoadingState message="..." />`
- **Skeleton**: `<Skeleton className="h-8 w-full" />`
- **Inline**: `<Loader2 className="animate-spin" />`

---

## 6. Responsive Behavior

### Mobile (<768px)
- Single column layouts
- Stacked cards
- Full-width buttons
- Simplified tables (or card view)
- Bottom navigation for key actions

### Tablet (768px - 1024px)
- 2-column layouts
- Condensed spacing
- Side-by-side forms

### Desktop (>1024px)
- 3-column layouts
- Sidebar layouts (quote page)
- Full data tables
- Sticky headers/sidebars

---

## 7. Animation & Transitions

- **Hover**: `transition-colors` on buttons, links
- **Focus**: Ring animation (`ring-2 ring-accent`)
- **Loading**: Spinner rotation (`animate-spin`)
- **Slide-in**: Modal overlays (via Radix UI)
- **Fade**: Toast notifications (M3)

---

## 8. Test IDs

All major elements have `data-testid` for E2E testing:

- `data-testid="dispatcher-dashboard"`
- `data-testid="order-row-{orderId}"`
- `data-testid="driver-select-{orderId}"`
- `data-testid="assign-button-{orderId}"`
- `data-testid="order-card-{orderId}"`

---

This wireframe document serves as the single source of truth for UI implementation across all user roles.

