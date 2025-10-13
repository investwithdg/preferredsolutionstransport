# Demo Mode Guide

This guide explains how to use the Demo Mode feature for testing and demonstrating the Preferred Solutions Transport platform.

## Overview

Demo Mode allows you to quickly switch between different user roles (Customer, Dispatcher, Driver, Admin) without needing to log in and out of different accounts. This is perfect for:
- Client demonstrations
- Testing the complete workflow
- Development and debugging
- Training sessions

## Enabling Demo Mode

1. Add the following to your `.env.local` file:
   ```
   NEXT_PUBLIC_DEMO_MODE=true
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

3. You'll see a yellow warning banner at the top indicating Demo Mode is active
4. A floating Demo Mode widget appears in the bottom-right corner

⚠️ **IMPORTANT**: Never enable Demo Mode in production! It bypasses all authentication.

## Using the Role Switcher

### Switching Roles

1. Click on the Demo Mode widget in the bottom-right corner
2. Use the "Switch Role" dropdown to select:
   - **Customer**: View quotes, make payments, track orders
   - **Dispatcher**: Assign drivers to orders, view dispatch queue
   - **Driver**: Accept orders, update delivery status
   - **Admin**: Manage users, drivers, view all orders

3. The page will automatically navigate to the appropriate dashboard

### Driver Selection

When switching to the Driver role:
1. Select a demo driver from the dropdown
2. Three demo drivers are available:
   - John Smith (Demo)
   - Sarah Johnson (Demo)
   - Mike Davis (Demo)

## Quick Actions

Click "Quick Actions" in the Demo Mode widget to access:

### Demo Flows
Pre-configured navigation for the complete workflow:

1. **Start as Customer → Quote**: Begin the customer journey at the quote page
2. **View as Dispatcher → Assign**: Switch to dispatcher view to assign orders
3. **View as Driver → Update Status**: View assigned orders as a driver
4. **View as Admin → Manage**: Access the admin dashboard

### Quick Actions
- **Create Test Order**: Instantly creates a new order in "Ready for Dispatch" status
- **Reset All Demo Data**: Clears all demo data and resets to initial state

## Demo Data

### Pre-seeded Orders
Demo Mode automatically generates 5 sample orders:
- 2 orders in "Ready for Dispatch" status
- 1 order "Assigned" to John Smith
- 1 order "Picked Up" by John Smith
- 1 order "Delivered"

### Sample Addresses
All demo orders use real NYC addresses with calculated distances

### Test Customers
5 demo customers with realistic names and contact information

## Testing the Complete Flow

### Option 1: Manual Flow
1. Start as **Customer** → Navigate to `/quote`
2. Fill out the quote form (addresses will autocomplete)
3. Proceed to payment (use Stripe test card: 4242 4242 4242 4242)
4. Switch to **Dispatcher** role
5. See the new order in "Ready for Dispatch" status
6. Assign it to a driver
7. Switch to **Driver** role (select the assigned driver)
8. Update the order status through the delivery stages
9. Switch to **Admin** to view overall metrics

### Option 2: Quick Demo
1. Use "Create Test Order" to instantly add orders
2. Switch between roles to demonstrate each interface
3. Orders are pre-populated with realistic data

## Features in Demo Mode

### Working Features
✅ Role switching without authentication
✅ View all dashboards and pages
✅ Create and manage orders
✅ View map routes (requires Google Maps API key)
✅ Push notifications (if configured)
✅ All UI interactions

### Limitations
❌ No real database operations
❌ No actual emails sent
❌ No real payment processing
❌ Data resets on page refresh (unless using localStorage)

## Tips for Demonstrations

1. **Prepare Your Flow**: Practice the role switches before the demo
2. **Use Quick Actions**: Speed up repetitive tasks
3. **Explain Demo Mode**: Make it clear this is a testing environment
4. **Reset When Needed**: Use "Reset All Demo Data" between demos
5. **Hide/Show Widget**: Click the chevron to minimize the Demo Mode widget

## Troubleshooting

### Demo Mode Not Appearing
- Verify `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`
- Restart the development server
- Clear browser cache

### Orders Not Showing
- Check if you're in the correct role
- Try "Reset All Demo Data"
- Refresh the page

### Role Switch Not Working
- Check browser console for errors
- Ensure you're not on a protected route
- Try navigating to home page first

## Disabling Demo Mode

To disable Demo Mode:
1. Set `NEXT_PUBLIC_DEMO_MODE=false` in `.env.local`
2. Restart the development server
3. The Demo Mode widget and banner will disappear
4. Normal authentication will be required
