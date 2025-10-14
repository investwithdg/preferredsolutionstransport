# Demo Mode Testing Plan

## Test Environment Setup
- **Requirement**: Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` or run with inline env var
- **Command**: `NEXT_PUBLIC_DEMO_MODE=true npm run dev`
- **URL**: http://localhost:3000

## Test Checklist

### 1. Demo Mode Activation ✓
- [ ] Yellow warning banner appears at the top of the page
- [ ] Banner text: "DEMO MODE - This is for testing only. Data shown is not real."
- [ ] Banner has warning icons on both sides
- [ ] Floating Demo Mode widget appears in bottom-right corner

### 2. Demo Mode Widget UI ✓
- [ ] Widget shows current role with appropriate icon
- [ ] Widget can be expanded/collapsed using chevron button
- [ ] When expanded, shows:
  - Role selector dropdown
  - Driver selector (when driver role selected)
  - Quick Actions button
  - Current context info (Demo ID)

### 3. Role Switching ✓
Test each role switch and verify navigation:

#### Switch to Customer Role
- [ ] Select "Customer" from role dropdown
- [ ] Verify icon changes to User icon (blue)
- [ ] Verify navigation to home page (`/`)
- [ ] Verify role persists in localStorage
- [ ] Verify demo cookie is set

#### Switch to Dispatcher Role
- [ ] Select "Dispatcher" from role dropdown
- [ ] Verify icon changes to Package icon (purple)
- [ ] Verify navigation to `/dispatcher`
- [ ] Verify role persists in localStorage

#### Switch to Driver Role
- [ ] Select "Driver" from role dropdown
- [ ] Verify icon changes to Truck icon (green)
- [ ] Verify driver selector dropdown appears
- [ ] Select "John Smith (Demo)"
- [ ] Verify navigation to `/driver`
- [ ] Verify driver ID persists in localStorage
- [ ] Switch to "Sarah Johnson (Demo)"
- [ ] Switch to "Mike Davis (Demo)"

#### Switch to Admin Role
- [ ] Select "Admin" from role dropdown
- [ ] Verify icon changes to Shield icon (orange)
- [ ] Verify navigation to `/admin`
- [ ] Verify role persists in localStorage

### 4. Quick Actions - Demo Flows ✓
Test each quick action flow:

- [ ] Click "Quick Actions" button to expand menu
- [ ] Click "1. Start as Customer → Quote"
  - Verify role switches to customer
  - Verify navigation to `/quote`
- [ ] Click "2. View as Dispatcher → Assign"
  - Verify role switches to dispatcher
  - Verify navigation to `/dispatcher`
- [ ] Click "3. View as Driver → Update Status"
  - Verify role switches to driver
  - Verify driver is selected (defaults to demo-driver-1 if none selected)
  - Verify navigation to `/driver`
- [ ] Click "4. View as Admin → Manage"
  - Verify role switches to admin
  - Verify navigation to `/admin`

### 5. Quick Actions - Data Management ✓

#### Create Test Order
- [ ] Click "Create Test Order"
- [ ] Verify page reloads
- [ ] Verify new order appears in localStorage (`demo-test-orders`)
- [ ] Verify order has unique ID with timestamp
- [ ] Create multiple test orders and verify each is unique

#### Reset All Demo Data
- [ ] Create some test orders
- [ ] Switch roles a few times
- [ ] Click "Reset All Demo Data"
- [ ] Verify page reloads
- [ ] Verify localStorage is cleared
- [ ] Verify all demo data is reset to initial state

### 6. State Persistence ✓
- [ ] Switch to a role (e.g., dispatcher)
- [ ] Refresh the page
- [ ] Verify role persists (still dispatcher)
- [ ] Select a driver (if in driver role)
- [ ] Refresh the page
- [ ] Verify driver selection persists

### 7. Demo Context Integration ✓
Verify demo context is properly consumed by components:

- [ ] Check that `useDemoAuth` hook returns correct demo user based on role
- [ ] Verify demo drivers list is available (3 drivers)
- [ ] Verify demo mode cookie is set for middleware
- [ ] Check that non-demo mode disables all features

### 8. Cross-Page Functionality ✓
Test role switching from different pages:

- [ ] From home page (`/`)
- [ ] From quote page (`/quote`)
- [ ] From customer dashboard (`/customer/dashboard`)
- [ ] From dispatcher page (`/dispatcher`)
- [ ] From driver page (`/driver`)
- [ ] From admin page (`/admin`)
- [ ] From tracking page (`/track/[orderId]`)

### 9. Demo Data Validation ✓
Verify demo data generation:

- [ ] Check `generateDemoOrders()` creates 5 orders
- [ ] Verify orders have correct statuses:
  - 2x ReadyForDispatch
  - 1x Assigned (to demo-driver-1)
  - 1x PickedUp (by demo-driver-1)
  - 1x Delivered
- [ ] Verify NYC addresses are used
- [ ] Verify demo customers have realistic data
- [ ] Verify pricing calculations are correct

### 10. UI/UX Testing ✓

#### Visual Design
- [ ] Widget shadow and styling matches design system
- [ ] Role icons display correctly with proper colors
- [ ] Buttons have proper hover states
- [ ] Transitions are smooth (300ms)
- [ ] Text is readable and properly sized

#### Interactions
- [ ] Expand/collapse animation works smoothly
- [ ] Dropdowns open and close properly
- [ ] Quick actions menu expands/collapses
- [ ] No UI glitches when switching roles quickly

#### Responsive Design
- [ ] Widget is visible on mobile devices
- [ ] Widget doesn't overlap with content
- [ ] Banner is responsive and readable
- [ ] Touch targets are appropriately sized

### 11. Demo Mode Disabled ✓
- [ ] Set `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] Restart development server
- [ ] Verify banner does NOT appear
- [ ] Verify widget does NOT appear
- [ ] Verify normal authentication is required

### 12. Browser Compatibility ✓
Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### 13. Console Errors ✓
- [ ] Open browser console
- [ ] Switch between all roles
- [ ] Verify no JavaScript errors
- [ ] Verify no React warnings
- [ ] Verify no network errors

## Test Scenarios

### Scenario 1: Complete Order Flow Demo
1. Start as Customer
2. Navigate to `/quote`
3. Switch to Dispatcher
4. View orders ready for dispatch
5. Switch to Driver
6. Select a driver
7. View assigned orders
8. Switch to Admin
9. View all orders and metrics

### Scenario 2: Rapid Role Switching
1. Switch between all 4 roles rapidly
2. Verify no errors or race conditions
3. Verify state remains consistent
4. Verify navigation works correctly

### Scenario 3: Data Persistence
1. Create 5 test orders
2. Switch roles multiple times
3. Select different drivers
4. Close browser tab
5. Reopen and verify state persists
6. Reset all data
7. Verify clean state

## Manual Testing Notes

### What to Look For:
- UI responsiveness and smoothness
- Correct role-based navigation
- Proper data persistence
- No console errors
- Intuitive user experience

### Known Limitations (Expected):
- Data resets on localStorage clear
- No real backend operations
- No actual emails or payments
- Mock data only

## Automated Testing

Run the automated test script:
```bash
chmod +x scripts/test-demo-mode.sh
./scripts/test-demo-mode.sh
```

## Test Results

Date: _____________
Tester: _____________
Environment: _____________

Overall Result: [ ] PASS [ ] FAIL

Notes:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

