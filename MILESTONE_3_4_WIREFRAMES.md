# Milestones 3 & 4 - Wireframes and Technical Planning

## 🎯 Overview

This document outlines the wireframes, user stories, and technical implementation plans for the next phases of the Preferred Solutions Transport platform.

---

## 🚀 Milestone 3: Real-Time & Notifications

### Core Features
- WebSocket integration for live updates
- Push notifications for drivers
- SMS notifications for customers
- Email receipts and invoices
- Real-time map tracking

### User Stories

#### US3.1: Real-Time Order Status Updates
**As a customer,** I want to see live updates of my delivery status without refreshing the page, **so that** I know exactly where my package is at all times.

**Acceptance Criteria:**
- Order status updates appear instantly on tracking page
- Delivery progress shows in real-time
- Driver location updates every 30 seconds
- Works on mobile and desktop

#### US3.2: Driver Push Notifications
**As a driver,** I want to receive push notifications for new orders and updates, **so that** I can respond quickly to dispatch requests.

**Acceptance Criteria:**
- New order assignments trigger push notification
- Order modifications notify assigned driver
- Works with browser notifications and mobile PWA
- Can be enabled/disabled in driver settings

#### US3.3: Customer SMS Notifications
**As a customer,** I want to receive SMS updates about my delivery, **so that** I don't need to constantly check the website.

**Acceptance Criteria:**
- SMS sent when order is assigned to driver
- SMS sent when driver picks up the package
- SMS sent when package is delivered
- SMS includes tracking link
- Opt-out option available

#### US3.4: Live Map Tracking
**As a customer,** I want to see my driver's location on a map in real-time, **so that** I can prepare for the delivery.

**Acceptance Criteria:**
- Map shows driver's current location
- Estimated arrival time updates based on traffic
- Route visualization from pickup to delivery
- Works on mobile devices

#### US3.5: Automated Email Receipts
**As a customer,** I want to receive a professional email receipt after delivery, **so that** I have documentation for my records.

**Acceptance Criteria:**
- Email sent automatically upon delivery confirmation
- Includes order details, pricing breakdown, and delivery proof
- Professional branding and formatting
- PDF attachment option

---

### Wireframes - Milestone 3

#### 3.1: Enhanced Order Tracking Page (`/track/[orderId]`)

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Preferred Solutions Transport            [Live] 🟢   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Order #12345 - Live Tracking                               │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    📍 Live Map                          │ │
│ │  [Driver Icon] ←── Current Location                     │ │
│ │      │                                                  │ │
│ │      ▼ ETA: 15 minutes                                 │ │
│ │  [Delivery Pin] ←── Your Address                       │ │
│ │                                                        │ │
│ │  Route: 2.3 miles remaining                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Status Timeline (Live Updates):                             │
│ ✅ Order Placed         - 2:30 PM                          │
│ ✅ Driver Assigned      - 2:45 PM                          │
│ ✅ Package Picked Up    - 3:15 PM                          │
│ 🚛 In Transit          - 3:45 PM (Current)                 │
│ ⏳ Delivered           - ETA 4:00 PM                       │
│                                                             │
│ Driver: John Smith 📱 (555) 123-4567                       │
│ Vehicle: White Ford Transit (ABC-1234)                     │
│                                                             │
│ 🔔 Get SMS updates: [Enable Notifications]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2: Driver Dashboard with Push Notifications (`/driver`)

```
┌─────────────────────────────────────────────────────────────┐
│ Driver Dashboard - John Smith          🔔 Notifications: ON │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🚨 NEW ORDER ALERT! [Dismiss] [Accept] [View Details]      │
│                                                             │
│ Current Orders (2):                                         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Order #12345 - IN TRANSIT                               │ │
│ │ Pickup: 123 Main St → Delivery: 456 Oak Ave            │ │
│ │ Customer: Jane Doe | Phone: (555) 987-6543             │ │
│ │                                                         │ │
│ │ 📍 Share Location: [ON] | ETA: 15 minutes               │ │
│ │                                                         │ │
│ │ [Mark as Delivered] [Contact Customer] [View Route]     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Order #12346 - ASSIGNED                                 │ │
│ │ Pickup: 789 Pine St → Delivery: 321 Elm Dr             │ │
│ │ Customer: Bob Wilson | Phone: (555) 456-7890           │ │
│ │                                                         │ │
│ │ [Accept Order] [Decline] [View Details]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Notification Settings:                                      │
│ ✅ New Orders    ✅ Order Updates    ✅ Customer Messages   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3: Customer SMS & Email Flow

**SMS Templates:**
```
🚛 Your delivery #12345 has been assigned to driver John Smith. 
Track live: https://app.com/track/12345
Reply STOP to opt out.

📦 Your package has been picked up and is on the way! 
ETA: 4:00 PM. Track: https://app.com/track/12345

✅ Delivered! Your package was delivered at 3:58 PM. 
Receipt: https://app.com/receipt/12345
```

**Email Receipt Template:**
```
Subject: Delivery Complete - Order #12345 Receipt

[Professional Header with Logo]

Thank you for choosing Preferred Solutions Transport!

Order Details:
- Order #12345
- Delivered: March 15, 2025 at 3:58 PM
- From: 123 Main St, City, ST
- To: 456 Oak Ave, City, ST
- Distance: 5.2 miles

Pricing Breakdown:
- Base Fee: $50.00
- Distance (5.2 mi × $2.00): $10.40
- Fuel Surcharge (10%): $6.04
- Total: $66.44

Driver: John Smith
Vehicle: White Ford Transit (ABC-1234)

[Delivery Proof Photo]
[Customer Signature]

Questions? Reply to this email or call (555) 123-MOVE
```

---

## 📊 Milestone 4: Analytics & Optimization

### Core Features
- Revenue analytics dashboard
- Driver performance metrics
- Customer behavior analysis
- Route optimization
- Pricing optimization tools

### User Stories

#### US4.1: Revenue Analytics Dashboard
**As an admin,** I want to see comprehensive revenue analytics, **so that** I can make informed business decisions.

**Acceptance Criteria:**
- Daily, weekly, monthly revenue charts
- Revenue by service type and geographic area
- Profit margin analysis
- Year-over-year growth comparisons
- Exportable reports (PDF/CSV)

#### US4.2: Driver Performance Metrics
**As a dispatcher,** I want to see driver performance data, **so that** I can optimize assignments and identify training needs.

**Acceptance Criteria:**
- On-time delivery rates per driver
- Average delivery time comparisons
- Customer satisfaction scores
- Route efficiency metrics
- Driver utilization rates

#### US4.3: Customer Behavior Analysis
**As an admin,** I want to understand customer patterns, **so that** I can improve service and pricing.

**Acceptance Criteria:**
- Repeat customer identification
- Peak demand time analysis
- Geographic demand heatmaps
- Service type preferences
- Customer lifetime value calculations

#### US4.4: Route Optimization
**As a dispatcher,** I want automated route suggestions, **so that** I can minimize delivery times and costs.

**Acceptance Criteria:**
- Multi-stop route optimization
- Traffic-aware route planning
- Driver location-based assignments
- Fuel cost optimization
- Integration with Google Maps

#### US4.5: Dynamic Pricing Optimization
**As an admin,** I want data-driven pricing recommendations, **so that** I can maximize revenue while staying competitive.

**Acceptance Criteria:**
- Demand-based pricing suggestions
- Competitor pricing analysis
- Seasonal pricing adjustments
- A/B testing for pricing strategies
- ROI impact projections

---

### Wireframes - Milestone 4

#### 4.1: Analytics Dashboard (`/admin/analytics`)

```
┌─────────────────────────────────────────────────────────────┐
│ Analytics Dashboard                      📊 Export Reports  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📈 Revenue Overview (Last 30 Days)                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │     $15,000 ┌─┐                                         │ │
│ │     $10,000 │ │ ┌─┐                                     │ │
│ │      $5,000 │ │ │ │ ┌─┐ ┌─┐                             │ │
│ │          $0 └─┘ └─┘ └─┘ └─┘ ┌─┐ ┌─┐                     │ │
│ │             W1  W2  W3  W4  W5  W6                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Key Metrics:                                                │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │   Revenue   │ │   Orders    │ │ Avg Order  │ │ Margin  │ │
│ │   $45,230   │ │     847     │ │   $53.40   │ │  23.5%  │ │
│ │   ▲ 12.3%   │ │   ▲ 8.7%    │ │   ▲ 3.2%   │ │ ▼ 1.8%  │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
│                                                             │
│ 🚛 Driver Performance                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Driver        │ Orders │ On-Time % │ Avg Time │ Rating  │ │
│ │ John Smith    │   45   │   96.7%   │  22 min  │ ⭐4.9   │ │
│ │ Sarah Johnson │   38   │   94.2%   │  25 min  │ ⭐4.8   │ │
│ │ Mike Davis    │   42   │   91.8%   │  28 min  │ ⭐4.7   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 📍 Geographic Analysis                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                   Heat Map                              │ │
│ │  🔥🔥🔥 Downtown (35%)     🔥🔥 Suburbs (28%)           │ │
│ │  🔥 Industrial (15%)      🔥 Residential (22%)          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2: Route Optimization Interface (`/dispatcher/optimize`)

```
┌─────────────────────────────────────────────────────────────┐
│ Route Optimization - Dispatch Planning                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Active Orders (12) | Available Drivers (5)                 │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    📍 Route Map                         │ │
│ │                                                         │ │
│ │  🚛 John Smith                                          │ │
│ │    └─ Order #123 → Order #124 → Order #125             │ │
│ │       Est. Time: 2.5 hrs | Distance: 45 mi             │ │
│ │                                                         │ │
│ │  🚛 Sarah Johnson                                       │ │
│ │    └─ Order #126 → Order #127                          │ │
│ │       Est. Time: 1.8 hrs | Distance: 32 mi             │ │
│ │                                                         │ │
│ │  [Optimize Routes] [Manual Assignment] [Refresh]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Optimization Results:                                       │
│ ✅ 23% reduction in total drive time                        │
│ ✅ $145 fuel cost savings                                   │
│ ✅ All deliveries within SLA                               │
│                                                             │
│ Unassigned Orders (3):                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #128 | Downtown → Suburbs | Priority: High | 2.1 mi    │ │
│ │ #129 | Airport → Downtown | Priority: Normal | 8.7 mi  │ │
│ │ #130 | Mall → Residential | Priority: Low | 4.2 mi     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Auto-Assign Remaining] [Notify Drivers] [Export Plan]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3: Pricing Optimization Dashboard (`/admin/pricing`)

```
┌─────────────────────────────────────────────────────────────┐
│ Dynamic Pricing Optimization                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Current Pricing Model:                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Base Fee: $50.00                                        │ │
│ │ Per Mile: $2.00                                         │ │
│ │ Fuel Surcharge: 10%                                     │ │
│ │ Rush Hour Multiplier: 1.25x (4-6 PM)                   │ │
│ │ Weekend Premium: $10.00                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 📊 Pricing Performance (Last 30 Days):                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Avg Order Value: $53.40 (Target: $55.00)               │ │
│ │ Conversion Rate: 78.5% (Industry: 72%)                 │ │
│ │ Price Sensitivity: Medium                               │ │
│ │ Competitor Gap: +$2.30 (5% premium)                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🎯 Optimization Recommendations:                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ Increase per-mile rate to $2.10 (+5% revenue)        │ │
│ │ ⚠️ Reduce base fee to $48 during off-peak hours        │ │
│ │ 📈 Add distance-based tiers (0-5mi, 5-15mi, 15+mi)     │ │
│ │ 🕐 Implement dynamic surge pricing (1.1x-1.5x)         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ A/B Testing:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Test A (Current): $50 base + $2.00/mi                  │ │
│ │ Test B (New): $48 base + $2.10/mi                      │ │
│ │                                                         │ │
│ │ Results after 100 orders each:                         │ │
│ │ Test A: 76% conversion, $52.80 avg                     │ │
│ │ Test B: 82% conversion, $54.20 avg (+8.2% revenue)     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Apply Recommendations] [Start New A/B Test] [Export Data] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technical Implementation Plan

### Milestone 3 Technical Stack

#### Real-Time Updates
- **WebSocket Server**: Socket.io or Supabase Realtime
- **Client Updates**: React hooks for real-time subscriptions
- **Database Triggers**: PostgreSQL triggers to emit events

#### Push Notifications
- **Web Push API**: For browser notifications
- **PWA Support**: Service worker for mobile-like experience
- **Notification Service**: Firebase Cloud Messaging or OneSignal

#### SMS Integration
- **SMS Provider**: Twilio or AWS SNS
- **Templates**: Configurable message templates
- **Opt-out Management**: Database tracking of preferences

#### Email System
- **Email Service**: SendGrid or AWS SES
- **Templates**: HTML email templates with branding
- **PDF Generation**: Puppeteer or jsPDF for receipts

#### Live Tracking
- **Geolocation API**: Browser geolocation for drivers
- **Map Integration**: Google Maps JavaScript API
- **Route Calculation**: Google Directions API
- **Location Updates**: WebSocket for real-time position sharing

### Milestone 4 Technical Stack

#### Analytics Engine
- **Data Warehouse**: Supabase with analytics views
- **Visualization**: Chart.js or D3.js
- **Export**: CSV/PDF generation
- **Caching**: Redis for performance

#### Route Optimization
- **Optimization Algorithm**: Google OR-Tools or custom solution
- **Traffic Data**: Google Maps Traffic API
- **Multi-objective**: Time, distance, and cost optimization
- **Real-time Updates**: Dynamic re-routing based on conditions

#### Machine Learning (Future)
- **Demand Forecasting**: TensorFlow.js or Python backend
- **Price Optimization**: A/B testing framework
- **Customer Segmentation**: Clustering algorithms
- **Predictive Analytics**: Delivery time estimation

---

## 📋 Implementation Priority

### Phase 3A (Weeks 1-2)
1. WebSocket integration for real-time updates
2. Basic push notifications
3. SMS notification system

### Phase 3B (Weeks 3-4)
1. Live map tracking
2. Email receipt system
3. Mobile PWA enhancements

### Phase 4A (Weeks 5-6)
1. Analytics dashboard foundation
2. Basic driver performance metrics
3. Revenue reporting

### Phase 4B (Weeks 7-8)
1. Route optimization
2. Pricing optimization tools
3. Advanced analytics features

---

## 🔧 Database Schema Extensions

### New Tables for Milestone 3
```sql
-- Real-time subscriptions
CREATE TABLE realtime_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  order_id uuid REFERENCES orders(id),
  subscription_type text NOT NULL, -- 'tracking', 'driver_updates'
  endpoint text, -- for push notifications
  created_at timestamptz DEFAULT now()
);

-- SMS preferences
CREATE TABLE sms_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  phone text NOT NULL,
  opted_in boolean DEFAULT true,
  preferences jsonb DEFAULT '{}', -- notification types
  created_at timestamptz DEFAULT now()
);

-- Email templates
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL, -- 'receipt', 'notification'
  subject text NOT NULL,
  html_content text NOT NULL,
  variables jsonb DEFAULT '[]', -- template variables
  created_at timestamptz DEFAULT now()
);

-- Driver locations (for live tracking)
CREATE TABLE driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id),
  order_id uuid REFERENCES orders(id),
  latitude decimal NOT NULL,
  longitude decimal NOT NULL,
  accuracy decimal,
  heading decimal,
  speed decimal,
  timestamp timestamptz DEFAULT now()
);
```

### New Tables for Milestone 4
```sql
-- Analytics cache
CREATE TABLE analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- A/B testing
CREATE TABLE ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  variants jsonb NOT NULL, -- test configurations
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  status text DEFAULT 'active',
  results jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Pricing rules
CREATE TABLE pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  conditions jsonb NOT NULL, -- distance, time, location conditions
  adjustments jsonb NOT NULL, -- price modifications
  priority integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Route optimizations
CREATE TABLE route_optimizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_date date NOT NULL,
  input_orders jsonb NOT NULL,
  optimized_routes jsonb NOT NULL,
  savings_data jsonb NOT NULL, -- time, distance, cost savings
  created_at timestamptz DEFAULT now()
);
```

---

This wireframing and planning document provides a comprehensive roadmap for implementing the next phases of your delivery platform. Each feature is backed by user stories, detailed wireframes, and technical implementation plans.
